import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Enhanced matching interface for error lenses
export interface ErrorLensData {
  id?: string;
  code: string;
  type: string;
  bifocalType?: string;
  smsBifocalType?: string;
  yangonOrderSubType?: string;
  yangonOrderBifocalType?: string;
  category: string;
  qty: number;
  rightQty?: number;
  leftQty?: number;
  price: number;
  sph?: string;
  cyl?: string;
  axis?: string;
  addition?: string;
  Right?: string;
  Left?: string;
  rightAxis?: string;
  leftAxis?: string;
  rightCyl?: string;
  leftCyl?: string;
  store?: string;
  errorReason?: string;
  yangonOrderName?: string;
  yangonOrderWithG?: boolean;
}

// Enhanced lens matching properties checker
export function matchingLensPropertiesEnhanced(errorLens: ErrorLensData, targetLens: any): boolean {
  console.log('🔍 Checking lens match:', {
    errorCode: errorLens.code,
    targetCode: targetLens.code,
    errorType: errorLens.type,
    targetType: targetLens.type
  });

  // Check lens name/code similarity (partial match for flexibility)
  const errorName = errorLens.code.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetName = targetLens.code.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Extract base name (remove numbers and special chars for better matching)
  const errorBaseName = errorName.replace(/\d+/g, '').substring(0, 6);
  const targetBaseName = targetName.replace(/\d+/g, '').substring(0, 6);
  
  const nameMatch = errorBaseName === targetBaseName || 
                   errorName.includes(targetBaseName) || 
                   targetName.includes(errorBaseName);

  if (!nameMatch) {
    console.log('❌ Name mismatch:', { errorBaseName, targetBaseName });
    return false;
  }

  // Check SPH match (exact)
  if (errorLens.sph && targetLens.sph && errorLens.sph !== targetLens.sph) {
    console.log('❌ SPH mismatch:', { error: errorLens.sph, target: targetLens.sph });
    return false;
  }
  
  // Check CYL match (exact)
  if (errorLens.cyl && targetLens.cyl && errorLens.cyl !== targetLens.cyl) {
    console.log('❌ CYL mismatch:', { error: errorLens.cyl, target: targetLens.cyl });
    return false;
  }
  
  // Check AXIS match (exact)
  if (errorLens.axis && targetLens.axis && errorLens.axis !== targetLens.axis) {
    console.log('❌ AXIS mismatch:', { error: errorLens.axis, target: targetLens.axis });
    return false;
  }
  
  // Check Addition match for bifocal lenses (exact)
  if (errorLens.addition && targetLens.addition && errorLens.addition !== targetLens.addition) {
    console.log('❌ Addition mismatch:', { error: errorLens.addition, target: targetLens.addition });
    return false;
  }
  
  // For Flattop bifocal lenses, check individual eye prescriptions (exact)
  if (errorLens.Right && targetLens.Right && errorLens.Right !== targetLens.Right) {
    console.log('❌ Right eye mismatch:', { error: errorLens.Right, target: targetLens.Right });
    return false;
  }
  
  if (errorLens.Left && targetLens.Left && errorLens.Left !== targetLens.Left) {
    console.log('❌ Left eye mismatch:', { error: errorLens.Left, target: targetLens.Left });
    return false;
  }
  
  if (errorLens.rightCyl && targetLens.rightCyl && errorLens.rightCyl !== targetLens.rightCyl) {
    console.log('❌ Right CYL mismatch:', { error: errorLens.rightCyl, target: targetLens.rightCyl });
    return false;
  }
  
  if (errorLens.leftCyl && targetLens.leftCyl && errorLens.leftCyl !== targetLens.leftCyl) {
    console.log('❌ Left CYL mismatch:', { error: errorLens.leftCyl, target: targetLens.leftCyl });
    return false;
  }
  
  if (errorLens.rightAxis && targetLens.rightAxis && errorLens.rightAxis !== targetLens.rightAxis) {
    console.log('❌ Right AXIS mismatch:', { error: errorLens.rightAxis, target: targetLens.rightAxis });
    return false;
  }
  
  if (errorLens.leftAxis && targetLens.leftAxis && errorLens.leftAxis !== targetLens.leftAxis) {
    console.log('❌ Left AXIS mismatch:', { error: errorLens.leftAxis, target: targetLens.leftAxis });
    return false;
  }

  // Check bifocal type match
  if (errorLens.bifocalType && targetLens.bifocalType && errorLens.bifocalType !== targetLens.bifocalType) {
    console.log('❌ Bifocal type mismatch:', { error: errorLens.bifocalType, target: targetLens.bifocalType });
    return false;
  }

  console.log('✅ Lens properties match!');
  return true;
}

// Enhanced function to find matching lens for error quantity addition
export async function findMatchingLensForErrorAddition(errorLens: ErrorLensData): Promise<any | null> {
  try {
    console.log('🔍 Finding matching lens for error quantity addition:', {
      code: errorLens.code,
      type: errorLens.type,
      category: errorLens.category,
      store: errorLens.store
    });
    
    // Determine the target lens types to search for based on error lens properties
    let targetTypes = ['Single Vision'];
    
    if (errorLens.bifocalType) {
      targetTypes = ['Bifocal'];
    }

    console.log(`🎯 Searching for lens types: ${targetTypes.join(', ')} in store: ${errorLens.store || 'win'}`);

    // Query for all potential matching lenses
    const lensQuery = query(
      collection(db, 'lenses'),
      where('store', '==', errorLens.store || 'win')
    );

    const querySnapshot = await getDocs(lensQuery);
    const availableLenses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📋 Found ${availableLenses.length} total lenses in store`);

    // Filter lenses by type and then by properties
    const candidateLenses = availableLenses.filter(lens => {
      // Skip error lenses and SMS lenses
      if (lens.type === 'Error' || lens.type === 'SMS' || lens.type === 'Yangon Order') {
        return false;
      }

      // Check if lens type matches our target types
      if (!targetTypes.includes(lens.type)) {
        return false;
      }

      return true;
    });

    console.log(`📋 Found ${candidateLenses.length} candidate lenses after type filtering`);

    // Find the best matching lens based on all properties
    const matchingLenses = candidateLenses.filter(lens => {
      return matchingLensPropertiesEnhanced(errorLens, lens);
    });

    console.log(`📋 Found ${matchingLenses.length} matching lenses after property filtering`);

    if (matchingLenses.length > 0) {
      // If multiple matches, prefer the one with higher remaining quantity
      const bestMatch = matchingLenses.reduce((best, current) => {
        return (current.qty || 0) > (best.qty || 0) ? current : best;
      });

      console.log('✅ Found best matching lens:', {
        code: bestMatch.code,
        type: bestMatch.type,
        category: bestMatch.category,
        qty: bestMatch.qty,
        currentErrorQty: bestMatch.errorQty || 0
      });

      return bestMatch;
    } else {
      console.log('❌ No matching lens found for error quantity addition');
      console.log('🔍 Search criteria:', {
        store: errorLens.store,
        targetTypes,
        errorQty: errorLens.qty,
        errorRightQty: errorLens.rightQty,
        errorLeftQty: errorLens.leftQty,
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
        }
      });
    }

    return null;
  } catch (error) {
    console.error('❌ Error finding matching lens for error addition:', error);
    return null;
  }
}

// Enhanced function to add error quantity to matching lens
export async function addErrorQuantityToMatchingLens(errorLens: ErrorLensData): Promise<boolean> {
  try {
    console.log('🚀 Starting error quantity addition to matching lens for:', errorLens.code);
    
    const matchingLens = await findMatchingLensForErrorAddition(errorLens);
    
    if (!matchingLens) {
      console.warn('⚠️ No matching lens found for error quantity addition');
      return false;
    }

    const lensRef = doc(db, 'lenses', matchingLens.id);
    
    if (errorLens.bifocalType && errorLens.bifocalType === 'Flattop') {
      // Handle Flattop bifocal error addition
      const newRightErrorQty = (matchingLens.rightErrorQty || 0) + (errorLens.rightQty || 0);
      const newLeftErrorQty = (matchingLens.leftErrorQty || 0) + (errorLens.leftQty || 0);
      const newTotalErrorQty = (matchingLens.errorQty || 0) + (errorLens.rightQty || 0) + (errorLens.leftQty || 0);
      
      await updateDoc(lensRef, {
        rightErrorQty: newRightErrorQty,
        leftErrorQty: newLeftErrorQty,
        errorQty: newTotalErrorQty,
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ Added Flattop bifocal error quantities - Right: ${errorLens.rightQty}, Left: ${errorLens.leftQty} to lens ${matchingLens.code}`);
      console.log(`📊 Updated error tracking - Right Error: ${newRightErrorQty}, Left Error: ${newLeftErrorQty}, Total Error: ${newTotalErrorQty}`);
    } else {
      // Handle single vision or non-Flattop bifocal error addition
      const newErrorQty = (matchingLens.errorQty || 0) + errorLens.qty;
      
      await updateDoc(lensRef, {
        errorQty: newErrorQty,
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ Added ${errorLens.qty} error pieces to lens ${matchingLens.code}`);
      console.log(`📊 Updated error tracking - Total Error: ${newErrorQty}`);
    }
    
    // Log the error addition for tracking
    await addDoc(collection(db, 'errorAdditions'), {
      errorLensId: errorLens.id || 'new-error-lens',
      errorLensCode: errorLens.code,
      matchingLensId: matchingLens.id,
      matchingLensCode: matchingLens.code,
      addedQty: errorLens.qty,
      addedRightQty: errorLens.rightQty || 0,
      addedLeftQty: errorLens.leftQty || 0,
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
      matchingCriteria: {
        nameMatch: true,
        prescriptionMatch: true,
        bifocalTypeMatch: errorLens.bifocalType === matchingLens.bifocalType
      },
      createdAt: serverTimestamp(),
    });
    
    console.log('📝 Error addition logged successfully');
    return true;
  } catch (error) {
    console.error('❌ Error adding quantity to matching lens:', error);
    return false;
  }
}

// Function to get error statistics for a lens
export async function getErrorStatistics(lensId: string) {
  try {
    const errorAdditionsQuery = query(
      collection(db, 'errorAdditions'),
      where('matchingLensId', '==', lensId)
    );
    
    const snapshot = await getDocs(errorAdditionsQuery);
    const errorAdditions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalErrorSources = errorAdditions.length;
    const totalErrorQuantity = errorAdditions.reduce((sum, addition) => sum + (addition.addedQty || 0), 0);
    const errorReasons = [...new Set(errorAdditions.map(addition => addition.errorReason))];

    return {
      totalErrorSources,
      totalErrorQuantity,
      errorReasons,
      errorAdditions
    };
  } catch (error) {
    console.error('Error getting error statistics:', error);
    return {
      totalErrorSources: 0,
      totalErrorQuantity: 0,
      errorReasons: [],
      errorAdditions: []
    };
  }
}