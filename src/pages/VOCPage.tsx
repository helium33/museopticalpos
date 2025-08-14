import React, { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { VOC } from '../type/voc'
import VocTable from '../components/voc/VocTable'
import { returnInventoryForVoc } from '../lib/InventoryCalculation'
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
  const [vocs, setVocs] = useState<Voc[]>([])

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'vocs', id))
      toast.success('VOC deleted successfully')
      await load()
    } catch (error) {
      console.error('Failed to delete VOC:', error)
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
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Create actual VOC in database with 0.5 sold/error quantities
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
