import React, { useState, useCallback } from 'react';
import { Store } from '../../lib/utils';
import VocForm from '../voc/VocForm';
import { useInventorySync } from '../../hooks/useInventorySync';
import Button from '../ui/Button';
import { RefreshCw, ShoppingCart, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface VocManagementProps {
  store: Store;
  onVocCreated?: () => void; // Callback to notify parent about VOC creation
}

const VocManagement: React.FC<VocManagementProps> = ({ store, onVocCreated }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { notifyInventoryUpdate } = useInventorySync();

  // Handle successful VOC creation
  const handleVocSuccess = useCallback(() => {
    console.log('✅ VOC created successfully');
    
    // Trigger a refresh of any inventory-related components
    setRefreshKey(prev => prev + 1);
    
    // Notify about inventory update
    notifyInventoryUpdate('VOC created successfully - Inventory updated');
    
    // Notify parent component if callback provided
    if (onVocCreated) {
      console.log('📡 Notifying parent component about VOC creation');
      onVocCreated();
    }
    
    toast.success('VOC created and inventory updated successfully!', {
      duration: 4000,
    });
  }, [notifyInventoryUpdate, onVocCreated]);

  // Handle VOC creation event specifically for lens inventory updates
  const handleVocCreated = useCallback(() => {
    console.log('📊 VOC creation detected - updating lens inventory');
    
    // Force refresh of inventory displays
    setRefreshKey(prev => prev + 1);
    
    // Additional notification for lens inventory update
    notifyInventoryUpdate('Lens inventory quantities updated');
    
    // Notify parent component
    if (onVocCreated) {
      onVocCreated();
    }
  }, [notifyInventoryUpdate, onVocCreated]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                VOC Management - {store?.toUpperCase()}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create vouchers and manage sales with automatic inventory updates
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Real-time Sync</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="flex items-center gap-2"
              title="Refresh VOC form"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Automatic Inventory Sync</p>
            <p>
              When you create a VOC, the system will automatically:
            </p>
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>Update lens inventory quantities in real-time</li>
              <li>Increase sold quantities for selected items</li>
              <li>Decrease remaining quantities accordingly</li>
              <li>Sync changes across all lens inventory displays</li>
            </ul>
          </div>
        </div>
      </div>

      {/* VOC Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New VOC
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Fill in the customer details and select items to create a new voucher
          </p>
        </div>
        
        <div className="p-6">
          <VocForm
            key={refreshKey} // Force re-render when refresh is triggered
            store={store}
            onSuccess={handleVocSuccess}
            onVocCreated={handleVocCreated} // Pass the callback for inventory updates
          />
        </div>
      </div>
    </div>
  );
};

export default VocManagement;