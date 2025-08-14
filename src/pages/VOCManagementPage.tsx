import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VocItem } from '../type/voc';
import { VOC } from '../type/Voc';
import VocTable from '../components/voc/VocTable';
import VocReturnModal from '../components/VocReturnModal';
import VocManagement from '../components/voc/vocManagment';
import { Store } from '../lib/utils';
import { returnItemsToInventory, returnVOCItemsToInventory } from '../lib/InventoryCalculation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ShoppingCart, List, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface VOCManagementPageProps {
  store: Store;
}

interface VOCWithExtras extends VOC {
  date: string; // Add date field for display
  store: string; // Add store field for filtering
}

const VOCManagementPage: React.FC<VOCManagementPageProps> = ({ store }) => {
  const [vocs, setVocs] = useState<VOCWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedVoc, setSelectedVoc] = useState<VOC | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Load VOCs from database
  const loadVocs = async () => {
    try {
      setLoading(true);
      const vocsSnapshot = await getDocs(collection(db, 'vocs'));
      const vocsData = vocsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.createdAt || data.date || new Date().toISOString(),
          store: data.store || store
        };
      }) as VOCWithExtras[];

      // Filter by store and add hasError flag
      const filteredVocs = vocsData
        .filter(voc => voc.store === store)
        .map(voc => ({
          ...voc,
          hasError: voc.items.some(item => item.hasError || (item.errorQuantity && item.errorQuantity > 0))
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setVocs(filteredVocs);
    } catch (error) {
      console.error('Error loading VOCs:', error);
      toast.error('Failed to load VOCs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVocs();
  }, [store]);

  // Handle VOC creation success
  const handleVocCreated = () => {
    loadVocs(); // Reload the list
    setActiveTab('list'); // Switch to list tab
    toast.success('VOC created successfully!');
  };

  // Handle return to inventory
  const handleReturnToInventory = async (vocId: string) => {
    const voc = vocs.find(v => v.id === vocId);
    if (!voc) return;

    setSelectedVoc(voc);
    setReturnModalOpen(true);
  };

  // Confirm return to inventory
  const confirmReturnToInventory = async (vocId: string) => {
    try {
      setReturnLoading(true);
      const voc = vocs.find(v => v.id === vocId);
      if (!voc) return;

      // Return items to inventory with actual database updates
      const returnResult = await returnVOCItemsToInventory(voc.items);
      
      if (!returnResult.success) {
        toast.error(returnResult.message);
        return;
      }

      // Update VOC status to 'returned'
      await updateDoc(doc(db, 'vocs', vocId), {
        status: 'returned',
        returnedAt: new Date().toISOString(),
        returnData: returnResult.returnedItems
      });

      // Reload VOCs
      await loadVocs();
      
      toast.success(returnResult.message);
      setReturnModalOpen(false);
      setSelectedVoc(null);
    } catch (error) {
      console.error('Error returning to inventory:', error);
      toast.error('Failed to return items to inventory');
    } finally {
      setReturnLoading(false);
    }
  };

  // Handle VOC deletion
  const handleDeleteVoc = async (vocId: string) => {
    if (!confirm('Are you sure you want to delete this VOC? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'vocs', vocId));
      await loadVocs();
      toast.success('VOC deleted successfully');
    } catch (error) {
      console.error('Error deleting VOC:', error);
      toast.error('Failed to delete VOC');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              VOC Management - {store?.toUpperCase()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage vouchers with automatic inventory tracking
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List size={16} />
            VOC List ({vocs.filter(v => v.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus size={16} />
            Create New VOC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    VOC List
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    Manage existing VOCs with separate sold and error quantity tracking
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Active: {vocs.filter(v => v.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      With Errors: {vocs.filter(v => v.hasError && v.status === 'active').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading VOCs...</span>
                </div>
              ) : vocs.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No VOCs found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first VOC to get started
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                    Create VOC
                  </button>
                </div>
              ) : (
                <VocTable
                  vocs={vocs.filter(v => v.status === 'active')}
                  onDeleteVoc={handleDeleteVoc}
                  onReturnToInventory={handleReturnToInventory}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="create">
          <VocManagement 
            store={store} 
            onVocCreated={handleVocCreated}
          />
        </TabsContent>
      </Tabs>

      {/* Return Modal */}
      <VocReturnModal
        voc={selectedVoc}
        isOpen={returnModalOpen}
        onClose={() => {
          setReturnModalOpen(false);
          setSelectedVoc(null);
        }}
        onConfirm={confirmReturnToInventory}
        loading={returnLoading}
      />
    </div>
  );
};

export default VOCManagementPage;