import React, { useEffect, useState } from 'react';
import { Store } from '../lib/utils';
import LensPage from '../components/lens/LensPage';
import { useInventorySync } from '../hooks/useInventorySync';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

interface LensManagementProps {
  store: Store;
}

const LensManagement: React.FC<LensManagementProps> = ({ store }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const { subscribeToInventoryUpdates, notifyInventoryUpdate } = useInventorySync();

  // Set up real-time inventory sync
  useEffect(() => {
    console.log('🔄 Setting up lens inventory sync for store:', store);
    
    const handleInventoryUpdate = () => {
      console.log('📊 Inventory update detected - refreshing lens data');
      setRefreshKey(prev => prev + 1);
      setLastSyncTime(new Date());
      toast.success('Lens inventory synchronized with latest sales', {
        duration: 3000,
      });
    };

    // Subscribe to inventory updates
    const unsubscribe = subscribeToInventoryUpdates(handleInventoryUpdate);

    return () => {
      console.log('🔌 Cleaning up lens inventory sync subscription');
      unsubscribe();
    };
  }, [store, subscribeToInventoryUpdates]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    console.log('🔄 Manual lens inventory refresh triggered');
    setRefreshKey(prev => prev + 1);
    setLastSyncTime(new Date());
    notifyInventoryUpdate('Lens inventory refreshed manually');
  };

  return (
    <div className="space-y-6">
      {/* Sync Status Header */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                Real-time Inventory Synchronization Active
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Lens quantities automatically update when VOCs are created. 
                Last synchronized: <span className="font-medium">{lastSyncTime.toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Live Sync</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="flex items-center gap-2"
              title="Manual refresh lens inventory"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Lens Page Component */}
      <LensPage 
        key={refreshKey} // Force re-render when refresh is triggered
        store={store} 
      />
    </div>
  );
};

export default LensManagement;