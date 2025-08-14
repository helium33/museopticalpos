import { doc, updateDoc, addDoc, collection, serverTimestamp, getDoc, query, where, getDocs, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface TransferItem {
  id: string;
  code: string;
  name: string;
  qty: number;
  store: string;
  [key: string]: any;
}

// Enhanced completeTransfer function with name-based matching
export const completeTransfer = async (
  transferId: string,
  transferData: any,
  userEmail: string
) => {
  try {
    const { itemType, fromStore, toStore, requestedQuantity, itemCode, itemName } = transferData;

    // 1. Find all source items with matching NAME (not just code)
    const sourceItemQuery = query(
      collection(db, itemType),
      where('store', '==', fromStore),
      where('name', '==', itemName) // Match by name instead of code
    );
    const sourceSnapshot = await getDocs(sourceItemQuery);

    if (sourceSnapshot.empty) {
      throw new Error(`Source item "${itemName}" not found in ${fromStore} store`);
    }

    // 2. Calculate total available quantity for this name
    let totalAvailableQty = 0;
    const sourceItems: any[] = [];
    
    sourceSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const qty = Number(data.qty) || 0;
      totalAvailableQty += qty;
      sourceItems.push({
        id: doc.id,
        data,
        qty
      });
    });

    // 3. Verify sufficient quantity
    if (totalAvailableQty < requestedQuantity) {
      throw new Error(`Insufficient quantity for "${itemName}". Available: ${totalAvailableQty}, Requested: ${requestedQuantity}`);
    }

    // 4. Check for EXACT match in destination store (by name)
    const destinationQuery = query(
      collection(db, itemType),
      where('store', '==', toStore),
      where('name', '==', itemName) // Match by name
    );

    const destinationSnapshot = await getDocs(destinationQuery);
    let destinationItemId: string | null = null;
    let destinationItemData: TransferItem | null = null;

    // Find exact name match in destination
    for (const docSnap of destinationSnapshot.docs) {
      const data = docSnap.data() as TransferItem;
      if (data.name === itemName) {
        destinationItemId = docSnap.id;
        destinationItemData = data;
        break;
      }
    }

    let remainingToTransfer = requestedQuantity;

    // 5. Deduct from source items (starting with items that have the most quantity)
    const sortedSourceItems = sourceItems
      .filter(item => item.qty > 0)
      .sort((a, b) => b.qty - a.qty);

    for (const sourceItem of sortedSourceItems) {
      if (remainingToTransfer <= 0) break;

      const deductFromThis = Math.min(sourceItem.qty, remainingToTransfer);
      const newSourceQty = sourceItem.qty - deductFromThis;
      
      await updateDoc(doc(db, itemType, sourceItem.id), {
        qty: newSourceQty,
        transferOutQty: increment(deductFromThis),
        updatedAt: serverTimestamp()
      });

      // Create transfer history for source
      await addDoc(collection(db, 'itemHistory'), {
        itemId: sourceItem.id,
        itemType: itemType,
        action: 'transfer_out',
        store: fromStore,
        performedBy: userEmail,
        performedAt: serverTimestamp(),
        changes: [
          {
            field: 'qty',
            oldValue: String(sourceItem.qty),
            newValue: String(newSourceQty)
          }
        ],
        notes: `Transferred ${deductFromThis} units to ${toStore.toUpperCase()} store (Transfer ID: ${transferId})`
      });

      remainingToTransfer -= deductFromThis;
    }

    // 6. Handle destination item
    if (destinationItemId && destinationItemData) {
      // Update existing item with same name
      await updateDoc(doc(db, itemType, destinationItemId), {
        qty: increment(requestedQuantity),
        transferInQty: increment(requestedQuantity),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'itemHistory'), {
        itemId: destinationItemId,
        itemType: itemType,
        action: 'transfer_in',
        store: toStore,
        performedBy: userEmail,
        performedAt: serverTimestamp(),
        changes: [
          {
            field: 'qty',
            oldValue: String(destinationItemData.qty),
            newValue: String(destinationItemData.qty + requestedQuantity)
          }
        ],
        notes: `Received ${requestedQuantity} units from ${fromStore.toUpperCase()} store (Transfer ID: ${transferId})`
      });
    } else {
      // Create new item with transferred quantity using the first source item as template
      const templateItem = sortedSourceItems[0];
      const newItem = {
        ...templateItem.data,
        id: undefined, // Remove old ID
        store: toStore,
        qty: requestedQuantity,
        soldQty: 0,
        transferInQty: requestedQuantity,
        transferOutQty: 0,
        originalQty: requestedQuantity,
        totalQty: requestedQuantity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const newDocRef = await addDoc(collection(db, itemType), newItem);

      await addDoc(collection(db, 'itemHistory'), {
        itemId: newDocRef.id,
        itemType: itemType,
        action: 'transfer_in',
        store: toStore,
        performedBy: userEmail,
        performedAt: serverTimestamp(),
        changes: [
          {
            field: 'qty',
            oldValue: '0',
            newValue: String(requestedQuantity)
          }
        ],
        notes: `Created new item "${itemName}" with ${requestedQuantity} units from ${fromStore.toUpperCase()} store (Transfer ID: ${transferId})`
      });
    }

    // 7. Update transfer status
    await updateDoc(doc(db, 'transfers', transferId), {
      status: 'completed',
      completedAt: serverTimestamp(),
      completedBy: userEmail,
      transferredQuantity: requestedQuantity
    });

    toast.success(`Transfer completed! ${requestedQuantity} "${itemName}" (${itemCode}) from ${fromStore} to ${toStore}`);

  } catch (error) {
    console.error('Transfer error:', error);
    toast.error(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

export const approveTransfer = async (
  transferId: string,
  userEmail: string
) => {
  try {
    await updateDoc(doc(db, 'transfers', transferId), {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: userEmail
    });

    await addDoc(collection(db, 'transferHistory'), {
      transferId,
      action: 'approved',
      performedBy: userEmail,
      performedAt: serverTimestamp(),
      newStatus: 'approved'
    });

    toast.success('Transfer request approved successfully');
  } catch (error) {
    console.error('Error approving transfer:', error);
    toast.error('Failed to approve transfer');
    throw error;
  }
};

export const rejectTransfer = async (
  transferId: string,
  reason: string,
  userEmail: string
) => {
  try {
    await updateDoc(doc(db, 'transfers', transferId), {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy: userEmail,
      rejectionReason: reason
    });

    await addDoc(collection(db, 'transferHistory'), {
      transferId,
      action: 'rejected',
      performedBy: userEmail,
      performedAt: serverTimestamp(),
      newStatus: 'rejected',
      reason
    });

    toast.success('Transfer request rejected');
  } catch (error) {
    console.error('Error rejecting transfer:', error);
    toast.error('Failed to reject transfer');
    throw error;
  }
};