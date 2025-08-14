import React, { useState } from 'react';
import { VocItem, VocData } from '../../type/Vocerror';
import { Trash2, RotateCcw, AlertTriangle, ShoppingCart, Package, Eye } from 'lucide-react';
import { calculateErrorQuantity, calculateSoldQuantity } from '../../lib/InventoryCalculation';

// VocItemDisplay Component
const VocItemDisplay: React.FC<{
  items: VocItem[];
  type: string;
  showSold?: boolean;
  showError?: boolean;
}> = ({ items, type, showSold = false, showError = false }) => {
  const filteredItems = items.filter(item => item.type === type);
  
  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
        {type}
      </div>
      {filteredItems.map((item, index) => {
        const soldQty = calculateSoldQuantity(item);
        const errorQty = calculateErrorQuantity(item);
        
        return (
          <div key={index} className="text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {item.name}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  Total: {item.quantity}
                </span>
                {showSold && soldQty > 0 && (
                  <span className="text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                    Sold: {soldQty}
                  </span>
                )}
                {showError && errorQty > 0 && (
                  <span className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                    Error: {errorQty}
                  </span>
                )}
              </div>
            </div>
            
            {errorQty > 0 && (item.hasError || item.errorQuantity || item.errorQty) && (
              <div className="ml-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs">
                <div className="flex items-center gap-1 text-red-700 dark:text-red-300">
                  <AlertTriangle size={12} />
                  <span className="font-medium">
                    {getErrorCategoryDisplayName(item.errorCategory || 'unknown')}: {errorQty} items
                  </span>
                </div>
                {item.errorDescription && (
                  <div className="text-red-600 dark:text-red-400 mt-1">
                    {item.errorDescription}
                  </div>
                )}
              </div>
            )}
            
            {item.category && (
              <div className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                Category: {item.category}
              </div>
            )}
            
            {item.details && (
              <div className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                {item.details.sph && `SPH: ${item.details.sph}`}
                {item.details.cyl && `, CYL: ${item.details.cyl}`}
                {item.details.axis && `, AXIS: ${item.details.axis}`}
                {item.details.addition && `, ADD: ${item.details.addition}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const formatCurrency = (amount: number): string => {
  try {
    return new Intl.NumberFormat('my-MM', {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    return `${amount.toLocaleString()} MMK`;
  }
};

const formatErrorQuantity = (quantity: number, type: string): string => {
  const formattedQty = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
  const unit = type === 'Lens' ? 'pairs' : 'pcs';
  return `${formattedQty} ${unit}`;
};

// Helper function to get error category display name
const getErrorCategoryDisplayName = (errorCategory: string): string => {
  const categoryMap: Record<string, string> = {
    'form_error': '📝 Form Error',
    'kkt': '🔧 KKT',
    'kcma': '⚙️ KCMA',
    'kmmt': '🛠️ KMMT',
    'eye_test': '👁️ Eye Test',
    'fitting': '🔧 Fitting',
    'factory': '🏭 Factory',
    'wrong_delivery': '📦 Wrong Delivery',
    'wrong_lens_production': '🔍 Wrong Lens Production',
    'unknown': '❓ Unknown Error'
  };
  
  return categoryMap[errorCategory] || `❓ ${errorCategory}`;
};

interface VocTableProps {
  vocs: VocData[];
  onDeleteVoc: (vocId: string) => void;
  onReturnToInventory: (vocId: string) => void;
}

const VocTable: React.FC<VocTableProps> = ({ vocs, onDeleteVoc, onReturnToInventory }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (vocId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(vocId)) {
      newExpanded.delete(vocId);
    } else {
      newExpanded.add(vocId);
    }
    setExpandedRows(newExpanded);
  };

  const getTotalSoldQuantity = (items: VocItem[]) => {
    return items.reduce((sum, item) => sum + calculateSoldQuantity(item), 0);
  };

  const getTotalErrorQuantity = (items: VocItem[]) => {
    return items.reduce((sum, item) => sum + calculateErrorQuantity(item), 0);
  };

  // Enhanced error detection function
  const hasVocErrors = (items: VocItem[]): boolean => {
    const totalErrorQty = getTotalErrorQuantity(items);
    return items.some(item => item.hasError) || totalErrorQty > 0;
  };
  const getErrorDetails = (items: VocItem[]) => {
    // Filter items that have error quantities, regardless of hasError flag
    const errorItems = items.filter(item => {
      const errorQty = calculateErrorQuantity(item);
      return errorQty > 0 && (item.hasError || item.errorQuantity || item.errorQty);
    });
    
    if (errorItems.length === 0) return null;

    return errorItems.map(item => ({
      name: item.name,
      type: item.type,
      category: item.errorCategory || 'unknown',
      description: item.errorDescription,
      quantity: calculateErrorQuantity(item),
    }));
  };

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              VOC Details
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Items Content
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} />
                Sold Quantity
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                Error Quantity & Details
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Total Amount
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {vocs.map((voc) => {
            const isExpanded = expandedRows.has(voc.id);
            const totalSoldQty = getTotalSoldQuantity(voc.items);
            const totalErrorQty = getTotalErrorQuantity(voc.items);
            const errorDetails = getErrorDetails(voc.items);
            const vocHasErrors = hasVocErrors(voc.items);

            return (
              <React.Fragment key={voc.id}>
                <tr 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    vocHasErrors ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500' : ''
                  }`}
                >
                  {/* VOC Details */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {voc.vocNumber}
                        </span>
                        {vocHasErrors && (
                          <AlertTriangle size={16} className="text-red-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {voc.customerName}
                      </div>
                      {voc.customerPhone && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {voc.customerPhone}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {voc.date}
                      </div>
                    </div>
                  </td>

                  {/* Items Content */}
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <VocItemDisplay items={voc.items} type="Lens" showSold={true} showError={true} />
                      <VocItemDisplay items={voc.items} type="Frame" showSold={true} showError={true} />
                      <VocItemDisplay items={voc.items} type="Accessories" showSold={true} showError={true} />
                      <VocItemDisplay items={voc.items} type="Contact Lens" showSold={true} showError={true} />
                    </div>
                  </td>

                  {/* Sold Quantity */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={16} className="text-green-600 dark:text-green-400" />
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">
                          {totalSoldQty}
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400">
                          items sold
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Error Quantity & Details */}
                  <td className="px-6 py-4">
                    {totalErrorQty > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-red-700 dark:text-red-300">
                              {totalErrorQty}
                            </span>
                            <span className="text-xs text-red-600 dark:text-red-400">
                              error items
                            </span>
                          </div>
                        </div>
                        
                        {/* Error Details */}
                        {errorDetails && (
                          <div className="space-y-1">
                            {errorDetails.map((error, index) => (
                              <div key={index} className="p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                                <div className="text-xs font-semibold text-red-800 dark:text-red-200">
                                  {error.name} ({formatErrorQuantity(error.quantity, error.type)})
                                </div>
                                <div className="text-xs text-red-700 dark:text-red-300">
                                  Category: {getErrorCategoryDisplayName(error.category)}
                                </div>
                                {error.description && (
                                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    {error.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Package size={16} />
                        <span className="text-sm">No errors</span>
                      </div>
                    )}
                  </td>

                  {/* Total Amount */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(voc.totalAmount)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRowExpansion(voc.id)}
                        className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                          vocHasErrors 
                            ? 'text-red-700 bg-red-100 border border-red-300 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-800/40'
                            : 'text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                        }`}
                        title={isExpanded ? "Hide Details" : `Show Details${vocHasErrors ? ` (${totalErrorQty} errors)` : ''}`}
                      >
                        <Eye size={14} />
                        <span>{isExpanded ? "Hide" : "View"}</span>
                        {vocHasErrors && !isExpanded && (
                          <span className="ml-1 px-1.5 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full text-xs font-bold">
                            {totalErrorQty}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => onReturnToInventory(voc.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-800 transition-colors"
                        title="Return to Inventory"
                      >
                        <RotateCcw size={14} />
                        Return
                      </button>
                      <button
                        onClick={() => onDeleteVoc(voc.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-800 transition-colors"
                        title="Delete VOC"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded row for detailed view */}
                {isExpanded && (
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Detailed Item Breakdown
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <VocItemDisplay items={voc.items} type="Lens" showSold={true} showError={true} />
                          <VocItemDisplay items={voc.items} type="Frame" showSold={true} showError={true} />
                          <VocItemDisplay items={voc.items} type="Accessories" showSold={true} showError={true} />
                          <VocItemDisplay items={voc.items} type="Contact Lens" showSold={true} showError={true} />
                        </div>
                        
                        {/* Summary Statistics */}
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-600 rounded-lg">
                          <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            VOC Summary
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                                {voc.items.reduce((sum, item) => sum + item.quantity, 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-green-600 dark:text-green-400">Sold Items:</span>
                              <span className="ml-2 font-semibold text-green-700 dark:text-green-300">
                                {totalSoldQty}
                              </span>
                            </div>
                            <div>
                              <span className="text-red-600 dark:text-red-400">Error Items:</span>
                              <span className="ml-2 font-semibold text-red-700 dark:text-red-300">
                                {totalErrorQty}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Error Rate:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                                {totalSoldQty + totalErrorQty > 0 
                                  ? ((totalErrorQty / (totalSoldQty + totalErrorQty)) * 100).toFixed(1)
                                  : 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VocTable;