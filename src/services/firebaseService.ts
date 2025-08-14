import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  DocumentData,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Store, ItemType, ItemHistory } from '../lib/utils';

// Track item history
export const trackItemHistory = async (
  itemId: string,
  itemType: ItemType,
  itemName: string,
  itemCode: string,
  action: 'update' | 'delete',
  changes: Array<{ field: string; oldValue: string; newValue: string }>,
  store: Store,
  staffEmail: string
): Promise<void> => {
  try {
    await addDoc(collection(db, 'itemHistory'), {
      itemId,
      itemType,
      itemName,
      itemCode,
      action,
      changes,
      store,
      staffEmail,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking item history:', error);
    throw new Error('Failed to track item history');
  }
};

// Get item history
export const getItemHistory = async (
  store: Store,
  filters?: {
    itemType?: ItemType;
    action?: 'update' | 'delete';
    startDate?: Date;
    endDate?: Date;
  }
): Promise<ItemHistory[]> => {
  try {
    const constraints = [
      where('store', '==', store),
      orderBy('createdAt', 'desc')
    ];

    if (filters?.itemType) {
      constraints.push(where('itemType', '==', filters.itemType));
    }

    if (filters?.action) {
      constraints.push(where('action', '==', filters.action));
    }

    if (filters?.startDate) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters?.endDate) {
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
    }

    const historyQuery = query(collection(db, 'itemHistory'), ...constraints);
    const snapshot = await getDocs(historyQuery);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        itemType: data.itemType,
        itemName: data.itemName,
        itemCode: data.itemCode,
        action: data.action,
        changes: data.changes || [],
        staffEmail: data.staffEmail,
        store: data.store,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching item history:', error);
    throw new Error('Failed to fetch item history');
  }
};

// Enhanced update item with history tracking
export const updateItemWithHistory = async <T extends DocumentData>(
  collectionName: string,
  id: string,
  oldData: T,
  newData: Partial<T>,
  store: Store,
  staffEmail: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    
    // First verify the document exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Item ${id} not found in ${collectionName}`);
    }

    // Then proceed with update
    const updateData = {
      ...newData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, updateData);

    // Track changes
    const changes = Object.entries(newData)
      .filter(([key]) => !['id', 'updatedAt'].includes(key))
      .map(([field, newValue]) => ({
        field,
        oldValue: String(oldData[field] || ''),
        newValue: String(newValue || '')
      }));

    if (changes.length > 0) {
      await trackItemHistory(
        id,
        oldData.type || collectionName as ItemType,
        oldData.name || oldData.code,
        oldData.code || id,
        'update',
        changes,
        store,
        staffEmail
      );
    }
  } catch (error) {
    console.error(`Error updating ${collectionName} item ${id}:`, error);
    throw error;
  }
};

// Enhanced delete item with history tracking
export const deleteItemWithHistory = async (
  collectionName: string,
  id: string,
  itemData: any,
  store: Store,
  staffEmail: string
): Promise<void> => {
  try {
    // First delete the item
    await deleteDoc(doc(db, collectionName, id));

    // Record deletion in history
    await trackItemHistory(
      id,
      itemData.type || collectionName as ItemType,
      itemData.name || itemData.code,
      itemData.code || id,
      'delete',
      [], // No changes array needed for deletion
      store,
      staffEmail
    );
  } catch (error) {
    console.error(`Error deleting ${collectionName}:`, error);
    throw error;
  }
};

export const getItem = async <T>(
  collectionName: string,
  id: string
): Promise<T | null> => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
};

export const addItem = async <T extends DocumentData>(
  collectionName: string,
  store: Store,
  data: T
): Promise<string> => {
  try {
    const item = {
      ...data,
      store,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, collectionName), item);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding ${collectionName}:`, error);
    throw error;
  }
};

export const recordSale = async (
  itemId: string,
  itemName: string,
  itemType: ItemType,
  category: string,
  store: Store,
  quantity: number,
  unitPrice: number
): Promise<void> => {
  try {
    await addDoc(collection(db, 'sales'), {
      itemId,
      itemName,
      itemType,
      category,
      store,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      date: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error recording sale:', error);
    throw error;
  }
};

export const getSalesHistory = async (
  filters?: {
    store?: Store;
    itemType?: ItemType;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<any[]> => {
  try {
    let q = query(
      collection(db, 'sales'),
      orderBy('date', 'desc')
    );
    
    if (filters?.store) {
      q = query(q, where('store', '==', filters.store));
    }
    
    if (filters?.itemType) {
      q = query(q, where('itemType', '==', filters.itemType));
    }
    
    if (filters?.startDate) {
      q = query(q, where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }
    
    if (filters?.endDate) {
      q = query(q, where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching sales history:', error);
    throw error;
  }
};