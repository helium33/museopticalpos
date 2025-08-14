import { collection, addDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { updateStockOnVocCreate, revertStockOnVocDelete, VocItem } from './stockults';
import { updateCompleteInventoryForVOC } from './InventoryUtlis';

export interface VocData {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: VocItem[];
  totalAmount: number;
  createdAt: string;
  status: 'active' | 'completed' | 'cancelled';
}

/**
 * Ensure error quantities are properly set for items with errors
 */
const processErrorQuantityForItems = (items: VocItem[]): VocItem[] => {
  return items.map(item => {
    // @ts-ignore
    if (item.hasError) {
      // Use the error quantity from the form, or default to 0
      const errorQty = item.errorQuantity || item.errorQty || 0;
      return {
        ...item,
        errorQuantity: errorQty,
        errorQty: errorQty // Ensure both fields are set for compatibility
      };
    }
    return {
      ...item,
      errorQuantity: 0,
      errorQty: 0
    };
  });
};

/**
 * Create a new VOC with stock management and error quantity calculation
 */
export const createVoc = async (vocData: Omit<VocData, 'id' | 'createdAt'>): Promise<string> => {
  try {
    // Process error quantities for items with errors
    const itemsWithErrorQty = processErrorQuantityForItems(vocData.items);

    // Add timestamp
    const vocWithTimestamp = {
      ...vocData,
      items: itemsWithErrorQty,
      createdAt: new Date().toISOString()
    };

    // Create VOC document
    const docRef = await addDoc(collection(db, 'vocs'), vocWithTimestamp);
    
    // CRITICAL FIX: Use the new inventory update function that properly handles BB categories
    console.log('🚀 [VOC CREATION] Using updateCompleteInventoryForVOC for BB category fix');
    const inventoryResult = await updateCompleteInventoryForVOC(itemsWithErrorQty);
    
    if (!inventoryResult.success) {
      console.error('❌ [VOC CREATION] Inventory update failed:', inventoryResult.errors);
      // Still return the VOC ID as it was created, but log the inventory errors
      console.warn('⚠️ [VOC CREATION] VOC created but inventory update had issues');
    } else {
      console.log('✅ [VOC CREATION] Inventory updated successfully for', inventoryResult.successCount, 'items');
    }
    
    console.log('VOC created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating VOC:', error);
    throw error;
  }
};

/**
 * Delete a VOC and revert stock changes
 */
export const deleteVoc = async (vocId: string, vocItems: VocItem[]): Promise<void> => {
  try {
    // Delete VOC document
    await deleteDoc(doc(db, 'vocs', vocId));
    
    // Revert stock changes
    await revertStockOnVocDelete(vocItems);
    
    console.log('VOC deleted successfully');
  } catch (error) {
    console.error('Error deleting VOC:', error);
    throw error;
  }
};

/**
 * Get all VOCs
 */
export const getAllVocs = async (): Promise<VocData[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'vocs'));
    const vocs: VocData[] = [];
    
    querySnapshot.forEach((doc) => {
      vocs.push({ id: doc.id, ...doc.data() } as VocData);
    });
    
    return vocs;
  } catch (error) {
    console.error('Error getting VOCs:', error);
    throw error;
  }
};

/**
 * Get VOCs by status
 */
export const getVocsByStatus = async (status: string): Promise<VocData[]> => {
  try {
    const q = query(collection(db, 'vocs'), where('status', '==', status));
    const querySnapshot = await getDocs(q);
    const vocs: VocData[] = [];
    
    querySnapshot.forEach((doc) => {
      vocs.push({ id: doc.id, ...doc.data() } as VocData);
    });
    
    return vocs;
  } catch (error) {
    console.error('Error getting VOCs by status:', error);
    throw error;
  }
};
