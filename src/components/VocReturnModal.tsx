import React, { useState } from 'react';
import { VOC } from '../type/Voc';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { AlertTriangle, RotateCcw, Package, TrendingUp } from 'lucide-react';
import { calculateErrorQuantity, returnItemsToInventory } from '../lib/InventoryCalculation';

interface Props {
  voc: VOC | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (vocId: string) => void;
  loading?: boolean;
}

const VocReturnModal: React.FC<Props> = ({ voc, isOpen, onClose, onConfirm, loading = false }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!voc) return null;

  const returnData = returnItemsToInventory(voc.items);
  const hasErrors = voc.items.some(item => calculateErrorQuantity(item) > 0);

  const handleConfirm = () => {
    onConfirm(voc.id!);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return VOC to Inventory">
      <div className="space-y-6">
        {/* Warning Header */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle size={20} />
            <h3 className="font-medium">Return Confirmation</h3>
          </div>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
            This will return all sold and error items back to inventory and mark the VOC as returned.
          </p>
        </div>

        {/* VOC Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">VOC Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">VOC Number:</span>
              <span className="ml-2 font-medium">{voc.vocNumber}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Customer:</span>
              <span className="ml-2 font-medium">{voc.customerName}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Date:</span>
              <span className="ml-2 font-medium">{new Date(voc.date).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="ml-2 font-medium">{voc.totalAmount.toLocaleString()} MMK</span>
            </div>
          </div>
        </div>

        {/* Return Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Items to Return</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sold Items */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
                <TrendingUp size={16} />
                <span className="font-medium">Sold Items</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {returnData.totalSoldQuantity}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                items to return to inventory
              </div>
            </div>

            {/* Error Items */}
            {hasErrors && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
                  <AlertTriangle size={16} />
                  <span className="font-medium">Error Items</span>
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {returnData.totalErrorQuantity}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  error items to return to inventory
                </div>
              </div>
            )}
          </div>

          {/* Detailed Breakdown */}
          {showDetails && (
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900 dark:text-gray-100">Detailed Breakdown</h5>
              
              {/* Sold Items Details */}
              {returnData.soldItemsToReturn.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <h6 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                    <Package size={14} />
                    Sold Items Returning to Inventory
                  </h6>
                  <div className="space-y-2">
                    {returnData.soldItemsToReturn.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-green-700 dark:text-green-300">
                          {item.name} ({item.type})
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {item.quantity} {item.type === 'Lens' ? 'pairs' : 'pcs'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Items Details */}
              {returnData.errorItemsToReturn.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <h6 className="font-medium text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Error Items Returning to Inventory
                  </h6>
                  <div className="space-y-2">
                    {returnData.errorItemsToReturn.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-red-700 dark:text-red-300">
                          {item.name} ({item.type})
                          {item.errorCategory && (
                            <span className="ml-2 px-1 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded text-xs">
                              {item.errorCategory}
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {item.quantity} {item.type === 'Lens' ? 'pairs' : 'pcs'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={loading}
            leftIcon={<RotateCcw size={16} />}
          >
            Confirm Return to Inventory
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VocReturnModal;