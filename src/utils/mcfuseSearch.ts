// Utility for searching MCFUSE lenses with specific criteria
import { LensFormData } from '../components/lens/LensForm';

export interface McfuseSearchResult {
  found: boolean;
  count: number;
  lenses: LensFormData[];
  allMcfuse: LensFormData[];
}

/**
 * Search for MCFUSE lenses with total qty 3 and remaining qty 3
 * @param lenses - Array of all lenses
 * @returns Search results with matching lenses
 */
export const searchMcfuseLenses = (lenses: LensFormData[]): McfuseSearchResult => {
  console.log('🔍 Searching for MCFUSE lenses with total qty 3 and remaining qty 3...');
  
  // Filter mcfuse lenses with total qty 3 and remaining qty 3
  const mcfuseLenses = lenses.filter(lens => {
    const isMatchingCategory = lens.category === 'mcfuse';
    const remainingQty = lens.qty;
    const totalQty = lens.originalQty + (lens.restockQty || 0);
    const matchesCriteria = remainingQty === 3 && totalQty === 3;
    
    return isMatchingCategory && matchesCriteria;
  });
  
  // Also get all mcfuse lenses for reference
  const allMcfuse = lenses.filter(lens => lens.category === 'mcfuse');
  
  const result: McfuseSearchResult = {
    found: mcfuseLenses.length > 0,
    count: mcfuseLenses.length,
    lenses: mcfuseLenses.slice(0, 3), // Limit to 3 as requested
    allMcfuse: allMcfuse
  };
  
  if (result.found) {
    console.log(`🎯 Found ${result.count} mcfuse lenses with total qty 3 and remaining qty 3:`);
    result.lenses.forEach((lens, index) => {
      console.log(`\n📦 MCFUSE Lens ${index + 1}:`);
      console.log(`   Code: ${lens.code}`);
      console.log(`   Category: ${lens.category}`);
      console.log(`   Type: ${lens.type}`);
      console.log(`   SPH: ${lens.sph}, CYL: ${lens.cyl}, AXIS: ${lens.axis}`);
      if (lens.addition) console.log(`   Addition: ${lens.addition}`);
      console.log(`   Price: ${lens.price}`);
      console.log(`   Total Qty: ${lens.originalQty + (lens.restockQty || 0)}`);
      console.log(`   Remaining Qty: ${lens.qty}`);
      console.log(`   Right Qty: ${lens.rightQty}, Left Qty: ${lens.leftQty}`);
      console.log(`   Sold Qty: ${lens.soldQty}`);
      console.log(`   Error Qty: ${lens.errorQty}`);
      if (lens.yangonOrderName) console.log(`   Yangon Order: ${lens.yangonOrderName}`);
    });
  } else {
    console.log(`\n📋 All mcfuse lenses in database (${allMcfuse.length} total):`);
    allMcfuse.forEach(lens => {
      const totalQty = lens.originalQty + (lens.restockQty || 0);
      console.log(`   📍 ${lens.code}: Total=${totalQty}, Remaining=${lens.qty}, Category=${lens.category}`);
    });
  }
  
  return result;
};

/**
 * Format mcfuse search results for display
 * @param result - Search results from searchMcfuseLenses
 * @returns Formatted string for display
 */
export const formatMcfuseResults = (result: McfuseSearchResult): string => {
  if (result.found) {
    return `Found ${result.count} MCFUSE lenses with total qty 3 and remaining qty 3! Showing first 3 results. Check console for full details.`;
  } else if (result.allMcfuse.length > 0) {
    return `No MCFUSE lenses found with total qty 3 and remaining qty 3. Found ${result.allMcfuse.length} total mcfuse lenses. Check console for details.`;
  } else {
    return 'No MCFUSE lenses found in the database.';
  }
};

/**
 * Get summary statistics for mcfuse lenses
 * @param lenses - Array of all lenses
 * @returns Summary statistics
 */
export const getMcfuseStats = (lenses: LensFormData[]) => {
  const mcfuseLenses = lenses.filter(lens => lens.category === 'mcfuse');
  
  const stats = {
    total: mcfuseLenses.length,
    inStock: mcfuseLenses.filter(lens => lens.qty > 0).length,
    outOfStock: mcfuseLenses.filter(lens => lens.qty === 0).length,
    lowStock: mcfuseLenses.filter(lens => lens.qty > 0 && lens.qty <= 2).length,
    totalValue: mcfuseLenses.reduce((sum, lens) => sum + (lens.price * lens.qty), 0),
    totalSold: mcfuseLenses.reduce((sum, lens) => sum + (lens.soldQty || 0), 0),
    totalErrors: mcfuseLenses.reduce((sum, lens) => sum + (lens.errorQty || 0), 0),
    avgPrice: mcfuseLenses.length > 0 
      ? mcfuseLenses.reduce((sum, lens) => sum + lens.price, 0) / mcfuseLenses.length 
      : 0
  };
  
  return stats;
};