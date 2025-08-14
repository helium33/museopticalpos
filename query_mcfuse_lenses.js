// Script to query mcfuse lenses with total qty 3 and remaining qty 3
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnR5SMrO8vhO1lEPRx1Ctg6gxyhYfVMp0",
  authDomain: "store-b8644.firebaseapp.com",
  projectId: "store-b8644",
  storageBucket: "store-b8644.appspot.com",
  messagingSenderId: "353628807781",
  appId: "1:353628807781:web:950616402c6e1157729c8c",
  measurementId: "G-YL7NLQBLG9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function queryMcfuseLenses() {
  try {
    console.log('🔍 Querying for mcfuse lenses with total qty 3 and remaining qty 3...');
    
    // Query for mcfuse category lenses
    const lensQuery = query(
      collection(db, 'lenses'),
      where('category', '==', 'mcfuse'),
      orderBy('code')
    );

    const querySnapshot = await getDocs(lensQuery);
    
    console.log(`📊 Found ${querySnapshot.docs.length} mcfuse lenses in database`);
    
    const mcfuseLenses = [];
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Calculate quantities
      const remainingQty = Number(data.qty) || 0;
      const soldQty = Number(data.soldQty) || 0;
      const errorQty = Number(data.errorQty) || 0;
      const restockQty = Number(data.restockQty) || 0;
      const originalQty = Number(data.originalQty) || remainingQty + soldQty + errorQty;
      const totalQty = originalQty + restockQty;
      
      // Filter for total qty 3 and remaining qty 3
      if (totalQty === 3 && remainingQty === 3) {
        mcfuseLenses.push({
          id: doc.id,
          code: data.code,
          category: data.category,
          type: data.type,
          sph: data.sph,
          cyl: data.cyl,
          axis: data.axis,
          addition: data.addition,
          price: Number(data.price) || 0,
          remainingQty: remainingQty,
          totalQty: totalQty,
          soldQty: soldQty,
          errorQty: errorQty,
          restockQty: restockQty,
          originalQty: originalQty,
          rightQty: Number(data.rightQty) || 0,
          leftQty: Number(data.leftQty) || 0,
          rightSoldQty: Number(data.rightSoldQty) || 0,
          leftSoldQty: Number(data.leftSoldQty) || 0,
          rightErrorQty: Number(data.rightErrorQty) || 0,
          leftErrorQty: Number(data.leftErrorQty) || 0,
          lastUpdated: data.lastUpdated || data.updatedAt || 'N/A',
          yangonOrderName: data.yangonOrderName || 'N/A'
        });
      }
    });
    
    console.log(`\n✅ Found ${mcfuseLenses.length} mcfuse lenses with total qty 3 and remaining qty 3:`);
    
    if (mcfuseLenses.length === 0) {
      console.log('❌ No mcfuse lenses found with the specified criteria');
      
      // Show all mcfuse lenses for reference
      console.log('\n📋 All mcfuse lenses in database:');
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const remainingQty = Number(data.qty) || 0;
        const soldQty = Number(data.soldQty) || 0;
        const errorQty = Number(data.errorQty) || 0;
        const restockQty = Number(data.restockQty) || 0;
        const originalQty = Number(data.originalQty) || remainingQty + soldQty + errorQty;
        const totalQty = originalQty + restockQty;
        
        console.log(`  📍 ${data.code}: Total=${totalQty}, Remaining=${remainingQty}, Category=${data.category}`);
      });
    } else {
      // Display the matching lenses
      mcfuseLenses.forEach((lens, index) => {
        console.log(`\n📦 Lens ${index + 1}:`);
        console.log(`   Code: ${lens.code}`);
        console.log(`   Category: ${lens.category}`);
        console.log(`   Type: ${lens.type}`);
        console.log(`   SPH: ${lens.sph}, CYL: ${lens.cyl}, AXIS: ${lens.axis}`);
        if (lens.addition) console.log(`   Addition: ${lens.addition}`);
        console.log(`   Price: ${lens.price}`);
        console.log(`   Total Qty: ${lens.totalQty}`);
        console.log(`   Remaining Qty: ${lens.remainingQty}`);
        console.log(`   Right Qty: ${lens.rightQty}, Left Qty: ${lens.leftQty}`);
        console.log(`   Sold Qty: ${lens.soldQty} (R: ${lens.rightSoldQty}, L: ${lens.leftSoldQty})`);
        console.log(`   Error Qty: ${lens.errorQty} (R: ${lens.rightErrorQty}, L: ${lens.leftErrorQty})`);
        console.log(`   Restock Qty: ${lens.restockQty}`);
        console.log(`   Last Updated: ${lens.lastUpdated}`);
        if (lens.yangonOrderName !== 'N/A') console.log(`   Yangon Order: ${lens.yangonOrderName}`);
      });
      
      // Limit to 3 as requested
      if (mcfuseLenses.length > 3) {
        console.log(`\n📋 Showing only first 3 mcfuse lenses as requested (out of ${mcfuseLenses.length} total)`);
        return mcfuseLenses.slice(0, 3);
      }
    }
    
    return mcfuseLenses;
    
  } catch (error) {
    console.error('❌ Error querying mcfuse lenses:', error);
    throw error;
  }
}

// Export for use in other scripts
export { queryMcfuseLenses };

// Run the query if this script is executed directly
if (typeof window === 'undefined') {
  queryMcfuseLenses()
    .then(results => {
      console.log(`\n🎯 Query completed. Found ${results.length} matching mcfuse lenses.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Query failed:', error);
      process.exit(1);
    });
}