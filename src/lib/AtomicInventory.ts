// Enhanced Atomic Inventory Management System
import { 
  doc, 
  runTransaction, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  increment,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface VocItem {
  id: string;
  type: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
  name: string;
  quantity: number;
  price: number;
  isFOC?: boolean;
  store?: string;
  hasError?: boolean;
  errorQuantity?: number;
  errorQty?: number;
  soldQty?: number;
  details?: {
    rightQty?: number;
    leftQty?: number;
    rightErrorQty?: number;
    leftErrorQty?: number;
    [key: string]: any;
  };
}

export interface InventoryUpdateResult {
  success: boolean;
  message: string;
  updatedItems: string[];
  errors: string[];
  vocId?: string;
}

/**
 * CRITICAL: Atomic VOC creation with inventory validation and updates
 * This function ensures data consistency using Firestore transactions
 */
export async function createVOCWithAtomicInventoryUpdate(
  vocData: any,
  items: VocItem[]
): Promise<InventoryUpdateResult> {
  console.log('🚀 Starting atomic VOC creation with inventory updates');
  
  const result: InventoryUpdateResult = {
    success: false,
    message: '',
    updatedItems: [],
    errors: []
  };

  try {
    // Use Firestore transaction for atomic operations
    const vocId = await runTransaction(db, async (transaction) => {
      console.log('📋 Transaction started - validating inventory');
      
      // Step 1: Validate all items have sufficient stock
      const itemValidations = [];
      
      for (const item of items) {
        if (item.isFOC) continue; // Skip FOC items
        
        const collectionName = getCollectionName(item.type);
        const itemRef = doc(db, collectionName, item.id);
        const itemDoc = await transaction.get(itemRef);
        
        if (!itemDoc.exists()) {
          throw new Error(`Item ${item.name} no longer exists in inventory`);
        }
        
        const itemData = itemDoc.data();
        const currentQty = itemData.qty || 0;
        
        // For bifocal lenses, check individual eye quantities
        if (item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
          const currentRightQty = itemData.rightQty || 0;
          const currentLeftQty = itemData.leftQty || 0;
          
          if (currentRightQty < item.details.rightQty) {
            throw new Error(`Insufficient right eye quantity for ${item.name}. Available: ${currentRightQty}, Required: ${item.details.rightQty}`);
          }
          
          if (currentLeftQty < item.details.leftQty) {
            throw new Error(`Insufficient left eye quantity for ${item.name}. Available: ${currentLeftQty}, Required: ${item.details.leftQty}`);
          }
          
          if (currentQty < item.quantity) {
            throw new Error(`Insufficient total quantity for ${item.name}. Available: ${currentQty}, Required: ${item.quantity}`);
          }
        } else {
          // Regular quantity check
          if (currentQty < item.quantity) {
            throw new Error(`Insufficient quantity for ${item.name}. Available: ${currentQty}, Required: ${item.quantity}`);
          }
        }
        
        itemValidations.push({
          itemRef,
          item,
          currentData: itemData
        });
      }
      
      console.log('✅ All items validated - proceeding with updates');
      
      // Step 2: Create VOC document
      const vocRef = doc(collection(db, 'vouchers'));
      transaction.set(vocRef, {
        ...vocData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('📝 VOC document created');
      
      // Step 3: Update all inventory items atomically
      for (const validation of itemValidations) {
        const { itemRef, item } = validation;
        
        // Calculate error and sold quantities
        const errorQty = item.errorQuantity || item.errorQty || 0;
        const soldQty = item.quantity - errorQty;
        
        console.log(`📊 Processing ${item.name}: Total=${item.quantity}, Error=${errorQty}, Sold=${soldQty}`);
        
        if (item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
          // Handle bifocal lens updates with error quantities
          const rightErrorQty = item.details.rightErrorQty || 0;
          const leftErrorQty = item.details.leftErrorQty || 0;
          const rightSoldQty = (item.details.rightQty || 0) - rightErrorQty;
          const leftSoldQty = (item.details.leftQty || 0) - leftErrorQty;
          
          const updateData: any = {
            qty: increment(-item.quantity),
            rightQty: increment(-item.details.rightQty),
            leftQty: increment(-item.details.leftQty),
            soldQty: increment(soldQty), // Only actual sold quantity
            rightSoldQty: increment(rightSoldQty), // Only actual sold quantity for right eye
            leftSoldQty: increment(leftSoldQty), // Only actual sold quantity for left eye
            lastUpdated: serverTimestamp()
          };
          
          // Add error quantities if present
          if (errorQty > 0) {
            updateData.errorQty = increment(errorQty);
          }
          if (rightErrorQty > 0) {
            updateData.rightErrorQty = increment(rightErrorQty);
          }
          if (leftErrorQty > 0) {
            updateData.leftErrorQty = increment(leftErrorQty);
          }
          
          transaction.update(itemRef, updateData);
          
          result.updatedItems.push(`${item.name} (R:${item.details.rightQty}, L:${item.details.leftQty}, Errors: ${errorQty})`);
        } else {
          // Handle regular item updates with error quantities
          const updateData: any = {
            qty: increment(-item.quantity),
            soldQty: increment(soldQty), // Only actual sold quantity (excluding errors)
            lastUpdated: serverTimestamp()
          };
          
          // Add error quantity if present
          if (errorQty > 0) {
            updateData.errorQty = increment(errorQty);
          }
          
          transaction.update(itemRef, updateData);
          
          result.updatedItems.push(`${item.name} (${item.quantity} pieces, Errors: ${errorQty})`);
        }
      }
      
      console.log('📊 All inventory updates applied');
      
      return vocRef.id;
    });
    
    result.success = true;
    result.vocId = vocId;
    result.message = `VOC created successfully with atomic inventory updates`;
    
    console.log('✅ Transaction completed successfully');
    console.log('📋 Updated items:', result.updatedItems);
    
    return result;
    
  } catch (error) {
    console.error('❌ Transaction failed:', error);
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(result.message);
    
    return result;
  }
}

/**
 * CRITICAL: Atomic VOC deletion with inventory restoration
 */
export async function deleteVOCWithAtomicInventoryRestore(
  vocId: string,
  items: VocItem[]
): Promise<InventoryUpdateResult> {
  console.log('🔄 Starting atomic VOC deletion with inventory restoration');
  
  const result: InventoryUpdateResult = {
    success: false,
    message: '',
    updatedItems: [],
    errors: []
  };

  try {
    await runTransaction(db, async (transaction) => {
      console.log('📋 Transaction started - restoring inventory');
      
      // Step 1: Delete VOC document
      const vocRef = doc(db, 'vouchers', vocId);
      transaction.delete(vocRef);
      
      console.log('🗑️ VOC document marked for deletion');
      
      // Step 2: Restore inventory quantities
      for (const item of items) {
        if (item.isFOC) continue; // Skip FOC items
        
        const collectionName = getCollectionName(item.type);
        const itemRef = doc(db, collectionName, item.id);
        
        // Calculate error and sold quantities for restoration
        const errorQty = item.errorQuantity || item.errorQty || 0;
        const soldQty = item.quantity - errorQty;
        
        if (item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
          // Handle bifocal lens restoration with error quantities
          const rightErrorQty = item.details.rightErrorQty || 0;
          const leftErrorQty = item.details.leftErrorQty || 0;
          const rightSoldQty = (item.details.rightQty || 0) - rightErrorQty;
          const leftSoldQty = (item.details.leftQty || 0) - leftErrorQty;
          
          const updateData: any = {
            qty: increment(item.quantity),
            rightQty: increment(item.details.rightQty),
            leftQty: increment(item.details.leftQty),
            soldQty: increment(-soldQty), // Restore only actual sold quantity
            rightSoldQty: increment(-rightSoldQty), // Restore only actual sold quantity for right eye
            leftSoldQty: increment(-leftSoldQty), // Restore only actual sold quantity for left eye
            lastUpdated: serverTimestamp()
          };
          
          // Restore error quantities if present
          if (errorQty > 0) {
            updateData.errorQty = increment(-errorQty);
          }
          if (rightErrorQty > 0) {
            updateData.rightErrorQty = increment(-rightErrorQty);
          }
          if (leftErrorQty > 0) {
            updateData.leftErrorQty = increment(-leftErrorQty);
          }
          
          transaction.update(itemRef, updateData);
          
          result.updatedItems.push(`${item.name} (R:${item.details.rightQty}, L:${item.details.leftQty}, Errors: ${errorQty}) restored`);
        } else {
          // Handle regular item restoration with error quantities
          const updateData: any = {
            qty: increment(item.quantity),
            soldQty: increment(-soldQty), // Restore only actual sold quantity
            lastUpdated: serverTimestamp()
          };
          
          // Restore error quantity if present
          if (errorQty > 0) {
            updateData.errorQty = increment(-errorQty);
          }
          
          transaction.update(itemRef, updateData);
          
          result.updatedItems.push(`${item.name} (${item.quantity} pieces, Errors: ${errorQty}) restored`);
        }
      }
      
      console.log('📊 All inventory restorations applied');
    });
    
    result.success = true;
    result.message = `VOC deleted and inventory restored successfully`;
    
    console.log('✅ Deletion transaction completed successfully');
    
    return result;
    
  } catch (error) {
    console.error('❌ Deletion transaction failed:', error);
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(result.message);
    
    return result;
  }
}

/**
 * CRITICAL: Real-time inventory validation before VOC creation
 */
export async function validateInventoryBeforeVOC(items: VocItem[]): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  console.log('🔍 Validating inventory before VOC creation');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    for (const item of items) {
      if (item.isFOC) continue; // Skip FOC items
      
      const collectionName = getCollectionName(item.type);
      const itemRef = doc(db, collectionName, item.id);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        errors.push(`${item.name} no longer exists in inventory`);
        continue;
      }
      
      const itemData = itemDoc.data();
      const currentQty = itemData.qty || 0;
      
      // Check bifocal quantities
      if (item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
        const currentRightQty = itemData.rightQty || 0;
        const currentLeftQty = itemData.leftQty || 0;
        
        if (currentRightQty < item.details.rightQty) {
          errors.push(`${item.name}: Insufficient right eye quantity (Available: ${currentRightQty}, Required: ${item.details.rightQty})`);
        }
        
        if (currentLeftQty < item.details.leftQty) {
          errors.push(`${item.name}: Insufficient left eye quantity (Available: ${currentLeftQty}, Required: ${item.details.leftQty})`);
        }
        
        if (currentQty < item.quantity) {
          errors.push(`${item.name}: Insufficient total quantity (Available: ${currentQty}, Required: ${item.quantity})`);
        }
        
        // Low stock warnings
        if (currentRightQty - item.details.rightQty <= 1) {
          warnings.push(`${item.name}: Right eye will have low stock after this sale`);
        }
        
        if (currentLeftQty - item.details.leftQty <= 1) {
          warnings.push(`${item.name}: Left eye will have low stock after this sale`);
        }
      } else {
        // Regular quantity check
        if (currentQty < item.quantity) {
          errors.push(`${item.name}: Insufficient quantity (Available: ${currentQty}, Required: ${item.quantity})`);
        }
        
        // Low stock warning
        if (currentQty - item.quantity <= 2) {
          warnings.push(`${item.name}: Will have low stock after this sale`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
    
  } catch (error) {
    console.error('❌ Error validating inventory:', error);
    return {
      isValid: false,
      errors: ['Failed to validate inventory. Please try again.'],
      warnings: []
    };
  }
}

/**
 * Helper function to get collection name by item type
 */
function getCollectionName(type: string): string {
  switch (type) {
    case 'Lens': return 'lenses';
    case 'Frame': return 'frames';
    case 'Accessories': return 'accessories';
    case 'Contact Lens': return 'contactLenses';
    default: return 'lenses';
  }
}

/**
 * CRITICAL: Batch inventory update for multiple operations
 */
export async function batchUpdateInventory(
  operations: Array<{
    itemId: string;
    itemType: string;
    quantityChange: number;
    rightQtyChange?: number;
    leftQtyChange?: number;
    errorQtyChange?: number;
    rightErrorQtyChange?: number;
    leftErrorQtyChange?: number;
  }>
): Promise<InventoryUpdateResult> {
  console.log('🔄 Starting batch inventory update');
  
  const result: InventoryUpdateResult = {
    success: false,
    message: '',
    updatedItems: [],
    errors: []
  };

  try {
    const batch = writeBatch(db);
    
    for (const operation of operations) {
      const collectionName = getCollectionName(operation.itemType);
      const itemRef = doc(db, collectionName, operation.itemId);
      
      const updateData: any = {
        qty: increment(operation.quantityChange),
        soldQty: increment(-operation.quantityChange),
        lastUpdated: serverTimestamp()
      };
      
      if (operation.rightQtyChange !== undefined) {
        updateData.rightQty = increment(operation.rightQtyChange);
        updateData.rightSoldQty = increment(-operation.rightQtyChange);
      }
      
      if (operation.leftQtyChange !== undefined) {
        updateData.leftQty = increment(operation.leftQtyChange);
        updateData.leftSoldQty = increment(-operation.leftQtyChange);
      }
      
      // Handle error quantity changes
      if (operation.errorQtyChange !== undefined) {
        updateData.errorQty = increment(operation.errorQtyChange);
      }
      
      if (operation.rightErrorQtyChange !== undefined) {
        updateData.rightErrorQty = increment(operation.rightErrorQtyChange);
      }
      
      if (operation.leftErrorQtyChange !== undefined) {
        updateData.leftErrorQty = increment(operation.leftErrorQtyChange);
      }
      
      batch.update(itemRef, updateData);
      result.updatedItems.push(`${operation.itemId} (${operation.quantityChange})`);
    }
    
    await batch.commit();
    
    result.success = true;
    result.message = 'Batch inventory update completed successfully';
    
    console.log('✅ Batch update completed');
    
    return result;
    
  } catch (error) {
    console.error('❌ Batch update failed:', error);
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Batch update failed';
    result.errors.push(result.message);
    
    return result;
  }
}