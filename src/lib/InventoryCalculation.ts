import { VocItem } from '../type/voc';
import { ILens, IVoc, LensStock, VOC } from "../type/Voc";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * QUANTITY CALCULATIONS
 */

/**
 * Calculate the sold quantity for an item
 * Sold quantity = Total quantity - Error quantity
 */
export function calculateSoldQuantity(item: VocItem): number {
  // If explicit soldQty is provided, use it
  if (item.soldQty !== undefined) {
    return item.soldQty;
  }

  // If no error, all quantity is sold
  if (!item.hasError) {
    return item.quantity;
  }

  // Get error quantity (prioritize errorQuantity over errorQty)
  const errorQty = item.errorQuantity !== undefined ? item.errorQuantity : (item.errorQty || 0);
  
  // Calculate sold quantity as total minus error
  return Math.max(0, item.quantity - errorQty);
}


/**
 * Calculate the error quantity for an item with enhanced logic
 */
export function calculateErrorQuantity(item: VocItem): number {
  // If no error flag, return 0
  if (!item.hasError) {
    return 0;
  }

  // Prioritize errorQuantity over errorQty
  if (item.errorQuantity !== undefined) {
    return Math.min(item.errorQuantity, item.quantity);
  }
  
  if (item.errorQty !== undefined) {
    return Math.min(item.errorQty, item.quantity);
  }

  // If hasError is true but no explicit quantity, return 0 (user needs to set quantity)
  return 0;
}

/**
 * VOC AMOUNT CALCULATIONS WITH ERROR EXCLUSION
 */

/**
 * Calculate total VOC amount with comprehensive pricing logic
 * Handles:
 * - Regular items (full price for sold quantity only)
 * - Error items (completely excluded from pricing)
 * - FOC (Free of Charge) items
 * - Item-level discounts
 * - Global discounts
 */
export function calculateVocAmount(items: VocItem[], globalDiscount: number = 0): {
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
 * Enhanced helper function to return items to inventory when VOC is returned or deleted
 * This function properly handles both sold and error quantities separately
 */
export const returnItemsToInventory = (items: VocItem[]): {
  soldItemsToReturn: VocItem[];
  errorItemsToReturn: VocItem[];
  totalSoldQuantity: number;
  totalErrorQuantity: number;
  inventoryUpdates: Array<{
    item: VocItem;
    soldQuantityToReturn: number;
    errorQuantityToReturn: number;
    totalQuantityToReturn: number;
  }>;
} => {
  const soldItemsToReturn: VocItem[] = [];
  const errorItemsToReturn: VocItem[] = [];
  const inventoryUpdates: Array<{
    item: VocItem;
    soldQuantityToReturn: number;
    errorQuantityToReturn: number;
    totalQuantityToReturn: number;
  }> = [];
  let totalSoldQuantity = 0;
  let totalErrorQuantity = 0;

  items.forEach(item => {
    const soldQty = calculateSoldQuantity(item);
    const errorQty = calculateErrorQuantity(item);
    const totalQtyToReturn = soldQty + errorQty;

    console.log(`Processing item: ${item.name}`);
    console.log(`- Total quantity: ${item.quantity}`);
    console.log(`- Sold quantity to return: ${soldQty}`);
    console.log(`- Error quantity to return: ${errorQty}`);
    console.log(`- Total to return: ${totalQtyToReturn}`);
    // Track inventory updates for each item
    if (totalQtyToReturn > 0) {
      inventoryUpdates.push({
        item,
        soldQuantityToReturn: soldQty,
        errorQuantityToReturn: errorQty,
        totalQuantityToReturn: totalQtyToReturn
      });
    }

    // Return sold items to inventory
    if (soldQty > 0) {
      const soldItem: VocItem = {
        ...item,
        quantity: soldQty,
        hasError: false,
        errorQuantity: 0,
        errorCategory: undefined,
        errorDescription: undefined,
        soldQty: undefined, // Clear sold quantity when returning
        errorQty: undefined // Clear error quantity when returning
      };

      // For bifocal lenses, adjust right/left quantities proportionally
      if (item.type === 'Lens' && item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
        const totalOriginal = (item.details.rightQty || 0) + (item.details.leftQty || 0);
        if (totalOriginal > 0) {
          const ratio = soldQty / totalOriginal;
          soldItem.details = {
            ...item.details,
            rightQty: Math.floor((item.details.rightQty || 0) * ratio),
            leftQty: Math.floor((item.details.leftQty || 0) * ratio)
          };
        }
      }

      soldItemsToReturn.push(soldItem);
      totalSoldQuantity += soldQty;
    }

    // Return error items to inventory
    if (errorQty > 0) {
      const errorItem: VocItem = {
        ...item,
        quantity: errorQty,
        hasError: false, // Reset error status when returning to inventory
        errorQuantity: 0, // Reset error quantity
        errorCategory: undefined, // Clear error category
        errorDescription: undefined, // Clear error description
        soldQty: undefined, // Clear sold quantity when returning
        errorQty: undefined // Clear error quantity when returning
      };

      // For bifocal lenses, adjust right/left quantities proportionally
      if (item.type === 'Lens' && item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
        const totalOriginal = (item.details.rightQty || 0) + (item.details.leftQty || 0);
        if (totalOriginal > 0) {
          const ratio = errorQty / totalOriginal;
          errorItem.details = {
            ...item.details,
            rightQty: Math.floor((item.details.rightQty || 0) * ratio),
            leftQty: Math.floor((item.details.leftQty || 0) * ratio)
          };
        }
      }

      errorItemsToReturn.push(errorItem);
      totalErrorQuantity += errorQty;
    }
  });

  console.log(`Total sold quantity to return: ${totalSoldQuantity}`);
  console.log(`Total error quantity to return: ${totalErrorQuantity}`);
  console.log(`Total inventory updates: ${inventoryUpdates.length}`);
  return {
    soldItemsToReturn,
    errorItemsToReturn,
    totalSoldQuantity,
    totalErrorQuantity,
    inventoryUpdates
  };
};

/**
 * Enhanced function to handle VOC deletion and inventory return
 */
export const returnInventoryForVoc = async (
  vocItems: VocItem[],
  updateInventoryCallback: (updates: Array<{
    item: VocItem;
    soldQuantityToReturn: number;
    errorQuantityToReturn: number;
    totalQuantityToReturn: number;
  }>) => Promise<void>
): Promise<{
  success: boolean;
  message: string;
  returnedItems: {
    soldItems: VocItem[];
    errorItems: VocItem[];
    totalSoldReturned: number;
    totalErrorReturned: number;
  };
}> => {
  try {
    const returnData = returnItemsToInventory(vocItems);
    
    // Update inventory with both sold and error quantities
    await updateInventoryCallback(returnData.inventoryUpdates);
    
    return {
      success: true,
      message: `Successfully returned ${returnData.totalSoldQuantity} sold items and ${returnData.totalErrorQuantity} error items to inventory`,
      returnedItems: {
        soldItems: returnData.soldItemsToReturn,
        errorItems: returnData.errorItemsToReturn,
        totalSoldReturned: returnData.totalSoldQuantity,
        totalErrorReturned: returnData.totalErrorQuantity
      }
    };
  } catch (error) {
    console.error('Error returning items to inventory:', error);
    return {
      success: false,
      message: `Failed to return items to inventory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      returnedItems: {
        soldItems: [],
        errorItems: [],
        totalSoldReturned: 0,
        totalErrorReturned: 0
      }
    };
  }
};

/**
 * Validate error quantities
 */
export const validateErrorQuantity = (item: VocItem, errorQuantity: number): {
  isValid: boolean;
  message?: string;
} => {
  if (errorQuantity < 0) {
    return { isValid: false, message: 'Error quantity cannot be negative' };
  }
  
  if (errorQuantity > item.quantity) {
    return { 
      isValid: false, 
      message: `Error quantity (${errorQuantity}) cannot exceed total quantity (${item.quantity})` 
    };
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
 * Enhanced function to return VOC items back to inventory - both sold and error quantities
 * This function ensures proper inventory restoration when VOCs are deleted
 */
export const returnVOCItemsToInventory = async (items: VocItem[]): Promise<{
  success: boolean;
  message: string;
  returnedItems: {
    soldItems: number;
    errorItems: number;
    totalItems: number;
  };
}> => {
  try {
    console.log('Starting VOC items return to inventory...');
    const returnData = returnItemsToInventory(items);
    let updatedLenses = 0;
    let updatedFrames = 0;
    let updatedAccessories = 0;

    // Process each item to return to inventory
    for (const item of items) {
      const soldQty = calculateSoldQuantity(item);
      const errorQty = calculateErrorQuantity(item);
      const totalReturnQty = soldQty + errorQty;

      console.log(`Processing return for item: ${item.name}`);
      console.log(`- Sold qty to return: ${soldQty}`);
      console.log(`- Error qty to return: ${errorQty}`);
      console.log(`- Total qty to return: ${totalReturnQty}`);
      if (totalReturnQty === 0) continue;

      if (item.type === 'Lens') {
        // Return lens to inventory
        try {
          const q = query(
            collection(db, "lenses"),
            where("name", "==", item.name),
            where("category", "==", item.category || ""),
            where("type", "==", item.type)
          );

          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            querySnapshot.forEach(async (lensDoc) => {
              const lensData = lensDoc.data() as LensStock;
              console.log(`Found lens in inventory: ${lensData.name}`);
              console.log(`- Current sold qty: ${lensData.soldQty || 0}`);
              console.log(`- Current error qty: ${lensData.errorQty || 0}`);
              
              const newSoldQty = Math.max(0, (lensData.soldQty || 0) - soldQty);
              const newErrorQty = Math.max(0, (lensData.errorQty || 0) - errorQty);
              const newRemainingQty = lensData.totalQty - newSoldQty;

              console.log(`- New sold qty: ${newSoldQty}`);
              console.log(`- New error qty: ${newErrorQty}`);
              console.log(`- New remaining qty: ${newRemainingQty}`);
              await updateDoc(doc(db, "lenses", lensDoc.id), {
                soldQty: newSoldQty,
                errorQty: newErrorQty,
                remainingQty: newRemainingQty,
                lastUpdated: new Date().toISOString(),
              });
              updatedLenses++;
              console.log(`Successfully updated lens inventory: ${lensData.name}`);
            });
          }
        } catch (error) {
          console.error(`Error returning lens ${item.name} to inventory:`, error);
        }
      } else if (item.type === 'Frame') {
        // Return frame to inventory
        try {
          const q = query(
            collection(db, "frames"),
            where("name", "==", item.name),
            where("category", "==", item.category || "")
          );

          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            querySnapshot.forEach(async (frameDoc) => {
              const frameData = frameDoc.data();
              console.log(`Found frame in inventory: ${frameData.name}`);
              const newSoldQty = Math.max(0, (frameData.soldQty || 0) - soldQty);
              const newErrorQty = Math.max(0, (frameData.errorQty || 0) - errorQty);
              const newRemainingQty = (frameData.totalQty || 0) - newSoldQty;

              await updateDoc(doc(db, "frames", frameDoc.id), {
                soldQty: newSoldQty,
                errorQty: newErrorQty,
                remainingQty: newRemainingQty,
                lastUpdated: new Date().toISOString(),
              });
              updatedFrames++;
              console.log(`Successfully updated frame inventory: ${frameData.name}`);
            });
          }
        } catch (error) {
          console.error(`Error returning frame ${item.name} to inventory:`, error);
        }
      } else if (item.type === 'Accessories') {
        // Return accessories to inventory
        try {
          const q = query(
            collection(db, "accessories"),
            where("name", "==", item.name),
            where("category", "==", item.category || "")
          );

          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            querySnapshot.forEach(async (accDoc) => {
              const accData = accDoc.data();
              console.log(`Found accessory in inventory: ${accData.name}`);
              const newSoldQty = Math.max(0, (accData.soldQty || 0) - soldQty);
              const newErrorQty = Math.max(0, (accData.errorQty || 0) - errorQty);
              const newRemainingQty = (accData.totalQty || 0) - newSoldQty;

              await updateDoc(doc(db, "accessories", accDoc.id), {
                soldQty: newSoldQty,
                errorQty: newErrorQty,
                remainingQty: newRemainingQty,
                lastUpdated: new Date().toISOString(),
              });
              updatedAccessories++;
              console.log(`Successfully updated accessory inventory: ${accData.name}`);
            });
          }
        } catch (error) {
          console.error(`Error returning accessory ${item.name} to inventory:`, error);
        }
      }
    }

    const successMessage = `Successfully returned ${returnData.totalSoldQuantity} sold items and ${returnData.totalErrorQuantity} error items to inventory. Updated: ${updatedLenses} lenses, ${updatedFrames} frames, ${updatedAccessories} accessories.`;
    console.log(successMessage);
    return {
      success: true,
      message: successMessage,
      returnedItems: {
        soldItems: returnData.totalSoldQuantity,
        errorItems: returnData.totalErrorQuantity,
        totalItems: returnData.totalSoldQuantity + returnData.totalErrorQuantity
      }
    };
  } catch (error) {
    console.error('Error returning VOC items to inventory:', error);
    const errorMessage = 'Failed to return items to inventory: ' + (error as Error).message;
    console.log(errorMessage);
    return {
      success: false,
      message: errorMessage,
      returnedItems: {
        soldItems: 0,
        errorItems: 0,
        totalItems: 0
      }
    };
  }
};

/**
 * Update lens stock for VOC creation with error quantity tracking
 */
export const updateLensStockForVOCWithError = async (
  lens: ILens, 
  soldQuantity: number = 1, 
  errorQuantity: number = 0
) => {
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
      const newSoldQty = (lensData.soldQty || 0) + soldQuantity;
      const newErrorQty = (lensData.errorQty || 0) + errorQuantity;
      const newRemainingQty = lensData.totalQty - newSoldQty - newErrorQty;

      await updateDoc(doc(db, "lenses", lensDoc.id), {
        soldQty: newSoldQty,
        errorQty: newErrorQty,
        remainingQty: Math.max(0, newRemainingQty),
        lastUpdated: new Date().toISOString(),
      });
      
      console.log(`Stock updated for lens: ${lensData.name} - Sold: +${soldQuantity}, Error: +${errorQuantity}`);
    });
  } catch (error) {
    console.error("Error updating lens stock with error tracking:", error);
  }
};

/**
 * Return lens stock when VOC is deleted or returned
 */
export const returnLensStockForVOC = async (lens: ILens, quantityToReturn: number) => {
  if (!lens.name || !lens.category || !lens.type || quantityToReturn <= 0) {
    console.error("Lens details are incomplete or invalid quantity, skipping stock return.", lens, quantityToReturn);
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
      console.warn("No matching lens found in inventory for stock return", lens);
      return;
    }

    querySnapshot.forEach(async (lensDoc) => {
      const lensData = lensDoc.data() as LensStock;
      const newSoldQty = Math.max(0, (lensData.soldQty || 0) - quantityToReturn);
      const newRemainingQty = lensData.totalQty - newSoldQty;

      await updateDoc(doc(db, "lenses", lensDoc.id), {
        soldQty: newSoldQty,
        remainingQty: newRemainingQty,
      });
      console.log(`Stock returned for lens: ${lensData.name}, quantity: ${quantityToReturn}`);
    });
  } catch (error) {
    console.error("Error returning lens stock:", error);
  }
};

/**
 * Return lens stock with separate sold and error quantities
 */
export const returnLensStockForVOCWithError = async (
  lens: ILens, 
  soldQuantityToReturn: number = 0, 
  errorQuantityToReturn: number = 0
) => {
  if (!lens.name || !lens.category || !lens.type) {
    console.error("Lens details are incomplete, skipping stock return.", lens);
    return;
  }
  
  const totalQuantityToReturn = soldQuantityToReturn + errorQuantityToReturn;
  if (totalQuantityToReturn <= 0) {
    console.warn("No quantity to return for lens:", lens.name);
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
      console.warn("No matching lens found in inventory for stock return", lens);
      return;
    }

    querySnapshot.forEach(async (lensDoc) => {
      const lensData = lensDoc.data() as LensStock;
      const newSoldQty = Math.max(0, (lensData.soldQty || 0) - soldQuantityToReturn);
      const newErrorQty = Math.max(0, (lensData.errorQty || 0) - errorQuantityToReturn);
      const newRemainingQty = lensData.totalQty - newSoldQty - newErrorQty;

      await updateDoc(doc(db, "lenses", lensDoc.id), {
        soldQty: newSoldQty,
        errorQty: newErrorQty,
        remainingQty: Math.max(0, newRemainingQty),
        lastUpdated: new Date().toISOString(),
      });
      
      console.log(`Stock returned for lens: ${lensData.name} - Sold: -${soldQuantityToReturn}, Error: -${errorQuantityToReturn}`);
    });
  } catch (error) {
    console.error("Error returning lens stock with error tracking:", error);
  }
};

/**
 * Create or update VOC in Firebase with proper error quantity indexing
 */
export const createVOCInFirebase = async (vocData: {
  vocNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: VocItem[];
  totalAmount: number;
  originalAmount: number;
  globalDiscount?: number;
  hasError?: boolean;
  notes?: string;
}): Promise<{ success: boolean; message: string; vocId?: string }> => {
  try {
    // Calculate totals
    const totalSoldQty = vocData.items.reduce((sum, item) => sum + calculateSoldQuantity(item), 0);
    const totalErrorQty = vocData.items.reduce((sum, item) => sum + calculateErrorQuantity(item), 0);
    const errorRate = totalSoldQty + totalErrorQty > 0 ? (totalErrorQty / (totalSoldQty + totalErrorQty)) * 100 : 0;
    
    // Prepare VOC document for Firebase
    const vocDocument = {
      vocNumber: vocData.vocNumber,
      customerName: vocData.customerName,
      customerPhone: vocData.customerPhone || '',
      customerAddress: vocData.customerAddress || '',
      items: vocData.items.map(item => ({
        ...item,
        soldQty: calculateSoldQuantity(item),
        errorQty: calculateErrorQuantity(item),
        // Ensure error details are properly indexed
        hasError: item.hasError || false,
        errorCategory: item.errorCategory || null,
        errorDescription: item.errorDescription || null,
      })),
      totalAmount: vocData.totalAmount,
      originalAmount: vocData.originalAmount,
      globalDiscount: vocData.globalDiscount || 0,
      totalSoldQty,
      totalErrorQty,
      errorRate,
      hasError: vocData.hasError || totalErrorQty > 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: vocData.notes || '',
    };

    // Add to Firebase
    const docRef = await addDoc(collection(db, "vocs"), vocDocument);
    
    // Update inventory for each item
    for (const item of vocData.items) {
      if (item.type === 'Lens' && item.details) {
        const lensData: ILens = {
          name: item.name,
          category: item.category || '',
          type: item.type,
          power: {
            sph: item.details.sph || '',
            cyl: item.details.cyl || '',
            axis: item.details.axis || '',
            add: item.details.addition || ''
          }
        };
        
        const soldQty = calculateSoldQuantity(item);
        const errorQty = calculateErrorQuantity(item);
        
        await updateLensStockForVOCWithError(lensData, soldQty, errorQty);
      }
    }
    
    return {
      success: true,
      message: `VOC ${vocData.vocNumber} created successfully with ${totalSoldQty} sold items and ${totalErrorQty} error items`,
      vocId: docRef.id
    };
  } catch (error) {
    console.error('Error creating VOC in Firebase:', error);
    return {
      success: false,
      message: `Failed to create VOC: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Update VOC error quantities in Firebase
 */
export const updateVOCErrorQuantitiesInFirebase = async (
  vocId: string,
  items: VocItem[]
): Promise<{ success: boolean; message: string }> => {
  try {
    const totalSoldQty = items.reduce((sum, item) => sum + calculateSoldQuantity(item), 0);
    const totalErrorQty = items.reduce((sum, item) => sum + calculateErrorQuantity(item), 0);
    const errorRate = totalSoldQty + totalErrorQty > 0 ? (totalErrorQty / (totalSoldQty + totalErrorQty)) * 100 : 0;
    
    await updateDoc(doc(db, "vocs", vocId), {
      items: items.map(item => ({
        ...item,
        soldQty: calculateSoldQuantity(item),
        errorQty: calculateErrorQuantity(item),
        hasError: item.hasError || false,
        errorCategory: item.errorCategory || null,
        errorDescription: item.errorDescription || null,
      })),
      totalSoldQty,
      totalErrorQty,
      errorRate,
      hasError: totalErrorQty > 0,
      updatedAt: new Date().toISOString(),
    });
    
    return {
      success: true,
      message: `VOC error quantities updated successfully`
    };
  } catch (error) {
    console.error('Error updating VOC error quantities:', error);
    return {
      success: false,
      message: `Failed to update VOC error quantities: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
/**
 * Bulk inventory update for VOC return
 */
export const bulkUpdateInventoryForVocReturn = async (
  inventoryUpdates: Array<{
    item: VocItem;
    soldQuantityToReturn: number;
    errorQuantityToReturn: number;
    totalQuantityToReturn: number;
  }>
): Promise<{
  success: boolean;
  message: string;
  updatedItems: number;
}> => {
  try {
    console.log(`Starting bulk inventory update for ${inventoryUpdates.length} items...`);
    let updatedItems = 0;
    
    for (const update of inventoryUpdates) {
      const { item, soldQuantityToReturn, errorQuantityToReturn, totalQuantityToReturn } = update;
      
      console.log(`Processing bulk update for: ${item.name}`);
      console.log(`- Sold quantity to return: ${soldQuantityToReturn}`);
      console.log(`- Error quantity to return: ${errorQuantityToReturn}`);
      console.log(`- Total quantity to return: ${totalQuantityToReturn}`);
      
      // Handle lens items
      if (item.type === 'Lens' && item.details) {
        const lensData: ILens = {
          name: item.name,
          category: item.category || '',
          type: item.type,
          power: {
            sph: item.details.sph || '',
            cyl: item.details.cyl || '',
            axis: item.details.axis || '',
            add: item.details.addition || ''
          }
        };
        
        // Return sold and error quantities separately to inventory
        if (soldQuantityToReturn > 0 || errorQuantityToReturn > 0) {
          await returnLensStockForVOCWithError(lensData, soldQuantityToReturn, errorQuantityToReturn);
          updatedItems++;
          console.log(`Successfully updated lens inventory: ${item.name}`);
        }
      }
      
      // Handle other item types (Frame, Accessories, Contact Lens)
      // Add specific logic for other inventory types as needed
      
      console.log(`Completed return to inventory: ${item.name} - Sold: ${soldQuantityToReturn}, Error: ${errorQuantityToReturn}`);
    }
    
    const successMessage = `Successfully updated ${updatedItems} items in inventory`;
    console.log(successMessage);
    
    return {
      success: true,
      message: successMessage,
      updatedItems
    };
  } catch (error) {
    console.error('Error in bulk inventory update:', error);
    const errorMessage = `Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.log(errorMessage);
    return {
      success: false,
      message: errorMessage,
      updatedItems: 0
    };
  }
};

/**
 * Enhanced VOC return process with comprehensive inventory update
 * This function handles the complete process of returning both sold and error quantities to inventory
 */
export const processVocReturn = async (vocItems: VocItem[]): Promise<{
  success: boolean;
  message: string;
  details: {
    totalSoldReturned: number;
    totalErrorReturned: number;
    itemsUpdated: number;
  };
}> => {
  try {
    console.log('Starting complete VOC return process...');
    console.log(`Processing ${vocItems.length} items for return`);
    
    // Calculate what needs to be returned
    const returnData = returnItemsToInventory(vocItems);
    
    console.log(`Return data calculated:`);
    console.log(`- Total sold to return: ${returnData.totalSoldQuantity}`);
    console.log(`- Total error to return: ${returnData.totalErrorQuantity}`);
    console.log(`- Inventory updates needed: ${returnData.inventoryUpdates.length}`);
    
    // Update inventory
    const inventoryResult = await bulkUpdateInventoryForVocReturn(returnData.inventoryUpdates);
    
    if (!inventoryResult.success) {
      console.error('Inventory update failed:', inventoryResult.message);
      throw new Error(inventoryResult.message);
    }
    
    const successMessage = `VOC successfully returned to inventory. Sold items: ${returnData.totalSoldQuantity}, Error items: ${returnData.totalErrorQuantity}`;
    console.log(successMessage);
    
    return {
      success: true,
      message: successMessage,
      details: {
        totalSoldReturned: returnData.totalSoldQuantity,
        totalErrorReturned: returnData.totalErrorQuantity,
        itemsUpdated: inventoryResult.updatedItems
      }
    };
  } catch (error) {
    console.error('Error processing VOC return:', error);
    const errorMessage = `Failed to process VOC return: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.log(errorMessage);
    return {
      success: false,
      message: errorMessage,
      details: {
        totalSoldReturned: 0,
        totalErrorReturned: 0,
        itemsUpdated: 0
      }
    };
  }
};