import React, { useState, useEffect } from 'react';
import { VocItem } from '../../type/Voc';
import { ChevronDown, ChevronRight, Eye, MapPin, Stethoscope, Percent, AlertTriangle } from 'lucide-react';
import { calculateErrorQuantity, calculateSoldQuantity } from '../../lib/InventoryCalculation';

interface DataDisplayProps {
  items: VocItem[];
  type: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
  showSold?: boolean;
  showError?: boolean;
}

const DataDisplay: React.FC<DataDisplayProps> = ({ 
  items, 
  type, 
  showSold = true, 
  showError = true,
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
    // Show decimal if it's not a whole number
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
  };

  // Auto-refresh display when items change (for real-time inventory updates)
  useEffect(() => {
    // Force re-render when items data changes to show updated quantities
    const timer = setTimeout(() => {
      // This ensures the component re-renders with fresh data
    }, 100);

    return () => clearTimeout(timer);
  }, [items]);

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

  // Helper function to check if a lens is bifocal (only bifocal needs left/right display)
  const isBifocalLens = (item: VocItem) => {
    if (item.type !== 'Lens') return false;

    return item.category && (
      item.category.toLowerCase().includes('fuse') || 
      item.category.toLowerCase().includes('flattop') || 
      item.category.toLowerCase().includes('bifocal')
    );
  };

  // Helper function to check if a lens is single vision (no left/right display needed)
  const isSingleVisionLens = (item: VocItem) => {
    if (item.type !== 'Lens') return false;

    return item.category && !isBifocalLens(item);
  };

  // Helper function to check if item is Yangon order
  const isYangonOrder = (item: VocItem) => {
    return item.category === 'yangon order' || item.isYangonOrder;
  };

  // Helper function to check if Yangon order is bifocal/multifocal
  const isYangonOrderBifocal = (item: VocItem) => {
    if (!isYangonOrder(item)) return false;
    // Check if it has right/left quantities or addition field
    return (item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) || 
           item.details?.addition;
  };

  // Helper function to check if item is SMS - DISABLED for display
  const isSMSLens = (item: VocItem) => {
    // Check if this is from Yangon store and hide SMS
    if (item.store === 'yangon') return false;
    return item.isSMS || false;
  };

  // Helper function to check if item is SMS bifocal - DISABLED for display
  const isSMSBifocalLens = (item: VocItem) => {
    // Check if this is from Yangon store and hide SMS bifocal
    if (item.store === 'yangon') return false;
    return item.isSMSBifocal || false;
  };

  // Helper function to format quantity display for lenses
  const formatLensQuantity = (item: VocItem) => {
    if (item.type !== 'Lens') return `${displayQuantity(item.quantity)}x`;

    if (isBifocalLens(item) || isSingleVisionLens(item) || isSMSLens(item) || isYangonOrder(item)) {
      // For bifocal, single vision, SMS lenses, and Yangon orders, show as pairs
      return `${displayQuantity(item.quantity)} pairs`;
    } else {
      // For other lens types, show as pieces
      return `${displayQuantity(item.quantity)} pcs`;
    }
  };

  // If no items of this type, return empty
  if (filteredItems.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  // For collapsed view, just show a summary with separate sold and error quantities
  if (!expanded) {
    return (
      <div className="min-w-0 max-w-full">
        <div 
          className="flex items-center gap-2 cursor-pointer text-sm group hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded transition-colors border border-gray-200 dark:border-gray-600"
          onClick={() => setExpanded(true)}
        >
          <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
          <div className="flex flex-col gap-2 w-full">
            {/* Type header */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{type}</span>
              <span className="text-xs text-gray-400">({filteredItems.length} items)</span>
            </div>
            
            {/* Enhanced sold/error display in two columns */}
            <div className="grid grid-cols-2 gap-2">
              {showSold && (
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">Sold</span>
                  </div>
                  <div className="text-sm font-bold text-green-800 dark:text-green-200">
                    {displayQuantity(totalSoldItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                  </div>
                </div>
              )}
              {showError && (
                <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs font-medium text-red-700 dark:text-red-300">Error</span>
                  </div>
                  <div className="text-sm font-bold text-red-800 dark:text-red-200">
                    {displayQuantity(totalErrorItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <div
        className="flex items-center gap-2 cursor-pointer text-sm group hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded transition-colors border border-gray-200 dark:border-gray-600"
        onClick={() => setExpanded(false)}
      >
        <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
        <div className="flex flex-col gap-2 w-full">
          {/* Summary header */}
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
            <span>{type} SUMMARY</span>
            <span className="text-gray-400 font-normal">({filteredItems.length} items)</span>
          </div>
          
          {/* Enhanced sold/error display in two columns */}
          <div className="grid grid-cols-2 gap-2">
            {showSold && (
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Sold</span>
                </div>
                <div className="text-sm font-bold text-green-800 dark:text-green-200">
                  {displayQuantity(totalSoldItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                </div>
              </div>
            )}
            {showError && (
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-700">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">Error</span>
                </div>
                <div className="text-sm font-bold text-red-800 dark:text-red-200">
                  {displayQuantity(totalErrorItems)} {type === 'Lens' ? 'pairs' : 'pcs'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 max-w-full">
        {filteredItems.map((item, index) => {
          const soldQty = calculateSoldQuantity(item);
          const errorQty = calculateErrorQuantity(item);
          
          return (
            <div
              key={index}
              className={`text-xs border-l-3 pl-3 py-2 rounded-r-md ${getTypeColor(type)}
                min-w-0 max-w-full
                ${isBifocalLens(item) ? 'border-l-4 border-l-purple-500' : ''}
                ${isSingleVisionLens(item) ? 'border-l-4 border-l-blue-500' : ''}
                ${isSMSLens(item) ? 'border-l-4 border-l-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
                ${isYangonOrder(item) ? 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/20' : ''}
                shadow-sm hover:shadow-md transition-shadow
              `}
            >
              {/* Item Header */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {item.name}
                  </span>

                  {/* Sold Quantity - Enhanced Display */}
                  {showSold && soldQty > 0 && (
                    <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-200 dark:border-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 dark:text-green-300 font-bold text-[10px] whitespace-nowrap">
                        SOLD: {displayQuantity(soldQty)}
                      </span>
                    </div>
                  )}

                  {/* Error Quantity - Enhanced Display */}
                  {showError && item.hasError && errorQty > 0 && (
                    <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md border border-red-200 dark:border-red-700">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 dark:text-red-300 font-bold text-[10px] whitespace-nowrap">
                        ERROR: {displayQuantity(errorQty)}
                      </span>
                    </div>
                  )}

                  {/* Price Label Badge */}
                  {item.selectedPriceLabel && item.selectedPriceLabel !== 'Regular Price' && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-[10px] font-medium whitespace-nowrap">
                      {item.selectedPriceLabel}
                    </span>
                  )}

                  {/* FOC Badge */}
                  {item.isFOC && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-[10px] font-medium whitespace-nowrap">
                      FOC
                    </span>
                  )}

                  {/* Discount Badge */}
                  {item.itemDiscount && item.itemDiscount > 0 && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 rounded-full text-[10px] font-medium flex items-center gap-1 whitespace-nowrap">
                      <Percent size={8} />
                      -{item.itemDiscount} MMK
                    </span>
                  )}

                  {/* Bifocal Lens Badge */}
                  {isBifocalLens(item) && (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 rounded-full text-[10px] font-medium flex items-center gap-1 whitespace-nowrap">
                      <Eye size={8} />
                      Bifocal
                    </span>
                  )}

                  {/* Single Vision Lens Badge */}
                  {isSingleVisionLens(item) && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-[10px] font-medium flex items-center gap-1 whitespace-nowrap">
                      <Eye size={8} />
                      Single Vision
                    </span>
                  )}

                  {/* SMS Lens Badge */}
                  {isSMSLens(item) && !isSMSBifocalLens(item) && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-[10px] font-medium flex items-center gap-1 whitespace-nowrap">
                      <Stethoscope size={8} />
                      SMS
                    </span>
                  )}

                  {/* SMS Bifocal Lens Badge */}
                  {isSMSBifocalLens(item) && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-[10px] font-medium flex items-center gap-1 whitespace-nowrap">
                      <Stethoscope size={8} />
                      SMS Bifocal
                    </span>
                  )}

                  {/* Yangon Order Badge */}
                  {isYangonOrder(item) && (
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 rounded-full text-[10px] font-bold flex items-center gap-1 whitespace-nowrap">
                      <MapPin size={8} />
                      YANGON ORDER
                    </span>
                  )}
                </div>
              </div>

              {/* Yangon Order Name Display */}
              {isYangonOrder(item) && item.details?.yangonOrderName && (
                <div className="mb-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center gap-1 text-orange-800 dark:text-orange-200">
                    <MapPin size={10} />
                    <span className="font-bold text-[10px]">YANGON ORDER: {item.details.yangonOrderName}</span>
                  </div>
                </div>
              )}

              {/* Item Discount Display */}
              {item.itemDiscount && item.itemDiscount > 0 && (
                <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center gap-1 text-yellow-800 dark:text-yellow-200">
                    <Percent size={10} />
                    <span className="font-bold text-[10px]">ITEM DISCOUNT: -{item.itemDiscount} MMK</span>
                  </div>
                </div>
              )}

              {/* Error Details Display */}
              {showError && item.hasError && (
                <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-1 text-red-800 dark:text-red-200 mb-1">
                    <AlertTriangle size={10} />
                    <span className="font-bold text-[10px]">
                      ERROR DETAILS - {item.errorCategory || 'Unknown Category'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-red-50 dark:bg-red-900/20 p-1 rounded border">
                      <div className="text-[8px] text-red-600 dark:text-red-400 font-bold">ERROR QTY</div>
                      <div className="text-[10px] font-bold text-red-800 dark:text-red-200">
                        {displayQuantity(errorQty)} {item.type === 'Lens' ? 'pairs' : 'pcs'}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-1 rounded border">
                      <div className="text-[8px] text-green-600 dark:text-green-400 font-bold">SOLD QTY</div>
                      <div className="text-[10px] font-bold text-green-800 dark:text-green-200">
                        {displayQuantity(soldQty)} {item.type === 'Lens' ? 'pairs' : 'pcs'}
                      </div>
                    </div>
                  </div>
                  {item.errorDescription && (
                    <div className="text-[9px] text-red-700 dark:text-red-300 ml-3">
                      <strong>Description:</strong> {item.errorDescription}
                    </div>
                  )}
                </div>
              )}

              {/* Item Details */}
              <div className="space-y-1">
                {/* Lens specific details */}
                {type === 'Lens' && (
                  <div className="text-gray-600 dark:text-gray-400">
                    {/* Yangon Order - Show complete prescription details */}
                    {isYangonOrder(item) ? (
                      <div className="space-y-2">
                        <div className="text-[10px] text-center font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded p-1">
                          YANGON ORDER - Total: {formatLensQuantity(item)}
                        </div>

                        {/* Show right/left quantities if available for bifocal */}
                        {isYangonOrderBifocal(item) && item.details?.rightQty !== undefined && item.details?.leftQty !== undefined && (
                          <div className="flex justify-between text-[10px] bg-orange-50 dark:bg-orange-900/20 rounded p-1 border border-orange-200 dark:border-orange-700">
                            <div className="text-center flex-1">
                              <div className="font-medium text-blue-600 dark:text-blue-400">Right</div>
                              <div className="font-semibold">
                                {item.details.rightQty > 0 ? displayQuantity(item.details.rightQty) : '-'}
                              </div>
                            </div>
                            <div className="w-px bg-orange-300 dark:bg-orange-600 mx-1"></div>
                            <div className="text-center flex-1">
                              <div className="font-medium text-green-600 dark:text-green-400">Left</div>
                              <div className="font-semibold">
                                {item.details.leftQty > 0 ? displayQuantity(item.details.leftQty) : '-'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Enhanced Yangon Order Prescription Display */}
                        {item.details && (
                          <div className="space-y-2">
                            {/* Main prescription details */}
                            <div className="flex flex-wrap gap-1">
                              {item.details.sph && (
                                <span className="px-1 py-0.5 rounded text-[9px] border font-bold bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600 text-orange-800 dark:text-orange-200">
                                  SPH: {item.details.sph}
                                </span>
                              )}
                              {item.details.cyl && (
                                <span className="px-1 py-0.5 rounded text-[9px] border font-bold bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600 text-orange-800 dark:text-orange-200">
                                  CYL: {item.details.cyl}
                                </span>
                              )}
                              {item.details.axis && (
                                <span className="px-1 py-0.5 rounded text-[9px] border font-bold bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600 text-orange-800 dark:text-orange-200">
                                  AXIS: {item.details.axis}
                                </span>
                              )}
                              {item.details.addition && (
                                <span className="px-1 py-0.5 rounded text-[9px] border font-bold bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600 text-orange-800 dark:text-orange-200">
                                  ADD: {item.details.addition}
                                </span>
                              )}
                            </div>

                            {/* Enhanced Individual Eye Prescriptions for Yangon Order */}
                            {(item.details.Right || item.details.Left || item.details.rightCyl || item.details.leftCyl || item.details.rightAxis || item.details.leftAxis) && (
                              <div className="space-y-1">
                                <div className="text-[9px] font-bold text-orange-700 dark:text-orange-300 text-center bg-orange-100 dark:bg-orange-900/30 rounded p-1">
                                  INDIVIDUAL EYE PRESCRIPTION
                                </div>

                                {/* Right Eye Details - Enhanced Display */}
                                {(item.details.Right || item.details.rightCyl || item.details.rightAxis) && (
                                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-2 border-blue-300 dark:border-blue-600">
                                    <div className="text-[9px] font-bold text-blue-800 dark:text-blue-200 mb-1 flex items-center gap-1">
                                      <Eye size={10} />
                                      RIGHT EYE PRESCRIPTION
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {item.details.Right && (
                                        <div className="text-center">
                                          <div className="text-[8px] text-blue-600 dark:text-blue-400 font-bold">SPH</div>
                                          <div className="px-1 py-0.5 rounded text-[8px] border-2 font-bold bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-800 dark:text-blue-200">
                                            {item.details.Right}
                                          </div>
                                        </div>
                                      )}
                                      {item.details.rightCyl && (
                                        <div className="text-center">
                                          <div className="text-[8px] text-blue-600 dark:text-blue-400 font-bold">CYL</div>
                                          <div className="px-1 py-0.5 rounded text-[8px] border-2 font-bold bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-800 dark:text-blue-200">
                                            {item.details.rightCyl}
                                          </div>
                                        </div>
                                      )}
                                      {item.details.rightAxis && (
                                        <div className="text-center">
                                          <div className="text-[8px] text-blue-600 dark:text-blue-400 font-bold">AXIS</div>
                                          <div className="px-1 py-0.5 rounded text-[8px] border-2 font-bold bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-800 dark:text-blue-200">
                                            {item.details.rightAxis}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Left Eye Details - Enhanced Display */}
                                {(item.details.Left || item.details.leftCyl || item.details.leftAxis) && (
                                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border-2 border-green-300 dark:border-green-600">
                                    <div className="text-[9px] font-bold text-green-800 dark:text-green-200 mb-1 flex items-center gap-1">
                                      <Eye size={10} />
                                      LEFT EYE PRESCRIPTION
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {item.details.Left && (
                                        <div className="text-center">
                                          <div className="text-[8px] text-green-600 dark:text-green-400 font-bold">SPH</div>
                                          <div className="px-1 py-0.5 rounded text-[8px] border-2 font-bold bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-800 dark:text-green-200">
                                            {item.details.Left}
                                          </div>
                                        </div>
                                      )}
                                      {item.details.leftCyl && (
                                        <div className="text-center">
                                          <div className="text-[8px] text-green-600 dark:text-green-400 font-bold">CYL</div>
                                          <div className="px-1 py-0.5 rounded text-[8px] border-2 font-bold bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-800 dark:text-green-200">
                                            {item.details.leftCyl}
                                          </div>
                                        </div>
                                      )}
                                      {item.details.leftAxis && (
                                        <div className="text-center">
                                          <div className="text-[8px] text-green-600 dark:text-green-400 font-bold">AXIS</div>
                                          <div className="px-1 py-0.5 rounded text-[8px] border-2 font-bold bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-800 dark:text-green-200">
                                            {item.details.leftAxis}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Special Yangon Order prescription note */}
                            <div className="p-1 bg-orange-50 dark:bg-orange-900/20 rounded border-2 border-orange-300 dark:border-orange-600">
                              <div className="text-[9px] text-orange-700 dark:text-orange-300 font-bold text-center">
                                {isYangonOrderBifocal(item) ? 'YANGON ORDER - BIFOCAL/MULTIFOCAL PRESCRIPTION' : 'YANGON ORDER - SINGLE VISION PRESCRIPTION'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (isBifocalLens(item) || isSMSBifocalLens(item)) ? (
                      // Show left/right breakdown for regular bifocal lenses and SMS bifocal with individual quantities
                      <div className="space-y-1">
                        <div className="text-[10px] text-center font-medium text-purple-700 dark:text-purple-300">
                          Total: {formatLensQuantity(item)}
                        </div>
                        <div className="flex justify-between text-[10px] bg-white dark:bg-gray-700 rounded p-1 border">
                          <div className="text-center flex-1">
                            <div className="font-medium text-blue-600 dark:text-blue-400">Right</div>
                            <div className="font-semibold">
                              {item.details?.rightQty !== undefined && item.details.rightQty > 0 
                                ? displayQuantity(item.details.rightQty)
                                : '-'
                              }
                            </div>
                          </div>
                          <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                          <div className="text-center flex-1">
                            <div className="font-medium text-green-600 dark:text-green-400">Left</div>
                            <div className="font-semibold">
                              {item.details?.leftQty !== undefined && item.details.leftQty > 0 
                                ? displayQuantity(item.details.leftQty)
                                : '-'
                              }
                            </div>
                          </div>
                        </div>

                        {/* Regular lens prescription details */}
                        {item.details && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.details.sph && (
                              <span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[9px] border">
                                SPH: {item.details.sph}
                              </span>
                            )}
                            {item.details.cyl && (
                              <span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[9px] border">
                                CYL: {item.details.cyl}
                              </span>
                            )}
                            {item.details.axis && (
                              <span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[9px] border">
                                AXIS: {item.details.axis}
                              </span>
                            )}
                            {item.details.addition && (
                              <span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[9px] border">
                                ADD: {item.details.addition}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // For single vision, SMS single vision and other lenses, just show quantity and prescription
                      <div className="space-y-1">
                        {showSold && (
                          <div className="text-[10px] space-y-1">
                            <div className="grid grid-cols-2 gap-1">
                              <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-700">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                <span className="text-green-700 dark:text-green-300 font-bold text-[9px]">
                                  SOLD: {calculateSoldQuantity(item)}
                                </span>
                              </div>
                              {showError && item.hasError && calculateErrorQuantity(item) > 0 && (
                                <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-700">
                                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                  <span className="text-red-700 dark:text-red-300 font-bold text-[9px]">
                                    ERROR: {calculateErrorQuantity(item)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Regular lens prescription details */}
                        {item.details && (
                          <div className="flex flex-wrap gap-1">
                            {item.details.sph && (
                              <span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[9px] border">
                                SPH: {item.details.sph}
                              </span>
                            )}
                            {item.details.cyl && (
                              <span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[9px] border">
                                CYL: {item.details.cyl}
                              </span>
                            )}
                            {item.details.axis && (
                              <span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[9px] border">
                                AXIS: {item.details.axis}
                              </span>
                            )}
                            {item.details.addition && (
                              <span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[9px] border">
                                ADD: {item.details.addition}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Frame specific details */}
                {type === 'Frame' && (
                  <div className="text-gray-600 dark:text-gray-400">
                    {showSold && (
                      <div className="text-[10px] mb-1">
                        <div className="grid grid-cols-2 gap-1">
                          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-700">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-green-700 dark:text-green-300 font-bold text-[9px]">
                              SOLD: {calculateSoldQuantity(item)}
                            </span>
                          </div>
                          {showError && item.hasError && calculateErrorQuantity(item) > 0 && (
                            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-700">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-red-700 dark:text-red-300 font-bold text-[9px]">
                                ERROR: {calculateErrorQuantity(item)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Show frame category if available */}
                    {item.category && (
                      <div className="mb-1">
                        <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-[10px] font-medium">
                          {item.category}
                        </span>
                      </div>
                    )}
                    {/* Show frame color */}
                    {item.details?.color && (
                      <span className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px] border">
                        Color: {item.details.color}
                      </span>
                    )}
                  </div>
                )}

                {/* Contact Lens specific details */}
                {type === 'Contact Lens' && (
                  <div className="text-gray-600 dark:text-gray-400">
                    {showSold && (
                      <div className="text-[10px] mb-1">
                        <div className="grid grid-cols-2 gap-1">
                          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-700">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-green-700 dark:text-green-300 font-bold text-[9px]">
                              SOLD: {calculateSoldQuantity(item)}
                            </span>
                          </div>
                          {showError && item.hasError && calculateErrorQuantity(item) > 0 && (
                            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-700">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                              <span className="text-red-700 dark:text-red-300 font-bold text-[9px]">
                                ERROR: {calculateErrorQuantity(item)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {item.details?.power && (
                      <span className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px] border">
                        Power: {item.details.power}
                      </span>
                    )}
                    {item.category && (
                      <div className="mt-1">
                        <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-600 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Accessories */}
                {type === 'Accessories' && (
                  <div className="text-gray-600 dark:text-gray-400 text-[10px] space-y-1">
                    {showSold && (
                      <div className="grid grid-cols-2 gap-1">
                        <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-700">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-green-700 dark:text-green-300 font-bold text-[9px]">
                            SOLD: {calculateSoldQuantity(item)}
                          </span>
                        </div>
                        {showError && item.hasError && calculateErrorQuantity(item) > 0 && (
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-700">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                            <span className="text-red-700 dark:text-red-300 font-bold text-[9px]">
                              ERROR: {calculateErrorQuantity(item)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Category display - Only show for non-frame items or if frame doesn't have category already shown */}
                {item.category && type !== 'Frame' && !isYangonOrder(item) && (
                  <div className="mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ 
                      isSMSLens(item) 
                        ? 'bg-blue-100 dark:bg-blue-600 text-blue-700 dark:text-blue-300' 
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300' 
                    }`}>
                      {item.category}
                    </span>
                  </div>
                )}

                {/* Store display for lenses */}
                {type === 'Lens' && item.store && (
                  <div className="mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ 
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

export default DataDisplay;