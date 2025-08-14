import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader, 
  Play, 
  RefreshCw,
  Package,
  Settings,
  Users,
  BarChart3
} from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { 
  initializeYangonOfficeCollections, 
  verifyYangonStoresSetup, 
  createSampleYangonData,
  yangonOfficeUtils
} from '../../lib/yangonOfficeSetup';
import { yangonFirebaseUtils } from '../../services/yangonFirebaseService';

const YangonFirebaseTest: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const [isTestingService, setIsTestingService] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any>(null);
  const [inventorySummary, setInventorySummary] = useState<any>(null);

  // Initialize Yangon Office Collections
  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      console.log('🚀 Starting Yangon Office Firebase initialization...');
      const result = await initializeYangonOfficeCollections();
      
      if (result.success) {
        toast.success('✅ Yangon Office Firebase collections initialized successfully!');
        console.log('✅ Initialization result:', result);
      } else {
        toast.error(`❌ Initialization failed: ${result.message}`);
        console.error('❌ Initialization failed:', result);
      }
    } catch (error) {
      console.error('❌ Initialization error:', error);
      toast.error('❌ Failed to initialize Yangon Office collections');
    } finally {
      setIsInitializing(false);
    }
  };

  // Verify Setup
  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      console.log('🔍 Verifying Yangon Office setup...');
      const results = await verifyYangonStoresSetup();
      setVerificationResults(results);
      toast.success('✅ Verification completed!');
      console.log('📊 Verification results:', results);
    } catch (error) {
      console.error('❌ Verification error:', error);
      toast.error('❌ Failed to verify setup');
    } finally {
      setIsVerifying(false);
    }
  };

  // Create Sample Data
  const handleCreateSample = async () => {
    setIsCreatingSample(true);
    try {
      console.log('📦 Creating sample data...');
      const result = await createSampleYangonData();
      
      if (result.success) {
        toast.success(`✅ Sample data created! ${result.framesCreated} frames, ${result.accessoriesCreated} accessories`);
        console.log('✅ Sample data result:', result);
      } else {
        toast.error('❌ Failed to create sample data');
        console.error('❌ Sample data creation failed:', result);
      }
    } catch (error) {
      console.error('❌ Sample data error:', error);
      toast.error('❌ Failed to create sample data');
    } finally {
      setIsCreatingSample(false);
    }
  };

  // Test Firebase Service
  const handleTestService = async () => {
    setIsTestingService(true);
    try {
      console.log('🧪 Testing Firebase service...');
      
      // Test both stores
      const yangonSummary = await yangonFirebaseUtils.getInventorySummary('yangon');
      const yangonOfficeSummary = await yangonFirebaseUtils.getInventorySummary('yangon-office');
      
      const combined = {
        yangon: yangonSummary,
        yangonOffice: yangonOfficeSummary,
        total: {
          items: yangonSummary.totalItems + yangonOfficeSummary.totalItems,
          value: yangonSummary.totalValue + yangonOfficeSummary.totalValue
        }
      };
      
      setInventorySummary(combined);
      toast.success('✅ Firebase service test completed!');
      console.log('📊 Service test results:', combined);
    } catch (error) {
      console.error('❌ Service test error:', error);
      toast.error('❌ Firebase service test failed');
    } finally {
      setIsTestingService(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Yangon Office Firebase Setup & Testing
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Initialize and test Firebase integration for Yangon Office
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Initialize Button */}
            <Button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="flex items-center gap-2 p-4 h-auto flex-col"
              variant="primary"
            >
              {isInitializing ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Settings className="h-5 w-5" />
              )}
              <div className="text-center">
                <div className="font-medium">Initialize</div>
                <div className="text-xs opacity-75">Setup Collections</div>
              </div>
            </Button>

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className="flex items-center gap-2 p-4 h-auto flex-col"
              variant="outline"
            >
              {isVerifying ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              <div className="text-center">
                <div className="font-medium">Verify</div>
                <div className="text-xs opacity-75">Check Setup</div>
              </div>
            </Button>

            {/* Create Sample Data Button */}
            <Button
              onClick={handleCreateSample}
              disabled={isCreatingSample}
              className="flex items-center gap-2 p-4 h-auto flex-col"
              variant="secondary"
            >
              {isCreatingSample ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Package className="h-5 w-5" />
              )}
              <div className="text-center">
                <div className="font-medium">Sample Data</div>
                <div className="text-xs opacity-75">Create Test Items</div>
              </div>
            </Button>

            {/* Test Service Button */}
            <Button
              onClick={handleTestService}
              disabled={isTestingService}
              className="flex items-center gap-2 p-4 h-auto flex-col"
              variant="success"
            >
              {isTestingService ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              <div className="text-center">
                <div className="font-medium">Test Service</div>
                <div className="text-xs opacity-75">Check Firebase</div>
              </div>
            </Button>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Verification Results */}
            {verificationResults && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Verification Results
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Yangon Store */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Yangon Store
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Store Config:</span>
                        <span className={`text-sm font-medium ${
                          verificationResults.yangonStore.storeConfig 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {verificationResults.yangonStore.storeConfig ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Transfer Config:</span>
                        <span className={`text-sm font-medium ${
                          verificationResults.yangonStore.transferConfig 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {verificationResults.yangonStore.transferConfig ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Items:</span>
                        <span className="text-sm font-medium text-blue-600">
                          {verificationResults.yangonStore.totalItems}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        {Object.entries(verificationResults.yangonStore.collections).map(([collection, count]) => (
                          <div key={collection} className="flex justify-between">
                            <span>{collection}:</span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Yangon Office */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Yangon Head Office
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Store Config:</span>
                        <span className={`text-sm font-medium ${
                          verificationResults.yangonOffice.storeConfig 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {verificationResults.yangonOffice.storeConfig ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Transfer Config:</span>
                        <span className={`text-sm font-medium ${
                          verificationResults.yangonOffice.transferConfig 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {verificationResults.yangonOffice.transferConfig ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Items:</span>
                        <span className="text-sm font-medium text-blue-600">
                          {verificationResults.yangonOffice.totalItems}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        {Object.entries(verificationResults.yangonOffice.collections).map(([collection, count]) => (
                          <div key={collection} className="flex justify-between">
                            <span>{collection}:</span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Inventory Summary */}
            {inventorySummary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Inventory Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Yangon Store Summary */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Yangon Store
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Items:</span>
                        <span className="text-sm font-medium">{inventorySummary.yangon.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Value:</span>
                        <span className="text-sm font-medium">{inventorySummary.yangon.totalValue.toLocaleString()} MMK</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Low Stock:</span>
                        <span className="text-sm font-medium text-yellow-600">{inventorySummary.yangon.lowStockItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Out of Stock:</span>
                        <span className="text-sm font-medium text-red-600">{inventorySummary.yangon.outOfStockItems}</span>
                      </div>
                    </div>
                  </div>

                  {/* Yangon Office Summary */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Yangon Head Office
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Items:</span>
                        <span className="text-sm font-medium">{inventorySummary.yangonOffice.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Value:</span>
                        <span className="text-sm font-medium">{inventorySummary.yangonOffice.totalValue.toLocaleString()} MMK</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Low Stock:</span>
                        <span className="text-sm font-medium text-yellow-600">{inventorySummary.yangonOffice.lowStockItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Out of Stock:</span>
                        <span className="text-sm font-medium text-red-600">{inventorySummary.yangonOffice.outOfStockItems}</span>
                      </div>
                    </div>
                  </div>

                  {/* Combined Summary */}
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Combined Total
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Items:</span>
                        <span className="text-lg font-bold text-green-600">{inventorySummary.total.items}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Value:</span>
                        <span className="text-lg font-bold text-green-600">{inventorySummary.total.value.toLocaleString()} MMK</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default YangonFirebaseTest;