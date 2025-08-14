import { collection, query, where, getDocs, doc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { LensFormData } from '../components/lens/LensForm';

export interface SMSDeductionResult {
  success: boolean;
  message: string;
  deductedFrom?: {
    id: string;
    code: string;
    category: string;
    deductedQty: number;
    rightDeducted?: number;
    leftDeducted?: number;
  };
}

/**
 * Deduct quantities from matching lens inventory when SMS lens is created
 */
export const deductQuantityFromMatchingLensForSMS = async (smsLensData: LensFormData): Promise<SMSDeductionResult> => {
  try {
    console.log('🔍 SMS Inventory Deduction - Starting search for matching lens:', {
      smsType: smsLensData.type,
      smsBifocalType: smsLensData.smsBifocalType,
      category: smsLensData.category,
      sph: smsLensData.sph,
      cyl: smsLensData.cyl,
      axis: smsLensData.axis,
      addition: smsLensData.addition,
      smsQty: smsLensData.qty,
      smsRightQty: smsLensData.rightQty,
      smsLeftQty: smsLensData.leftQty
    });

    // Determine the matching lens type based on SMS bifocal type
    let matchingLensType: string;
    let matchingBifocalType: string | undefined;

    if (!smsLensData.smsBifocalType) {
      // SMS Single Vision -> Match with Single Vision
      matchingLensType = 'Single Vision';
      matchingBifocalType = undefined;
    } else {
      // SMS Bifocal -> Match with corresponding Bifocal type
      matchingLensType = 'Bifocal';
      matchingBifocalType = smsLensData.smsBifocalType;
    }

    console.log('🎯 SMS Deduction - Target matching lens type:', {
      matchingLensType,
      matchingBifocalType
    });

    // Build the base query
    const lensesRef = collection(db, 'lenses');
    let queryConstraints = [
      where('type', '==', matchingLensType),
      where('category', '==', smsLensData.category)
    ];

    // Add bifocal type constraint if needed
    if (matchingBifocalType) {
      queryConstraints.push(where('bifocalType', '==', matchingBifocalType));
    }

    // Execute the query
    const matchingQuery = query(lensesRef, ...queryConstraints);
    const querySnapshot = await getDocs(matchingQuery);

    console.log('📊 SMS Deduction - Found', querySnapshot.docs.length, 'potential matching lenses');

    // Filter by prescription details
    const matchingLenses = querySnapshot.docs.filter(doc => {
      const lensData = doc.data();
      
      if (matchingLensType === 'Single Vision') {
        // For Single Vision, match sph, cyl, axis
        return lensData.sph === smsLensData.sph &&
               lensData.cyl === smsLensData.cyl &&
               lensData.axis === smsLensData.axis;
      } else {
        // For Bifocal, match based on bifocal type
        if (matchingBifocalType === 'Flattop') {
          // For Flattop, match detailed measurements
          return lensData.sph === smsLensData.sph &&
                 lensData.addition === smsLensData.addition &&
                 lensData.Left === smsLensData.Left &&
                 lensData.Right === smsLensData.Right &&
                 lensData.leftCyl === smsLensData.leftCyl &&
                 lensData.rightCyl === smsLensData.rightCyl &&
                 lensData.leftAxis === smsLensData.leftAxis &&
                 lensData.rightAxis === smsLensData.rightAxis;
        } else {
          // For Fuse/Multifocal, match sph and addition
          return lensData.sph === smsLensData.sph &&
                 lensData.addition === smsLensData.addition;
        }
      }
    });

    console.log('🔍 SMS Deduction - Found', matchingLenses.length, 'exactly matching lenses after prescription filter');

    if (matchingLenses.length === 0) {
      return {
        success: false,
        message: `No matching ${matchingLensType}${matchingBifocalType ? ` ${matchingBifocalType}` : ''} lens found with category "${smsLensData.category}" and matching prescription`
      };
    }

    // Find the best matching lens (prioritize by available quantity)
    let bestMatch = matchingLenses[0];
    let bestMatchData = bestMatch.data();
    let bestAvailableQty = bestMatchData.qty || 0;

    for (const lens of matchingLenses) {
      const lensData = lens.data();
      const availableQty = lensData.qty || 0;
      if (availableQty > bestAvailableQty) {
        bestMatch = lens;
        bestMatchData = lensData;
        bestAvailableQty = availableQty;
      }
    }

    console.log('🎯 SMS Deduction - Best matching lens found:', {
      id: bestMatch.id,
      code: bestMatchData.code,
      category: bestMatchData.category,
      availableQty: bestAvailableQty,
      type: bestMatchData.type,
      bifocalType: bestMatchData.bifocalType
    });

    // Perform the deduction using transaction for atomicity
    const result = await runTransaction(db, async (transaction) => {
      const matchingLensRef = doc(db, 'lenses', bestMatch.id);
      const currentDoc = await transaction.get(matchingLensRef);
      
      if (!currentDoc.exists()) {
        throw new Error('Matching lens no longer exists');
      }

      const currentData = currentDoc.data();
      
      // Check if SMS is Flattop bifocal type
      const isFlattopSMS = smsLensData.smsBifocalType === 'Flattop';
      
      if (isFlattopSMS) {
        // Handle Flattop bifocal SMS deduction
        const currentRightQty = currentData.rightQty || 0;
        const currentLeftQty = currentData.leftQty || 0;
        const smsRightQty = smsLensData.rightQty || 0;
        const smsLeftQty = smsLensData.leftQty || 0;

        console.log('📊 SMS Flattop Deduction - Current vs SMS quantities:', {
          currentRight: currentRightQty,
          currentLeft: currentLeftQty,
          smsRight: smsRightQty,
          smsLeft: smsLeftQty
        });

        // Validate sufficient quantities
        if (currentRightQty < smsRightQty) {
          throw new Error(`Insufficient right eye quantity in matching lens. Available: ${currentRightQty}, Required: ${smsRightQty}`);
        }
        if (currentLeftQty < smsLeftQty) {
          throw new Error(`Insufficient left eye quantity in matching lens. Available: ${currentLeftQty}, Required: ${smsLeftQty}`);
        }

        // Deduct right and left quantities
        transaction.update(matchingLensRef, {
          rightQty: increment(-smsRightQty),
          leftQty: increment(-smsLeftQty),
          qty: increment(-(smsRightQty + smsLeftQty)),
          soldQty: increment(smsRightQty + smsLeftQty),
          rightSoldQty: increment(smsRightQty),
          leftSoldQty: increment(smsLeftQty),
          lastUpdated: new Date()
        });

        return {
          success: true,
          message: `Successfully deducted ${smsRightQty + smsLeftQty} pieces (R:${smsRightQty}, L:${smsLeftQty}) from ${matchingLensType}${matchingBifocalType ? ` ${matchingBifocalType}` : ''} lens "${currentData.code}"`,
          deductedFrom: {
            id: bestMatch.id,
            code: currentData.code,
            category: currentData.category,
            deductedQty: smsRightQty + smsLeftQty,
            rightDeducted: smsRightQty,
            leftDeducted: smsLeftQty
          }
        };
      } else {
        // Handle regular SMS deduction
        const currentQty = currentData.qty || 0;
        const smsQty = smsLensData.qty || 0;

        console.log('📊 SMS Regular Deduction - Current vs SMS quantity:', {
          current: currentQty,
          sms: smsQty
        });

        // Validate sufficient quantity
        if (currentQty < smsQty) {
          throw new Error(`Insufficient quantity in matching lens. Available: ${currentQty}, Required: ${smsQty}`);
        }

        // Deduct the quantity
        transaction.update(matchingLensRef, {
          qty: increment(-smsQty),
          soldQty: increment(smsQty),
          lastUpdated: new Date()
        });

        return {
          success: true,
          message: `Successfully deducted ${smsQty} pieces from ${matchingLensType}${matchingBifocalType ? ` ${matchingBifocalType}` : ''} lens "${currentData.code}"`,
          deductedFrom: {
            id: bestMatch.id,
            code: currentData.code,
            category: currentData.category,
            deductedQty: smsQty
          }
        };
      }
    });

    console.log('✅ SMS Deduction completed successfully:', result);
    return result;

  } catch (error) {
    console.error('❌ SMS Deduction error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during SMS inventory deduction'
    };
  }
};

/**
 * Preview what would be deducted for SMS creation (for validation/preview purposes)
 */
export const previewSMSDeduction = async (smsLensData: LensFormData): Promise<{
  found: boolean;
  matchingLens?: {
    id: string;
    code: string;
    category: string;
    type: string;
    bifocalType?: string;
    availableQty: number;
    rightQty?: number;
    leftQty?: number;
  };
  message: string;
}> => {
  try {
    // Determine the matching lens type
    let matchingLensType: string;
    let matchingBifocalType: string | undefined;

    if (!smsLensData.smsBifocalType) {
      matchingLensType = 'Single Vision';
      matchingBifocalType = undefined;
    } else {
      matchingLensType = 'Bifocal';
      matchingBifocalType = smsLensData.smsBifocalType;
    }

    // Build the query
    const lensesRef = collection(db, 'lenses');
    let queryConstraints = [
      where('type', '==', matchingLensType),
      where('category', '==', smsLensData.category)
    ];

    if (matchingBifocalType) {
      queryConstraints.push(where('bifocalType', '==', matchingBifocalType));
    }

    const matchingQuery = query(lensesRef, ...queryConstraints);
    const querySnapshot = await getDocs(matchingQuery);

    // Filter by prescription details
    const matchingLenses = querySnapshot.docs.filter(doc => {
      const lensData = doc.data();
      
      if (matchingLensType === 'Single Vision') {
        return lensData.sph === smsLensData.sph &&
               lensData.cyl === smsLensData.cyl &&
               lensData.axis === smsLensData.axis;
      } else {
        if (matchingBifocalType === 'Flattop') {
          return lensData.sph === smsLensData.sph &&
                 lensData.addition === smsLensData.addition &&
                 lensData.Left === smsLensData.Left &&
                 lensData.Right === smsLensData.Right &&
                 lensData.leftCyl === smsLensData.leftCyl &&
                 lensData.rightCyl === smsLensData.rightCyl &&
                 lensData.leftAxis === smsLensData.leftAxis &&
                 lensData.rightAxis === smsLensData.rightAxis;
        } else {
          return lensData.sph === smsLensData.sph &&
                 lensData.addition === smsLensData.addition;
        }
      }
    });

    if (matchingLenses.length === 0) {
      return {
        found: false,
        message: `No matching ${matchingLensType}${matchingBifocalType ? ` ${matchingBifocalType}` : ''} lens found`
      };
    }

    const bestMatch = matchingLenses[0];
    const bestMatchData = bestMatch.data();

    return {
      found: true,
      matchingLens: {
        id: bestMatch.id,
        code: bestMatchData.code,
        category: bestMatchData.category,
        type: bestMatchData.type,
        bifocalType: bestMatchData.bifocalType,
        availableQty: bestMatchData.qty || 0,
        rightQty: bestMatchData.rightQty,
        leftQty: bestMatchData.leftQty
      },
      message: `Found matching lens: ${bestMatchData.code}`
    };

  } catch (error) {
    return {
      found: false,
      message: error instanceof Error ? error.message : 'Error during preview'
    };
  }
};