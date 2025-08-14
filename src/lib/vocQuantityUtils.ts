import { VocItem } from '../type/Voc';

/**
 * Calculates the sold quantity of a VOC item.
 * Sold quantity is the total quantity minus the error quantity.
 * @param item - The VOC item.
 * @returns The calculated sold quantity.
 */
export const calculateSoldQuantity = (item: VocItem): number => {
  return (item.quantity || 0) - (item.errorQty || 0);
};

/**
 * Calculates the error quantity of a VOC item.
 * @param item - The VOC item.
 * @returns The error quantity, or 0 if not specified.
 */
export const calculateErrorQuantity = (item: VocItem): number => {
  return item.errorQty || 0;
};

/**
 * Utility functions for handling VOC quantities
 */

/**
 * Create a VOC item with explicit sold and error quantities
 */
export function createVocItemWithQuantities(
  baseItem: Partial<VocItem>,
  soldQty: number,
  errorQty: number
): VocItem {
  const totalQty = soldQty + errorQty;
  
  return {
    id: baseItem.id || '',
    name: baseItem.name || '',
    type: baseItem.type || 'Lens',
    quantity: totalQty,
    price: baseItem.price || 0,
    soldQty: soldQty,
    errorQty: errorQty,
    hasError: errorQty > 0,
    errorQuantity: errorQty, // For backward compatibility
    category: baseItem.category || '',
    ...baseItem
  } as VocItem;
}

/**
 * Validate that sold + error quantities equal total quantity
 */
export function validateVocItemQuantities(item: VocItem): {
  isValid: boolean;
  message?: string;
} {
  const soldQty = item.soldQty || 0;
  const errorQty = item.errorQty || 0;
  const totalExpected = soldQty + errorQty;
  
  if (totalExpected !== item.quantity) {
    return {
      isValid: false,
      message: `Total quantity mismatch: sold (${soldQty}) + error (${errorQty}) = ${totalExpected}, but item quantity is ${item.quantity}`
    };
  }
  
  if (soldQty < 0 || errorQty < 0) {
    return {
      isValid: false,
      message: 'Sold and error quantities cannot be negative'
    };
  }
  
  return { isValid: true };
}

/**
 * Convert legacy VOC item to new format with explicit quantities
 */
export function convertLegacyVocItem(item: VocItem): VocItem {
  // If already has explicit quantities, return as is
  if (item.soldQty !== undefined && item.errorQty !== undefined) {
    return item;
  }
  
  // Calculate quantities based on existing logic
  let soldQty = item.quantity;
  let errorQty = 0;
  
  if (item.hasError) {
    if (item.errorQuantity !== undefined) {
      errorQty = item.errorQuantity;
      soldQty = Math.max(0, item.quantity - errorQty);
    } else {
      // Use default error calculation
      errorQty = Math.min(item.quantity, Math.ceil(item.quantity * 0.1)); // 10% default
      soldQty = Math.max(0, item.quantity - errorQty);
    }
  }
  
  return {
    ...item,
    soldQty,
    errorQty
  };
}

/**
 * Create test VOC items with specific quantities for testing
 */
export function createTestVocItems(): VocItem[] {
  return [
    createVocItemWithQuantities({
      id: 'test-lens-1',
      name: 'Test Lens (0.5 sold, 0.5 error)',
      type: 'Lens',
      price: 50000,
      category: 'single vision'
    }, 0.5, 0.5),
    
    createVocItemWithQuantities({
      id: 'test-frame-1',
      name: 'Test Frame (0.5 sold, 0.5 error)',
      type: 'Frame',
      price: 30000,
      category: 'metal'
    }, 0.5, 0.5),
    
    createVocItemWithQuantities({
      id: 'test-acc-1',
      name: 'Test Accessories (0.5 sold, 0.5 error)',
      type: 'Accessories',
      price: 10000,
      category: 'case'
    }, 0.5, 0.5),
    
    createVocItemWithQuantities({
      id: 'test-lens-2',
      name: 'Perfect Lens (1 sold, 0 error)',
      type: 'Lens',
      price: 50000,
      category: 'single vision'
    }, 1, 0),
    
    createVocItemWithQuantities({
      id: 'test-frame-2',
      name: 'Defective Frame (0 sold, 1 error)',
      type: 'Frame',
      price: 30000,
      category: 'metal'
    }, 0, 1)
  ];
}