import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { 
  updateCompleteInventoryForVOC, 
  returnCompleteInventoryFromVOC,
  verifyInventoryUpdate,
  InventoryUpdateResult 
} from '../../utils/InventoryUtils';
import { VocItem } from '../../utils/utils';

interface VOCInventoryDebuggerProps {
  vocItems: VocItem[];
  onInventoryUpdate?: (result: InventoryUpdateResult) => void;
}

export default function VOCInventoryDebugger({ vocItems, onInventoryUpdate }: VOCInventoryDebuggerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastResult, setLastResult] = useState<InventoryUpdateResult | null>(null);
  const [verificationData, setVerificationData] = useState<any[]>([]);

  const handleInventoryUpdate = async () => {
    setIsUpdating(true);
    try {
      console.log('🚀 Starting inventory update from debugger...');
      const result = await updateCompleteInventoryForVOC(vocItems);
      setLastResult(result);
      onInventoryUpdate?.(result);
      
      // Auto-verify after update
      setTimeout(() => {
        handleVerifyInventory();
      }, 1000);
      
    } catch (error) {
      console.error('Error updating inventory:', error);
      setLastResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        updatedItems: [],
        errors: [error instanceof Error ? error.message : String(error)]
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInventoryReturn = async () => {
    setIsReturning(true);
    try {
      console.log('🔄 Starting inventory return from debugger...');
      const result = await returnCompleteInventoryFromVOC(vocItems);
      setLastResult(result);
      onInventoryUpdate?.(result);
      
      // Auto-verify after return
      setTimeout(() => {
        handleVerifyInventory();
      }, 1000);
      
    } catch (error) {
      console.error('Error returning inventory:', error);
      setLastResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        updatedItems: [],
        errors: [error instanceof Error ? error.message : String(error)]
      });
    } finally {
      setIsReturning(false);
    }
  };

  const handleVerifyInventory = async () => {
    setIsVerifying(true);
    try {
      const verification = await verifyInventoryUpdate(vocItems);
      setVerificationData(verification);
    } catch (error) {
      console.error('Error verifying inventory:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const lensItems = vocItems.filter(item => item.type === 'Lens' && !item.isFOC);
  const otherItems = vocItems.filter(item => item.type !== 'Lens' && !item.isFOC);
  const focItems = vocItems.filter(item => item.isFOC);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Search className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">VOC Inventory Debugger</h2>
      </div>

      {/* Items Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{lensItems.length}</div>
          <div className="text-sm text-blue-800">Lens Items</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{otherItems.length}</div>
          <div className="text-sm text-green-800">Other Items</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{focItems.length}</div>
          <div className="text-sm text-yellow-800">FOC Items</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{vocItems.length}</div>
          <div className="text-sm text-purple-800">Total Items</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleInventoryUpdate}
          disabled={isUpdating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUpdating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {isUpdating ? 'Updating...' : 'Update Inventory'}
        </button>

        <button
          onClick={handleInventoryReturn}
          disabled={isReturning}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReturning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {isReturning ? 'Returning...' : 'Return Inventory'}
        </button>

        <button
          onClick={handleVerifyInventory}
          disabled={isVerifying}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {isVerifying ? 'Verifying...' : 'Verify Inventory'}
        </button>
      </div>

      {/* Items Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Items to Process</h3>
        
        {lensItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600">Lens Items ({lensItems.length})</h4>
            <div className="grid gap-2">
              {lensItems.map((item, index) => (
                <div key={item.id} className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        Store: {item.store} | Qty: {item.quantity}
                      </div>
                      {item.details?.rightQty !== undefined && item.details?.leftQty !== undefined && (
                        <div className="text-sm text-blue-600">
                          Bifocal - Right: {item.details.rightQty}, Left: {item.details.leftQty}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-blue-600">
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {otherItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-600">Other Items ({otherItems.length})</h4>
            <div className="grid gap-2">
              {otherItems.map((item, index) => (
                <div key={item.id} className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        Type: {item.type} | Store: {item.store} | Qty: {item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {focItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-600">FOC Items ({focItems.length}) - Will be skipped</h4>
            <div className="grid gap-2">
              {focItems.map((item, index) => (
                <div key={item.id} className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        Type: {item.type} | Store: {item.store} | Qty: {item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-yellow-600">
                      FOC
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Last Operation Result</h3>
          <div className={`p-4 rounded-lg border-l-4 ${
            lastResult.success 
              ? 'bg-green-50 border-green-400' 
              : 'bg-red-50 border-red-400'
          }`}>
            <div className="flex items-start gap-3">
              {lastResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className={`font-medium ${
                  lastResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {lastResult.message}
                </div>
                
                {lastResult.updatedItems.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-gray-700">Updated Items:</div>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {lastResult.updatedItems.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {lastResult.errors.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-red-700">Errors:</div>
                    <ul className="text-sm text-red-600 list-disc list-inside">
                      {lastResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Results */}
      {verificationData.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Current Inventory Status</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Search Strategy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sold Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {verificationData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.itemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.actualLensCode || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.searchStrategy === 'exact_match' ? 'bg-green-100 text-green-800' :
                        item.searchStrategy?.includes('same_store') ? 'bg-blue-100 text-blue-800' :
                        item.searchStrategy?.includes('different_store') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.searchStrategy || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.currentQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.currentSoldQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lastUpdated instanceof Date 
                        ? item.lastUpdated.toLocaleString() 
                        : item.lastUpdated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enhanced Diagnostic Information */}
      {lastResult && lastResult.debugInfo && lastResult.debugInfo.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Lens Matching Diagnostic</h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="space-y-3">
              {lastResult.debugInfo.map((debug, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        Searched: "{debug.itemName}"
                      </span>
                      {debug.actualLensCode && debug.actualLensCode !== debug.itemName && (
                        <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                          → Found: "{debug.actualLensCode}"
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      debug.searchStrategy === 'exact_match' ? 'bg-green-100 text-green-800' :
                      debug.searchStrategy?.includes('same_store') ? 'bg-blue-100 text-blue-800' :
                      debug.searchStrategy?.includes('different_store') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {debug.searchStrategy}
                    </span>
                  </div>
                  {debug.foundInStore && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Found in store: <span className="font-medium">{debug.foundInStore}</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Before: Qty {debug.beforeUpdate?.qty || 0}, Sold {debug.beforeUpdate?.soldQty || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}