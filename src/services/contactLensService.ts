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
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ContactLensFormData } from '../components/contactLens/ContactLensForm';
import { recordSale, updateItemWithHistory, deleteItemWithHistory } from './firebaseService';
import toast from 'react-hot-toast';

const COLLECTION_NAME = 'contactLenses';

// Get all contact lenses for a store
export const getContactLenses = async (store: string): Promise<ContactLensFormData[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('store', '==', store),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        code: data.code,
        name: data.name,
        category: data.category,
        power: data.power,
        qty: data.qty || 0,
        soldQty: data.soldQty || 0,
        remainingQty: data.remainingQty || data.qty || 0,
        restockedQty: data.restockedQty || 0,
        originalQty: data.originalQty || data.qty || 0,
        price: data.price,
        imageUrl: data.imageUrl,
        store: data.store,
        isCancelled: data.isCancelled || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as ContactLensFormData;
    });
  } catch (error) {
    console.error('Error fetching contact lenses:', error);
    toast.error('Failed to fetch contact lenses');
    throw error;
  }
};

// Get a single contact lens
export const getContactLens = async (id: string): Promise<ContactLensFormData | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        code: data.code,
        name: data.name,
        category: data.category,
        power: data.power,
        qty: data.qty || 0,
        soldQty: data.soldQty || 0,
        remainingQty: data.remainingQty || data.qty || 0,
        restockedQty: data.restockedQty || 0,
        originalQty: data.originalQty || data.qty || 0,
        price: data.price,
        imageUrl: data.imageUrl,
        store: data.store,
        isCancelled: data.isCancelled || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as ContactLensFormData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching contact lens:', error);
    toast.error('Failed to fetch contact lens');
    throw error;
  }
};

// Add a new contact lens
export const addContactLens = async (contactLensData: ContactLensFormData, store: string): Promise<string> => {
  try {
    const dataToSave = {
      code: contactLensData.code,
      name: contactLensData.name,
      category: contactLensData.category,
      power: contactLensData.power || '',
      qty: contactLensData.qty || 0,
      soldQty: 0,
      remainingQty: contactLensData.qty || 0,
      restockedQty: 0,
      originalQty: contactLensData.qty || 0,
      price: contactLensData.price,
      imageUrl: contactLensData.imageUrl || '',
      store: store,
      isCancelled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    toast.success('Contact lens added successfully');
    return docRef.id;
  } catch (error) {
    console.error('Error adding contact lens:', error);
    toast.error('Failed to add contact lens');
    throw error;
  }
};

// Update a contact lens
export const updateContactLens = async (
  id: string, 
  contactLensData: Partial<ContactLensFormData>,
  store: string,
  staffEmail: string = 'system@store.com'
): Promise<void> => {
  try {
    // Get current data first
    const currentData = await getContactLens(id);
    if (!currentData) {
      throw new Error('Contact lens not found');
    }

    const updateData = {
      code: contactLensData.code,
      name: contactLensData.name,
      category: contactLensData.category,
      power: contactLensData.power || '',
      qty: contactLensData.qty,
      remainingQty: contactLensData.remainingQty || contactLensData.qty,
      price: contactLensData.price,
      imageUrl: contactLensData.imageUrl || '',
      updatedAt: serverTimestamp()
    };

    // Use the firebaseService function to update with history tracking
    await updateItemWithHistory(
      COLLECTION_NAME,
      id,
      currentData,
      updateData,
      store as any,
      staffEmail
    );

    toast.success('Contact lens updated successfully');
  } catch (error) {
    console.error('Error updating contact lens:', error);
    toast.error('Failed to update contact lens');
    throw error;
  }
};

// Delete a contact lens
export const deleteContactLens = async (
  id: string,
  store: string,
  staffEmail: string = 'system@store.com'
): Promise<void> => {
  try {
    // Get current data first
    const currentData = await getContactLens(id);
    if (!currentData) {
      throw new Error('Contact lens not found');
    }

    // Use the firebaseService function to delete with history tracking
    await deleteItemWithHistory(
      COLLECTION_NAME,
      id,
      currentData,
      store as any,
      staffEmail
    );

    toast.success('Contact lens deleted successfully');
  } catch (error) {
    console.error('Error deleting contact lens:', error);
    toast.error('Failed to delete contact lens');
    throw error;
  }
};

// Sell contact lens (reduce quantity)
export const sellContactLens = async (
  id: string,
  quantity: number,
  store: string,
  staffEmail: string = 'system@store.com'
): Promise<void> => {
  try {
    const contactLens = await getContactLens(id);
    if (!contactLens) {
      throw new Error('Contact lens not found');
    }

    if (contactLens.remainingQty < quantity) {
      throw new Error('Insufficient quantity available');
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      soldQty: increment(quantity),
      remainingQty: increment(-quantity),
      updatedAt: serverTimestamp()
    });

    // Record the sale
    await recordSale(
      id,
      contactLens.name,
      'Contact Lens' as any,
      contactLens.category,
      store as any,
      quantity,
      contactLens.price
    );

    toast.success(`Sold ${quantity} units successfully`);
  } catch (error) {
    console.error('Error selling contact lens:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to process sale');
    throw error;
  }
};

// Restock contact lens (add quantity)
export const restockContactLens = async (
  id: string,
  quantity: number,
  store: string,
  staffEmail: string = 'system@store.com'
): Promise<void> => {
  try {
    const contactLens = await getContactLens(id);
    if (!contactLens) {
      throw new Error('Contact lens not found');
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      qty: increment(quantity),
      remainingQty: increment(quantity),
      restockedQty: increment(quantity),
      updatedAt: serverTimestamp()
    });

    toast.success(`Restocked ${quantity} units successfully`);
  } catch (error) {
    console.error('Error restocking contact lens:', error);
    toast.error('Failed to restock contact lens');
    throw error;
  }
};

// Cancel contact lens (mark as cancelled)
export const cancelContactLens = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      isCancelled: true,
      updatedAt: serverTimestamp()
    });

    toast.success('Contact lens cancelled successfully');
  } catch (error) {
    console.error('Error cancelling contact lens:', error);
    toast.error('Failed to cancel contact lens');
    throw error;
  }
};

// Get contact lenses by category
export const getContactLensesByCategory = async (store: string, category: string): Promise<ContactLensFormData[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('store', '==', store),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        code: data.code,
        name: data.name,
        category: data.category,
        power: data.power,
        qty: data.qty || 0,
        soldQty: data.soldQty || 0,
        remainingQty: data.remainingQty || data.qty || 0,
        restockedQty: data.restockedQty || 0,
        originalQty: data.originalQty || data.qty || 0,
        price: data.price,
        imageUrl: data.imageUrl,
        store: data.store,
        isCancelled: data.isCancelled || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as ContactLensFormData;
    });
  } catch (error) {
    console.error('Error fetching contact lenses by category:', error);
    toast.error('Failed to fetch contact lenses');
    throw error;
  }
};