import React, { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import Input from './Input';
import Select from './Select';

interface VocItem {
  id?: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
  hasError?: boolean;
  errorQuantity?: number;
  errorCategory?: string;
  errorDescription?: string;
  isFOC?: boolean;
}

interface ErrorTrackerProps {
  item: VocItem;
  onUpdateItem: (updatedItem: VocItem) => void;
}

const ERROR_CATEGORIES = [
  'KKT',
  'KCMA', 
  'KMMT',
  'မှန်မှားထုတ်',
  'Factory Error',
  'Auto စက် Error',
  'ပါဝါမှား',
  'Customer Error',
  'Production Error',
  'Quality Control Error'
];

const ErrorTracker: React.FC<ErrorTrackerProps> = ({ item, onUpdateItem }) => {
  const [showErrorDetails, setShowErrorDetails] = useState(item.hasError || false);

  const handleErrorToggle = (hasError: boolean) => {
    const updatedItem = {
      ...item,
      hasError,
      errorQuantity: hasError ? (item.errorQuantity || 0) : 0,
      errorCategory: hasError ? item.errorCategory : undefined,
      errorDescription: hasError ? item.errorDescription : undefined
    };
    
    setShowErrorDetails(hasError);
    onUpdateItem(updatedItem);
  };

  const handleErrorQuantityChange = (value: string) => {
    const errorQuantity = parseFloat(value) || 0;
    const maxError = item.quantity;
    
    // Validate error quantity doesn't exceed total quantity
    if (errorQuantity > maxError) {
      return; // Don't update if exceeds max
    }
    
    const updatedItem = {
      ...item,
      errorQuantity: Math.max(0, Math.min(errorQuantity, maxError))
    };
    
    onUpdateItem(updatedItem);
  };

  const handleErrorCategoryChange = (category: string) => {
    const updatedItem = {
      ...item,
      errorCategory: category
    };
    
    onUpdateItem(updatedItem);
  };

  const handleErrorDescriptionChange = (description: string) => {
    const updatedItem = {
      ...item,
      errorDescription: description
    };
    
    onUpdateItem(updatedItem);
  };

  // Calculate error rate
  const errorRate = item.quantity > 0 ? ((item.errorQuantity || 0) / item.quantity) * 100 : 0;
  const soldQuantity = item.quantity - (item.errorQuantity || 0);
  const soldAmount = soldQuantity * item.price;
  const errorAmount = (item.errorQuantity || 0) * item.price;

  return (
    <div className="mt-3 border-t pt-3">
      {/* Error Toggle */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={item.hasError || false}
            onChange={(e) => handleErrorToggle(e.target.checked)}
            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
          />
          <AlertTriangle size={16} className="text-red-600" />
          <span className="text-sm font-medium text-red-700">This item has errors</span>
        </label>
        
        {(item.errorQuantity || 0) > 0 && (
          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            Error Rate: {errorRate.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Error Details */}
      {showErrorDetails && (
        <div className="space-y-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Error Quantity */}
            <div>
              <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                Error Quantity *
              </label>
              <Input
                type="number"
                min="0"
                max={item.quantity}
                step="0.5"
                value={item.errorQuantity || 0}
                onChange={(e) => handleErrorQuantityChange(e.target.value)}
                className="border-red-300 focus:border-red-500"
                placeholder="Enter error quantity"
              />
              <div className="text-xs text-red-600 mt-1">
                Max: {item.quantity} | Remaining for sale: {soldQuantity}
              </div>
            </div>

            {/* Error Category */}
            <div>
              <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                Error Category *
              </label>
              <Select
                value={item.errorCategory || ''}
                onChange={(e) => handleErrorCategoryChange(e.target.value)}
                options={[
                  { value: '', label: 'Select error category' },
                  ...ERROR_CATEGORIES.map(category => ({
                    value: category,
                    label: category
                  }))
                ]}
                className="border-red-300 focus:border-red-500"
              />
            </div>
          </div>

          {/* Error Description */}
          <div>
            <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
              Error Description
            </label>
            <textarea
              value={item.errorDescription || ''}
              onChange={(e) => handleErrorDescriptionChange(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-red-600 dark:text-white"
              placeholder="Describe the error details..."
            />
          </div>

          {/* Error Summary */}
          {(item.errorQuantity || 0) > 0 && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded p-3">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                <Info size={16} />
                Error Impact Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-700 dark:text-green-300">Sold Quantity: </span>
                  <span className="text-green-800 dark:text-green-200">{soldQuantity}</span>
                </div>
                <div>
                  <span className="font-medium text-red-700 dark:text-red-300">Error Quantity: </span>
                  <span className="text-red-800 dark:text-red-200">{item.errorQuantity || 0}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700 dark:text-green-300">Sold Amount: </span>
                  <span className="text-green-800 dark:text-green-200">{soldAmount.toFixed(0)} MMK</span>
                </div>
                <div>
                  <span className="font-medium text-red-700 dark:text-red-300">Error Amount: </span>
                  <span className="text-red-800 dark:text-red-200">{errorAmount.toFixed(0)} MMK</span>
                </div>
              </div>
              
              {errorRate > 0 && (
                <div className="mt-2 pt-2 border-t border-red-300 dark:border-red-600">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-red-700 dark:text-red-300">Error Rate: </span>
                    <span className={`font-bold ${
                      errorRate > 50 ? 'text-red-800' : 
                      errorRate > 25 ? 'text-orange-600' : 
                      'text-yellow-600'
                    }`}>
                      {errorRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorTracker;