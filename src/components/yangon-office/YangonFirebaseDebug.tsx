import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { yangonFirebaseUtils } from '../../services/yangonFirebaseService';
import { initializeYangonOfficeCollections, createSampleYangonData, verifyYangonStoresSetup } from '../../lib/yangonOfficeSetup';
import Button from '../ui/Button';
import Card from '../ui/Card';
import toast from 'react-hot-toast';

const YangonFirebaseDebug: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  
  // Check user access
  const hasYangonAccess = user?.email === 'yannaing190792@gmail.com' || user?.email === 'kyawwinhtun564@gmail.com';
  const currentStore = user?.email === 'yannaing190792@gmail.com' ? 'yangon-office' : 'yangon';

  const handleInitialize = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Initializing Yangon Office collections...');
      const result = await initializeYangonOfficeCollections();
      setDebugResults(prev => ({ ...prev, init: result }));
      toast.success('Initialization completed!');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      toast.error('Initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Verifying Yangon stores setup...');
      const result = await verifyYangonStoresSetup();
      setDebugResults(prev => ({ ...prev, verify: result }));
      toast.success('Verification completed!');
    } catch (error) {
      console.error('❌ Verification failed:', error);
      toast.error('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSample = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Creating sample data...');
      const result = await createSampleYangonData();
      setDebugResults(prev => ({ ...prev, sampleData: result }));
      toast.success('Sample data created!');
    } catch (error) {
      console.error('❌ Sample data creation failed:', error);
      toast.error('Sample data creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading data from Firebase...');
      const allItems = await yangonFirebaseUtils.getAllItems(currentStore);
      setDebugResults(prev => ({ ...prev, loadedData: allItems }));
      toast.success(`Loaded data for ${currentStore}`);
    } catch (error) {
      console.error('❌ Data loading failed:', error);
      toast.error('Data loading failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasYangonAccess) {
    return (
      <Card>
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Access Denied</h3>
          <p className="text-gray-600">Only authorized Yangon office users can access this debug tool.</p>
          <p className="text-sm text-gray-500 mt-2">Current user: {user?.email}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">🔧 Yangon Firebase Debug Tool</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-medium">Current User:</p>
              <p className="text-sm text-blue-600">{user?.email}</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-medium">Current Store:</p>
              <p className="text-sm text-green-600">{currentStore}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={handleInitialize}
              disabled={isLoading}
              variant="primary"
            >
              {isLoading ? 'Initializing...' : 'Initialize Collections'}
            </Button>
            
            <Button
              onClick={handleVerify}
              disabled={isLoading}
              variant="secondary"
            >
              {isLoading ? 'Verifying...' : 'Verify Setup'}
            </Button>
            
            <Button
              onClick={handleCreateSample}
              disabled={isLoading}
              variant="success"
            >
              {isLoading ? 'Creating...' : 'Create Sample Data'}
            </Button>
            
            <Button
              onClick={handleLoadData}
              disabled={isLoading}
              variant="info"
            >
              {isLoading ? 'Loading...' : 'Load Current Data'}
            </Button>
          </div>

          {debugResults && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Debug Results:</h4>
              <div className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
                <pre className="text-sm">
                  {JSON.stringify(debugResults, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default YangonFirebaseDebug;