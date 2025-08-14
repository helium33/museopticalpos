import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  increment,
  getDoc,
  DocumentData,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Store, ItemType, ItemHistory, trackItemHistory } from './utils';

export const deleteVocWithHistory = async (
  vocId: string,
  vocData: any,
  returnToInventory: boolean,
  store: Store,
  staffEmail: string
) => {
  try {
    // Track deletion in history first
    await trackItemHistory({
      itemId: vocId,
      itemType: 'voc',
      itemName: `VOC ${vocData.vocNumber}`,
      itemCode: vocData.vocNumber,
      action: 'delete',
      changes: [
        {
          field: 'status',
          oldValue: 'active',
          newValue: 'deleted'
        },
        {
          field: 'total_amount',
          oldValue: String(vocData.totalAmount),
          newValue: '0'
        }
      ],
      store,
      staffEmail
    });

    if (returnToInventory) {
      // Return items to inventory
      for (const item of vocData.items) {
        if (item.isFOC) continue;

        const collectionName = (() => {
          switch (item.type) {
            case 'Lens': return 'lenses';
            case 'Frame': return 'frames';
            case 'Accessories': return 'accessories';
            case 'Contact Lens': return 'contactLenses';
            default: return '';
          }
        })();

        if (collectionName) {
          const itemRef = doc(db, collectionName, item.id);
          const itemDoc = await getDoc(itemRef);

          if (itemDoc.exists()) {
            await updateDoc(itemRef, {
              qty: increment(item.quantity),
              soldQty: increment(-item.quantity),
              updatedAt: serverTimestamp(),
            });

            // Track inventory update
            await trackItemHistory({
              itemId: item.id,
              itemType: item.type,
              itemName: item.name,
              itemCode: item.id,
              action: 'update',
              changes: [{
                field: 'qty',
                oldValue: String(itemDoc.data().qty),
                newValue: String(itemDoc.data().qty + item.quantity)
              }],
              store,
              staffEmail
            });
          }
        }
      }
    }

    // Finally delete the VOC
    await deleteDoc(doc(db, 'vouchers', vocId));
  } catch (error) {
    console.error('Error deleting VOC:', error);
    throw error;
  }
};

export const updateVocWithHistory = async (
  vocId: string,
  originalVoc: any,
  newData: any,
  store: Store,
  staffEmail: string
) => {
  try {
    const changes = [];
    
    // Track quantity changes
    if (newData.items) {
      for (let i = 0; i < newData.items.length; i++) {
        const newItem = newData.items[i];
        const originalItem = originalVoc.items[i];
        
        if (originalItem && newItem.quantity !== originalItem.quantity) {
          changes.push({
            field: `${newItem.name} quantity`,
            oldValue: String(originalItem.quantity),
            newValue: String(newItem.quantity)
          });
        }
      }
    }

    // Track notes changes
    if (newData.notes !== originalVoc.notes) {
      changes.push({
        field: 'notes',
        oldValue: originalVoc.notes || '',
        newValue: newData.notes || ''
      });
    }

    // Track history if there are changes
    if (changes.length > 0) {
      await trackItemHistory({
        itemId: vocId,
        itemType: 'voc',
        itemName: `VOC ${originalVoc.vocNumber}`,
        itemCode: originalVoc.vocNumber,
        action: 'update',
        changes,
        store,
        staffEmail
      });
    }

    // Update VOC document
    const vocRef = doc(db, 'vouchers', vocId);
    await updateDoc(vocRef, {
      ...newData,
      updatedAt: serverTimestamp(),
      updatedBy: staffEmail
    });
  } catch (error) {
    console.error('Error updating VOC:', error);
    throw error;
  }
};