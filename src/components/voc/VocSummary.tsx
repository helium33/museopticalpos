import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface VocItem {
  name: string;
  type: string;
  quantity: number;
  price: number;
  errorQuantity?: number;
  errorCategory?: string;
  isFOC?: boolean;
  hasError?: boolean;
}

interface VocErrorSummaryProps {
  items: VocItem[];
}

const VocErrorSummary: React.FC<VocErrorSummaryProps> = ({ items }) => {
  // Calculate error statistics
  const errorItems = items.filter(item => item.hasError && (item.errorQuantity || 0) > 0);
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalErrorQuantity = items.reduce((sum, item) => sum + (item.errorQuantity || 0), 0);
  const totalSoldQuantity = totalQuantity - totalErrorQuantity;
  
  // Calculate amounts
  const totalAmount = items.reduce((sum, item) => {
    if (item.isFOC) return sum;
    return sum + (item.price * item.quantity);
  }, 0);
  
  const soldAmount = items.reduce((sum, item) => {
    if (item.isFOC) return sum;
    const soldQty = item.quantity - (item.errorQuantity || 0);
    return sum + (item.price * soldQty);
  }, 0);
  
  // Error items are not charged, so error amount is 0 for revenue calculation
  const errorAmount = 0; // Error items are completely excluded from pricing
  
  // Overall error rate
  const overallErrorRate = totalQuantity > 0 ? (totalErrorQuantity / totalQuantity) * 100 : 0;
  
  // Error categories breakdown (no amount charged for error items)
  const errorByCategory = errorItems.reduce((acc, item) => {
    const category = item.errorCategory || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { quantity: 0, amount: 0 };
    }
    acc[category].quantity += item.errorQuantity || 0;
    acc[category].amount = 0; // Error items are not charged
    return acc;
  }, {} as Record<string, { quantity: number; amount: number }>);

  if (errorItems.length === 0) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <span className="text-green-800 dark:text-green-200 font-medium">
            No errors reported for this VOC
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Error Summary */}
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
            Error Summary
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{errorItems.length}</div>
            <div className="text-sm text-red-700 dark:text-red-300">Items with Errors</div>
            <div className="text-xs text-gray-600">of {totalItems} total</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totalErrorQuantity}</div>
            <div className="text-sm text-red-700 dark:text-red-300">Error Quantity</div>
            <div className="text-xs text-gray-600">of {totalQuantity} total</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              overallErrorRate > 50 ? 'text-red-600' : 
              overallErrorRate > 25 ? 'text-orange-600' : 
              'text-yellow-600'
            }`}>
              {overallErrorRate.toFixed(1)}%
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">Error Rate</div>
            <div className="text-xs text-gray-600">overall</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(errorAmount)}</div>
            <div className="text-sm text-green-700 dark:text-green-300">Error Charge</div>
            <div className="text-xs text-gray-600">not charged</div>
          </div>
        </div>
      </div>

      {/* Amount Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-green-800 dark:text-green-200">Sold Items</h4>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-green-700 dark:text-green-300">Quantity:</span>
              <span className="font-medium text-green-800 dark:text-green-200">{totalSoldQuantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-green-700 dark:text-green-300">Amount:</span>
              <span className="font-medium text-green-800 dark:text-green-200">{formatCurrency(soldAmount)}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <h4 className="font-medium text-red-800 dark:text-red-200">Error Items</h4>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-red-700 dark:text-red-300">Quantity:</span>
              <span className="font-medium text-red-800 dark:text-red-200">{totalErrorQuantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-red-700 dark:text-red-300">Amount:</span>
              <span className="font-medium text-green-600">{formatCurrency(errorAmount)} (Not Charged)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Categories */}
      {Object.keys(errorByCategory).length > 0 && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-orange-600" />
            <h4 className="font-medium text-orange-800 dark:text-orange-200">Error Categories</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(errorByCategory).map(([category, data]) => (
              <div key={category} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border">
                <span className="font-medium text-gray-700 dark:text-gray-300">{category}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-orange-600">
                    {data.quantity} items
                  </div>
                  <div className="text-xs text-green-600">
                    {formatCurrency(data.amount)} (Not Charged)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Error Items */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
        <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Error Items Details</h4>
        <div className="space-y-2">
          {errorItems.map((item, index) => {
            const soldQty = item.quantity - (item.errorQuantity || 0);
            const errorRate = item.quantity > 0 ? ((item.errorQuantity || 0) / item.quantity) * 100 : 0;
            
            return (
              <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    errorRate > 50 ? 'bg-red-100 text-red-800' : 
                    errorRate > 25 ? 'bg-orange-100 text-orange-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {errorRate.toFixed(1)}% error
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Sold: </span>
                    <span className="font-medium text-green-600">{soldQty}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Error: </span>
                    <span className="font-medium text-red-600">{item.errorQuantity || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Category: </span>
                    <span className="font-medium">{item.errorCategory || 'N/A'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VocErrorSummary;