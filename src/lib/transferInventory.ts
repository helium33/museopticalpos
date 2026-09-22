// src/lib/transferInventory.ts
// Store-to-store transfers for frames, accessories and contact lenses.
// A store requests items from another store; the store being taken from confirms,
// and the stock moves between the two stores in the same step.
import { collection, query, where, doc, serverTimestamp, getDocs, runTransaction, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import { TransferRequest } from '../type/transfer';

// Statuses whose stock has not moved yet. 'approved' only exists on requests
// approved under the old two-step flow, where the requester had to complete them.
const OPEN_STATUSES = ['pending', 'approved'];

// Frames can share a name but carry different side codes - each code is its own model.
// Code is optional on some items, so a missing code counts as an empty one.
export const normalizeItemCode = (code: unknown): string => String(code ?? '').trim();

// Moves the requested quantity out of the source store and into the requesting store,
// then marks the transfer completed. It all happens in one transaction, so stock is never
// deducted without arriving, and a second Confirm click cannot move the items twice.
export const completeTransfer = async (transfer: TransferRequest, performedBy: string): Promise<void> => {
  if (!transfer.id) throw new Error('Transfer has no ID');
  const quantity = Number(transfer.requestedQuantity) || 0;
  if (quantity <= 0) throw new Error('Requested quantity must be greater than 0');

  const collectionName = transfer.itemType;

  // Transactions cannot run queries, so locate the documents first. They are queried by
  // name and then narrowed to the requested side code, so stock of another code with the
  // same name is never touched. Quantities are read again inside the transaction.
  const [sourceSnapshot, destSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, collectionName),
      where('store', '==', transfer.fromStore),
      where('name', '==', transfer.itemName)
    )),
    getDocs(query(
      collection(db, collectionName),
      where('store', '==', transfer.toStore),
      where('name', '==', transfer.itemName)
    ))
  ]);

  const itemCode = normalizeItemCode(transfer.itemCode);
  const hasRequestedCode = (d: { data: () => DocumentData }) => normalizeItemCode(d.data().code) === itemCode;
  const sourceDocs = sourceSnapshot.docs.filter(hasRequestedCode);
  const destDoc = destSnapshot.docs.find(hasRequestedCode);
  const label = itemCode ? `${itemCode} - "${transfer.itemName}"` : `"${transfer.itemName}"`;

  if (sourceDocs.length === 0) {
    throw new Error(`${label} not found in ${transfer.fromStore.toUpperCase()} store`);
  }

  const transferRef = doc(db, 'transfers', transfer.id);
  const destRef = destDoc ? destDoc.ref : null;

  await runTransaction(db, async (tx) => {
    // Reads - Firestore requires every read to happen before the first write
    const transferSnap = await tx.get(transferRef);
    const currentStatus = transferSnap.data()?.status;
    if (!OPEN_STATUSES.includes(currentStatus)) {
      throw new Error(`This transfer is already ${currentStatus || 'removed'}`);
    }

    const sourceSnaps = await Promise.all(sourceDocs.map(d => tx.get(d.ref)));
    const destSnap = destRef ? await tx.get(destRef) : null;

    // Deduct from the largest stock first
    const sources = sourceSnaps
      .filter(snap => snap.exists())
      .map(snap => ({ ref: snap.ref, data: snap.data() as DocumentData, qty: Number(snap.data()?.qty) || 0 }))
      .filter(source => source.qty > 0)
      .sort((a, b) => b.qty - a.qty);

    const totalAvailable = sources.reduce((sum, source) => sum + source.qty, 0);
    if (totalAvailable < quantity) {
      throw new Error(`Not enough ${label} in ${transfer.fromStore.toUpperCase()} (Available: ${totalAvailable}, Requested: ${quantity})`);
    }

    // Writes - source store
    let remainingToTransfer = quantity;
    for (const source of sources) {
      if (remainingToTransfer <= 0) break;

      const deductFromThis = Math.min(source.qty, remainingToTransfer);
      const newSourceQty = source.qty - deductFromThis;

      tx.update(source.ref, {
        qty: newSourceQty,
        totalQty: Math.max(0, (source.data.totalQty || source.qty) - deductFromThis),
        transferOutQty: (source.data.transferOutQty || 0) + deductFromThis,
        updatedAt: serverTimestamp()
      });
      tx.set(doc(collection(db, 'itemHistory')), {
        itemId: source.ref.id,
        itemType: transfer.itemType,
        action: 'transfer_out',
        store: transfer.fromStore,
        performedBy,
        performedAt: serverTimestamp(),
        changes: [{ field: 'qty', oldValue: String(source.qty), newValue: String(newSourceQty) }],
        notes: `Transferred ${deductFromThis} units of ${label} to ${transfer.toStore.toUpperCase()} store (Transfer ID: ${transfer.id})`
      });

      remainingToTransfer -= deductFromThis;
    }

    // Writes - requesting store
    if (destRef && destSnap && destSnap.exists()) {
      const destData = destSnap.data();
      const destCurrentQty = Number(destData.qty) || 0;
      const newDestQty = destCurrentQty + quantity;

      tx.update(destRef, {
        qty: newDestQty,
        totalQty: (destData.totalQty || destCurrentQty) + quantity,
        transferInQty: (destData.transferInQty || 0) + quantity,
        updatedAt: serverTimestamp()
      });
      tx.set(doc(collection(db, 'itemHistory')), {
        itemId: destRef.id,
        itemType: transfer.itemType,
        action: 'transfer_in',
        store: transfer.toStore,
        performedBy,
        performedAt: serverTimestamp(),
        changes: [{ field: 'qty', oldValue: String(destCurrentQty), newValue: String(newDestQty) }],
        notes: `Received ${quantity} units of ${label} from ${transfer.fromStore.toUpperCase()} store (Transfer ID: ${transfer.id})`
      });
    } else {
      // The requesting store has never stocked this code - create it from the source item
      const newItem: DocumentData = {
        ...sources[0].data,
        qty: quantity,
        store: transfer.toStore,
        originalQty: quantity,
        totalQty: quantity,
        soldQty: 0,
        transferInQty: quantity,
        transferOutQty: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      delete newItem.id; // Never copy a stored ID onto the new document

      const newItemRef = doc(collection(db, collectionName));
      tx.set(newItemRef, newItem);
      tx.set(doc(collection(db, 'itemHistory')), {
        itemId: newItemRef.id,
        itemType: transfer.itemType,
        action: 'transfer_in',
        store: transfer.toStore,
        performedBy,
        performedAt: serverTimestamp(),
        changes: [{ field: 'qty', oldValue: '0', newValue: String(quantity) }],
        notes: `Created new item ${label} with ${quantity} units from ${transfer.fromStore.toUpperCase()} store (Transfer ID: ${transfer.id})`
      });
    }

    // Confirming a pending request approves and completes it in the same step
    tx.update(transferRef, {
      status: 'completed',
      completedBy: performedBy,
      completedAt: serverTimestamp(),
      transferredQuantity: quantity,
      ...(currentStatus === 'pending' && { approvedBy: performedBy, approvedAt: serverTimestamp() })
    });
    tx.set(doc(collection(db, 'transferHistory')), {
      transferId: transfer.id,
      action: 'completed',
      performedBy,
      performedAt: serverTimestamp(),
      newStatus: 'completed'
    });
  });
};

export const rejectTransfer = async (transfer: TransferRequest, performedBy: string): Promise<void> => {
  if (!transfer.id) throw new Error('Transfer has no ID');
  const transferRef = doc(db, 'transfers', transfer.id);

  await runTransaction(db, async (tx) => {
    const currentStatus = (await tx.get(transferRef)).data()?.status;
    if (!OPEN_STATUSES.includes(currentStatus)) {
      throw new Error(`This transfer is already ${currentStatus || 'removed'}`);
    }

    tx.update(transferRef, {
      status: 'rejected',
      rejectedBy: performedBy,
      rejectedAt: serverTimestamp()
    });
    tx.set(doc(collection(db, 'transferHistory')), {
      transferId: transfer.id,
      action: 'rejected',
      performedBy,
      performedAt: serverTimestamp(),
      newStatus: 'rejected'
    });
  });
};
