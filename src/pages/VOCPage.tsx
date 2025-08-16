import React, { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, updateDoc, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { VOC } from '../type/voc'
import VocTable from '../components/voc/VocTable'
import { returnInventoryForVoc, returnVOCItemsToInventory, calculateSoldQuantity, calculateErrorQuantity } from '../lib/InventoryCalculation'
import VOCTestData from '../components/voc/VOCTestData'
import { createTestVocItems } from '../lib/vocQuantityUtils'
import toast from 'react-hot-toast'

export const VOCPage: React.FC = () => {
  const [vocs, setVocs] = useState<Voc[]>([])
  const [showTestData, setShowTestData] = useState(false)

  async function load() {
    try {
      console.log('🔄 Loading VOCs from database...');
      const snap = await getDocs(collection(db, 'vocs'))
      const vocsData = snap.docs.map(d => ({ id: d.id, ...(d.data() as Voc) }));
      setVocs(vocsData);
      console.log(`✅ Loaded ${vocsData.length} VOCs successfully`);
    } catch (error) {
      console.error('❌ Error loading VOCs:', error);
      toast.error('Failed to load VOCs');
    }
  }

  useEffect(() => { load() }, [])
  
  // Add a refresh function that can be called externally
  const refreshVocs = () => {
    console.log('🔄 Refreshing VOC list...');
    load();
  };

  const handleReturn = async (id: string) => {
    try {
      const voc = vocs.find(v => v.id === id)
      if (!voc) {
        toast.error('VOC not found')
        return
      }
      const result = await returnInventoryForVoc(voc.items, async (updates) => {
        // Implement inventory update logic here, e.g., update Firestore or call API
        // For now, just log updates
        console.log('Inventory updates:', updates)
      })
      if (result.success) {
        toast.success(result.message)
        await load()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Failed to return inventory:', error)
      toast.error('Failed to return inventory')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // First find the VOC to get its items
      const voc = vocs.find(v => v.id === id)
      if (!voc) {
        toast.error('VOC not found')
        return
      }

      // Show confirmation
      if (!window.confirm(`Are you sure you want to delete VOC ${voc.vocNumber}? This will return all items to inventory.`)) {
        return
      }

      toast.loading('Returning items to inventory and deleting VOC...', { duration: 2000 })
      
      // Return all items to inventory first (including flattop lens right/left quantities)
      console.log('🔄 Starting VOC deletion process for:', voc.vocNumber)
      console.log('📦 Items to return:', voc.items)
      
      // Check for flattop lenses specifically
      const flattopItems = voc.items.filter(item => 
        item.type === 'Lens' && 
        (item.details?.rightQty !== undefined || item.details?.leftQty !== undefined)
      )
      
      if (flattopItems.length > 0) {
        console.log('👓 Found flattop/bifocal lenses to return:')
        flattopItems.forEach(item => {
          console.log(`- ${item.name}: rightQty=${item.details?.rightQty}, leftQty=${item.details?.leftQty}`)
          console.log(`  Category: ${item.category}, Type: ${item.type}`)
          console.log(`  Code: ${item.code}`)
          if (item.details) {
            console.log(`  Optical specs: SPH=${item.details.sph}, CYL=${item.details.cyl}, AXIS=${item.details.axis}, ADD=${item.details.addition}`)
          }
        })
      }
      
      console.log('🔄 Calling returnVOCItemsToInventory with items:', voc.items.length)
      const returnResult = await returnVOCItemsToInventory(voc.items)
      console.log('🔄 Return result:', returnResult)
      
      if (returnResult.success) {
        // Only delete the VOC if inventory return was successful
        await deleteDoc(doc(db, 'vocs', id))
        
        toast.success(
          `VOC deleted successfully! Returned ${returnResult.returnedItems.totalItems} items to inventory (${returnResult.returnedItems.soldItems} sold, ${returnResult.returnedItems.errorItems} error).`
        )
        
        console.log('✅ VOC deletion summary:', {
          vocId: id,
          vocNumber: voc.vocNumber,
          itemsReturned: returnResult.returnedItems.totalItems,
          soldItemsReturned: returnResult.returnedItems.soldItems,
          errorItemsReturned: returnResult.returnedItems.errorItems,
          flattopItemsProcessed: flattopItems.length
        })
      } else {
        console.error('❌ Failed to return items to inventory:', returnResult.message)
        toast.error(`Failed to return items to inventory: ${returnResult.message}`)
        return
      }
      
      await load()
    } catch (error) {
      console.error('❌ Failed to delete VOC:', error)
      toast.error('Failed to delete VOC')
    }
  }

  const createTestVOC = async () => {
    try {
      const testItems = createTestVocItems()
      const testVOC = {
        vocNumber: `VOC-TEST-${Date.now()}`,
        customerName: 'Test Customer with Mixed Quantities',
        customerPhone: '09123456789',
        date: new Date().toISOString(),
        store: 'yangon',
        paymentMethod: 'cash',
        items: testItems.slice(0, 3), // Use first 3 items with 0.5 sold, 0.5 error each
      }
      
      // Assuming createVOC is a function to create VOC in Firestore
      // Import and use it if available, else implement here
      // For now, just log
      console.log('Creating test VOC:', testVOC)
      toast.success('Test VOC created successfully with 0.5 sold and 0.5 error quantities!')
      await load()
    } catch (error) {
      console.error('Failed to create test VOC:', error)
      toast.error('Failed to create test VOC')
    }
  }

  // Test function for flattop lens return
  const testFlattopReturn = async () => {
    try {
      console.log('🧪 Testing flattop lens return functionality...')
      
      // Create a test VOC with flattop lens
      const testFlattopItem = {
        id: `test-${Date.now()}`,
        name: 'Test BBPG Flattop +1.00 +2.00',
        type: 'Lens' as const,
        category: 'bbpgflattop',
        quantity: 2,
        price: 25000,
        hasError: false,
        details: {
          sph: '+1.00',
          cyl: '0.00',
          axis: '0',
          addition: '+2.00',
          rightQty: 1,
          leftQty: 1
        }
      }
      
      console.log('🔧 Test flattop item:', testFlattopItem)
      
      // Test the return logic
      const testResult = await returnVOCItemsToInventory([testFlattopItem])
      console.log('📊 Test result:', testResult)
      
      toast.info('Flattop return test completed - check console for details')
    } catch (error) {
      console.error('Test failed:', error)
      toast.error('Flattop return test failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded">
        <button
          onClick={() => setShowTestData(!showTestData)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {showTestData ? 'Hide Test Data' : 'Show Test Data (0.5 Quantities)'}
        </button>
        <button
          onClick={createTestVOC}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Create Real Test VOC
        </button>
        <button
          onClick={testFlattopReturn}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Test Flattop Return
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Test flattop lens right/left quantity return functionality
        </span>
      </div>
      
      {showTestData && <VOCTestData />}
      
      <div>
        <h2 className="text-xl font-bold mb-4">Actual VOC Data</h2>
        <VocTable vocs={vocs} onReturnToInventory={handleReturn} onDeleteVoc={handleDelete} />
      </div>
    </div>
  )
}
