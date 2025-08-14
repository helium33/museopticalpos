import { doc, updateDoc, getDoc, runTransaction, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface StockItem {
  id: string;
  name: string;
  totalQty: number;
  soldQty: number;
  errorQty?: number; // Track error quantities
  remainingQty: number;
  price: number;
  category?: string;
  type?: 'single_vision' | 'bifocal' | 'progressive' | 'Single Vision' | 'Bifocal' | 'SMS' | 'Yangon Order';
  store?: string;
  sph?: number;
  cyl?: number;
  axis?: number;
  addition?: number;
  rightQty?: number;
  leftQty?: number;
  rightSoldQty?: number;
  leftSoldQty?: number;
  rightErrorQty?: number; // Track right eye error quantities
  leftErrorQty?: number; // Track left eye error quantities
  specifications?: {
    sph?: number;
    cyl?: number;
    axis?: number;
    addition?: number;
    side?: 'right' | 'left' | 'both';
  };
}

export interface VocItem {
  itemId?: string;
  id: string;
  itemName?: string;
  name: string;
  quantity: number;
  price: number;
  total?: number;
  type: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
  isFOC?: boolean;
  isBifocal?: boolean;
  isSingleVision?: boolean;
  isSMS?: boolean;
  isYangonOrder?: boolean;
  category?: string;
  store?: string;
  // CRITICAL FIX: Add error quantity fields for BB category fix
  hasError?: boolean;
  errorQuantity?: number;
  errorQty?: number; // Backward compatibility
  errorCategory?: string;
  details?: {
    sph?: number;
    cyl?: number;
    axis?: number;
    addition?: number;
    rightQty?: number;
    leftQty?: number;
    rightErrorQty?: number; // Error quantity for right eye
    leftErrorQty?: number;  // Error quantity for left eye
    Right?: string;         // Right eye specification
    Left?: string;          // Left eye specification
    rightCyl?: number;      // Right eye cylinder
    leftCyl?: number;       // Left eye cylinder
    rightAxis?: number;     // Right eye axis
    leftAxis?: number;      // Left eye axis
    [key: string]: any;
  };
}

export interface VocData {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: VocItem[];
  totalAmount: number;
  createdAt: string;
  status: 'pending' | 'completed' | 'cancelled';
}

/**
 * Get the appropriate collection name based on item type
 */
const getCollectionName = (itemType: string): string => {
  switch (itemType) {
    case 'Lens': return 'lenses';
    case 'Frame': return 'frames';
    case 'Accessories': return 'accessories';
    case 'Contact Lens': return 'contactLenses';
    default: return 'lenses';
  }
};

/**
 * Find matching stock item based on lens type and specifications
 */
const findMatchingStockItem = async (vocItem: VocItem): Promise<StockItem | null> => {
  try {
    const collectionName = getCollectionName(vocItem.type);
    const stockCollection = collection(db, collectionName);
    
    // For non-lens items, find by ID directly
    if (vocItem.type !== 'Lens') {
      const docRef = doc(db, collectionName, vocItem.id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as StockItem;
      }
      return null;
    }

    // For lens items, find by ID first (most direct match)
    const docRef = doc(db, collectionName, vocItem.id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as StockItem;
    }

    // If not found by ID, try to find by specifications (fallback)
    const snapshot = await getDocs(stockCollection);
    
    for (const docSnap of snapshot.docs) {
      const stockItem = { id: docSnap.id, ...docSnap.data() } as StockItem;
      
      // Check if basic properties match
      if (stockItem.name === vocItem.name || stockItem.name === vocItem.itemName) {
        // For lens items, also check specifications if available
        if (vocItem.details) {
          const isSpecMatch = 
            (!vocItem.details.sph || stockItem.sph === vocItem.details.sph) &&
            (!vocItem.details.cyl || stockItem.cyl === vocItem.details.cyl) &&
            (!vocItem.details.axis || stockItem.axis === vocItem.details.axis) &&
            (!vocItem.details.addition || stockItem.addition === vocItem.details.addition);
          
          if (isSpecMatch) {
            return stockItem;
          }
        } else {
          return stockItem;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding matching stock item:', error);
    throw error;
  }
};

/**
 * Update stock when VOC is created - reduces remaining stock and increases sold quantity
 */
export const updateStockOnVocCreate = async (vocItems: VocItem[]): Promise<void> => {
  try {
    console.log('🔄 Starting stock update for VOC creation...');
    
    await runTransaction(db, async (transaction) => {
      const stockUpdates: { docRef: any; currentStock: StockItem; vocItem: VocItem; collectionName: string }[] = [];
      
      // Find matching stock items for each VOC item
      for (const vocItem of vocItems) {
        // Skip FOC items as they don't affect stock
        if (vocItem.isFOC) {
          console.log(`⏭️ Skipping FOC item: ${vocItem.name}`);
          continue;
        }

        console.log(`🔍 Finding stock for item: ${vocItem.name} (ID: ${vocItem.id})`);
        
        const matchingStock = await findMatchingStockItem(vocItem);
        
        if (!matchingStock) {
          console.warn(`⚠️ No matching stock found for ${vocItem.name}`);
          // Don't throw error for missing stock, just log warning
          continue;
        }

        const collectionName = getCollectionName(vocItem.type);
        const stockDocRef = doc(db, collectionName, matchingStock.id);
        const stockDoc = await transaction.get(stockDocRef);
        
        if (!stockDoc.exists()) {
          console.warn(`⚠️ Stock document not found for ${vocItem.name}`);
          continue;
        }
        
        const currentStock = stockDoc.data() as StockItem;
        
        // Calculate quantities correctly: total quantity already includes sold + error
        // @ts-ignore
        const errorQty = vocItem.errorQuantity || vocItem.errorQty || 0;
        const totalQty = vocItem.quantity; // This is the total quantity (sold + error)
        const soldQty = totalQty - errorQty; // Actual sold quantity (excluding errors)
        const totalQtyToReduce = totalQty; // Total to reduce from inventory
        
        // Check if we have enough stock
        const availableQty = currentStock.remainingQty || currentStock.qty || 0;
        if (availableQty < totalQtyToReduce) {
          console.warn(`⚠️ Insufficient stock for ${vocItem.name}. Available: ${availableQty}, Required: ${totalQtyToReduce}`);
          // Don't throw error, just log warning and continue
          continue;
        }
        
        stockUpdates.push({
          docRef: stockDocRef,
          currentStock,
          vocItem,
          collectionName,
          soldQty,
          errorQty
        });
      }

      // Update all stock items
      for (const { docRef, currentStock, vocItem, collectionName, soldQty, errorQty } of stockUpdates) {
        console.log(`📝 Updating stock for ${vocItem.name} in ${collectionName}`);
        
        const currentQty = currentStock.remainingQty || currentStock.qty || 0;
        const currentSoldQty = currentStock.soldQty || 0;
        
        const newSoldQty = currentSoldQty + soldQty; // Only add actual sold quantity, not error quantity
        const newRemainingQty = Math.max(0, currentQty - (soldQty + errorQty)); // Reduce by total quantity (sold + error)
        
        const currentErrorQty = currentStock.errorQty || 0;
        const newErrorQty = currentErrorQty + errorQty;
        
        const updateData: any = {
          soldQty: newSoldQty,
          errorQty: newErrorQty, // Track error quantities separately
          lastUpdated: new Date().toISOString()
        };

        // Update remaining quantity based on collection structure
        if (collectionName === 'lenses') {
          updateData.qty = newRemainingQty;
          updateData.remainingQty = newRemainingQty;
          
          // Handle bifocal lens eye-specific quantities
          if (vocItem.isBifocal && vocItem.details?.rightQty !== undefined && vocItem.details?.leftQty !== undefined) {
            const currentRightQty = currentStock.rightQty || 0;
            const currentLeftQty = currentStock.leftQty || 0;
            const currentRightSoldQty = currentStock.rightSoldQty || 0;
            const currentLeftSoldQty = currentStock.leftSoldQty || 0;
            const currentRightErrorQty = currentStock.rightErrorQty || 0;
            const currentLeftErrorQty = currentStock.leftErrorQty || 0;
            
            // Get right and left quantities from VOC item
            const rightTotalQty = vocItem.details.rightQty || 0;
            const leftTotalQty = vocItem.details.leftQty || 0;
            const rightErrorQty = vocItem.details.rightErrorQty || 0;
            const leftErrorQty = vocItem.details.leftErrorQty || 0;
            const rightSoldQty = rightTotalQty - rightErrorQty;
            const leftSoldQty = leftTotalQty - leftErrorQty;
            
            updateData.rightQty = Math.max(0, currentRightQty - rightTotalQty);
            updateData.leftQty = Math.max(0, currentLeftQty - leftTotalQty);
            updateData.rightSoldQty = currentRightSoldQty + rightSoldQty; // Only actual sold quantity
            updateData.leftSoldQty = currentLeftSoldQty + leftSoldQty; // Only actual sold quantity
            updateData.rightErrorQty = currentRightErrorQty + rightErrorQty; // Track right errors
            updateData.leftErrorQty = currentLeftErrorQty + leftErrorQty; // Track left errors
          }
        } else {
          // For other collections (frames, accessories, etc.)
          updateData.qty = newRemainingQty;
          if (currentStock.remainingQty !== undefined) {
            updateData.remainingQty = newRemainingQty;
          }
        }
        
        transaction.update(docRef, updateData);
        
        console.log(`✅ Updated ${vocItem.name}: remaining ${currentQty} → ${newRemainingQty}, sold ${currentSoldQty} → ${newSoldQty}, errors ${currentErrorQty} → ${newErrorQty}`);
      }
    });
    
    console.log('✅ Stock updated successfully for VOC creation');
  } catch (error) {
    console.error('❌ Error updating stock:', error);
    throw error;
  }
};

/**
 * Revert stock when VOC is deleted - increases remaining stock and decreases sold quantity
 */
export const revertStockOnVocDelete = async (vocItems: VocItem[]): Promise<void> => {
  try {
    console.log('🔄 Starting stock revert for VOC deletion...');
    
    await runTransaction(db, async (transaction) => {
      const stockUpdates: { docRef: any; currentStock: StockItem; vocItem: VocItem; collectionName: string }[] = [];
      
      for (const vocItem of vocItems) {
        // Skip FOC items as they don't affect stock
        if (vocItem.isFOC) {
          console.log(`⏭️ Skipping FOC item during revert: ${vocItem.name}`);
          continue;
        }

        const matchingStock = await findMatchingStockItem(vocItem);
        
        if (!matchingStock) {
          console.warn(`⚠️ No matching stock found for ${vocItem.name} during revert`);
          continue;
        }

        const collectionName = getCollectionName(vocItem.type);
        const stockDocRef = doc(db, collectionName, matchingStock.id);
        const stockDoc = await transaction.get(stockDocRef);
        
        if (!stockDoc.exists()) {
          console.warn(`⚠️ Stock document not found for ${vocItem.name} during revert`);
          continue;
        }
        
        const currentStock = stockDoc.data() as StockItem;
        
        stockUpdates.push({
          docRef: stockDocRef,
          currentStock,
          vocItem,
          collectionName
        });
      }

      // Update all stock items
      for (const { docRef, currentStock, vocItem, collectionName } of stockUpdates) {
        console.log(`📝 Reverting stock for ${vocItem.name} in ${collectionName}`);
        
        const currentQty = currentStock.remainingQty || currentStock.qty || 0;
        const currentSoldQty = currentStock.soldQty || 0;
        const currentErrorQty = currentStock.errorQty || 0;
        
        // Calculate quantities correctly for revert
        // @ts-ignore
        const errorQty = vocItem.errorQuantity || vocItem.errorQty || 0;
        const totalQty = vocItem.quantity; // Total quantity (sold + error)
        const soldQty = totalQty - errorQty; // Actual sold quantity
        
        const newSoldQty = Math.max(0, currentSoldQty - soldQty); // Revert only actual sold quantity
        const newErrorQty = Math.max(0, currentErrorQty - errorQty); // Revert error quantity
        const newRemainingQty = currentQty + totalQty; // Add back total quantity
        
        const updateData: any = {
          soldQty: newSoldQty,
          errorQty: newErrorQty,
          lastUpdated: new Date().toISOString()
        };

        // Update remaining quantity based on collection structure
        if (collectionName === 'lenses') {
          updateData.qty = newRemainingQty;
          updateData.remainingQty = newRemainingQty;
          
          // Handle bifocal lens eye-specific quantities
          if (vocItem.isBifocal && vocItem.details?.rightQty !== undefined && vocItem.details?.leftQty !== undefined) {
            const currentRightQty = currentStock.rightQty || 0;
            const currentLeftQty = currentStock.leftQty || 0;
            const currentRightSoldQty = currentStock.rightSoldQty || 0;
            const currentLeftSoldQty = currentStock.leftSoldQty || 0;
            const currentRightErrorQty = currentStock.rightErrorQty || 0;
            const currentLeftErrorQty = currentStock.leftErrorQty || 0;
            
            // Get right and left quantities from VOC item
            const rightTotalQty = vocItem.details.rightQty || 0;
            const leftTotalQty = vocItem.details.leftQty || 0;
            const rightErrorQty = vocItem.details.rightErrorQty || 0;
            const leftErrorQty = vocItem.details.leftErrorQty || 0;
            const rightSoldQty = rightTotalQty - rightErrorQty;
            const leftSoldQty = leftTotalQty - leftErrorQty;
            
            updateData.rightQty = currentRightQty + rightTotalQty; // Add back total quantities
            updateData.leftQty = currentLeftQty + leftTotalQty;
            updateData.rightSoldQty = Math.max(0, currentRightSoldQty - rightSoldQty); // Revert only sold quantities
            updateData.leftSoldQty = Math.max(0, currentLeftSoldQty - leftSoldQty);
            updateData.rightErrorQty = Math.max(0, currentRightErrorQty - rightErrorQty); // Revert error quantities
            updateData.leftErrorQty = Math.max(0, currentLeftErrorQty - leftErrorQty);
          }
        } else {
          // For other collections
          updateData.qty = newRemainingQty;
          if (currentStock.remainingQty !== undefined) {
            updateData.remainingQty = newRemainingQty;
          }
        }
        
        transaction.update(docRef, updateData);
        
        console.log(`✅ Reverted ${vocItem.name}: remaining ${currentQty} → ${newRemainingQty}, sold ${currentSoldQty} → ${newSoldQty}, errors ${currentErrorQty} → ${newErrorQty}`);
      }
    });
    
    console.log('✅ Stock reverted successfully for VOC deletion');
  } catch (error) {
    console.error('❌ Error reverting stock:', error);
    throw error;
  }
};

/**
 * Create VOC and update stock
 */
export const createVocWithStockUpdate = async (vocData: Omit<VocData, 'id'>): Promise<string> => {
  try {
    console.log('🚀 Creating VOC with stock update...');
    
    // First validate stock availability
    const validation = await validateStockAvailability(vocData.items);
    if (!validation.isValid) {
      console.error('❌ Stock validation failed:', validation.errors);
      throw new Error(`Stock validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Create VOC document
    const vocRef = await addDoc(collection(db, 'vouchers'), {
      ...vocData,
      createdAt: new Date().toISOString()
    });
    
    console.log('✅ VOC document created with ID:', vocRef.id);
    
    // Update stock
    await updateStockOnVocCreate(vocData.items);
    
    console.log('✅ VOC creation with stock update completed successfully');
    return vocRef.id;
  } catch (error) {
    console.error('❌ Error creating VOC with stock update:', error);
    throw error;
  }
};

/**
 * Validate stock availability before creating VOC
 */
export const validateStockAvailability = async (vocItems: VocItem[]): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = [];
  
  try {
    console.log('🔍 Validating stock availability for', vocItems.length, 'items...');
    
    for (const vocItem of vocItems) {
      // Skip FOC items as they don't affect stock
      if (vocItem.isFOC) {
        console.log(`⏭️ Skipping FOC item validation: ${vocItem.name}`);
        continue;
      }

      console.log(`🔍 Validating stock for: ${vocItem.name} (quantity: ${vocItem.quantity})`);
      
      const matchingStock = await findMatchingStockItem(vocItem);
      
      if (!matchingStock) {
        const error = `No matching stock found for "${vocItem.name}"`;
        console.warn(`⚠️ ${error}`);
        errors.push(error);
        continue;
      }
      
      const availableQty = matchingStock.remainingQty || matchingStock.qty || 0;
      if (availableQty < vocItem.quantity) {
        const error = `Insufficient stock for "${vocItem.name}". Available: ${availableQty}, Required: ${vocItem.quantity}`;
        console.warn(`⚠️ ${error}`);
        errors.push(error);
      } else {
        console.log(`✅ Stock validation passed for ${vocItem.name}: ${availableQty} available, ${vocItem.quantity} required`);
      }
    }
  } catch (error) {
    const errorMsg = 'Error validating stock availability';
    console.error('❌', errorMsg, error);
    errors.push(errorMsg);
  }
  
  const isValid = errors.length === 0;
  console.log(`${isValid ? '✅' : '❌'} Stock validation ${isValid ? 'passed' : 'failed'}${errors.length > 0 ? ` with ${errors.length} errors` : ''}`);
  
  return {
    isValid,
    errors
  };
};