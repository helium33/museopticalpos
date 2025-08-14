import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ErrorLensDeductionResult {
  success: boolean;
  message: string;
  deductedFromLens?: any;
  deductedQuantity?: number;
  deductedRightQty?: number;
  deductedLeftQty?: number;
}

/**
 * Enhanced function to find and deduct from matching lens inventory for Error lenses
 */
export async function deductFromInventoryForErrorLens(errorLens: any): Promise<ErrorLensDeductionResult> {
  try {
    console.log('🔍 Starting error lens inventory deduction for:', errorLens.code);
    
    // Determine the target lens type and category to search for
    let targetType = 'Single Vision';
    let targetCategory = '';
    let targetBifocalType = '';
    
    if (errorLens.bifocalType) {
      targetType = 'Bifocal';
      targetBifocalType = errorLens.bifocalType;
      
      // Map error bifocal type to actual lens categories
      switch (errorLens.bifocalType) {
        case 'Fuse':
          // Try to match with common fuse categories
          const fuseCategories = ['bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse'];
          targetCategory = fuseCategories[0]; // Default to first one, will search all
          break;
        case 'Flattop':
          // Try to match with common flattop categories
          const flattopCategories = ['mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop'];
          targetCategory = flattopCategories[0]; // Default to first one, will search all
          break;
        case 'Multifocal':
          // Try to match with common multifocal categories
          const multifocalCategories = ['BB', 'MC', 'CR', 'BBPG', 'PG'];
          targetCategory = multifocalCategories[0]; // Default to first one, will search all
          break;
      }
    } else {
      // For single vision errors, try to match with common categories
      const singleVisionCategories = [
        'bb 1.61', 'bb 1.67', 'bbpg 1.61', 'pg',
        'anti flash', 'anti glare', 'photo pink', 'photo blue', 
        'photo purple', 'photo brown', 'cr', 'mc'
      ];
      targetCategory = singleVisionCategories[0]; // Default to first one, will search all
    }

    console.log(`🎯 Searching for ${targetType} lenses to deduct from`);

    // Query for potential matching lenses
    const lensQuery = query(
      collection(db, 'lenses'),
      where('store', '==', errorLens.store || 'win'),
      where('type', '==', targetType)
    );

    const querySnapshot = await getDocs(lensQuery);
    const availableLenses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📋 Found ${availableLenses.length} potential matching lenses`);

    // Find the best matching lens based on prescription and availability
    const matchingLens = availableLenses.find(lens => {
      // Skip if no quantity available
      if (lens.qty <= 0) {
        return false;
      }

      // Check prescription properties match
      if (!matchingLensProperties(errorLens, lens)) {
        return false;
      }

      // For bifocal lenses, check bifocal type and category match
      if (errorLens.bifocalType) {
        if (lens.bifocalType !== errorLens.bifocalType) {
          return false;
        }

        // For Flattop bifocal, check individual eye quantities
        if (errorLens.bifocalType === 'Flattop') {
          const hasEnoughRight = !errorLens.rightQty || (lens.rightQty >= errorLens.rightQty);
          const hasEnoughLeft = !errorLens.leftQty || (lens.leftQty >= errorLens.leftQty);
          return hasEnoughRight && hasEnoughLeft;
        } else {
          // For Fuse/Multifocal, check total quantity
          return lens.qty >= errorLens.qty;
        }
      } else {
        // For single vision errors, check total quantity
        return lens.qty >= errorLens.qty;
      }
    });

    if (!matchingLens) {
      console.log('❌ No matching lens found for error deduction');
      return {
        success: false,
        message: 'No matching lens found in inventory to deduct from'
      };
    }

    console.log('✅ Found matching lens:', matchingLens.code, 'with qty:', matchingLens.qty);

    // Perform the deduction
    const lensRef = doc(db, 'lenses', matchingLens.id);
    
    if (errorLens.bifocalType === 'Flattop') {
      // Handle Flattop bifocal error deduction
      const newRightQty = Math.max(0, (matchingLens.rightQty || 0) - (errorLens.rightQty || 0));
      const newLeftQty = Math.max(0, (matchingLens.leftQty || 0) - (errorLens.leftQty || 0));
      const newTotalQty = newRightQty + newLeftQty;
      
      // Update sold quantities to track the error deduction
      const newRightSoldQty = (matchingLens.rightSoldQty || 0) + (errorLens.rightQty || 0);
      const newLeftSoldQty = (matchingLens.leftSoldQty || 0) + (errorLens.leftQty || 0);
      const newTotalSoldQty = (matchingLens.soldQty || 0) + (errorLens.rightQty || 0) + (errorLens.leftQty || 0);
      
      await updateDoc(lensRef, {
        rightQty: newRightQty,
        leftQty: newLeftQty,
        qty: newTotalQty,
        rightSoldQty: newRightSoldQty,
        leftSoldQty: newLeftSoldQty,
        soldQty: newTotalSoldQty,
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ Deducted Flattop bifocal error quantities - Right: ${errorLens.rightQty}, Left: ${errorLens.leftQty}`);
      
      return {
        success: true,
        message: `Successfully deducted ${(errorLens.rightQty || 0) + (errorLens.leftQty || 0)} pieces from ${matchingLens.code}`,
        deductedFromLens: matchingLens,
        deductedRightQty: errorLens.rightQty || 0,
        deductedLeftQty: errorLens.leftQty || 0
      };
    } else {
      // Handle single vision or non-Flattop bifocal error deduction
      const newQty = Math.max(0, matchingLens.qty - errorLens.qty);
      const newSoldQty = (matchingLens.soldQty || 0) + errorLens.qty;
      
      await updateDoc(lensRef, {
        qty: newQty,
        soldQty: newSoldQty,
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ Deducted ${errorLens.qty} pieces from lens ${matchingLens.code}`);
      
      return {
        success: true,
        message: `Successfully deducted ${errorLens.qty} pieces from ${matchingLens.code}`,
        deductedFromLens: matchingLens,
        deductedQuantity: errorLens.qty
      };
    }
  } catch (error) {
    console.error('❌ Error during inventory deduction:', error);
    return {
      success: false,
      message: 'Failed to deduct from inventory due to system error'
    };
  }
}

/**
 * Helper function to check if lens properties match for deduction
 */
function matchingLensProperties(errorLens: any, targetLens: any): boolean {
  // Check SPH match
  if (errorLens.sph && targetLens.sph && errorLens.sph !== targetLens.sph) {
    return false;
  }
  
  // Check CYL match (for single vision)
  if (!errorLens.bifocalType && errorLens.cyl && targetLens.cyl && errorLens.cyl !== targetLens.cyl) {
    return false;
  }
  
  // Check AXIS match (for single vision)
  if (!errorLens.bifocalType && errorLens.axis && targetLens.axis && errorLens.axis !== targetLens.axis) {
    return false;
  }
  
  // Check Addition match for bifocal lenses
  if (errorLens.bifocalType && errorLens.addition && targetLens.addition && errorLens.addition !== targetLens.addition) {
    return false;
  }
  
  // For Flattop bifocal lenses, check individual eye prescriptions
  if (errorLens.bifocalType === 'Flattop') {
    if (errorLens.Right && targetLens.Right && errorLens.Right !== targetLens.Right) {
      return false;
    }
    
    if (errorLens.Left && targetLens.Left && errorLens.Left !== targetLens.Left) {
      return false;
    }
    
    if (errorLens.rightCyl && targetLens.rightCyl && errorLens.rightCyl !== targetLens.rightCyl) {
      return false;
    }
    
    if (errorLens.leftCyl && targetLens.leftCyl && errorLens.leftCyl !== targetLens.leftCyl) {
      return false;
    }
    
    if (errorLens.rightAxis && targetLens.rightAxis && errorLens.rightAxis !== targetLens.rightAxis) {
      return false;
    }
    
    if (errorLens.leftAxis && targetLens.leftAxis && errorLens.leftAxis !== targetLens.leftAxis) {
      return false;
    }
  }
  
  return true;
}

/**
 * Log error deduction for audit trail
 */
export async function logErrorDeduction(errorLens: any, matchingLens: any, deductionResult: ErrorLensDeductionResult): Promise<void> {
  try {
    await addDoc(collection(db, 'errorDeductions'), {
      errorLensId: errorLens.id || 'new-error-lens',
      errorLensCode: errorLens.code,
      matchingLensId: matchingLens.id,
      matchingLensCode: matchingLens.code,
      deductedQty: deductionResult.deductedQuantity || 0,
      deductedRightQty: deductionResult.deductedRightQty || 0,
      deductedLeftQty: deductionResult.deductedLeftQty || 0,
      errorReason: errorLens.errorReason,
      errorCategory: 'factory error',
      originalCategory: matchingLens.category,
      store: errorLens.store,
      prescription: {
        sph: errorLens.sph,
        cyl: errorLens.cyl,
        axis: errorLens.axis,
        addition: errorLens.addition,
        Right: errorLens.Right,
        Left: errorLens.Left,
        rightCyl: errorLens.rightCyl,
        leftCyl: errorLens.leftCyl,
        rightAxis: errorLens.rightAxis,
        leftAxis: errorLens.leftAxis
      },
      success: deductionResult.success,
      message: deductionResult.message,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging deduction:', error);
  }
}