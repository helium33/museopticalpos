// Yangon Office Firebase Firestore Setup
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  setDoc,
  serverTimestamp, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import toast from 'react-hot-toast';

// Yangon Office Store Configuration
export const YANGON_STORE_CONFIG = {
  storeId: 'yangon',
  storeName: 'Yangon Office',
  storeCode: 'YGN',
  location: 'Yangon, Myanmar',
  contact: {
    email: 'ygnoptical@gmail.com',
    phone: '+95-1-XXXXXXX',
    address: 'Yangon, Myanmar'
  },
  timezone: 'Asia/Yangon',
  currency: 'MMK',
  isActive: true
};

// Initialize Yangon Office Collections
export const initializeYangonOfficeCollections = async () => {
  try {
    console.log('🔄 Initializing Yangon Office Firestore collections...');
    
    const batch = writeBatch(db);
    const collections = ['frames', 'accessories', 'contactLenses', 'lenses'];
    const stores = ['yangon', 'yangon-office']; // Both Yangon store and Yangon Head Office
    
    for (const storeId of stores) {
      console.log(`🏢 Initializing collections for store: ${storeId}...`);
      
      for (const collectionName of collections) {
        // Check if store items exist in each collection
        const storeQuery = query(
          collection(db, collectionName),
          where('store', '==', storeId)
        );
        
        const storeSnapshot = await getDocs(storeQuery);
        
        if (storeSnapshot.empty) {
          console.log(`📦 Creating initial ${collectionName} document for ${storeId}...`);
          
          // Create a placeholder document to initialize the collection
          const initialDoc = {
            store: storeId,
            name: `Initial ${collectionName} Document`,
            code: `${storeId.toUpperCase().replace('-', '')}-INIT-${collectionName.toUpperCase()}`,
            qty: 0,
            soldQty: 0,
            transferInQty: 0,
            transferOutQty: 0,
            originalQty: 0,
            totalQty: 0,
            price: 0,
            category: 'Setup',
            isInitialDocument: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: `system@${storeId}-setup`
          };
          
          // Add collection-specific fields
          if (collectionName === 'frames') {
            Object.assign(initialDoc, {
              frameType: 'Eyeglasses',
              material: 'Setup',
              brand: 'System'
            });
          } else if (collectionName === 'accessories') {
            Object.assign(initialDoc, {
              accessoryType: 'Setup',
              brand: 'System'
            });
          } else if (collectionName === 'contactLenses') {
            Object.assign(initialDoc, {
              brand: 'System',
              type: 'Setup',
              power: '0.00'
            });
          } else if (collectionName === 'lenses') {
            Object.assign(initialDoc, {
              lensType: 'Setup',
              brand: 'System',
              power: '0.00'
            });
          }
          
          await addDoc(collection(db, collectionName), initialDoc);
        } else {
          console.log(`✅ ${collectionName} collection already has ${storeId} items (${storeSnapshot.size} items)`);
        }
      }
    }
    
    // Initialize store configuration document
    const storeConfigRef = doc(db, 'storeConfigurations', 'yangon');
    await setDoc(storeConfigRef, {
      ...YANGON_STORE_CONFIG,
      initializedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    // Initialize transfer settings for Yangon
    const transferConfigRef = doc(db, 'transferConfigurations', 'yangon');
    await setDoc(transferConfigRef, {
      storeId: 'yangon',
      storeName: 'Yangon Office',
      canReceiveFrom: ['main', 'win', 'pwint'],
      canSendTo: ['main', 'win', 'pwint'],
      autoApproveTransfers: false,
      maxTransferAmount: 1000,
      requiresApproval: true,
      approvers: ['yannaing190792@gmail.com', 'kyawwinhtun564@gmail.com'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Initialize history tracking
    await addDoc(collection(db, 'systemHistory'), {
      action: 'yangon_office_initialization',
      performedBy: 'system',
      performedAt: serverTimestamp(),
      details: {
        collectionsInitialized: collections,
        storeConfig: YANGON_STORE_CONFIG.storeId,
        transferConfig: 'enabled'
      },
      notes: 'Yangon Office Firestore collections and configurations initialized'
    });
    
    console.log('✅ Yangon Office initialization completed successfully!');
    toast.success('Yangon Office Firebase setup completed successfully!');
    
    return {
      success: true,
      message: 'Yangon Office collections initialized successfully',
      storeId: 'yangon',
      collections: collections
    };
    
  } catch (error) {
    console.error('❌ Error initializing Yangon stores:', error);
    toast.error('Failed to initialize Yangon stores Firebase setup');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to initialize Yangon stores collections'
    };
  }
};

// Verify Yangon Stores Setup
export const verifyYangonStoresSetup = async () => {
  try {
    console.log('🔍 Verifying Yangon Store & Yangon Head Office setup...');
    
    const collections = ['frames', 'accessories', 'contactLenses', 'lenses'];
    const stores = ['yangon', 'yangon-office'];
    const results = {
      yangonStore: {
        storeConfig: false,
        transferConfig: false,
        collections: {} as Record<string, number>,
        totalItems: 0
      },
      yangonOffice: {
        storeConfig: false,
        transferConfig: false,
        collections: {} as Record<string, number>,
        totalItems: 0
      }
    };
    
    for (const storeId of stores) {
      const storeKey = storeId === 'yangon' ? 'yangonStore' : 'yangonOffice';
      
      // Check store configuration
      const storeConfigSnap = await getDocs(query(collection(db, 'storeConfigurations'), where('storeId', '==', storeId)));
      results[storeKey].storeConfig = !storeConfigSnap.empty;
      
      // Check transfer configuration
      const transferConfigSnap = await getDocs(query(collection(db, 'transferConfigurations'), where('storeId', '==', storeId)));
      results[storeKey].transferConfig = !transferConfigSnap.empty;
      
      // Check each collection
      for (const collectionName of collections) {
        const storeQuery = query(
          collection(db, collectionName),
          where('store', '==', storeId)
        );
        
        const snapshot = await getDocs(storeQuery);
        results[storeKey].collections[collectionName] = snapshot.size;
        results[storeKey].totalItems += snapshot.size;
      }
    }
    
    console.log('📊 Yangon Stores Verification Results:', results);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error verifying Yangon stores setup:', error);
    throw error;
  }
};

// Create Sample Data for Both Yangon Stores
export const createSampleYangonData = async () => {
  try {
    console.log('🔄 Creating sample data for Yangon Store & Yangon Head Office...');
    
    // Sample data for Yangon Store
    const yangonStoreFrames = [
      {
        store: 'yangon',
        name: 'Yangon Classic Frame',
        code: 'YGN-FRAME-001',
        category: 'Eyeglasses',
        frameType: 'Full Rim',
        material: 'Metal',
        brand: 'Yangon Optical',
        qty: 10,
        originalQty: 10,
        totalQty: 10,
        soldQty: 0,
        transferInQty: 0,
        transferOutQty: 0,
        price: 25000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system@yangon-setup'
      },
      {
        store: 'yangon',
        name: 'Yangon Sunglasses Model',
        code: 'YGN-SUN-001',
        category: 'Sunglasses',
        frameType: 'Full Rim',
        material: 'Plastic',
        brand: 'Yangon Optical',
        qty: 15,
        originalQty: 15,
        totalQty: 15,
        soldQty: 0,
        transferInQty: 0,
        transferOutQty: 0,
        price: 35000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system@yangon-setup'
      }
    ];

    // Sample data for Yangon Office (Head Office)
    const yangonOfficeFrames = [
      {
        store: 'yangon-office',
        name: 'HQ Premium Frame Model A',
        code: 'YGNHQ-FRAME-001',
        category: 'Eyeglasses',
        frameType: 'Full Rim',
        material: 'Titanium',
        brand: 'HQ Professional',
        qty: 25,
        originalQty: 25,
        totalQty: 25,
        soldQty: 0,
        transferInQty: 0,
        transferOutQty: 0,
        price: 45000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system@yangon-office-setup'
      }
    ];
    
    const yangonStoreAccessories = [
      {
        store: 'yangon',
        name: 'Yangon Lens Cleaning Kit',
        code: 'YGN-ACC-001',
        category: 'Cleaning',
        accessoryType: 'Cleaning Kit',
        brand: 'Yangon Optical',
        qty: 20,
        originalQty: 20,
        totalQty: 20,
        soldQty: 0,
        transferInQty: 0,
        transferOutQty: 0,
        price: 5000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system@yangon-setup'
      }
    ];
    
    const yangonOfficeAccessories = [
      {
        store: 'yangon-office',
        name: 'HQ Professional Cleaning Kit',
        code: 'YGNHQ-ACC-001',
        category: 'Cleaning',
        accessoryType: 'Professional Kit',
        brand: 'HQ Professional',
        qty: 50,
        originalQty: 50,
        totalQty: 50,
        soldQty: 0,
        transferInQty: 0,
        transferOutQty: 0,
        price: 15000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system@yangon-office-setup'
      }
    ];
    
    // Add sample frames for both stores
    for (const frame of yangonStoreFrames) {
      await addDoc(collection(db, 'frames'), frame);
    }
    
    for (const frame of yangonOfficeFrames) {
      await addDoc(collection(db, 'frames'), frame);
    }
    
    // Add sample accessories for both stores
    for (const accessory of yangonStoreAccessories) {
      await addDoc(collection(db, 'accessories'), accessory);
    }
    
    for (const accessory of yangonOfficeAccessories) {
      await addDoc(collection(db, 'accessories'), accessory);
    }
    
    // Log the creation
    await addDoc(collection(db, 'systemHistory'), {
      action: 'yangon_sample_data_created',
      performedBy: 'system',
      performedAt: serverTimestamp(),
      details: {
        framesCreated: yangonStoreFrames.length + yangonOfficeFrames.length,
        accessoriesCreated: yangonStoreAccessories.length + yangonOfficeAccessories.length,
        store: 'yangon and yangon-office'
      },
      notes: 'Sample data created for Yangon Store and Yangon Office'
    });
    
    console.log('✅ Sample Yangon Office data created successfully!');
    toast.success('Sample data created for Yangon Office!');
    
    return {
      success: true,
      framesCreated: yangonStoreFrames.length + yangonOfficeFrames.length,
      accessoriesCreated: yangonStoreAccessories.length + yangonOfficeAccessories.length
    };
    
  } catch (error) {
    console.error('❌ Error creating sample Yangon data:', error);
    toast.error('Failed to create sample Yangon data');
    throw error;
  }
};

// Export utility functions
export const yangonOfficeUtils = {
  initialize: initializeYangonOfficeCollections,
  verify: verifyYangonStoresSetup,
  createSampleData: createSampleYangonData,
  storeConfig: YANGON_STORE_CONFIG
};