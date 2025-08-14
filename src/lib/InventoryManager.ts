import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VocItem } from '../types/voc';

export interface InventoryUpdateResult {
  success: boolean;
  message: string;
  updatedItems: any[];
  errors: string[];
}

/**
 * Enhanced inventory management for VOC items with error tracking
 */
export async function updateInventoryForVoc(vocItems: VocItem[], vocNumber: string): Promise<InventoryUpdateResult> {
  console.log('🔄 Starting inventory update for VOC:', vocNumber);
  
  const updatedItems: any[] = [];
  const errors: string[] = [];
  
  try {
    for (const item of vocItems) {
      console.log(`📦 Processing item: ${item.name} (${item.code})`);
      
      // Calculate sold and error quantities
      const errorQuantity = item.hasError ? (item.errorQuantity || 0) : 0;
      const soldQuantity = item.quantity - errorQuantity;
      
      console.log(`📊 Quantities - Total: ${item.quantity}, Sold: ${soldQuantity}, Error: ${errorQuantity}`);
      
      if (item.type === 'Lens') {
        const lensResult = await updateLensInventory(item, soldQuantity, errorQuantity, vocNumber);
        if (lensResult.success) {
          updatedItems.push(lensResult.updatedItem);
        } else {
          errors.push(`${item.name}: ${lensResult.message}`);
        }
      } else {
        // Handle frames and accessories
        const frameResult = await updateFrameInventory(item, soldQuantity, errorQuantity, vocNumber);
        if (frameResult.success) {
          updatedItems.push(frameResult.updatedItem);
        } else {
          errors.push(`${item.name}: ${frameResult.message}`);
        }
      }
    }
    
    // Log the VOC transaction
    await logVocTransaction(vocItems, vocNumber);
    
    const result: InventoryUpdateResult = {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Successfully updated inventory for ${updatedItems.length} items`
        : `Updated ${updatedItems.length} items with ${errors.length} errors`,
      updatedItems,
      errors
    };
    
    console.log('✅ Inventory update completed:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Inventory update failed:', error);
    return {
      success: false,
      message: 'Inventory update failed due to system error',
      updatedItems: [],
      errors: [error.message]
    };
  }
}

/**
 * Update lens inventory with enhanced category matching
 */
async function updateLensInventory(item: VocItem, soldQty: number, errorQty: number, vocNumber: string) {
  try {
    console.log(`🔍 Finding lens inventory for: ${item.code}`);
    
    // Enhanced category matching for BB lenses
    const searchCategories = getSearchCategories(item.category);
    console.log(`🎯 Search categories:`, searchCategories);
    
    let lensDoc = null;
    
    // Try to find exact match first
    for (const category of searchCategories) {
      const lensQuery = query(
        collection(db, 'lenses'),
        where('code', '==', item.code),
        where('category', '==', category),
        where('store', '==', item.store || 'win')
      );
      
      const querySnapshot = await getDocs(lensQuery);
      if (!querySnapshot.empty) {
        lensDoc = querySnapshot.docs[0];
        console.log(`✅ Found lens with category: ${category}`);
        break;
      }
    }
    
    if (!lensDoc) {
      // Fallback: search by code only
      const fallbackQuery = query(
        collection(db, 'lenses'),
        where('code', '==', item.code),
        where('store', '==', item.store || 'win')
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      if (!fallbackSnapshot.empty) {
        lensDoc = fallbackSnapshot.docs[0];
        console.log(`⚠️ Found lens with fallback search`);
      }
    }
    
    if (!lensDoc) {
      return {
        success: false,
        message: `Lens not found in inventory: ${item.code}`,
        updatedItem: null
      };
    }
    
    const lensData = lensDoc.data();
    console.log(`📋 Current lens data:`, {
      qty: lensData.qty,
      soldQty: lensData.soldQty || 0,
      errorQty: lensData.errorQty || 0
    });
    
    // Calculate new quantities
    const newQty = Math.max(0, lensData.qty - soldQty - errorQty);
    const newSoldQty = (lensData.soldQty || 0) + soldQty;
    const newErrorQty = (lensData.errorQty || 0) + errorQty;
    
    // Handle Flattop bifocal lenses with individual eye quantities
    let updateData: any = {
      qty: newQty,
      soldQty: newSoldQty,
      errorQty: newErrorQty,
      lastUpdated: serverTimestamp(),
      lastVocNumber: vocNumber
    };
    
    if (item.bifocalType === 'Flattop' && item.rightQty !== undefined && item.leftQty !== undefined) {
      const rightSoldQty = item.hasError ? (item.rightQty - (item.errorQuantity || 0) / 2) : item.rightQty;
      const leftSoldQty = item.hasError ? (item.leftQty - (item.errorQuantity || 0) / 2) : item.leftQty;
      const rightErrorQty = item.hasError ? (item.errorQuantity || 0) / 2 : 0;
      const leftErrorQty = item.hasError ? (item.errorQuantity || 0) / 2 : 0;
      
      updateData = {
        ...updateData,
        rightQty: Math.max(0, (lensData.rightQty || 0) - rightSoldQty - rightErrorQty),
        leftQty: Math.max(0, (lensData.leftQty || 0) - leftSoldQty - leftErrorQty),
        rightSoldQty: (lensData.rightSoldQty || 0) + rightSoldQty,
        leftSoldQty: (lensData.leftSoldQty || 0) + leftSoldQty,
        rightErrorQty: (lensData.rightErrorQty || 0) + rightErrorQty,
        leftErrorQty: (lensData.leftErrorQty || 0) + leftErrorQty,
      };
    }
    
    // Update the lens document
    await updateDoc(doc(db, 'lenses', lensDoc.id), updateData);
    
    console.log(`✅ Updated lens inventory:`, {
      code: item.code,
      oldQty: lensData.qty,
      newQty: newQty,
      soldQty: newSoldQty,
      errorQty: newErrorQty
    });
    
    // Log error if present
    if (item.hasError && errorQty > 0) {
      await logErrorItem(item, lensDoc.id, vocNumber);
    }
    
    return {
      success: true,
      message: `Successfully updated lens inventory`,
      updatedItem: {
        ...lensData,
        id: lensDoc.id,
        ...updateData
      }
    };
    
  } catch (error) {
    console.error(`❌ Error updating lens inventory for ${item.code}:`, error);
    return {
      success: false,
      message: `Failed to update lens inventory: ${error.message}`,
      updatedItem: null
    };
  }
}

/**
 * Update frame/accessory inventory
 */
async function updateFrameInventory(item: VocItem, soldQty: number, errorQty: number, vocNumber: string) {
  try {
    console.log(`🔍 Finding frame/accessory inventory for: ${item.code}`);
    
    const collectionName = item.type === 'Frame' ? 'frames' : 'accessories';
    
    const itemQuery = query(
      collection(db, collectionName),
      where('code', '==', item.code),
      where('store', '==', item.store || 'win')
    );
    
    const querySnapshot = await getDocs(itemQuery);
    
    if (querySnapshot.empty) {
      return {
        success: false,
        message: `${item.type} not found in inventory: ${item.code}`,
        updatedItem: null
      };
    }
    
    const itemDoc = querySnapshot.docs[0];
    const itemData = itemDoc.data();
    
    // Calculate new quantities
    const newQty = Math.max(0, itemData.qty - soldQty - errorQty);
    const newSoldQty = (itemData.soldQty || 0) + soldQty;
    const newErrorQty = (itemData.errorQty || 0) + errorQty;
    
    const updateData = {
      qty: newQty,
      soldQty: newSoldQty,
      errorQty: newErrorQty,
      lastUpdated: serverTimestamp(),
      lastVocNumber: vocNumber
    };
    
    // Update the document
    await updateDoc(doc(db, collectionName, itemDoc.id), updateData);
    
    console.log(`✅ Updated ${item.type} inventory:`, {
      code: item.code,
      oldQty: itemData.qty,
      newQty: newQty,
      soldQty: newSoldQty,
      errorQty: newErrorQty
    });
    
    // Log error if present
    if (item.hasError && errorQty > 0) {
      await logErrorItem(item, itemDoc.id, vocNumber);
    }
    
    return {
      success: true,
      message: `Successfully updated ${item.type} inventory`,
      updatedItem: {
        ...itemData,
        id: itemDoc.id,
        ...updateData
      }
    };
    
  } catch (error) {
    console.error(`❌ Error updating ${item.type} inventory for ${item.code}:`, error);
    return {
      success: false,
      message: `Failed to update ${item.type} inventory: ${error.message}`,
      updatedItem: null
    };
  }
}

/**
 * Get search categories for enhanced BB lens matching
 */
function getSearchCategories(originalCategory: string): string[] {
  const category = originalCategory.toLowerCase();
  
  // Enhanced BB category mapping
  const categoryMappings: { [key: string]: string[] } = {
    'bb 1.56': ['bb 1.56', 'bb1.56', 'bb156', 'bb_1.56', 'bb-1.56'],
    'bb 1.61': ['bb 1.61', 'bb1.61', 'bb161', 'bb_1.61', 'bb-1.61'],
    'bb 1.67': ['bb 1.67', 'bb1.67', 'bb167', 'bb_1.67', 'bb-1.67'],
    'bbpg 1.56': ['bbpg 1.56', 'bbpg1.56', 'bbpg156', 'bbpg_1.56', 'bbpg-1.56'],
    'bbpg 1.61': ['bbpg 1.61', 'bbpg1.61', 'bbpg161', 'bbpg_1.61', 'bbpg-1.61'],
    
    // Other common categories
    'cr': ['cr', 'CR', 'cr39', 'CR39'],
    'mc': ['mc', 'MC', 'mineral', 'Mineral'],
    'pg': ['pg', 'PG', 'photogray', 'PhotoGray'],
    'anti flash': ['anti flash', 'antiflash', 'anti_flash', 'anti-flash'],
    'anti glare': ['anti glare', 'antiglare', 'anti_glare', 'anti-glare'],
    'photo pink': ['photo pink', 'photopink', 'photo_pink', 'photo-pink'],
    'photo blue': ['photo blue', 'photoblue', 'photo_blue', 'photo-blue'],
    'photo purple': ['photo purple', 'photopurple', 'photo_purple', 'photo-purple'],
    'photo brown': ['photo brown', 'photobrown', 'photo_brown', 'photo-brown'],
  };
  
  // Return mapped categories or original category
  return categoryMappings[category] || [originalCategory, category, category.toUpperCase()];
}

/**
 * Log error items for tracking
 */
async function logErrorItem(item: VocItem, inventoryId: string, vocNumber: string) {
  try {
    await addDoc(collection(db, 'errorItems'), {
      vocNumber,
      inventoryId,
      itemCode: item.code,
      itemName: item.name,
      itemType: item.type,
      category: item.category,
      errorCategory: item.errorCategory,
      errorDescription: item.errorDescription,
      errorQuantity: item.errorQuantity,
      totalQuantity: item.quantity,
      store: item.store || 'win',
      createdAt: serverTimestamp(),
    });
    
    console.log(`📝 Logged error item: ${item.code}`);
  } catch (error) {
    console.error('❌ Error logging error item:', error);
  }
}

/**
 * Log VOC transaction for audit trail
 */
async function logVocTransaction(vocItems: VocItem[], vocNumber: string) {
  try {
    const transactionData = {
      vocNumber,
      itemCount: vocItems.length,
      totalQuantity: vocItems.reduce((sum, item) => sum + item.quantity, 0),
      soldQuantity: vocItems.reduce((sum, item) => {
        const errorQty = item.hasError ? (item.errorQuantity || 0) : 0;
        return sum + (item.quantity - errorQty);
      }, 0),
      errorQuantity: vocItems.reduce((sum, item) => {
        return sum + (item.hasError ? (item.errorQuantity || 0) : 0);
      }, 0),
      errorItemCount: vocItems.filter(item => item.hasError).length,
      items: vocItems.map(item => ({
        code: item.code,
        name: item.name,
        type: item.type,
        category: item.category,
        quantity: item.quantity,
        hasError: item.hasError,
        errorQuantity: item.errorQuantity,
        errorCategory: item.errorCategory
      })),
      createdAt: serverTimestamp(),
    };
    
    await addDoc(collection(db, 'vocTransactions'), transactionData);
    console.log(`📝 Logged VOC transaction: ${vocNumber}`);
  } catch (error) {
    console.error('❌ Error logging VOC transaction:', error);
  }
}