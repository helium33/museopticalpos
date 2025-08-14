import React from 'react';
import { VocItem } from '../../type/Voc';
import { calculateSoldQuantity, calculateErrorQuantity } from '../../lib/InventoryCalculation';
import DataDisplay from '../tables/DataDisplay';

// Test component to verify error quantity functionality
const ErrorQuantityTest: React.FC = () => {
  // Sample VOC items with different error scenarios
  const testItems: VocItem[] = [
    {
      id: 'test-1',
      name: 'Test Lens 1',
      type: 'Lens',
      category: 'Single Vision',
      quantity: 2,
      price: 50000,
      hasError: true,
      errorQuantity: 1, // Explicit error quantity
      errorCategory: 'kkt',
      errorDescription: 'Wrong power measurement'
    },
    {
      id: 'test-2',
      name: 'Test Frame 1',
      type: 'Frame',
      category: 'Metal',
      quantity: 1,
      price: 30000,
      hasError: true,
      errorCategory: 'fitting',
      errorDescription: 'Size too small'
    },
    {
      id: 'test-3',
      name: 'Test Accessories 1',
      type: 'Accessories',
      category: 'Case',
      quantity: 3,
      price: 5000,
      hasError: true,
      errorQuantity: 2, // Explicit error quantity
      errorCategory: 'factory',
      errorDescription: 'Defective material'
    },
    {
      id: 'test-4',
      name: 'Test Lens 2 (No Error)',
      type: 'Lens',
      category: 'Progressive',
      quantity: 1,
      price: 80000,
      hasError: false
    }
  ];

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Error Quantity Test
      </h2>
      
      {/* Test Results Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Calculation Results
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 dark:border-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left border-b">Item Name</th>
                <th className="px-4 py-2 text-left border-b">Type</th>
                <th className="px-4 py-2 text-left border-b">Total Qty</th>
                <th className="px-4 py-2 text-left border-b">Has Error</th>
                <th className="px-4 py-2 text-left border-b">Error Qty</th>
                <th className="px-4 py-2 text-left border-b">Sold Qty</th>
                <th className="px-4 py-2 text-left border-b">Error Category</th>
              </tr>
            </thead>
            <tbody>
              {testItems.map((item) => {
                const errorQty = calculateErrorQuantity(item);
                const soldQty = calculateSoldQuantity(item);
                
                return (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-600">
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.type}</td>
                    <td className="px-4 py-2">{item.quantity}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.hasError 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {item.hasError ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {errorQty}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {soldQty}
                      </span>
                    </td>
                    <td className="px-4 py-2">{item.errorCategory || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DataDisplay Component Test */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          DataDisplay Component Test
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Lens Items</h4>
            <DataDisplay 
              items={testItems} 
              type="Lens" 
              showSold={true} 
              showError={true} 
            />
          </div>
          
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Frame Items</h4>
            <DataDisplay 
              items={testItems} 
              type="Frame" 
              showSold={true} 
              showError={true} 
            />
          </div>
          
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Accessories</h4>
            <DataDisplay 
              items={testItems} 
              type="Accessories" 
              showSold={true} 
              showError={true} 
            />
          </div>
          
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Contact Lens</h4>
            <DataDisplay 
              items={testItems} 
              type="Contact Lens" 
              showSold={true} 
              showError={true} 
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 dark:text-blue-300">Total Items:</span>
            <span className="ml-2 font-semibold">
              {testItems.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <div>
            <span className="text-green-700 dark:text-green-300">Total Sold:</span>
            <span className="ml-2 font-semibold">
              {testItems.reduce((sum, item) => sum + calculateSoldQuantity(item), 0)}
            </span>
          </div>
          <div>
            <span className="text-red-700 dark:text-red-300">Total Error:</span>
            <span className="ml-2 font-semibold">
              {testItems.reduce((sum, item) => sum + calculateErrorQuantity(item), 0)}
            </span>
          </div>
          <div>
            <span className="text-purple-700 dark:text-purple-300">Items with Errors:</span>
            <span className="ml-2 font-semibold">
              {testItems.filter(item => item.hasError).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorQuantityTest;