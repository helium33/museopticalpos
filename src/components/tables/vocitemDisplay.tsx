import React, { useState } from 'react';
import { VocItem } from '../../type/voc';
// import { calculateSoldQuantity, calculateErrorQuantity } from '../../lib/InventoryCalculation';
import { ChevronDown, ChevronRight, Eye, MapPin, Stethoscope, Percent, AlertTriangle, Package, ShoppingCart } from 'lucide-react';
import { calculateErrorQuantity, calculateSoldQuantity } from '../../lib/InventoryCalculation';

interface VocItemDisplayProps {
  items: VocItem[];
  type: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
  showSold?: boolean;
  showError?: boolean;
}

const VocItemDisplay: React.FC<VocItemDisplayProps> = ({ 
  items, 
  type, 
  showSold = true, 
  showError = true 
}) => {
  const [expanded, setExpanded] = useState(false);

  // Filter items by type
  const filteredItems = items.filter(item => item.type === type);

  // Calculate total quantities
  const totalItems = filteredItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalErrorItems = filteredItems.reduce((sum, item) => sum + calculateErrorQuantity(item), 0);
  const totalSoldItems = filteredItems.reduce((sum, item) => sum + calculateSoldQuantity(item), 0);

  // Helper function to display quantity with proper zero handling and decimal support
  const displayQuantity = (qty: number | undefined | null): string => {
    if (qty === undefined || qty === null) return '0';
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
  };

  const getTypeColor = (itemType: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens'): string => {
    switch (itemType) {
      case 'Lens':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'Frame':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'Accessories':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'Contact Lens':
        return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-800';
    }
  };

  // Helper function to check if a lens is bifocal
  const isBifocalLens = (item: VocItem) => {
    if (item.type !== 'Lens') return false;
    return item.category && (
      item.category.toLowerCase().includes('fuse') || 
      item.category.toLowerCase().includes('flattop') || 
      item.category.toLowerCase().includes('bifocal')
    );
  };

  // Helper function to check if a lens is single vision
  const isSingleVisionLens = (item: VocItem) => {
    if (item.type !== 'Lens') return false;
    return item.category && !isBifocalLens(item);
  };

  // Helper function to check if item is Yangon order
  const isYangonOrder = (item: VocItem) => {
    return item.category === 'yangon order' || item.isYangonOrder;
  };

  // Helper function to format quantity display for lenses
  const formatLensQuantity = (item: VocItem) => {
    if (item.type !== 'Lens') return `${displayQuantity(item.quantity)}x`;

    if (isBifocalLens(item) || isSingleVisionLens(item) || isYangonOrder(item)) {
      return `${displayQuantity(item.quantity)} pairs`;
    } else {
      return `${displayQuantity(item.quantity)} pcs`;
    }
  };

  // If no items of this type, return empty
  if (filteredItems.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  // For collapsed view, show summary with separate sold and error quantities
  if (!expanded) {
    return (
      <div className="min-w-0 max-w-full">
        <div 
          className="flex items-center gap-2 cursor-pointer text-sm group hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 shadow-sm"
          onClick={() => setExpanded(true)}
        >
          <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
          
          <div className="flex flex-col gap-2 w-full">
            {/* Type header */}
            <div className="flex items-center gap-2">
              <Package size={14} className="text-gray-500" />
              <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                {type} ({filteredItems.length} items)
              </span>
            </div>

            {/* Sold and Error quantities display */}
            <div className="flex flex-wrap gap-2">
              {/* Sold Quantity */}
              {showSold && (
                <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-700">
                  <ShoppingCart size={12} className="text-green-600 dark:text-green-400" />
                  <div className="flex flex-col">
                    <span className="text-green-700 dark:text-green-300 font-semibold text-xs">
                      Sold Qty
                    </span>
                    <span className="text-green-800 dark:text-green-200 font-bold text-sm">
                      {displayQuantity(totalSoldItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Quantity - Only show if there are errors */}
              {showError && totalErrorItems > 0 && (
                <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-700">
                  <AlertTriangle size={12} className="text-red-600 dark:text-red-400" />
                  <div className="flex flex-col">
                    <span className="text-red-700 dark:text-red-300 font-semibold text-xs">
                      Error Qty
                    </span>
                    <span className="text-red-800 dark:text-red-200 font-bold text-sm">
                      {displayQuantity(totalErrorItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                    </span>
                  </div>
                </div>
              )}

              {/* Total quantity display */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600">
                <Package size={12} className="text-gray-600 dark:text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                    Total Qty
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 font-bold text-sm">
                    {displayQuantity(totalItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-3">
      {/* Expanded header */}
      <div
        className="flex items-center gap-2 cursor-pointer text-sm group hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 shadow-sm"
        onClick={() => setExpanded(false)}
      >
        <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
        
        <div className="flex flex-col gap-2 w-full">
          {/* Type header */}
          <div className="flex items-center gap-2">
            <Package size={14} className="text-gray-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
              {type} Summary ({filteredItems.length} items)
            </span>
          </div>

          {/* Sold and Error quantities display */}
          <div className="flex flex-wrap gap-2">
            {/* Sold Quantity */}
            {showSold && (
              <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-700">
                <ShoppingCart size={12} className="text-green-600 dark:text-green-400" />
                <div className="flex flex-col">
                  <span className="text-green-700 dark:text-green-300 font-semibold text-xs">
                    Sold Qty
                  </span>
                  <span className="text-green-800 dark:text-green-200 font-bold text-sm">
                    {displayQuantity(totalSoldItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                  </span>
                </div>
              </div>
            )}

            {/* Error Quantity - Only show if there are errors */}
            {showError && totalErrorItems > 0 && (
              <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-700">
                <AlertTriangle size={12} className="text-red-600 dark:text-red-400" />
                <div className="flex flex-col">
                  <span className="text-red-700 dark:text-red-300 font-semibold text-xs">
                    Error Qty
                  </span>
                  <span className="text-red-800 dark:text-red-200 font-bold text-sm">
                    {displayQuantity(totalErrorItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                  </span>
                </div>
              </div>
            )}

            {/* Total quantity display */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600">
              <Package size={12} className="text-gray-600 dark:text-gray-400" />
              <div className="flex flex-col">
                <span className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                  Total Qty
                </span>
                <span className="text-gray-800 dark:text-gray-200 font-bold text-sm">
                  {displayQuantity(totalItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual items */}
      <div className="space-y-2 max-w-full">
        {filteredItems.map((item, index) => {
          const soldQty = calculateSoldQuantity(item);
          const errorQty = calculateErrorQuantity(item);

          return (
            <div
              key={index}
              className={`text-xs border-l-4 pl-4 py-3 rounded-r-lg ${getTypeColor(type)}
                min-w-0 max-w-full shadow-sm hover:shadow-md transition-shadow
              `}
            >
              {/* Item Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate text-sm">
                    {item.name}
                  </span>

                  {/* Price Label Badge */}
                  {item.selectedPriceLabel && item.selectedPriceLabel !== 'Regular Price' && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-xs font-medium whitespace-nowrap">
                      {item.selectedPriceLabel}
                    </span>
                  )}

                  {/* FOC Badge */}
                  {item.isFOC && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-xs font-medium whitespace-nowrap">
                      FOC
                    </span>
                  )}

                  {/* Discount Badge */}
                  {item.itemDiscount && item.itemDiscount > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                      <Percent size={10} />
                      -{item.itemDiscount} MMK
                    </span>
                  )}

                  {/* Yangon Order Badge */}
                  {isYangonOrder(item) && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                      <MapPin size={10} />
                      YANGON ORDER
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Display - Separate Sold and Error */}
              <div className="flex flex-wrap gap-2 mb-3">
                {/* Sold Quantity */}
                {showSold && (
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md border border-green-200 dark:border-green-700">
                    <ShoppingCart size={14} className="text-green-600 dark:text-green-400" />
                    <div className="flex flex-col">
                      <span className="text-green-700 dark:text-green-300 font-semibold text-xs">
                        Sold Qty
                      </span>
                      <span className="text-green-800 dark:text-green-200 font-bold text-sm">
                        {displayQuantity(soldQty)} {item.type === 'Lens' ? 'pairs' : 'pcs'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error Quantity - Only show if there are errors */}
                {showError && errorQty > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md border border-red-200 dark:border-red-700">
                    <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />
                    <div className="flex flex-col">
                      <span className="text-red-700 dark:text-red-300 font-semibold text-xs">
                        Error Qty
                      </span>
                      <span className="text-red-800 dark:text-red-200 font-bold text-sm">
                        {displayQuantity(errorQty)} {item.type === 'Lens' ? 'pairs' : 'pcs'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Total Quantity */}
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600">
                  <Package size={14} className="text-gray-600 dark:text-gray-400" />
                  <div className="flex flex-col">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                      Total Qty
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 font-bold text-sm">
                      {formatLensQuantity(item)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Details Display - Only show if there are errors */}
              {showError && item.hasError && errorQty > 0 && (
                <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
                    <AlertTriangle size={14} />
                    <span className="font-bold text-sm">
                      ERROR DETAILS - {item.errorCategory || 'Unknown Category'}
                    </span>
                  </div>
                  {item.errorDescription && (
                    <div className="text-xs text-red-700 dark:text-red-300 ml-4 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-600">
                      <strong>Description:</strong> {item.errorDescription}
                    </div>
                  )}
                </div>
              )}

              {/* Item Details */}
              <div className="space-y-2">
                {/* Lens specific details */}
                {type === 'Lens' && (
                  <div className="text-gray-600 dark:text-gray-400">
                    {/* Lens Quantity Breakdown - Always show for lenses */}
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-1">
                        <Eye size={12} />
                        Lens Quantity Breakdown
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {/* Total Quantity */}
                        <div className="text-center p-2 bg-gray-100 dark:bg-gray-700 rounded border">
                          <div className="font-medium text-gray-600 dark:text-gray-400">Total</div>
                          <div className="font-bold text-gray-800 dark:text-gray-200">
                            {formatLensQuantity(item)}
                          </div>
                        </div>
                        
                        {/* Sold Quantity */}
                        <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                          <div className="font-medium text-green-600 dark:text-green-400">Sold</div>
                          <div className="font-bold text-green-800 dark:text-green-200">
                            {displayQuantity(soldQty)} {item.type === 'Lens' ? 'pairs' : 'pcs'}
                          </div>
                        </div>
                        
                        {/* Error Quantity */}
                        <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                          <div className="font-medium text-red-600 dark:text-red-400">Error</div>
                          <div className="font-bold text-red-800 dark:text-red-200">
                            {displayQuantity(errorQty)} {item.type === 'Lens' ? 'pairs' : 'pcs'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Error Rate Display */}
                      {(soldQty + errorQty) > 0 && (
                        <div className="mt-2 text-center">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            errorQty === 0 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : errorQty / (soldQty + errorQty) > 0.2
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            Error Rate: {errorQty === 0 ? '0%' : `${((errorQty / (soldQty + errorQty)) * 100).toFixed(1)}%`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Yangon Order Details */}
                    {isYangonOrder(item) && (
                      <div className="space-y-2">
                        {item.details?.yangonOrderName && (
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-700">
                            <div className="flex items-center gap-1 text-orange-800 dark:text-orange-200">
                              <MapPin size={12} />
                              <span className="font-bold text-xs">ORDER: {item.details.yangonOrderName}</span>
                            </div>
                          </div>
                        )}

                        {/* Show right/left quantities for bifocal Yangon orders */}
                        {item.details?.rightQty !== undefined && item.details?.leftQty !== undefined && (
                          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
                            <div className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-2 text-center">
                              Bifocal Lens Distribution
                            </div>
                            <div className="flex justify-between text-xs">
                            <div className="text-center flex-1">
                              <div className="font-medium text-blue-600 dark:text-blue-400">Right</div>
                              <div className="font-semibold">
                                {item.details.rightQty > 0 ? displayQuantity(item.details.rightQty) : '-'}
                              </div>
                            </div>
                            <div className="w-px bg-orange-300 dark:bg-orange-600 mx-2"></div>
                            <div className="text-center flex-1">
                              <div className="font-medium text-green-600 dark:text-green-400">Left</div>
                              <div className="font-semibold">
                                {item.details.leftQty > 0 ? displayQuantity(item.details.leftQty) : '-'}
                              </div>
                            </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Regular bifocal lens details */}
                    {!isYangonOrder(item) && isBifocalLens(item) && item.details?.rightQty !== undefined && item.details?.leftQty !== undefined && (
                      <div className="p-2 bg-white dark:bg-gray-700 rounded border">
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-2 text-center">
                          Bifocal Lens Distribution
                        </div>
                        <div className="flex justify-between text-xs">
                        <div className="text-center flex-1">
                          <div className="font-medium text-blue-600 dark:text-blue-400">Right</div>
                          <div className="font-semibold">
                            {item.details.rightQty > 0 ? displayQuantity(item.details.rightQty) : '-'}
                          </div>
                        </div>
                        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                        <div className="text-center flex-1">
                          <div className="font-medium text-green-600 dark:text-green-400">Left</div>
                          <div className="font-semibold">
                            {item.details.leftQty > 0 ? displayQuantity(item.details.leftQty) : '-'}
                          </div>
                        </div>
                        </div>
                      </div>
                    )}

                    {/* Prescription details */}
                    {item.details && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Prescription Details:
                        </div>
                        <div className="flex flex-wrap gap-1">
                        {item.details.sph && (
                          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs border font-medium">
                            SPH: {item.details.sph}
                          </span>
                        )}
                        {item.details.cyl && (
                          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs border font-medium">
                            CYL: {item.details.cyl}
                          </span>
                        )}
                        {item.details.axis && (
                          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs border font-medium">
                            AXIS: {item.details.axis}
                          </span>
                        )}
                        {item.details.addition && (
                          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs border font-medium">
                            ADD: {item.details.addition}
                          </span>
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Frame specific details */}
                {type === 'Frame' && (
                  <div className="text-gray-600 dark:text-gray-400">
                    {item.category && (
                      <div className="mb-2">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                          {item.category}
                        </span>
                      </div>
                    )}
                    {item.details?.color && (
                      <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs border">
                        Color: {item.details.color}
                      </span>
                    )}
                  </div>
                )}

                {/* Contact Lens specific details */}
                {type === 'Contact Lens' && (
                  <div className="text-gray-600 dark:text-gray-400">
                    {item.details?.power && (
                      <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs border">
                        Power: {item.details.power}
                      </span>
                    )}
                    {item.category && (
                      <div className="mt-1">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-600 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Category display for other items */}
                {item.category && type !== 'Frame' && !isYangonOrder(item) && (
                  <div className="mt-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                      {item.category}
                    </span>
                  </div>
                )}

                {/* Store display */}
                {item.store && (
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ 
                      isYangonOrder(item) 
                        ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' 
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    }`}>
                      Store: {item.store.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VocItemDisplay;