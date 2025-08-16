import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { VocItem } from '../type/Vocerror';

interface ILens {
  name: string;
  category: string;
  type: string;
  power: {
    sph: string;
    cyl: string;
    axis: string;
    add: string;
  };
}

interface LensStock {
  name: string;
  category: string;
  type: string;
  totalQty: number;
  soldQty: number;
  remainingQty: number;
}

/**
 * Calculate sold quantity from VOC item
 */
export const calculateSoldQuantity = (item: VocItem): number => {
  if (item.soldQuantity !== undefined) {
    return item.soldQuantity;
  }
  
  if (item.soldQty !== undefined) {
    return item.soldQty;
  }
  
  // If quantity is a whole number and no error, assume all sold
  if (item.quantity % 1 === 0 && !item.hasError && !item.errorQuantity && !item.errorQty) {
    return item.quantity;
  }
  
  // If quantity has decimals, calculate based on error status
  if (item.hasError || item.errorQuantity || item.errorQty) {
    const errorQuantity = calculateErrorQuantity(item);
    return Math.max(0, item.quantity - errorQuantity);
  }
  
  // Default: assume all quantity is sold
  return item.quantity;
};

/**
 * Calculate error quantity from VOC item
 */
export const calculateErrorQuantity = (item: VocItem): number => {
  // Check explicit error quantity fields first
  if (item.errorQuantity !== undefined) {
    return item.errorQuantity;
  }
  
  if (item.errorQty !== undefined) {
    return item.errorQty;
  }
  
  // If item is marked as having error but no explicit quantity
  if (item.hasError && (item.errorQuantity === undefined && item.errorQty === undefined)) {
    // For decimal quantities, assume the decimal part is error
    if (item.quantity % 1 !== 0) {
      return item.quantity % 1;
    }
    // For whole numbers with error flag, assume small error quantity
    return 0.5;
  }
  
  return 0;
};

/**
 * PRICING CALCULATIONS - Updated to handle error quantities properly
 */

/**
 * Calculate pricing breakdown for VOC items with proper error quantity handling
 */
export function calculateVOCPricing(items: VocItem[], globalDiscount: number = 0): {
  totalAmount: number;
  originalAmount: number;
  subtotal: number;
  totalDiscount: number;
  totalErrorDiscount: number;
  totalItemDiscounts: number;
  totalRevenue: number;
  itemBreakdown: Array<{
    id: string;
    name: string;
    quantity: number;
    soldQuantity: number;
    errorQuantity: number;
    unitPrice: number;
    subtotal: number;
    itemDiscount: number;
    errorDiscount: number;
    netAmount: number;
  }>;
} {
  let subtotal = 0;
  let originalAmount = 0;
  let totalDiscount = 0;
  let totalErrorDiscount = 0;
  let totalItemDiscounts = 0;
  let totalRevenue = 0;

  const itemBreakdown = items.map(item => {
    const errorQty = calculateErrorQuantity(item);
    const soldQty = calculateSoldQuantity(item);
    const unitPrice = item.price || 0;
    
    // Calculate base amounts
    const itemSubtotal = item.quantity * unitPrice;
    const itemDiscount = item.itemDiscount || 0;
    
    // Error items are completely excluded from pricing (no discount, just excluded)
    const errorDiscount = errorQty > 0 ? errorQty * unitPrice : 0; // Full price excluded for error items
    
    // Calculate net amount for this item
    let netAmount = 0;
    
    if (item.isFOC) {
      netAmount = 0; // FOC items contribute nothing to total
    } else {
      // Only charge for sold quantity, completely exclude error quantity from pricing
      const soldAmount = soldQty * unitPrice;
      netAmount = soldAmount - itemDiscount; // No charge for error items
    }

    // Ensure net amount isn't negative
    netAmount = Math.max(0, netAmount);
    
    // Accumulate totals
    subtotal += itemSubtotal;
    originalAmount += itemSubtotal;
    totalItemDiscounts += itemDiscount;
    totalErrorDiscount += errorDiscount;
    totalRevenue += netAmount;

    return {
      id: item.id || '',
      name: item.name,
      quantity: item.quantity,
      soldQuantity: soldQty,
      errorQuantity: errorQty,
      unitPrice,
      subtotal: itemSubtotal,
      itemDiscount,
      errorDiscount,
      netAmount
    };
  });

  // Apply global discount
  totalDiscount = totalItemDiscounts + totalErrorDiscount + globalDiscount;
  const totalAmount = Math.max(0, totalRevenue - globalDiscount);

  return {
    totalAmount,
    originalAmount,
    subtotal,
    totalDiscount,
    totalErrorDiscount,
    totalItemDiscounts,
    totalRevenue,
    itemBreakdown
  };
}

/**
 * INVENTORY MANAGEMENT
 */

/**
 * Enhanced inventory deduction - deduct both sold and error quantities
 */
export const calculateInventoryDeduction = (item: VocItem): {
  totalDeduction: number;
  soldDeduction: number;
  errorDeduction: number;
  remainingAfterDeduction: number;
} => {
  const soldQuantity = calculateSoldQuantity(item);
  const errorQuantity = calculateErrorQuantity(item);
  const totalDeduction = soldQuantity + errorQuantity;
  
  return {
    totalDeduction,
    soldDeduction: soldQuantity,
    errorDeduction: errorQuantity,
    remainingAfterDeduction: Math.max(0, item.quantity - totalDeduction)
  };
};

/**
 * Helper function to return items to inventory (used for calculations)
 */
export const returnItemsToInventory = (items: VocItem[]): {
  totalSoldQuantity: number;
  totalErrorQuantity: number;
  totalQuantity: number;
  itemsReturned: number;
} => {
  let totalSoldQuantity = 0;
  let totalErrorQuantity = 0;
  let itemsReturned = 0;

  items.forEach(item => {
    const soldQty = calculateSoldQuantity(item);
    const errorQty = calculateErrorQuantity(item);
    
    totalSoldQuantity += soldQty;
    totalErrorQuantity += errorQty;
    itemsReturned++;
  });

  return {
    totalSoldQuantity,
    totalErrorQuantity,
    totalQuantity: totalSoldQuantity + totalErrorQuantity,
    itemsReturned
  };
};

/**
 * Validation Functions
 */

/**
 * Validate VOC item quantities
 */
export const validateVOCQuantities = (item: VocItem): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (item.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  const soldQty = calculateSoldQuantity(item);
  const errorQty = calculateErrorQuantity(item);
  
  if (soldQty < 0) {
    errors.push('Sold quantity cannot be negative');
  }
  
  if (errorQty < 0) {
    errors.push('Error quantity cannot be negative');
  }
  
  if (soldQty + errorQty > item.quantity) {
    errors.push('Sum of sold and error quantities cannot exceed total quantity');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate all items in a VOC
 */
export const validateAllVOCItems = (items: VocItem[]): { isValid: boolean; errors: string[] } => {
  const allErrors: string[] = [];
  
  items.forEach((item, index) => {
    const validation = validateVOCQuantities(item);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        allErrors.push(`Item ${index + 1} (${item.name}): ${error}`);
      });
    }
  });
  
  return { isValid: allErrors.length === 0, errors: allErrors };
};

/**
 * General item validation function
 */
export const validateVOCItem = (item: VocItem): { isValid: boolean; message?: string } => {
  if (!item.name || item.name.trim() === '') {
    return { isValid: false, message: 'Item name is required' };
  }
  
  if (!item.type || item.type.trim() === '') {
    return { isValid: false, message: 'Item type is required' };
  }
  
  if (item.quantity <= 0) {
    return { isValid: false, message: 'Quantity must be greater than 0' };
  }
  
  const soldQty = calculateSoldQuantity(item);
  const errorQty = calculateErrorQuantity(item);
  
  if (soldQty + errorQty > item.quantity) {
    return { isValid: false, message: 'Sold + Error quantities cannot exceed total quantity' };
  }
  
  return { isValid: true };
};

/**
 * Calculate error rate for an item
 */
export const calculateErrorRate = (item: VocItem): number => {
  if (!item.quantity || item.quantity === 0) return 0;
  const errorQuantity = calculateErrorQuantity(item);
  return (errorQuantity / item.quantity) * 100;
};

/**
 * Calculate overall error rate for all items
 */
export const calculateOverallErrorRate = (items: VocItem[]): number => {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalErrorQuantity = items.reduce((sum, item) => sum + calculateErrorQuantity(item), 0);
  
  if (totalQuantity === 0) return 0;
  return (totalErrorQuantity / totalQuantity) * 100;
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  try {
    return new Intl.NumberFormat('my-MM', {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    return `${amount.toLocaleString()} MMK`;
  }
};

/**
 * Update lens stock for VOC creation
 */
export const updateLensStockForVOC = async (lens: ILens) => {
  if (!lens.name || !lens.category || !lens.type) {
    console.error("Lens details are incomplete, skipping stock update.", lens);
    return;
  }
  try {
    const q = query(
      collection(db, "lenses"),
      where("name", "==", lens.name),
      where("category", "==", lens.category),
      where("type", "==", lens.type),
      where("power.sph", "==", lens.power.sph),
      where("power.cyl", "==", lens.power.cyl),
      where("power.axis", "==", lens.power.axis),
      where("power.add", "==", lens.power.add)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn("No matching lens found in inventory for stock update", lens);
      return;
    }

    querySnapshot.forEach(async (lensDoc) => {
      const lensData = lensDoc.data() as LensStock;
      const newSoldQty = (lensData.soldQty || 0) + 1;
      const newRemainingQty = lensData.totalQty - newSoldQty;

      await updateDoc(doc(db, "lenses", lensDoc.id), {
        soldQty: newSoldQty,
        remainingQty: newRemainingQty,
      });
      console.log(`Stock updated for lens: ${lensData.name}`);
    });
  } catch (error) {
    console.error("Error updating lens stock:", error);
  }
};

/**
 * Return VOC items to inventory - handles both regular quantities and flattop lens right/left quantities
 */
export const returnVOCItemsToInventory = async (items: VocItem[]): Promise<{
  success: boolean;
  message: string;
  returnedItems: {
    totalItems: number;
    soldItems: number;
    errorItems: number;
  };
}> => {
  console.log('🔄 Starting VOC items return to inventory:', items);
  
  try {
    let totalReturned = 0;
    let soldReturned = 0;
    let errorReturned = 0;
    
    for (const item of items) {
      console.log(`🔄 Processing item: ${item.name} (${item.type})`);
      
      // Calculate quantities to return
      const soldQty = calculateSoldQuantity(item);
      const errorQty = calculateErrorQuantity(item);
      const totalQty = soldQty + errorQty;
      
      console.log(`📊 Quantities - Total: ${totalQty}, Sold: ${soldQty}, Error: ${errorQty}`);
      
      if (totalQty === 0) {
        console.log('⏭️ Skipping item with zero quantity');
        continue;
      }
      
      // Handle lens items (including flattop with right/left quantities)
      if (item.type === 'Lens') {
        await returnLensToInventory(item, soldQty, errorQty);
      } 
      // Handle other item types
      else {
        await returnGenericItemToInventory(item, soldQty, errorQty);
      }
      
      totalReturned += totalQty;
      soldReturned += soldQty;
      errorReturned += errorQty;
    }
    
    console.log(`✅ VOC inventory return completed: ${totalReturned} items returned`);
    
    return {
      success: true,
      message: `Successfully returned ${totalReturned} items to inventory`,
      returnedItems: {
        totalItems: totalReturned,
        soldItems: soldReturned,
        errorItems: errorReturned
      }
    };
    
  } catch (error) {
    console.error('❌ Error returning VOC items to inventory:', error);
    return {
      success: false,
      message: `Failed to return items to inventory: ${error}`,
      returnedItems: {
        totalItems: 0,
        soldItems: 0,
        errorItems: 0
      }
    };
  }
};

/**
 * Return lens items to inventory - handles flattop bifocal lenses with right/left quantities
 */
const returnLensToInventory = async (item: VocItem, soldQty: number, errorQty: number): Promise<void> => {
  console.log(`👓 Returning lens to inventory: ${item.name}`);
  
  // Check if this is a flattop/bifocal lens with right/left quantities
  const hasRightLeft = item.details?.rightQty !== undefined || item.details?.leftQty !== undefined;
  
  if (hasRightLeft) {
    console.log(`🔧 Processing flattop/bifocal lens with right/left quantities`);
    console.log(`📊 RightQty: ${item.details?.rightQty}, LeftQty: ${item.details?.leftQty}`);
    
    await returnFlattopLensToInventory(item, soldQty, errorQty);
  } else {
    console.log(`🔧 Processing regular lens`);
    await returnRegularLensToInventory(item, soldQty, errorQty);
  }
};

/**
 * Return flattop/bifocal lens with right/left quantities to inventory
 */
const returnFlattopLensToInventory = async (item: VocItem, soldQty: number, errorQty: number): Promise<void> => {
  try {
    console.log(`🔍 Searching for flattop lens in inventory:`, {
      name: item.name,
      code: item.code,
      category: item.category,
      details: item.details
    });
    
    let querySnapshot;
    
    // Strategy 1: Try matching by code first (most precise)
    if (item.code) {
      console.log(`🔍 Step 1: Searching by code: ${item.code}`);
      const codeQuery = query(
        collection(db, 'lenses'),
        where('code', '==', item.code)
      );
      querySnapshot = await getDocs(codeQuery);
      console.log(`📊 Code search found: ${querySnapshot.docs.length} results`);
    }
    
    // Strategy 2: If no results, try matching by category and type
    if (!querySnapshot || querySnapshot.empty) {
      console.log(`🔍 Step 2: Searching by category and type`);
      const categoryQuery = query(
        collection(db, 'lenses'),
        where('category', '==', item.category || ''),
        where('type', '==', 'Bifocal')
      );
      querySnapshot = await getDocs(categoryQuery);
      console.log(`📊 Category search found: ${querySnapshot.docs.length} results`);
      
      // Filter by optical power if available
      if (querySnapshot && !querySnapshot.empty && item.details) {
        console.log(`🔍 Step 2a: Filtering by optical power`);
        const filteredDocs = querySnapshot.docs.filter(doc => {
          const data = doc.data();
          return (
            (!item.details.sph || data.sph === item.details.sph) &&
            (!item.details.cyl || data.cyl === item.details.cyl) &&
            (!item.details.axis || data.axis === item.details.axis) &&
            (!item.details.addition || data.addition === item.details.addition)
          );
        });
        
        if (filteredDocs.length > 0) {
          querySnapshot = { docs: filteredDocs, empty: false } as any;
          console.log(`✅ Optical power filtering found: ${filteredDocs.length} matches`);
        }
      }
    }
    
    // Strategy 3: If still no results, try broader category search
    if (!querySnapshot || querySnapshot.empty) {
      console.log(`🔍 Step 3: Trying broader category search`);
      if (item.category && item.category.includes('flattop')) {
        const broadQuery = query(
          collection(db, 'lenses'),
          where('category', '==', item.category)
        );
        querySnapshot = await getDocs(broadQuery);
        console.log(`📊 Broad category search found: ${querySnapshot.docs.length} results`);
      }
    }
    
    // Strategy 4: Last resort - search by name pattern
    if (!querySnapshot || querySnapshot.empty) {
      console.log(`🔍 Step 4: Trying name-based search`);
      const allLensesQuery = query(collection(db, 'lenses'));
      const allLenses = await getDocs(allLensesQuery);
      
      const nameParts = item.name.toLowerCase().split(' ');
      const matchingDocs = allLenses.docs.filter(doc => {
        const data = doc.data();
        const lensName = (data.name || data.code || '').toLowerCase();
        return nameParts.some(part => part.length > 3 && lensName.includes(part));
      });
      
      if (matchingDocs.length > 0) {
        querySnapshot = { docs: matchingDocs, empty: false } as any;
        console.log(`✅ Name pattern search found: ${matchingDocs.length} matches`);
      }
    }
    
    if (!querySnapshot || querySnapshot.empty) {
      console.warn(`⚠️ No matching flattop lens found in inventory after all search strategies for: ${item.name}`);
      console.warn(`📝 Search criteria used:`, {
        code: item.code,
        name: item.name,
        category: item.category,
        type: 'Bifocal',
        optical: item.details
      });
      return;
    }
    
    // Process the first matching lens
    const lensDoc = querySnapshot.docs[0];
    const lensData = lensDoc.data();
    
    console.log(`📦 Found matching flattop lens in inventory:`, {
      id: lensDoc.id,
      code: lensData.code,
      name: lensData.name,
      category: lensData.category,
      currentRightQty: lensData.rightQty || 0,
      currentLeftQty: lensData.leftQty || 0,
      currentTotalQty: lensData.qty || 0
    });
    
    // Calculate quantities to return - use exact quantities from VOC
    const rightQtyToReturn = item.details?.rightQty || 0;
    const leftQtyToReturn = item.details?.leftQty || 0;
    
    console.log(`🔄 Returning exact quantities from VOC:`, {
      rightQtyToReturn,
      leftQtyToReturn,
      totalToReturn: rightQtyToReturn + leftQtyToReturn
    });
    
    // Update the lens inventory with returned quantities
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };
    
    // Return right quantity
    if (rightQtyToReturn > 0) {
      updateData.rightQty = (lensData.rightQty || 0) + rightQtyToReturn;
      console.log(`➡️ Right qty: ${lensData.rightQty || 0} + ${rightQtyToReturn} = ${updateData.rightQty}`);
    }
    
    // Return left quantity  
    if (leftQtyToReturn > 0) {
      updateData.leftQty = (lensData.leftQty || 0) + leftQtyToReturn;
      console.log(`⬅️ Left qty: ${lensData.leftQty || 0} + ${leftQtyToReturn} = ${updateData.leftQty}`);
    }
    
    // Update total quantity
    const totalReturnQty = rightQtyToReturn + leftQtyToReturn;
    if (totalReturnQty > 0) {
      updateData.qty = (lensData.qty || 0) + totalReturnQty;
      console.log(`🔢 Total qty: ${lensData.qty || 0} + ${totalReturnQty} = ${updateData.qty}`);
    }
    
    // Reduce sold quantity if it was marked as sold
    if (lensData.soldQty && soldQty > 0) {
      updateData.soldQty = Math.max(0, (lensData.soldQty || 0) - soldQty);
      console.log(`📉 Sold qty: ${lensData.soldQty || 0} - ${soldQty} = ${updateData.soldQty}`);
    }
    
    // Reduce right/left sold quantities if they exist
    if (lensData.rightSoldQty && rightQtyToReturn > 0) {
      updateData.rightSoldQty = Math.max(0, (lensData.rightSoldQty || 0) - rightQtyToReturn);
      console.log(`📉 Right sold qty: ${lensData.rightSoldQty || 0} - ${rightQtyToReturn} = ${updateData.rightSoldQty}`);
    }
    
    if (lensData.leftSoldQty && leftQtyToReturn > 0) {
      updateData.leftSoldQty = Math.max(0, (lensData.leftSoldQty || 0) - leftQtyToReturn);
      console.log(`📉 Left sold qty: ${lensData.leftSoldQty || 0} - ${leftQtyToReturn} = ${updateData.leftSoldQty}`);
    }
    
    console.log(`🔧 Updating lens document with:`, updateData);
    await updateDoc(doc(db, 'lenses', lensDoc.id), updateData);
    
    console.log(`✅ Flattop lens inventory updated successfully! Lens: ${lensData.code || lensData.name}`);
    
  } catch (error) {
    console.error(`❌ Error returning flattop lens to inventory:`, error);
    throw error;
  }
};

/**
 * Return regular lens to inventory
 */
const returnRegularLensToInventory = async (item: VocItem, soldQty: number, errorQty: number): Promise<void> => {
  try {
    console.log(`🔍 Searching for regular lens in inventory:`, {
      name: item.name,
      code: item.code,
      category: item.category,
      type: item.type
    });
    
    let querySnapshot;
    
    // Strategy 1: Try matching by code first
    if (item.code) {
      console.log(`🔍 Step 1: Searching by code: ${item.code}`);
      const codeQuery = query(
        collection(db, 'lenses'),
        where('code', '==', item.code)
      );
      querySnapshot = await getDocs(codeQuery);
      console.log(`📊 Code search found: ${querySnapshot.docs.length} results`);
    }
    
    // Strategy 2: If no results, try by code with category
    if (!querySnapshot || querySnapshot.empty) {
      console.log(`🔍 Step 2: Searching by code and category`);
      if (item.code && item.category) {
        const codeAndCategoryQuery = query(
          collection(db, 'lenses'),
          where('code', '==', item.code),
          where('category', '==', item.category)
        );
        querySnapshot = await getDocs(codeAndCategoryQuery);
        console.log(`📊 Code + Category search found: ${querySnapshot.docs.length} results`);
      }
    }
    
    // Strategy 3: Try matching by name
    if (!querySnapshot || querySnapshot.empty) {
      console.log(`🔍 Step 3: Searching by name: ${item.name}`);
      const nameQuery = query(
        collection(db, 'lenses'),
        where('name', '==', item.name)
      );
      querySnapshot = await getDocs(nameQuery);
      console.log(`📊 Name search found: ${querySnapshot.docs.length} results`);
    }
    
    // Strategy 4: Try matching by category and type
    if (!querySnapshot || querySnapshot.empty) {
      console.log(`🔍 Step 4: Searching by category and type`);
      if (item.category && item.type) {
        const categoryTypeQuery = query(
          collection(db, 'lenses'),
          where('category', '==', item.category),
          where('type', '==', item.type)
        );
        querySnapshot = await getDocs(categoryTypeQuery);
        console.log(`📊 Category + Type search found: ${querySnapshot.docs.length} results`);
        
        // Further filter by optical specs if available
        if (querySnapshot && !querySnapshot.empty && item.details) {
          console.log(`🔍 Step 4a: Filtering by optical specs`);
          const filteredDocs = querySnapshot.docs.filter(doc => {
            const data = doc.data();
            return (
              (!item.details.sph || data.sph === item.details.sph) &&
              (!item.details.cyl || data.cyl === item.details.cyl) &&
              (!item.details.axis || data.axis === item.details.axis) &&
              (!item.details.addition || data.addition === item.details.addition)
            );
          });
          
          if (filteredDocs.length > 0) {
            querySnapshot = { docs: filteredDocs, empty: false } as any;
            console.log(`✅ Optical specs filtering found: ${filteredDocs.length} matches`);
          }
        }
      }
    }
    
    if (!querySnapshot || querySnapshot.empty) {
      console.warn(`⚠️ No matching regular lens found in inventory after all search strategies for: ${item.name}`);
      console.warn(`📝 Search criteria used:`, {
        code: item.code,
        name: item.name,
        category: item.category,
        type: item.type,
        optical: item.details
      });
      return;
    }
    
    const lensDoc = querySnapshot.docs[0];
    const lensData = lensDoc.data();
    
    console.log(`📦 Found matching regular lens in inventory:`, {
      id: lensDoc.id,
      code: lensData.code,
      name: lensData.name,
      category: lensData.category,
      currentQty: lensData.qty || 0,
      currentSoldQty: lensData.soldQty || 0
    });
    
    const totalReturnQty = soldQty + errorQty;
    console.log(`🔄 Returning total quantity: ${totalReturnQty} (sold: ${soldQty}, error: ${errorQty})`);
    
    // Update the lens inventory
    const updateData: any = {
      qty: (lensData.qty || 0) + totalReturnQty,
      updatedAt: serverTimestamp(),
    };
    
    // Reduce sold quantity if it was marked as sold
    if (lensData.soldQty && soldQty > 0) {
      updateData.soldQty = Math.max(0, (lensData.soldQty || 0) - soldQty);
      console.log(`📉 Sold qty: ${lensData.soldQty || 0} - ${soldQty} = ${updateData.soldQty}`);
    }
    
    console.log(`🔧 Updating regular lens document with:`, updateData);
    await updateDoc(doc(db, 'lenses', lensDoc.id), updateData);
    
    console.log(`✅ Regular lens inventory updated successfully! Lens: ${lensData.code || lensData.name}`);
  } catch (error) {
    console.error(`❌ Error returning regular lens to inventory:`, error);
    throw error;
  }
};

/**
 * Return generic items (frames, accessories, contact lenses) to inventory
 */
const returnGenericItemToInventory = async (item: VocItem, soldQty: number, errorQty: number): Promise<void> => {
  try {
    let collectionName = '';
    
    // Determine collection based on item type
    switch (item.type) {
      case 'Frame':
        collectionName = 'frames';
        break;
      case 'Accessories':
        collectionName = 'accessories';
        break;
      case 'Contact Lens':
        collectionName = 'contactLenses';
        break;
      default:
        console.warn(`Unknown item type: ${item.type}`);
        return;
    }
    
    // Find matching item in inventory
    const itemQuery = query(
      collection(db, collectionName),
      where('code', '==', item.code || item.name)
    );
    
    const querySnapshot = await getDocs(itemQuery);
    
    if (!querySnapshot.empty) {
      const itemDoc = querySnapshot.docs[0];
      const itemData = itemDoc.data();
      
      console.log(`📦 Found matching ${item.type} in inventory:`, itemData.code);
      
      const totalReturnQty = soldQty + errorQty;
      
      // Update the item inventory
      const updateData: any = {
        qty: (itemData.qty || 0) + totalReturnQty,
        updatedAt: serverTimestamp(),
      };
      
      // Reduce sold quantity if it was marked as sold
      if (itemData.soldQty && soldQty > 0) {
        updateData.soldQty = Math.max(0, (itemData.soldQty || 0) - soldQty);
      }
      
      await updateDoc(doc(db, collectionName, itemDoc.id), updateData);
      
      console.log(`✅ ${item.type} inventory updated successfully`);
    } else {
      console.warn(`⚠️ No matching ${item.type} found in inventory for: ${item.name}`);
    }
  } catch (error) {
    console.error(`❌ Error returning ${item.type} to inventory:`, error);
    throw error;
  }
};

/**
 * Legacy function for backwards compatibility
 */
export const returnInventoryForVoc = async (
  items: VocItem[], 
  updateCallback?: (updates: any) => Promise<void>
): Promise<{ success: boolean; message: string }> => {
  console.log('🔄 Legacy returnInventoryForVoc called, delegating to returnVOCItemsToInventory');
  
  const result = await returnVOCItemsToInventory(items);
  
  if (updateCallback && result.success) {
    try {
      await updateCallback({
        returnedItems: result.returnedItems,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error in update callback:', error);
    }
  }
  
  return {
    success: result.success,
    message: result.message
  };
};