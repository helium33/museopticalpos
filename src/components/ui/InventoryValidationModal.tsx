import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Eye, Package, RefreshCw } from 'lucide-react';
import { VocItem } from '../../types/voc';
import { ValidationResult, ItemValidationResult } from '../../lib/InventoryValidation';
import Button from '../ui/Button';

interface InventoryValidationModalProps {
  validationResult: ValidationResult;
  onContinue: () => void;
  onCancel: () => void;
  onRetry: () => void;
  loading?: boolean;
}

const InventoryValidationModal: React.FC<InventoryValidationModalProps> = ({
  validationResult,
  onContinue,
  onCancel,
  onRetry,
  loading = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'errors' | 'warnings' | 'all'>('errors');

  const errorItems = validationResult.itemResults.filter(item => !item.isValid);
  const warningItems = validationResult.itemResults.filter(item => item.isValid && item.warningMessage);
  const successItems = validationResult.itemResults.filter(item => item.isValid && !item.warningMessage);

  const getStatusIcon = (result: ItemValidationResult) => {
    if (!result.isValid) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else if (result.warningMessage) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusBadge = (result: ItemValidationResult) => {
    if (!result.isValid) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Failed</span>;
    } else if (result.warningMessage) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Warning</span>;
    } else {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">OK</span>;
    }
  };

  const filteredItems = () => {
    switch (selectedTab) {
      case 'errors':
        return errorItems;
      case 'warnings':
        return warningItems;
      default:
        return validationResult.itemResults;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-700 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <h2 className="text-2xl font-bold text-red-800 dark:text-red-200">
                Inventory Validation Failed
              </h2>
              <p className="text-red-600 dark:text-red-400 mt-1">
                {errorItems.length} items failed validation, {warningItems.length} warnings
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">Errors</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-200">{errorItems.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{warningItems.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">Success</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">{successItems.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Error Summary */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Quick Summary</h3>
            <div className="space-y-2 text-sm">
              {errorItems.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 dark:text-red-300">
                    <strong>{item.item.name}</strong>: {item.errorMessage}
                  </span>
                </div>
              ))}
              {errorItems.length > 3 && (
                <div className="text-red-600 dark:text-red-400">
                  ... and {errorItems.length - 3} more items
                </div>
              )}
            </div>
          </div>

          {/* Toggle Details */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Retry Validation
            </Button>
          </div>

          {/* Detailed Results */}
          {showDetails && (
            <div className="space-y-4">
              {/* Filter Tabs */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedTab('errors')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === 'errors'
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Errors ({errorItems.length})
                </button>
                <button
                  onClick={() => setSelectedTab('warnings')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === 'warnings'
                      ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Warnings ({warningItems.length})
                </button>
                <button
                  onClick={() => setSelectedTab('all')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    selectedTab === 'all'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  All ({validationResult.itemResults.length})
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredItems().map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      !result.isValid
                        ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                        : result.warningMessage
                        ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700'
                        : 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(result)}
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {result.item.name}
                          </h4>
                          {getStatusBadge(result)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Requested:</span>
                            <span className="ml-2 font-medium">{result.requestedQty}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Available:</span>
                            <span className="ml-2 font-medium">{result.availableQty}</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Type:</span>
                          <span className="ml-2">{result.item.type}</span>
                          {result.item.category && (
                            <>
                              <span className="ml-4 text-gray-600 dark:text-gray-400">Category:</span>
                              <span className="ml-2">{result.item.category}</span>
                            </>
                          )}
                        </div>
                        
                        {result.errorMessage && (
                          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-300">
                            {result.errorMessage}
                          </div>
                        )}
                        
                        {result.warningMessage && (
                          <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-sm text-yellow-700 dark:text-yellow-300">
                            {result.warningMessage}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
          <div className="space-y-4">
            {/* Options Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Your Options:</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• <strong>Continue Anyway:</strong> Items will be marked as FOC (Free of Charge) if out of stock</li>
                <li>• <strong>Cancel:</strong> Review and adjust quantities or remove problematic items</li>
                <li>• <strong>Retry:</strong> Refresh inventory data and validate again</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              
              <Button
                variant="outline"
                onClick={onRetry}
                disabled={loading}
                className="min-w-[100px]"
              >
                {loading ? 'Retrying...' : 'Retry'}
              </Button>
              
              <Button
                variant="primary"
                onClick={onContinue}
                className="min-w-[120px] bg-orange-600 hover:bg-orange-700"
              >
                Continue Anyway
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryValidationModal;