import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { VocItem } from '../lib/InventoryUtlis';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  itemResults: ItemValidationResult[];
}

export interface ItemValidationResult {
  item: VocItem;
  isValid: boolean;
  availableQty: number;
  requestedQty: number;
  errorMessage?: string;
  warningMessage?: string;
  canContinueAsFOC?: boolean;
}

/**
 * Enhanced inventory validation with comprehensive error handling
 */
export async function validateVOCInventory(items: VocItem[]): Promise<ValidationResult> {
  console.log('🔍 Starting comprehensive inventory validation for', items.length, 'items');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  const itemResults: ItemValidationResult[] = [];
  
  // Group items by type for batch processing
  const itemsByType = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, VocItem[]>);
  
  // Process each type concurrently
  const typePromises = Object.entries(itemsByType).map(([type, typeItems]) =>
    validateItemsByType(type, typeItems)
  );
  
  const typeResults = await Promise.all(typePromises);
  
  // Flatten results
  typeResults.forEach(results => {
    results.forEach(result => {
      itemResults.push(result);
      
      if (!result.isValid) {
        // Only add to errors if it's a critical validation failure
        // Don't add inventory shortage as error if user can continue with FOC
        if (!result.canContinueAsFOC) {
          errors.push(result.errorMessage || `Critical validation failed for ${result.item.name}`);
        } else {
          warnings.push(`Inventory shortage for ${result.item.name}: ${result.errorMessage}`);
        }
      } else if (result.warningMessage) {
        warnings.push(result.warningMessage);
      }
    });
  });
  
  // Consider validation successful if there are no critical errors
  // Inventory shortages that can be handled as FOC are not critical errors
  const isValid = errors.length === 0;
  
  console.log(`✅ Inventory validation completed. Valid: ${isValid}, Errors: ${errors.length}, Warnings: ${warnings.length}`);
  
  return {
    isValid,
    errors,
    warnings,
    itemResults
  };
}

async function validateItemsByType(type: string, items: VocItem[]): Promise<ItemValidationResult[]> {
  const collectionName = getCollectionNameByType(type);
  if (!collectionName) {
    return items.map(item => ({
      item,
      isValid: false,
      availableQty: 0,
      requestedQty: item.quantity,
      errorMessage: `Unknown item type: ${type}`,
      canContinueAsFOC: false
    }));
  }
  
  const results: ItemValidationResult[] = [];
  
  for (const item of items) {
    try {
      // Skip FOC items from inventory validation
      if (item.isFOC) {
        console.log(`⏭️ Skipping FOC item: ${item.name}`);
        results.push({
          item,
          isValid: true,
          availableQty: 0,
          requestedQty: item.quantity,
          warningMessage: 'FOC item - no inventory check needed',
          canContinueAsFOC: true
        });
        continue;
      }
      
      const validationResult = await validateSingleItem(item, collectionName);
      results.push(validationResult);
      
    } catch (error) {
      console.error(`❌ Error validating item ${item.name}:`, error);
      results.push({
        item,
        isValid: false,
        availableQty: 0,
        requestedQty: item.quantity,
        errorMessage: `Validation error: ${error.message}`,
        canContinueAsFOC: true
      });
    }
  }
  
  return results;
}

async function validateSingleItem(item: VocItem, collectionName: string): Promise<ItemValidationResult> {
  console.log(`🔍 Validating item: ${item.name} (${item.quantity} requested)`);
  console.log(`🔍 Item specifications:`, {
    code: item.code,
    sph: item.sph,
    cyl: item.cyl,
    axis: item.axis,
    addition: item.addition,
    store: item.store
  });
  
  let itemData: any = null;
  let availableQty = 0;
  
  try {
    const collectionName = getCollectionNameByType(item.type);
    if (!collectionName) {
      return {
        item,
        isValid: false,
        availableQty: 0,
        requestedQty: item.quantity,
        errorMessage: `Unknown item type: ${item.type}`
      };
    }
    
    // Method 1: For lenses, try specification-based matching first
    if (item.type === 'Lens') {
      // Try to find by code first (most specific)
      if (item.code) {
        const codeQuery = query(
          collection(db, collectionName),
          where('name', '==', item.name),
          where('code', '==', item.code)
        );
        
        if (item.store) {
          const storeCodeQuery = query(codeQuery, where('store', '==', item.store));
          const storeSnapshot = await getDocs(storeCodeQuery);
          if (!storeSnapshot.empty) {
            const itemDoc = storeSnapshot.docs[0];
            itemData = itemDoc.data();
            availableQty = itemData.qty || 0;
            console.log(`✅ Found lens by code and store: ${item.code}`);
          }
        }
        
        if (!itemData) {
          const codeSnapshot = await getDocs(codeQuery);
          if (!codeSnapshot.empty) {
            const itemDoc = codeSnapshot.docs[0];
            itemData = itemDoc.data();
            availableQty = itemData.qty || 0;
            console.log(`✅ Found lens by code: ${item.code}`);
          }
        }
      }
    }
    
    // Method 2: Query by name and store if specification lookup failed
    if (!itemData) {
      const itemQuery = query(
        collection(db, collectionName),
        where('name', '==', item.name),
        where('store', '==', item.store || 'win')
      );
      
      const querySnapshot = await getDocs(itemQuery);
      
      if (querySnapshot.empty) {
        // Method 3: Try searching without store filter (fallback)
        const fallbackQuery = query(
          collection(db, collectionName),
          where('name', '==', item.name)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        if (fallbackSnapshot.empty) {
          return {
            item,
            isValid: false,
            availableQty: 0,
            requestedQty: item.quantity,
            errorMessage: `Item not found: ${item.name} in ${collectionName} collection`
          };
        }
        
        // For lenses, try to find best match by specifications
        if (item.type === 'Lens' && fallbackSnapshot.docs.length > 1) {
          const bestMatch = findBestLensMatchForValidation(fallbackSnapshot.docs, item);
          if (bestMatch) {
            itemData = bestMatch.data();
            availableQty = itemData.qty || 0;
            console.log(`✅ Found best lens match by specifications`);
          } else {
            // Use first match as fallback
            const itemDoc = fallbackSnapshot.docs[0];
            itemData = itemDoc.data();
            availableQty = itemData.qty || 0;
            console.warn(`⚠️ Using first match for ${item.name}`);
          }
        } else {
          // Use first match from fallback search
          const itemDoc = fallbackSnapshot.docs[0];
          itemData = itemDoc.data();
          availableQty = itemData.qty || 0;
          console.warn(`Found ${item.name} without store filter in ${itemData.store || 'unknown'} store`);
        }
      } else {
        // For lenses with multiple matches, find best match
        if (item.type === 'Lens' && querySnapshot.docs.length > 1) {
          const bestMatch = findBestLensMatchForValidation(querySnapshot.docs, item);
          if (bestMatch) {
            itemData = bestMatch.data();
            availableQty = itemData.qty || 0;
            console.log(`✅ Found best lens match by specifications`);
          } else {
            // Use first match
            const itemDoc = querySnapshot.docs[0];
            itemData = itemDoc.data();
            availableQty = itemData.qty || 0;
          }
        } else {
          // Get the first matching item
          const itemDoc = querySnapshot.docs[0];
          itemData = itemDoc.data();
          availableQty = itemData.qty || 0;
        }
      }
    }
    
    // Validate quantity
    return validateQuantity(item, availableQty, itemData);
    
  } catch (error) {
    console.error(`❌ Error validating ${item.name}:`, error);
    return {
      item,
      isValid: false,
      availableQty: 0,
      requestedQty: item.quantity,
      errorMessage: `Database error: ${error.message}`,
      canContinueAsFOC: true
    };
  }
}

/**
 * Find best lens match for validation (similar to inventory utils but for validation)
 */
function findBestLensMatchForValidation(docs: any[], item: VocItem): any | null {
  if (!item.sph && !item.cyl && !item.axis && !item.addition && !item.code) {
    return null;
  }
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const doc of docs) {
    const data = doc.data();
    let score = 0;
    
    // Match by code (highest priority)
    if (item.code && data.code === item.code) {
      score += 20;
    }
    
    // Match by lens specifications
    if (item.sph && data.sph === item.sph) score += 5;
    if (item.cyl && data.cyl === item.cyl) score += 5;
    if (item.axis && data.axis === item.axis) score += 3;
    if (item.addition && data.addition === item.addition) score += 3;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = doc;
    }
  }
  
  return bestScore >= 3 ? bestMatch : null;
}

function validateQuantity(item: VocItem, availableQty: number, itemData: any): ItemValidationResult {
  const requestedQty = item.quantity;
  
  // Check for exact stock match
  if (availableQty === requestedQty) {
    return {
      item,
      isValid: true,
      availableQty,
      requestedQty,
      warningMessage: `Exact stock match for ${item.name}. Stock will be depleted.`,
      canContinueAsFOC: false
    };
  }
  
  // Check for insufficient stock
  if (availableQty < requestedQty) {
    const shortage = requestedQty - availableQty;
    
    // If there's some stock available, allow partial fulfillment
    if (availableQty > 0) {
      return {
        item,
        isValid: false,
        availableQty,
        requestedQty,
        errorMessage: `Partial stock available for ${item.name}. Available: ${availableQty}, Requested: ${requestedQty} (Short by: ${shortage}). Can fulfill ${availableQty} and mark ${shortage} as FOC.`,
        canContinueAsFOC: true
      };
    }
    
    // Completely out of stock
    return {
      item,
      isValid: false,
      availableQty,
      requestedQty,
      errorMessage: `Out of stock for ${item.name}. Requested: ${requestedQty}. Can mark entire quantity as FOC.`,
      canContinueAsFOC: true
    };
  }
  
  // Check for low stock warning
  const remainingAfterSale = availableQty - requestedQty;
  if (remainingAfterSale <= 2) {
    return {
      item,
      isValid: true,
      availableQty,
      requestedQty,
      warningMessage: `Low stock warning for ${item.name}. Only ${remainingAfterSale} will remain after this sale.`,
      canContinueAsFOC: false
    };
  }
  
  // All good
  return {
    item,
    isValid: true,
    availableQty,
    requestedQty,
    canContinueAsFOC: false
  };
}

function getCollectionNameByType(type: string): string | null {
  switch (type) {
    case 'Lens':
      return 'lenses';
    case 'Frame':
      return 'frames';
    case 'Accessories':
      return 'accessories';
    case 'Contact Lens':
      return 'contactLenses';
    default:
      return null;
  }
}

/**
 * Enhanced validation with detailed error messages
 */
export function createValidationErrorMessage(result: ValidationResult): string {
  if (result.isValid) {
    if (result.warnings.length > 0) {
      return `Validation completed with ${result.warnings.length} warnings. You can continue with FOC items.`;
    }
    return 'All items validated successfully';
  }
  
  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;
  const itemCount = result.itemResults.length;
  
  let message = '';
  
  if (errorCount > 0) {
    message += `Critical validation errors for ${errorCount} out of ${itemCount} items:\n\n`;
  }
  
  if (warningCount > 0) {
    message += `Inventory warnings for ${warningCount} items (can continue with FOC):\n\n`;
  }
  
  // Show detailed breakdown
  const criticalErrors = result.itemResults.filter(r => !r.isValid && !r.canContinueAsFOC).length;
  const inventoryShortages = result.itemResults.filter(r => !r.isValid && r.canContinueAsFOC).length;
  const outOfStock = result.itemResults.filter(r => !r.isValid && r.availableQty === 0).length;
  const partialStock = result.itemResults.filter(r => !r.isValid && r.availableQty > 0 && r.availableQty < r.requestedQty).length;
  
  if (criticalErrors > 0) {
    message += `• ${criticalErrors} items have critical errors that must be resolved\n`;
  }
  if (inventoryShortages > 0) {
    message += `• ${inventoryShortages} items have inventory shortages (can continue as FOC)\n`;
  }
  if (outOfStock > 0) {
    message += `• ${outOfStock} items are completely out of stock\n`;
  }
  if (partialStock > 0) {
    message += `• ${partialStock} items have partial stock available\n`;
  }
  
  message += '\nDetailed breakdown:\n';
  result.itemResults
    .filter(item => !item.isValid)
    .slice(0, 5)
    .forEach((item, index) => {
      const status = item.canContinueAsFOC ? '[CAN CONTINUE AS FOC]' : '[CRITICAL ERROR]';
      message += `${index + 1}. ${item.item.name} ${status}: ${item.errorMessage}\n`;
    });
  
  const totalIssues = result.itemResults.filter(r => !r.isValid).length;
  if (totalIssues > 5) {
    message += `\n... and ${totalIssues - 5} more items\n`;
  }
  
  // Add suggestion for continuing
  const canContinueItems = result.itemResults.filter(r => r.canContinueAsFOC).length;
  if (canContinueItems > 0 && errorCount === 0) {
    message += `\n✅ You can continue this VOC by marking ${canContinueItems} items as FOC (Free of Charge).`;
  }
  
  return message;
}

/**
 * Auto-fix inventory issues by marking items as FOC or adjusting quantities
 */
export function autoFixInventoryIssues(items: VocItem[], validationResult: ValidationResult): {
  fixedItems: VocItem[];
  changes: string[];
} {
  const fixedItems = [...items];
  const changes: string[] = [];
  
  validationResult.itemResults.forEach((result, index) => {
    if (!result.isValid) {
      if (result.availableQty === 0) {
        // Mark as FOC if completely out of stock
        fixedItems[index] = {
          ...fixedItems[index],
          isFOC: true,
          quantity: result.requestedQty,
          // Don't increment error quantity - this is handled separately
          errorQuantity: 0
        };
        changes.push(`Marked ${result.item.name} as FOC (out of stock)`);
        console.log(`🔧 Auto-fixed: Marked ${result.item.name} as FOC (out of stock)`);
      } else if (result.availableQty > 0) {
        // Split into available quantity (sold) and shortage (FOC)
        const shortage = result.requestedQty - result.availableQty;
        
        // Keep original item with available quantity
        fixedItems[index] = {
          ...fixedItems[index],
          quantity: result.availableQty,
          errorQuantity: 0
        };
        
        // Add FOC item for the shortage
        const focItem: VocItem = {
          ...fixedItems[index],
          quantity: shortage,
          isFOC: true,
          errorQuantity: 0
        };
        
        fixedItems.push(focItem);
        changes.push(`Split ${result.item.name}: ${result.availableQty} sold, ${shortage} as FOC`);
        console.log(`🔧 Auto-fixed: Split ${result.item.name} - ${result.availableQty} sold, ${shortage} FOC`);
      }
    }
  });
  
  return {
    fixedItems,
    changes
  };
}

/**
 * Handle inventory validation result and provide user-friendly options
 */
export function handleInventoryValidationResult(
  items: VocItem[], 
  validationResult: ValidationResult
): {
  canProceed: boolean;
  requiresUserConfirmation: boolean;
  message: string;
  suggestedActions: string[];
  autoFixedItems?: VocItem[];
} {
  const criticalErrors = validationResult.itemResults.filter(r => !r.isValid && !r.canContinueAsFOC);
  const inventoryShortages = validationResult.itemResults.filter(r => !r.isValid && r.canContinueAsFOC);
  
  // Critical errors - cannot proceed
  if (criticalErrors.length > 0) {
    return {
      canProceed: false,
      requiresUserConfirmation: false,
      message: `Cannot proceed due to ${criticalErrors.length} critical validation errors.`,
      suggestedActions: [
        'Fix the critical errors before proceeding',
        'Check item names and types',
        'Verify database connectivity'
      ]
    };
  }
  
  // Inventory shortages - can proceed with user confirmation
  if (inventoryShortages.length > 0) {
    const autoFix = autoFixInventoryIssues(items, validationResult);
    
    return {
      canProceed: true,
      requiresUserConfirmation: true,
      message: `Inventory validation found ${inventoryShortages.length} items with insufficient stock. Continue anyway?`,
      suggestedActions: [
        `Mark ${inventoryShortages.filter(r => r.availableQty === 0).length} out-of-stock items as FOC`,
        `Split ${inventoryShortages.filter(r => r.availableQty > 0).length} partial-stock items (sell available, mark shortage as FOC)`,
        'Continue with current quantities (not recommended)'
      ],
      autoFixedItems: autoFix.fixedItems
    };
  }
  
  // All good or only warnings
  return {
    canProceed: true,
    requiresUserConfirmation: false,
    message: validationResult.warnings.length > 0 
      ? `Validation completed with ${validationResult.warnings.length} warnings.`
      : 'All items validated successfully.',
    suggestedActions: []
  };
}

/**
 * Get validation summary statistics
 */
export function getValidationSummary(result: ValidationResult): {
  totalItems: number;
  errorItems: number;
  warningItems: number;
  successItems: number;
  outOfStockItems: number;
  lowStockItems: number;
  canContinueItems: number;
} {
  const totalItems = result.itemResults.length;
  const errorItems = result.itemResults.filter(r => !r.isValid).length;
  const warningItems = result.itemResults.filter(r => r.isValid && r.warningMessage).length;
  const successItems = result.itemResults.filter(r => r.isValid && !r.warningMessage).length;
  const outOfStockItems = result.itemResults.filter(r => !r.isValid && r.availableQty === 0).length;
  const lowStockItems = result.itemResults.filter(r => !r.isValid && r.availableQty > 0).length;
  const canContinueItems = result.itemResults.filter(r => r.canContinueAsFOC).length;
  
  return {
    totalItems,
    errorItems,
    warningItems,
    successItems,
    outOfStockItems,
    lowStockItems,
    canContinueItems
  };
}