import { db } from './firebase';
import { doc, updateDoc, increment, serverTimestamp, writeBatch, getDoc, collection, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { trackItemHistory } from './utils';
import toast from 'react-hot-toast';

// Enhanced VocItem interface combining features from both files
export interface VocItem {
  id: string;
  type: string;
  name: string;
  quantity: number;
  price?: number;
  category: string;
  store: string;
  isBifocal?: boolean;
  isSingleVision?: boolean;
  isSMS?: boolean;
  isSMSBifocal?: boolean;
  isYangonOrder?: boolean;
  errorQuantity?: number;
  soldQuantity?: number;
  selectedSide?: 'left' | 'right' | 'both' | null;
  errorSide?: 'left' | 'right' | 'both' | null;
  isFOC?: boolean;
  staffEmail?: string;
  hasError?: boolean;
  details?: {
    sph?: string | null;
    cyl?: string | null;
    axis?: string | null;
    addition?: string | null;
    color?: string | null;
    power?: string | null;
    yangonOrderName?: string | null;
    Right?: string | null;
    Left?: string | null;
    rightAxis?: string | null;
    leftAxis?: string | null;
    rightCyl?: string | null;
    leftCyl?: string | null;
    rightQty?: number | null;
    leftQty?: number | null;
    rightErrorQty?: number | null;
    leftErrorQty?: number | null;
  };
}

export interface StockItem {
  id: string;
  name: string;
  totalQty: number;
  soldQty: number;
  remainingQty: number;
  price: number;
  category?: string;
  store?: string;
  type?: string;
  // Bifocal flattop specific fields
  rightQty?: number;
  leftQty?: number;
  rightSoldQty?: number;
  leftSoldQty?: number;
  rightErrorQty?: number;
  leftErrorQty?: number;
  originalRightQty?: number;
  originalLeftQty?: number;
  // Error tracking
  errorQty?: number;
  originalQty?: number;
}

export interface InventoryUpdateResult {
  success: boolean;
  successCount: number;
  totalItems: number;
  errors: string[];
}

// Matching criteria interfaces
export interface FrameMatchingCriteria {
  name: string;
  category: string;
  store: string;
  code?: string;
}

export interface AccessoryMatchingCriteria {
  name: string;
  store: string;
  code?: string;
}

export interface ContactLensMatchingCriteria {
  name: string;
  category: string;
  store: string;
  code?: string;
  power?: string;
}

export interface LensMatchingCriteria {
  name: string;
  category: string;
  type: string;
  sph?: string;
  cyl?: string;
  axis?: string;
  addition?: string;
  store: string;
  // For Yangon Orders and bifocal lenses
  Right?: string;
  Left?: string;
  rightCyl?: string;
  leftCyl?: string;
  rightAxis?: string;
  leftAxis?: string;
}

// Helper functions
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^\w.]/g, '') // Keep dots for numbers like 1.56
    .trim();
};

const flexibleTextMatch = (value1: string | undefined, value2: string | undefined): boolean => {
  if (!value1 && !value2) return true;
  if (!value1 || !value2) return false;
  
  const norm1 = normalizeText(value1);
  const norm2 = normalizeText(value2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Partial match for lens names/categories
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  return false;
};

const isBifocalFlattop = (item: VocItem): boolean => {
  return item.isBifocal && (
    item.category?.toLowerCase().includes('flattop') ||
    (item.details?.rightQty !== null && item.details?.leftQty !== null)
  );
};

/**
 * Enhanced SMS lens matching logic for inventory deduction
 */
const findSMSLensForInventoryDeduction = async (item: VocItem): Promise<any | null> => {
  try {
    if (!item.isSMS && !item.isSMSBifocal) {
      return null; // Not an SMS item
    }

    console.log('🔍 [SMS LENS MATCHING] Finding inventory match for SMS lens:', {
      name: item.name,
      category: item.category,
      isSMS: item.isSMS,
      isSMSBifocal: item.isSMSBifocal,
      details: item.details
    });

    const criteria: LensMatchingCriteria = {
      name: item.name,
      category: item.category,
      type: 'Lens',
      store: item.store,
      sph: item.details?.sph || undefined,
      cyl: item.details?.cyl || undefined,
      axis: item.details?.axis || undefined,
      addition: item.details?.addition || undefined,
      Right: item.details?.Right || undefined,
      Left: item.details?.Left || undefined,
      rightAxis: item.details?.rightAxis || undefined,
      leftAxis: item.details?.leftAxis || undefined,
      rightCyl: item.details?.rightCyl || undefined,
      leftCyl: item.details?.leftCyl || undefined
    };

    const matchingLens = await findMatchingLens(criteria);
    
    if (matchingLens) {
      console.log('✅ [SMS LENS MATCHING] Found matching lens for SMS item:', {
        originalSMS: item.name,
        matchedLens: matchingLens.name,
        matchedCategory: matchingLens.category,
        availableQty: matchingLens.qty
      });
      
      // Determine lens type for proper inventory deduction
      const lensCategory = matchingLens.category?.toLowerCase() || '';
      const lensType = matchingLens.type?.toLowerCase() || '';
      
      // Check if it's single vision
      if (item.isSMS && !item.isSMSBifocal) {
        console.log('📝 [SMS LENS MATCHING] Single vision SMS lens detected');
        return {
          ...matchingLens,
          deductionType: 'single_vision'
        };
      }
      
      // Check if it's bifocal
      if (item.isSMSBifocal || item.isBifocal) {
        // Check if it's flattop bifocal
        if (lensCategory.includes('flattop')) {
          console.log('📝 [SMS LENS MATCHING] Bifocal flattop SMS lens detected');
          return {
            ...matchingLens,
            deductionType: 'bifocal_flattop',
            requiresSideSelection: true
          };
        } else {
          console.log('📝 [SMS LENS MATCHING] Bifocal fuse SMS lens detected');
          return {
            ...matchingLens,
            deductionType: 'bifocal_fuse'
          };
        }
      }
      
      return {
        ...matchingLens,
        deductionType: 'general'
      };
    }
    
    console.log('❌ [SMS LENS MATCHING] No matching lens found for SMS item:', item.name);
    return null;

  } catch (error) {
    console.error('❌ [SMS LENS MATCHING] Error finding SMS lens match:', error);
    return null;
  }
};

const getCollectionName = (type: string): string => {
  switch (type) {
    case 'Lens':
      return 'lenses';
    case 'Frame':
      return 'frames';
    case 'Contact Lens':
      return 'contactLenses';
    case 'Accessories':
      return 'accessories';
    default:
      return 'lenses';
  }
};

/**
 * ENHANCED: Find matching lens with SMS prescription-based matching
 */
export const findMatchingLens = async (criteria: LensMatchingCriteria): Promise<any | null> => {
  try {
    console.log('🔍 [LENS MATCHING] Starting search with criteria:', criteria);

    const allLensesQuery = query(collection(db, 'lenses'));
    const allSnapshot = await getDocs(allLensesQuery);
    
    console.log(`📊 [LENS MATCHING] Total lenses in database: ${allSnapshot.docs.length}`);
    
    if (allSnapshot.empty) {
      console.error('❌ [LENS MATCHING] No lenses found in database');
      return null;
    }

    // Debug: Show all available lenses
    const allLenses = allSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        code: data.code || '',
        category: data.category || '',
        type: data.type || '',
        store: data.store || '',
        qty: data.qty || 0,
        sph: data.sph || '',
        cyl: data.cyl || '',
        axis: data.axis || '',
        addition: data.addition || ''
      };
    });

    console.log('📋 [LENS MATCHING] All lenses in database:');
    allLenses.forEach((lens, index) => {
      console.log(`  ${index + 1}. Name: "${lens.name}", Category: "${lens.category}", SPH: "${lens.sph}", CYL: "${lens.cyl}", AXIS: "${lens.axis}", Store: "${lens.store}", Qty: ${lens.qty}`);
    });

    console.log(`🎯 [LENS MATCHING] Searching for: "${criteria.name}" with SPH: "${criteria.sph}", CYL: "${criteria.cyl}", AXIS: "${criteria.axis}"`);

    let matchingLenses: any[] = [];

    // Priority 1: SMS Prescription-based matching for lenses with sph/cyl/axis
    if (criteria.sph || criteria.cyl || criteria.axis) {
      console.log('🔍 [SMS PRESCRIPTION] Attempting prescription-based matching...');
      
      matchingLenses = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        
        // Category matching (flexible)
        const categoryMatch = !criteria.category || !data.category || 
                             flexibleTextMatch(criteria.category, data.category) ||
                             flexibleTextMatch(criteria.name, data.category);
        
        // Prescription matching - exact match for precision
        const sphMatch = !criteria.sph || !data.sph || 
                        data.sph.toString() === criteria.sph.toString();
        const cylMatch = !criteria.cyl || !data.cyl || 
                        data.cyl.toString() === criteria.cyl.toString();
        const axisMatch = !criteria.axis || !data.axis || 
                         data.axis.toString() === criteria.axis.toString();
        const additionMatch = !criteria.addition || !data.addition || 
                             data.addition.toString() === criteria.addition.toString();
        
        // For bifocal lenses, also check Right/Left eye data
        const rightMatch = !criteria.Right || !data.Right || 
                          data.Right.toString() === criteria.Right.toString();
        const leftMatch = !criteria.Left || !data.Left || 
                         data.Left.toString() === criteria.Left.toString();
        
        const prescriptionMatch = sphMatch && cylMatch && axisMatch && additionMatch && rightMatch && leftMatch;
        
        if (categoryMatch && prescriptionMatch) {
          console.log(`✅ [SMS PRESCRIPTION] Match found: "${data.name || data.code}" - Category:${categoryMatch}, SPH:${sphMatch}, CYL:${cylMatch}, AXIS:${axisMatch}`);
          return true;
        }
        
        return false;
      });
      
      console.log(`📊 [SMS PRESCRIPTION] Found ${matchingLenses.length} prescription matches`);
    }

    // Fallback: Traditional matching if no prescription matches found
    if (matchingLenses.length === 0) {
      // Approach 1: Exact name match
      matchingLenses = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        const nameMatch = data.name === criteria.name;
        console.log(`🔍 [EXACT NAME] "${data.name || data.code}" === "${criteria.name}" = ${nameMatch}`);
        return nameMatch;
      });

      console.log(`📊 [EXACT NAME] Found ${matchingLenses.length} matches`);

      // Approach 2: Exact code match
      if (matchingLenses.length === 0) {
        matchingLenses = allSnapshot.docs.filter(doc => {
          const data = doc.data();
          const codeMatch = data.code === criteria.name;
          console.log(`🔍 [EXACT CODE] "${data.code}" === "${criteria.name}" = ${codeMatch}`);
          return codeMatch;
        });
        console.log(`📊 [EXACT CODE] Found ${matchingLenses.length} matches`);
      }

      // Approach 3: Exact category match
      if (matchingLenses.length === 0) {
        matchingLenses = allSnapshot.docs.filter(doc => {
          const data = doc.data();
          const categoryMatch = data.category === criteria.name;
          console.log(`🔍 [EXACT CATEGORY] "${data.category}" === "${criteria.name}" = ${categoryMatch}`);
          return categoryMatch;
        });
        console.log(`📊 [EXACT CATEGORY] Found ${matchingLenses.length} matches`);
      }

      // Approach 4: Flexible matching
      if (matchingLenses.length === 0) {
        console.log('🔄 [FLEXIBLE] Trying flexible matching...');
        matchingLenses = allSnapshot.docs.filter(doc => {
          const data = doc.data();
          
          const nameMatch = flexibleTextMatch(criteria.name, data.name);
          const codeMatch = flexibleTextMatch(criteria.name, data.code);
          const categoryMatch = flexibleTextMatch(criteria.name, data.category);
          
          const anyMatch = nameMatch || codeMatch || categoryMatch;
          
          if (anyMatch) {
            console.log(`✅ [FLEXIBLE] Match found: "${data.name || data.code}" - Name:${nameMatch}, Code:${codeMatch}, Category:${categoryMatch}`);
          }
          
          return anyMatch;
        });
        console.log(`📊 [FLEXIBLE] Found ${matchingLenses.length} matches`);
      }

      // Approach 5: Partial string matching (last resort)
      if (matchingLenses.length === 0) {
        console.log('🔄 [PARTIAL] Trying partial string matching...');
        const searchTerm = criteria.name.toLowerCase();
        
        matchingLenses = allSnapshot.docs.filter(doc => {
          const data = doc.data();
          
          const namePartial = (data.name || '').toLowerCase().includes(searchTerm);
          const codePartial = (data.code || '').toLowerCase().includes(searchTerm);
          const categoryPartial = (data.category || '').toLowerCase().includes(searchTerm);
          
          const anyPartial = namePartial || codePartial || categoryPartial;
          
          if (anyPartial) {
            console.log(`✅ [PARTIAL] Partial match: "${data.name || data.code}" - Name:${namePartial}, Code:${codePartial}, Category:${categoryPartial}`);
          }
          
          return anyPartial;
        });
        console.log(`📊 [PARTIAL] Found ${matchingLenses.length} matches`);
      }
    }

    if (matchingLenses.length === 0) {
      console.error(`❌ [LENS MATCHING] No matches found for "${criteria.name}"`);
      return null;
    }

    console.log(`✅ [LENS MATCHING] Found ${matchingLenses.length} potential matches`);

    // Filter by additional criteria
    let filteredLenses = matchingLenses.filter(doc => {
      const data = doc.data();
      
      const storeMatch = data.store === criteria.store;
      const typeMatch = !criteria.type || !data.type || data.type === criteria.type;
      const categoryMatch = !criteria.category || !data.category || 
                           data.category === criteria.category ||
                           flexibleTextMatch(criteria.category, data.category);
      
      const overallMatch = typeMatch && categoryMatch;
      
      console.log(`🔍 [FILTER] "${data.name || data.code}": Store:${storeMatch}, Type:${typeMatch}, Category:${categoryMatch}, Overall:${overallMatch}`);
      
      return overallMatch;
    });

    console.log(`📊 [FILTER] After filtering: ${filteredLenses.length} matches`);

    if (filteredLenses.length === 0) {
      filteredLenses = matchingLenses;
      console.log('⚠️ [FILTER] No matches after filtering, using all potential matches');
    }

    // Prioritize by store and stock
    const sameStoreLenses = filteredLenses.filter(doc => doc.data().store === criteria.store);
    const otherStoreLenses = filteredLenses.filter(doc => doc.data().store !== criteria.store);
    
    console.log(`📊 [PRIORITY] Same store: ${sameStoreLenses.length}, Other stores: ${otherStoreLenses.length}`);

    let bestMatch = sameStoreLenses.find(doc => {
      const qty = doc.data().qty || 0;
      console.log(`🔍 [SAME STORE] "${doc.data().name || doc.data().code}" has ${qty} qty`);
      return qty > 0;
    });

    if (!bestMatch) {
      bestMatch = otherStoreLenses.find(doc => {
        const qty = doc.data().qty || 0;
        console.log(`🔍 [OTHER STORE] "${doc.data().name || doc.data().code}" has ${qty} qty`);
        return qty > 0;
      });
    }

    if (!bestMatch && filteredLenses.length > 0) {
      bestMatch = filteredLenses[0];
      console.log('⚠️ [FALLBACK] Using first match even if out of stock');
    }

    if (bestMatch) {
      const lensData = bestMatch.data();
      console.log('✅ [SUCCESS] Selected lens:', {
        id: bestMatch.id,
        name: lensData.name,
        code: lensData.code,
        category: lensData.category,
        store: lensData.store,
        qty: lensData.qty,
        sph: lensData.sph,
        cyl: lensData.cyl,
        axis: lensData.axis
      });
      
      return {
        id: bestMatch.id,
        ...lensData
      };
    }

    console.error('❌ [LENS MATCHING] No suitable match found after all strategies');
    return null;

  } catch (error) {
    console.error('❌ [LENS MATCHING] Error during search:', error);
    return null;
  }
};

/**
 * ENHANCED: Find matching frame with comprehensive debugging
 */
export const findMatchingFrame = async (criteria: FrameMatchingCriteria): Promise<any | null> => {
  try {
    console.log('🔍 [FRAME MATCHING] Starting search with criteria:', criteria);

    const allFramesQuery = query(collection(db, 'frames'));
    const allSnapshot = await getDocs(allFramesQuery);
    
    console.log(`📊 [FRAME MATCHING] Total frames in database: ${allSnapshot.docs.length}`);
    
    if (allSnapshot.empty) {
      console.error('❌ [FRAME MATCHING] No frames found in database');
      return null;
    }

    const allFrames = allSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        code: data.code || '',
        category: data.category || '',
        store: data.store || '',
        qty: data.qty || 0
      };
    });

    console.log('📋 [FRAME MATCHING] All frames in database:');
    allFrames.forEach((frame, index) => {
      console.log(`  ${index + 1}. Name: "${frame.name}", Code: "${frame.code}", Category: "${frame.category}", Store: "${frame.store}", Qty: ${frame.qty}`);
    });

    console.log(`🎯 [FRAME MATCHING] Searching for: "${criteria.name}" in category: "${criteria.category}"`);

    // Try multiple matching approaches
    let matchingFrames = allSnapshot.docs.filter(doc => {
      const data = doc.data();
      const nameMatch = data.name === criteria.name;
      console.log(`🔍 [EXACT NAME] "${data.name || data.code}" === "${criteria.name}" = ${nameMatch}`);
      return nameMatch;
    });

    console.log(`📊 [EXACT NAME] Found ${matchingFrames.length} matches`);

    if (matchingFrames.length === 0) {
      matchingFrames = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        const codeMatch = data.code === criteria.name;
        console.log(`🔍 [EXACT CODE] "${data.code}" === "${criteria.name}" = ${codeMatch}`);
        return codeMatch;
      });
      console.log(`📊 [EXACT CODE] Found ${matchingFrames.length} matches`);
    }

    if (matchingFrames.length === 0) {
      console.log('🔄 [FLEXIBLE] Trying flexible matching...');
      matchingFrames = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        
        const nameMatch = flexibleTextMatch(criteria.name, data.name);
        const codeMatch = flexibleTextMatch(criteria.name, data.code);
        
        const anyMatch = nameMatch || codeMatch;
        
        if (anyMatch) {
          console.log(`✅ [FLEXIBLE] Match found: "${data.name || data.code}" - Name:${nameMatch}, Code:${codeMatch}`);
        }
        
        return anyMatch;
      });
      console.log(`📊 [FLEXIBLE] Found ${matchingFrames.length} matches`);
    }

    if (matchingFrames.length === 0) {
      console.error(`❌ [FRAME MATCHING] No matches found for "${criteria.name}"`);
      return null;
    }

    console.log(`✅ [FRAME MATCHING] Found ${matchingFrames.length} potential matches`);

    // Filter by additional criteria
    let filteredFrames = matchingFrames.filter(doc => {
      const data = doc.data();
      
      const storeMatch = data.store === criteria.store;
      const categoryMatch = !criteria.category || !data.category || 
                           data.category === criteria.category ||
                           flexibleTextMatch(criteria.category, data.category);
      
      const overallMatch = storeMatch && categoryMatch;
      
      console.log(`🔍 [FILTER] "${data.name || data.code}": Store:${storeMatch}, Category:${categoryMatch}, Overall:${overallMatch}`);
      
      return overallMatch;
    });

    console.log(`📊 [FILTER] After filtering: ${filteredFrames.length} matches`);

    if (filteredFrames.length === 0) {
      filteredFrames = matchingFrames;
      console.log('⚠️ [FILTER] No matches after filtering, using all potential matches');
    }

    // Prioritize by stock
    const bestMatch = filteredFrames.find(doc => {
      const qty = doc.data().qty || 0;
      console.log(`🔍 [STOCK CHECK] "${doc.data().name || doc.data().code}" has ${qty} qty`);
      return qty > 0;
    });

    const finalMatch = bestMatch || filteredFrames[0];

    if (finalMatch) {
      const frameData = finalMatch.data();
      console.log('✅ [SUCCESS] Selected frame:', {
        id: finalMatch.id,
        name: frameData.name,
        code: frameData.code,
        category: frameData.category,
        store: frameData.store,
        qty: frameData.qty
      });
      
      return {
        id: finalMatch.id,
        ...frameData
      };
    }

    console.error('❌ [FRAME MATCHING] No suitable match found after all strategies');
    return null;

  } catch (error) {
    console.error('❌ [FRAME MATCHING] Error during search:', error);
    return null;
  }
};

/**
 * ENHANCED: Find matching accessory with comprehensive debugging
 */
export const findMatchingAccessory = async (criteria: AccessoryMatchingCriteria): Promise<any | null> => {
  try {
    console.log('🔍 [ACCESSORY MATCHING] Starting search with criteria:', criteria);

    const allAccessoriesQuery = query(collection(db, 'accessories'));
    const allSnapshot = await getDocs(allAccessoriesQuery);
    
    console.log(`📊 [ACCESSORY MATCHING] Total accessories in database: ${allSnapshot.docs.length}`);
    
    if (allSnapshot.empty) {
      console.error('❌ [ACCESSORY MATCHING] No accessories found in database');
      return null;
    }

    const allAccessories = allSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        code: data.code || '',
        store: data.store || '',
        qty: data.qty || 0
      };
    });

    console.log('📋 [ACCESSORY MATCHING] All accessories in database:');
    allAccessories.forEach((accessory, index) => {
      console.log(`  ${index + 1}. Name: "${accessory.name}", Code: "${accessory.code}", Store: "${accessory.store}", Qty: ${accessory.qty}`);
    });

    console.log(`🎯 [ACCESSORY MATCHING] Searching for: "${criteria.name}"`);

    // Try multiple matching approaches
    let matchingAccessories = allSnapshot.docs.filter(doc => {
      const data = doc.data();
      const nameMatch = data.name === criteria.name;
      console.log(`🔍 [EXACT NAME] "${data.name || data.code}" === "${criteria.name}" = ${nameMatch}`);
      return nameMatch;
    });

    console.log(`📊 [EXACT NAME] Found ${matchingAccessories.length} matches`);

    if (matchingAccessories.length === 0) {
      matchingAccessories = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        const codeMatch = data.code === criteria.name;
        console.log(`🔍 [EXACT CODE] "${data.code}" === "${criteria.name}" = ${codeMatch}`);
        return codeMatch;
      });
      console.log(`📊 [EXACT CODE] Found ${matchingAccessories.length} matches`);
    }

    if (matchingAccessories.length === 0) {
      console.log('🔄 [FLEXIBLE] Trying flexible matching...');
      matchingAccessories = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        
        const nameMatch = flexibleTextMatch(criteria.name, data.name);
        const codeMatch = flexibleTextMatch(criteria.name, data.code);
        
        const anyMatch = nameMatch || codeMatch;
        
        if (anyMatch) {
          console.log(`✅ [FLEXIBLE] Match found: "${data.name || data.code}" - Name:${nameMatch}, Code:${codeMatch}`);
        }
        
        return anyMatch;
      });
      console.log(`📊 [FLEXIBLE] Found ${matchingAccessories.length} matches`);
    }

    if (matchingAccessories.length === 0) {
      console.error(`❌ [ACCESSORY MATCHING] No matches found for "${criteria.name}"`);
      return null;
    }

    console.log(`✅ [ACCESSORY MATCHING] Found ${matchingAccessories.length} potential matches`);

    // Filter by store
    let filteredAccessories = matchingAccessories.filter(doc => {
      const data = doc.data();
      const storeMatch = data.store === criteria.store;
      
      console.log(`🔍 [FILTER] "${data.name || data.code}": Store:${storeMatch}`);
      
      return storeMatch;
    });

    console.log(`📊 [FILTER] After filtering: ${filteredAccessories.length} matches`);

    if (filteredAccessories.length === 0) {
      filteredAccessories = matchingAccessories;
      console.log('⚠️ [FILTER] No matches after filtering, using all potential matches');
    }

    // Prioritize by stock
    const bestMatch = filteredAccessories.find(doc => {
      const qty = doc.data().qty || 0;
      console.log(`🔍 [STOCK CHECK] "${doc.data().name || doc.data().code}" has ${qty} qty`);
      return qty > 0;
    });

    const finalMatch = bestMatch || filteredAccessories[0];

    if (finalMatch) {
      const accessoryData = finalMatch.data();
      console.log('✅ [SUCCESS] Selected accessory:', {
        id: finalMatch.id,
        name: accessoryData.name,
        code: accessoryData.code,
        store: accessoryData.store,
        qty: accessoryData.qty
      });
      
      return {
        id: finalMatch.id,
        ...accessoryData
      };
    }

    console.error('❌ [ACCESSORY MATCHING] No suitable match found after all strategies');
    return null;

  } catch (error) {
    console.error('❌ [ACCESSORY MATCHING] Error during search:', error);
    return null;
  }
};

/**
 * ENHANCED: Find matching contact lens with comprehensive debugging
 */
export const findMatchingContactLens = async (criteria: ContactLensMatchingCriteria): Promise<any | null> => {
  try {
    console.log('🔍 [CONTACT LENS MATCHING] Starting search with criteria:', criteria);

    const allContactLensesQuery = query(collection(db, 'contactLenses'));
    const allSnapshot = await getDocs(allContactLensesQuery);
    
    console.log(`📊 [CONTACT LENS MATCHING] Total contact lenses in database: ${allSnapshot.docs.length}`);
    
    if (allSnapshot.empty) {
      console.error('❌ [CONTACT LENS MATCHING] No contact lenses found in database');
      return null;
    }

    const allContactLenses = allSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        code: data.code || '',
        category: data.category || '',
        power: data.power || '',
        store: data.store || '',
        qty: data.qty || 0
      };
    });

    console.log('📋 [CONTACT LENS MATCHING] All contact lenses in database:');
    allContactLenses.forEach((lens, index) => {
      console.log(`  ${index + 1}. Name: "${lens.name}", Code: "${lens.code}", Category: "${lens.category}", Power: "${lens.power}", Store: "${lens.store}", Qty: ${lens.qty}`);
    });

    console.log(`🎯 [CONTACT LENS MATCHING] Searching for: "${criteria.name}" in category: "${criteria.category}"`);

    // Try multiple matching approaches
    let matchingContactLenses = allSnapshot.docs.filter(doc => {
      const data = doc.data();
      const nameMatch = data.name === criteria.name;
      console.log(`🔍 [EXACT NAME] "${data.name || data.code}" === "${criteria.name}" = ${nameMatch}`);
      return nameMatch;
    });

    console.log(`📊 [EXACT NAME] Found ${matchingContactLenses.length} matches`);

    if (matchingContactLenses.length === 0) {
      matchingContactLenses = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        const codeMatch = data.code === criteria.name;
        console.log(`🔍 [EXACT CODE] "${data.code}" === "${criteria.name}" = ${codeMatch}`);
        return codeMatch;
      });
      console.log(`📊 [EXACT CODE] Found ${matchingContactLenses.length} matches`);
    }

    if (matchingContactLenses.length === 0) {
      console.log('🔄 [FLEXIBLE] Trying flexible matching...');
      matchingContactLenses = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        
        const nameMatch = flexibleTextMatch(criteria.name, data.name);
        const codeMatch = flexibleTextMatch(criteria.name, data.code);
        
        const anyMatch = nameMatch || codeMatch;
        
        if (anyMatch) {
          console.log(`✅ [FLEXIBLE] Match found: "${data.name || data.code}" - Name:${nameMatch}, Code:${codeMatch}`);
        }
        
        return anyMatch;
      });
      console.log(`📊 [FLEXIBLE] Found ${matchingContactLenses.length} matches`);
    }

    if (matchingContactLenses.length === 0) {
      console.error(`❌ [CONTACT LENS MATCHING] No matches found for "${criteria.name}"`);
      return null;
    }

    console.log(`✅ [CONTACT LENS MATCHING] Found ${matchingContactLenses.length} potential matches`);

    // Filter by additional criteria
    let filteredContactLenses = matchingContactLenses.filter(doc => {
      const data = doc.data();
      
      const storeMatch = data.store === criteria.store;
      const categoryMatch = !criteria.category || !data.category || 
                           data.category === criteria.category ||
                           flexibleTextMatch(criteria.category, data.category);
      const powerMatch = !criteria.power || !data.power || 
                        data.power === criteria.power ||
                        flexibleTextMatch(criteria.power, data.power);
      
      const overallMatch = storeMatch && categoryMatch && powerMatch;
      
      console.log(`🔍 [FILTER] "${data.name || data.code}": Store:${storeMatch}, Category:${categoryMatch}, Power:${powerMatch}, Overall:${overallMatch}`);
      
      return overallMatch;
    });

    console.log(`📊 [FILTER] After filtering: ${filteredContactLenses.length} matches`);

    if (filteredContactLenses.length === 0) {
      filteredContactLenses = matchingContactLenses;
      console.log('⚠️ [FILTER] No matches after filtering, using all potential matches');
    }

    // Prioritize by stock
    const bestMatch = filteredContactLenses.find(doc => {
      const qty = doc.data().qty || 0;
      return qty > 0;
    });

    const finalMatch = bestMatch || filteredContactLenses[0];

    if (finalMatch) {
      const contactLensData = finalMatch.data();
      console.log('✅ [SUCCESS] Selected contact lens:', {
        id: finalMatch.id,
        name: contactLensData.name,
        code: contactLensData.code,
        category: contactLensData.category,
        power: contactLensData.power,
        store: contactLensData.store,
        qty: contactLensData.qty
      });
      
      return {
        id: finalMatch.id,
        ...contactLensData
      };
    }

    console.error('❌ [CONTACT LENS MATCHING] No suitable match found after all strategies');
    return null;

  } catch (error) {
    console.error('❌ [CONTACT LENS MATCHING] Error during search:', error);
    return null;
  }
};

/**
 * ENHANCED: Validate VOC inventory availability before processing
 */
export const validateVOCInventory = async (items: VocItem[]): Promise<{
  isValid: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];

  try {
    for (const item of items) {
      // FOC items should still be validated for inventory availability
      // They need to be physically available even if free

      console.log(`🔍 Validating ${item.name} (${item.type})...`, {
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
        itemCategory: item.category,
        itemStore: item.store,
        itemQuantity: item.quantity,
        itemDetails: item.details
      });

      let itemData = null;
      const collectionName = getCollectionName(item.type);

      // Try direct ID lookup first
      if (item.id && item.id.trim() !== '') {
        try {
          const itemDoc = await getDoc(doc(db, collectionName, item.id));
          if (itemDoc.exists()) {
            itemData = itemDoc.data();
          }
        } catch (error) {
          console.warn(`Could not find item by ID ${item.id}, trying matching logic`);
        }
      }

      // If direct ID didn't work, use matching logic
      if (!itemData) {
        switch (item.type) {
          case 'Lens':
            const matchingLens = await findMatchingLens({
              name: item.name,
              category: item.category,
              type: '', // Don't filter by type to allow broader matching
              store: item.store,
              sph: item.details?.sph,
              cyl: item.details?.cyl,
              axis: item.details?.axis,
              addition: item.details?.addition,
            });
            itemData = matchingLens;
            break;
          case 'Frame':
            const matchingFrame = await findMatchingFrame({
              name: item.name,
              category: item.category,
              store: item.store,
            });
            itemData = matchingFrame;
            break;
          case 'Accessories':
            const matchingAccessory = await findMatchingAccessory({
              name: item.name,
              store: item.store,
            });
            itemData = matchingAccessory;
            break;
          case 'Contact Lens':
            const matchingContactLens = await findMatchingContactLens({
              name: item.name,
              category: item.category,
              store: item.store,
              power: item.details?.power,
            });
            itemData = matchingContactLens;
            break;
        }
      }

      if (!itemData) {
        errors.push(`${item.name} no longer exists in inventory`);
        continue;
      }

      // Enhanced bifocal flattop validation with side-specific checks
      if (isBifocalFlattop(item)) {
        console.log(`🔍 Validating bifocal flattop: ${item.name}`, {
          selectedSide: item.selectedSide,
          quantity: item.quantity,
          errorQuantity: item.errorQuantity,
          rightQty: itemData.rightQty,
          leftQty: itemData.leftQty
        });

        const availableRightQty = itemData.rightQty || 0;
        const availableLeftQty = itemData.leftQty || 0;

        if (item.selectedSide === 'right') {
          if (availableRightQty < item.quantity) {
            errors.push(`Not enough right eye lenses for ${item.name} (Requested: ${item.quantity}, Available: ${availableRightQty})`);
          }
        } else if (item.selectedSide === 'left') {
          if (availableLeftQty < item.quantity) {
            errors.push(`Not enough left eye lenses for ${item.name} (Requested: ${item.quantity}, Available: ${availableLeftQty})`);
          }
        } else if (item.selectedSide === 'both') {
          const halfQuantity = item.quantity / 2;
          if (availableRightQty < halfQuantity || availableLeftQty < halfQuantity) {
            errors.push(`Not enough bifocal lenses for ${item.name} - both sides (Requested: ${halfQuantity} each, Available: R:${availableRightQty}, L:${availableLeftQty})`);
          }
        } else {
          const totalAvailable = availableRightQty + availableLeftQty;
          if (totalAvailable < item.quantity) {
            errors.push(`Not enough total lenses for ${item.name} (Requested: ${item.quantity}, Available: ${totalAvailable})`);
          }
        }
      } else {
        // Regular item validation
        const availableQty = itemData.qty || 0;
        if (availableQty < item.quantity) {
          errors.push(`Not enough ${item.name} available (Requested: ${item.quantity}, Available: ${availableQty})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Error validating VOC inventory:', error);
    return {
      isValid: false,
      errors: ['Failed to validate inventory availability']
    };
  }
};

/**
 * ENHANCED: Update complete inventory for VOC with proper bifocal flattop side tracking
 */
export const updateCompleteInventoryForVOC = async (items: VocItem[]): Promise<InventoryUpdateResult> => {
  const batch = writeBatch(db);
  let successCount = 0;
  const errors: string[] = [];

  console.log('🚀 Starting enhanced inventory updates for VOC with', items.length, 'items');

  try {
    for (const item of items) {
      try {
        // FOC items should still deduct from inventory as they are physically given out
        // Only payment is free, but inventory must be tracked
        console.log(`🎯 Processing item: ${item.name} (FOC: ${item.isFOC || false})`);

        let matchingDoc: any = null;
        const collectionName = getCollectionName(item.type);

        // Always use direct ID with doc() as requested
        if (!item.id || item.id.trim() === '' || item.id === 'undefined' || item.id === 'null') {
          const errorMsg = `❌ Item ${item.name} has no valid ID. Cannot update inventory without ID.`;
          console.error(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        try {
          console.log(`🎯 Using direct ID with doc() for ${item.name}: ${item.id}`);
          const directDoc = await getDoc(doc(db, collectionName, item.id));
          
          if (directDoc.exists()) {
            matchingDoc = {
              id: directDoc.id,
              ...directDoc.data()
            };
            console.log(`✅ Found item by direct ID: ${item.name}`, {
              id: matchingDoc.id,
              currentQty: matchingDoc.qty,
              currentSoldQty: matchingDoc.soldQty,
              currentErrorQty: matchingDoc.errorQty
            });
          } else {
            const errorMsg = `❌ Document not found for ${item.name} with ID: ${item.id}`;
            console.error(errorMsg);
            errors.push(errorMsg);
            continue;
          }
        } catch (error) {
          const errorMsg = `❌ Error fetching document for ${item.name} (ID: ${item.id}): ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        if (!matchingDoc || !matchingDoc.id) {
          console.error(`❌ No matching document found for item:`, {
            name: item.name,
            type: item.type,
            id: item.id,
            store: item.store,
            category: item.category
          });
          throw new Error(`${item.name} not found in inventory`);
        }

        console.log(`🔄 Processing ${item.type}: ${item.name}`, {
          quantity: item.quantity,
          soldQuantity: item.soldQuantity || 0,
          errorQuantity: item.errorQuantity || 0,
          selectedSide: item.selectedSide,
          errorSide: item.errorSide,
          isBifocalFlattop: isBifocalFlattop(item)
        });

        const itemRef = doc(db, collectionName, matchingDoc.id);
        const errorQty = item.errorQuantity || 0;
        const soldQty = (item.soldQuantity !== undefined) ? item.soldQuantity : (item.quantity - errorQty);

        if (soldQty < 0) {
          throw new Error(`Error quantity (${errorQty}) cannot exceed total quantity (${item.quantity}) for ${item.name}`);
        }

        // Enhanced bifocal flattop updates with side-specific tracking
        if (isBifocalFlattop(item)) {
          console.log(`👓 Processing bifocal flattop updates for: ${item.name}`);

          if (item.selectedSide === 'right') {
            batch.update(itemRef, {
              rightQty: increment(-item.quantity),
              rightSoldQty: increment(soldQty),
              rightErrorQty: increment(errorQty),
              qty: increment(-item.quantity),
              soldQty: increment(soldQty),
              errorQty: increment(errorQty),
              lastUpdated: serverTimestamp()
            });
            console.log(`📊 Right side update: -${item.quantity} (${soldQty} sold, ${errorQty} error)`);
          } else if (item.selectedSide === 'left') {
            batch.update(itemRef, {
              leftQty: increment(-item.quantity),
              leftSoldQty: increment(soldQty),
              leftErrorQty: increment(errorQty),
              qty: increment(-item.quantity),
              soldQty: increment(soldQty),
              errorQty: increment(errorQty),
              lastUpdated: serverTimestamp()
            });
            console.log(`📊 Left side update: -${item.quantity} (${soldQty} sold, ${errorQty} error)`);
          } else if (item.selectedSide === 'both') {
            const halfQuantity = item.quantity / 2;
            const halfSoldQty = soldQty / 2;
            const halfErrorQty = errorQty / 2;
            
            batch.update(itemRef, {
              rightQty: increment(-halfQuantity),
              leftQty: increment(-halfQuantity),
              rightSoldQty: increment(halfSoldQty),
              leftSoldQty: increment(halfSoldQty),
              rightErrorQty: increment(halfErrorQty),
              leftErrorQty: increment(halfErrorQty),
              qty: increment(-item.quantity),
              soldQty: increment(soldQty),
              errorQty: increment(errorQty),
              lastUpdated: serverTimestamp()
            });
            console.log(`📊 Both sides update: R:-${halfQuantity}, L:-${halfQuantity} (${soldQty} total sold, ${errorQty} total error)`);
          } else {
            batch.update(itemRef, {
              qty: increment(-item.quantity),
              soldQty: increment(soldQty),
              errorQty: increment(errorQty),
              lastUpdated: serverTimestamp()
            });
            console.log(`📊 General bifocal update: -${item.quantity} (${soldQty} sold, ${errorQty} error)`);
          }
        } else if (item.type === 'Lens' && item.isBifocal && item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
          // Handle bifocal lens updates with error quantities
          const rightSoldQty = Math.max(0, (item.details.rightQty || 0) - (item.details.rightErrorQty || 0));
          const leftSoldQty = Math.max(0, (item.details.leftQty || 0) - (item.details.leftErrorQty || 0));
          const rightErrorQty = item.details.rightErrorQty || 0;
          const leftErrorQty = item.details.leftErrorQty || 0;
          
          batch.update(itemRef, {
            rightQty: increment(-(item.details.rightQty || 0)),
            leftQty: increment(-(item.details.leftQty || 0)),
            qty: increment(-item.quantity),
            rightSoldQty: increment(rightSoldQty),
            leftSoldQty: increment(leftSoldQty),
            rightErrorQty: increment(rightErrorQty),
            leftErrorQty: increment(leftErrorQty),
            soldQty: increment(soldQty),
            errorQty: increment(errorQty),
            lastUpdated: serverTimestamp()
          });
          console.log(`📊 Bifocal lens update: R:-${item.details.rightQty}, L:-${item.details.leftQty}`);
        } else {
          // Regular item updates
          batch.update(itemRef, {
            qty: increment(-item.quantity),
            soldQty: increment(soldQty),
            errorQty: increment(errorQty),
            lastUpdated: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log(`📊 Regular item update: -${item.quantity} (${soldQty} sold, ${errorQty} error)`);
        }

        successCount++;
        console.log(`✅ Successfully prepared update for: ${item.name}`);
      } catch (itemError) {
        console.error(`❌ Error preparing update for ${item.name}:`, itemError);
        errors.push(`Failed to update ${item.name}: ${itemError.message}`);
      }
    }

    // Commit all updates in a single batch
    console.log('🚀 Committing batch updates...');
    await batch.commit();
    console.log('✅ All inventory updates committed successfully');

    // Log summary
    console.log(`📊 Inventory Update Summary:
    - Total items processed: ${items.length}
    - Successful updates: ${successCount}
    - Failed updates: ${errors.length}
    - FOC items processed: ${items.filter(item => item.isFOC).length}`);

    return {
      success: errors.length === 0,
      successCount,
      totalItems: items.length,
      errors
    };
  } catch (error) {
    console.error('❌ Error updating inventory for VOC:', error);
    return {
      success: false,
      successCount,
      totalItems: items.length,
      errors: [`Batch update failed: ${error.message}`]
    };
  }
};

/**
 * ENHANCED: Update single item inventory with bifocal flattop support
 */
export const updateSingleItemInventory = async (
  itemId: string,
  itemType: string,
  quantity: number,
  options: {
    side?: 'left' | 'right' | 'both';
    errorQuantity?: number;
    isBifocalFlattop?: boolean;
  } = {}
): Promise<{ success: boolean; message: string }> => {
  try {
    const collectionName = getCollectionName(itemType);
    const itemRef = doc(db, collectionName, itemId);

    const soldQty = quantity - (options.errorQuantity || 0);
    const errorQty = options.errorQuantity || 0;

    if (options.isBifocalFlattop && options.side) {
      console.log(`👓 Updating bifocal flattop inventory: ${itemId}`, {
        side: options.side,
        quantity,
        soldQty,
        errorQty
      });

      if (options.side === 'right') {
        await updateDoc(itemRef, {
          rightQty: increment(-quantity),
          rightSoldQty: increment(soldQty),
          rightErrorQty: increment(errorQty),
          qty: increment(-quantity),
          soldQty: increment(soldQty),
          errorQty: increment(errorQty),
          lastUpdated: serverTimestamp()
        });
      } else if (options.side === 'left') {
        await updateDoc(itemRef, {
          leftQty: increment(-quantity),
          leftSoldQty: increment(soldQty),
          leftErrorQty: increment(errorQty),
          qty: increment(-quantity),
          soldQty: increment(soldQty),
          errorQty: increment(errorQty),
          lastUpdated: serverTimestamp()
        });
      } else if (options.side === 'both') {
        const halfQuantity = quantity / 2;
        const halfSoldQty = soldQty / 2;
        const halfErrorQty = errorQty / 2;
        
        await updateDoc(itemRef, {
          rightQty: increment(-halfQuantity),
          leftQty: increment(-halfQuantity),
          rightSoldQty: increment(halfSoldQty),
          leftSoldQty: increment(halfSoldQty),
          rightErrorQty: increment(halfErrorQty),
          leftErrorQty: increment(halfErrorQty),
          qty: increment(-quantity),
          soldQty: increment(soldQty),
          errorQty: increment(errorQty),
          lastUpdated: serverTimestamp()
        });
      }
    } else {
      // Regular inventory update
      await updateDoc(itemRef, {
        qty: increment(-quantity),
        soldQty: increment(soldQty),
        errorQty: increment(errorQty),
        lastUpdated: serverTimestamp()
      });
    }

    return {
      success: true,
      message: `Successfully updated inventory for ${itemId}`
    };
  } catch (error) {
    console.error('Error updating single item inventory:', error);
    return {
      success: false,
      message: `Failed to update inventory: ${error.message}`
    };
  }
};

/**
 * Get real-time inventory status for an item
 */
export const getInventoryStatus = async (itemId: string, itemType: string): Promise<StockItem | null> => {
  try {
    const collectionName = getCollectionName(itemType);
    const itemRef = doc(db, collectionName, itemId);
    const itemDoc = await getDoc(itemRef);

    if (!itemDoc.exists()) {
      return null;
    }

    const data = itemDoc.data();
    return {
      id: itemDoc.id,
      name: data.name || data.code || 'Unknown Item',
      totalQty: data.originalQty || 0,
      soldQty: data.soldQty || 0,
      remainingQty: data.qty || 0,
      price: data.price || 0,
      category: data.category,
      store: data.store,
      type: data.type,
      // Bifocal specific fields
      rightQty: data.rightQty,
      leftQty: data.leftQty,
      rightSoldQty: data.rightSoldQty,
      leftSoldQty: data.leftSoldQty,
      rightErrorQty: data.rightErrorQty,
      leftErrorQty: data.leftErrorQty,
      originalRightQty: data.originalRightQty,
      originalLeftQty: data.originalLeftQty,
      // Error tracking
      errorQty: data.errorQty,
      originalQty: data.originalQty
    } as StockItem;
  } catch (error) {
    console.error('Error getting inventory status:', error);
    return null;
  }
};

/**
 * Bulk inventory check for multiple items
 */
export const bulkInventoryCheck = async (items: { id: string; type: string; quantity: number }[]): Promise<{
  available: boolean;
  unavailableItems: string[];
}> => {
  const unavailableItems: string[] = [];

  try {
    for (const item of items) {
      const status = await getInventoryStatus(item.id, item.type);
      if (!status || status.remainingQty < item.quantity) {
        unavailableItems.push(`${status?.name || item.id} (Available: ${status?.remainingQty || 0}, Requested: ${item.quantity})`);
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems
    };
  } catch (error) {
    console.error('Error in bulk inventory check:', error);
    return {
      available: false,
      unavailableItems: ['Error checking inventory availability']
    };
  }
};

/**
 * ENHANCED: Return lens inventory when VOC is deleted - handles both sold and error quantities
 */
export const returnLensInventoryForVOC = async (
  items: VocItem[],
  quantities: Record<string, number>
): Promise<{ success: boolean; successCount: number; errors: string[] }> => {
  const errors: string[] = [];
  let successCount = 0;

  try {
    for (const item of items) {
      // Skip FOC items - they were physically given to customers, so don't return to inventory
      if (item.isFOC) {
        console.log(`⚠️ Skipping FOC item: ${item.name} - physically given to customer, not returning to inventory`);
        continue;
      }
      
      console.log(`🔄 Returning item: ${item.name} (FOC: ${item.isFOC || false})`);
      
      if (item.type !== 'Lens') continue;
      
      const itemId = item.id || `temp-${items.indexOf(item)}`;
      const quantityToReturn = quantities[itemId] || 0;
      if (quantityToReturn <= 0) continue;

      try {
        const lensRef = doc(db, 'lenses', item.id);
        const lensDoc = await getDoc(lensRef);

        if (lensDoc.exists()) {
          const currentQty = lensDoc.data().qty || 0;
          const currentSoldQty = lensDoc.data().soldQty || 0;
          const currentErrorQty = lensDoc.data().errorQty || 0;
          
          // Calculate how much of the return quantity was sold vs error
          const originalErrorQty = item.errorQuantity || 0;
          const originalSoldQty = item.quantity - originalErrorQty;
          
          // Proportionally return sold and error quantities
          const errorQtyToReturn = Math.min(quantityToReturn, originalErrorQty);
          const soldQtyToReturn = quantityToReturn - errorQtyToReturn;
          
          const newQty = currentQty + quantityToReturn;
          const newSoldQty = Math.max(0, currentSoldQty - soldQtyToReturn);
          const newErrorQty = Math.max(0, currentErrorQty - errorQtyToReturn);

          console.log(`🔄 Returning lens ${item.name}:`, {
            totalReturn: quantityToReturn,
            soldReturn: soldQtyToReturn,
            errorReturn: errorQtyToReturn,
            newQty,
            newSoldQty,
            newErrorQty
          });

          await updateDoc(lensRef, {
            qty: newQty,
            soldQty: newSoldQty,
            errorQty: newErrorQty,
            updatedAt: serverTimestamp(),
          });

          if (typeof trackItemHistory === 'function') {
            await trackItemHistory({
              itemId: item.id,
              itemType: 'Lens',
              itemName: item.name,
              itemCode: item.id,
              action: 'return',
              changes: [
                {
                  field: 'qty',
                  oldValue: String(currentQty),
                  newValue: String(newQty)
                },
                {
                  field: 'soldQty',
                  oldValue: String(currentSoldQty),
                  newValue: String(newSoldQty)
                },
                {
                  field: 'errorQty',
                  oldValue: String(currentErrorQty),
                  newValue: String(newErrorQty)
                }
              ],
              store: item.store || '',
              staffEmail: item.staffEmail || 'unknown',
              totalQty: newQty
            });
          }
          
          successCount++;
          console.log(`✅ Successfully returned ${quantityToReturn} ${item.name} (${soldQtyToReturn} sold + ${errorQtyToReturn} error)`);
        } else {
          errors.push(`Lens ${item.name} not found in inventory`);
        }
      } catch (error) {
        console.error(`Error returning lens ${item.name}:`, error);
        errors.push(`Failed to return lens ${item.name}`);
      }
    }

    return {
      success: errors.length === 0,
      successCount,
      errors
    };
  } catch (error) {
    console.error('Error returning lens inventory:', error);
    errors.push('System error');
    return {
      success: false,
      successCount,
      errors
    };
  }
};

/**
 * ENHANCED: Return all item types inventory when VOC is deleted - handles FOC items correctly
 */
export const returnCompleteInventoryForVOC = async (
  items: VocItem[],
  quantities: Record<string, number>
): Promise<{ success: boolean; successCount: number; errors: string[] }> => {
  const errors: string[] = [];
  let successCount = 0;

  try {
    for (const item of items) {
      // Skip FOC items - they were physically given to customers, so don't return to inventory
      if (item.isFOC) {
        console.log(`⚠️ Skipping FOC item: ${item.name} - physically given to customer, not returning to inventory`);
        continue;
      }
      
      console.log(`🔄 Returning item: ${item.name} (Type: ${item.type}, FOC: ${item.isFOC || false})`);
      
      const itemId = item.id || `temp-${items.indexOf(item)}`;
      const quantityToReturn = quantities[itemId] || item.quantity || 0;
      if (quantityToReturn <= 0) continue;

      try {
        const collectionName = getCollectionName(item.type);
        const itemRef = doc(db, collectionName, item.id);
        const itemDoc = await getDoc(itemRef);

        if (itemDoc.exists()) {
          const currentQty = itemDoc.data().qty || 0;
          const currentSoldQty = itemDoc.data().soldQty || 0;
          const currentErrorQty = itemDoc.data().errorQty || 0;
          
          // Calculate how much of the return quantity was sold vs error
          const originalErrorQty = item.errorQuantity || 0;
          const originalSoldQty = quantityToReturn - originalErrorQty;
          
          // Proportionally return sold and error quantities
          const errorQtyToReturn = Math.min(quantityToReturn, originalErrorQty);
          const soldQtyToReturn = quantityToReturn - errorQtyToReturn;
          
          const newQty = currentQty + quantityToReturn;
          const newSoldQty = Math.max(0, currentSoldQty - soldQtyToReturn);
          const newErrorQty = Math.max(0, currentErrorQty - errorQtyToReturn);

          console.log(`🔄 Returning ${item.type}: ${item.name}:`, {
            totalReturn: quantityToReturn,
            soldReturn: soldQtyToReturn,
            errorReturn: errorQtyToReturn,
            newQty,
            newSoldQty,
            newErrorQty
          });

          // Handle bifocal flattop returns
          if (item.type === 'Lens' && item.selectedSide && (item.selectedSide === 'left' || item.selectedSide === 'right' || item.selectedSide === 'both')) {
            const updateData: any = {
              qty: newQty,
              soldQty: newSoldQty,
              errorQty: newErrorQty,
              updatedAt: serverTimestamp(),
            };

            if (item.selectedSide === 'right') {
              updateData.rightQty = increment(quantityToReturn);
              updateData.rightSoldQty = Math.max(0, (itemDoc.data().rightSoldQty || 0) - soldQtyToReturn);
              updateData.rightErrorQty = Math.max(0, (itemDoc.data().rightErrorQty || 0) - errorQtyToReturn);
            } else if (item.selectedSide === 'left') {
              updateData.leftQty = increment(quantityToReturn);
              updateData.leftSoldQty = Math.max(0, (itemDoc.data().leftSoldQty || 0) - soldQtyToReturn);
              updateData.leftErrorQty = Math.max(0, (itemDoc.data().leftErrorQty || 0) - errorQtyToReturn);
            } else if (item.selectedSide === 'both') {
              const halfQuantity = quantityToReturn / 2;
              const halfSoldQty = soldQtyToReturn / 2;
              const halfErrorQty = errorQtyToReturn / 2;
              
              updateData.rightQty = increment(halfQuantity);
              updateData.leftQty = increment(halfQuantity);
              updateData.rightSoldQty = Math.max(0, (itemDoc.data().rightSoldQty || 0) - halfSoldQty);
              updateData.leftSoldQty = Math.max(0, (itemDoc.data().leftSoldQty || 0) - halfSoldQty);
              updateData.rightErrorQty = Math.max(0, (itemDoc.data().rightErrorQty || 0) - halfErrorQty);
              updateData.leftErrorQty = Math.max(0, (itemDoc.data().leftErrorQty || 0) - halfErrorQty);
            }

            await updateDoc(itemRef, updateData);
          } else {
            // Regular item return
            await updateDoc(itemRef, {
              qty: newQty,
              soldQty: newSoldQty,
              errorQty: newErrorQty,
              updatedAt: serverTimestamp(),
            });
          }

          if (typeof trackItemHistory === 'function') {
            await trackItemHistory({
              itemId: item.id,
              itemType: item.type,
              itemName: item.name,
              itemCode: item.id,
              action: 'return',
              changes: [
                {
                  field: 'qty',
                  oldValue: String(currentQty),
                  newValue: String(newQty)
                },
                {
                  field: 'soldQty',
                  oldValue: String(currentSoldQty),
                  newValue: String(newSoldQty)
                },
                {
                  field: 'errorQty',
                  oldValue: String(currentErrorQty),
                  newValue: String(newErrorQty)
                }
              ],
              store: item.store || '',
              staffEmail: item.staffEmail || 'unknown',
              totalQty: newQty
            });
          }
          
          successCount++;
          console.log(`✅ Successfully returned ${quantityToReturn} ${item.name} (${soldQtyToReturn} sold + ${errorQtyToReturn} error)`);
        } else {
          errors.push(`${item.type} ${item.name} not found in inventory`);
        }
      } catch (error) {
        console.error(`Error returning ${item.type} ${item.name}:`, error);
        errors.push(`Failed to return ${item.type} ${item.name}`);
      }
    }

    return {
      success: errors.length === 0,
      successCount,
      errors
    };
  } catch (error) {
    console.error('Error returning inventory for VOC:', error);
    errors.push('System error');
    return {
      success: false,
      successCount,
      errors
    };
  }
};

/**
 * ENHANCED: Get real-time inventory status for a lens
 */
export const getLensInventoryStatus = async (criteria: LensMatchingCriteria): Promise<{
  found: boolean;
  lens?: any;
  availableQty: number;
  rightQty?: number;
  leftQty?: number;
}> => {
  try {
    const matchingLens = await findMatchingLens(criteria);
    
    if (!matchingLens) {
      return {
        found: false,
        availableQty: 0
      };
    }

    return {
      found: true,
      lens: matchingLens,
      availableQty: matchingLens.qty || 0,
      rightQty: matchingLens.rightQty,
      leftQty: matchingLens.leftQty
    };
  } catch (error) {
    console.error('Error getting lens inventory status:', error);
    return {
      found: false,
      availableQty: 0
    };
  }
};

// Default export with all functions
export default {
  validateVOCInventory,
  updateCompleteInventoryForVOC,
  updateSingleItemInventory,
  getInventoryStatus,
  bulkInventoryCheck,
  findMatchingLens,
  findMatchingFrame,
  findMatchingAccessory,
  findMatchingContactLens,
  returnLensInventoryForVOC,
  returnCompleteInventoryForVOC,
  getLensInventoryStatus
};