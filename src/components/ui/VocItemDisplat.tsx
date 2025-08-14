import React from 'react';
import { VocItem, formatVOCItemQuantity, getItemSummary } from '../lib/InventoryUtils';

interface VOCItemDisplayProps {
  item: VocItem;
  showDetails?: boolean;
  itemIndex?: number;
}

const VOCItemDisplay: React.FC<VOCItemDisplayProps> = ({ item, showDetails = false, itemIndex }) => {
  const soldQuantity = item.quantity - (item.errorQuantity || 0);
  const errorQuantity = item.errorQuantity || 0;
  
  console.log(`🖥️ VOCItemDisplay rendering ${item.name} (index: ${itemIndex}):`, {
    totalQuantity: item.quantity,
    errorQuantity,
    soldQuantity,
    hasError: item.hasError,
    isFOC: item.isFOC,
    itemId: item.id
  });
  
  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white">
          {item.name}
          {item.isFOC && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
              FOC
            </span>
          )}
          {item.hasError && errorQuantity > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
              ERROR
            </span>
          )}
        </h4>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {item.type}
        </span>
      </div>
      
      {/* Quantity breakdown */}
      <div className="space-y-1 text-sm">
        {errorQuantity > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Quantity:</span>
              <span className="font-medium">{item.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600 dark:text-green-400">Sold:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{soldQuantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600 dark:text-red-400">Error:</span>
              <span className="font-medium text-red-600 dark:text-red-400">{errorQuantity}</span>
            </div>
          </>
        )}
        
        {errorQuantity === 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Quantity:</span>
              <span className="font-medium">{item.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600 dark:text-green-400">Sold:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{item.quantity}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Error details */}
      {item.hasError && item.errorCategory && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
          <div className="text-xs text-red-700 dark:text-red-300">
            <div className="font-medium">Error: {item.errorCategory}</div>
            {item.errorDescription && (
              <div className="mt-1">{item.errorDescription}</div>
            )}
          </div>
        </div>
      )}
      
      {/* Lens specifications */}
      {showDetails && item.type === 'Lens' && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {item.code && <div>Code: {item.code}</div>}
          {item.sph && <div>SPH: {item.sph}</div>}
          {item.cyl && <div>CYL: {item.cyl}</div>}
          {item.axis && <div>AXIS: {item.axis}</div>}
          {item.addition && <div>ADD: {item.addition}</div>}
        </div>
      )}
      
      <div className="mt-2 text-right">
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          ${item.price.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default VOCItemDisplay;