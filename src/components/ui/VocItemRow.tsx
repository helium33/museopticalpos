import React, { useState } from 'react';
import { VocItem } from '../lib/utils';
import { Edit3, Eye, MapPin, Stethoscope, Percent } from 'lucide-react';
import LensEditModal from './LensEditModal';

interface VocItemRowProps {
  item: VocItem;
  itemIndex: number;
  vocId: string;
  onItemUpdate: () => void;
}

const VocItemRow: React.FC<VocItemRowProps> = ({ item, itemIndex, vocId, onItemUpdate }) => {
  const [showEditModal, setShowEditModal] = useState(false);

  // Helper function to check if item can be edited
  const canEditItem = (item: VocItem) => {
    return item.type === 'Lens';
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

  // Helper function to check if item is SMS
  const isSMSLens = (item: VocItem) => {
    if (item.store === 'yangon') return false;
    return item.isSMS || false;
  };

  // Helper function to format quantity display
  const formatQuantity = (item: VocItem) => {
    if (item.type === 'Lens') {
      if (isBifocalLens(item) || isSingleVisionLens(item) || isSMSLens(item) || isYangonOrder(item)) {
        return `${item.quantity.toString()} pairs`;
      } else {
        return `${item.quantity.toString()} pcs`;
      }
    }
    return `${item.quantity.toString()} items`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
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

  return (
    <>
      <div className={`
        border-l-4 p-4 rounded-r-lg shadow-sm hover:shadow-md transition-all duration-200
        ${getTypeColor(item.type)}
        ${isBifocalLens(item) ? 'border-l-purple-500' : ''}
        ${isSingleVisionLens(item) ? 'border-l-blue-500' : ''}
        ${isSMSLens(item) ? 'border-l-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
        ${isYangonOrder(item) ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20' : ''}
      `}>
        {/* Item Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {item.name}
              </h3>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                ×{formatQuantity(item)}
              </span>
              
              {/* Badges */}
              {item.selectedPriceLabel && item.selectedPriceLabel !== 'Regular Price' && (
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-xs font-medium">
                  {item.selectedPriceLabel}
                </span>
              )}
              
              {item.isFOC && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-xs font-medium">
                  FOC
                </span>
              )}
              
              {item.itemDiscount && item.itemDiscount > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 rounded-full text-xs font-medium flex items-center gap-1">
                  <Percent size={10} />
                  -{item.itemDiscount} MMK
                </span>
              )}
              
              {isBifocalLens(item) && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 rounded-full text-xs font-medium flex items-center gap-1">
                  <Eye size={10} />
                  Bifocal
                </span>
              )}
              
              {isSingleVisionLens(item) && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-xs font-medium flex items-center gap-1">
                  <Eye size={10} />
                  Single Vision
                </span>
              )}
              
              {isSMSLens(item) && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-xs font-medium flex items-center gap-1">
                  <Stethoscope size={10} />
                  SMS
                </span>
              )}
              
              {isYangonOrder(item) && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 rounded-full text-xs font-bold flex items-center gap-1">
                  <MapPin size={10} />
                  YANGON ORDER
                </span>
              )}
            </div>
          </div>
          
          {/* Edit Button */}
          {canEditItem(item) && (
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              title="Edit lens specifications"
            >
              <Edit3 size={16} />
            </button>
          )}
        </div>

        {/* Yangon Order Name Display */}
        {isYangonOrder(item) && item.details?.yangonOrderName && (
          <div className="mb-3 p-3 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-700">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <MapPin size={12} />
              <span className="font-bold text-sm">YANGON ORDER: {item.details.yangonOrderName}</span>
            </div>
          </div>
        )}

        {/* Item Discount Display */}
        {item.itemDiscount && item.itemDiscount > 0 && (
          <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Percent size={12} />
              <span className="font-bold text-sm">ITEM DISCOUNT: -{item.itemDiscount} MMK</span>
            </div>
          </div>
        )}

        {/* Item Details */}
        <div className="space-y-3">
          {/* Lens specific details */}
          {item.type === 'Lens' && (
            <div className="text-gray-600 dark:text-gray-400">
              {/* Yangon Order - Show complete prescription details */}
              {isYangonOrder(item) ? (
                <div className="space-y-3">
                  <div className="text-xs text-center font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded p-2">
                    YANGON ORDER - Total: {formatQuantity(item)}
                  </div>
                  
                  {/* Enhanced Yangon Order Prescription Display */}
                  {item.details && (
                    <div className="space-y-3">
                      {/* Main prescription details */}
                      <div className="grid grid-cols-4 gap-2">
                        {item.details.sph && (
                          <div className="text-center p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600 rounded">
                            <div className="text-xs font-medium text-orange-600 dark:text-orange-400">SPH</div>
                            <div className="font-bold text-orange-800 dark:text-orange-200">{item.details.sph}</div>
                          </div>
                        )}
                        {item.details.cyl && (
                          <div className="text-center p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600 rounded">
                            <div className="text-xs font-medium text-orange-600 dark:text-orange-400">CYL</div>
                            <div className="font-bold text-orange-800 dark:text-orange-200">{item.details.cyl}</div>
                          </div>
                        )}
                        {item.details.axis && (
                          <div className="text-center p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600 rounded">
                            <div className="text-xs font-medium text-orange-600 dark:text-orange-400">AXIS</div>
                            <div className="font-bold text-orange-800 dark:text-orange-200">{item.details.axis}</div>
                          </div>
                        )}
                        {item.details.addition && (
                          <div className="text-center p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600 rounded">
                            <div className="text-xs font-medium text-orange-600 dark:text-orange-400">ADD</div>
                            <div className="font-bold text-orange-800 dark:text-orange-200">{item.details.addition}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (isBifocalLens(item)) ? (
                // Show left/right breakdown for regular bifocal lenses
                <div className="space-y-2">
                  <div className="text-xs text-center font-medium text-purple-700 dark:text-purple-300">
                    Total: {formatQuantity(item)}
                  </div>
                  <div className="flex justify-between text-xs bg-white dark:bg-gray-700 rounded p-2 border">
                    <div className="text-center flex-1">
                      <div className="font-medium text-blue-600 dark:text-blue-400">Right</div>
                      <div className="font-semibold">
                        {item.details?.rightQty !== undefined && item.details.rightQty > 0 
                          ? item.details.rightQty
                          : '-'
                        }
                      </div>
                    </div>
                    <div className="w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                    <div className="text-center flex-1">
                      <div className="font-medium text-green-600 dark:text-green-400">Left</div>
                      <div className="font-semibold">
                        {item.details?.leftQty !== undefined && item.details.leftQty > 0 
                          ? item.details.leftQty
                          : '-'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Regular lens prescription details */}
                  {item.details && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {item.details.sph && (
                        <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">SPH</div>
                          <div className="font-bold text-gray-900 dark:text-white">{item.details.sph}</div>
                        </div>
                      )}
                      {item.details.cyl && (
                        <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">CYL</div>
                          <div className="font-bold text-gray-900 dark:text-white">{item.details.cyl}</div>
                        </div>
                      )}
                      {item.details.axis && (
                        <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">AXIS</div>
                          <div className="font-bold text-gray-900 dark:text-white">{item.details.axis}</div>
                        </div>
                      )}
                      {item.details.addition && (
                        <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">ADD</div>
                          <div className="font-bold text-gray-900 dark:text-white">{item.details.addition}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // For single vision and other lenses
                <div className="space-y-2">
                  <div className="text-xs">
                    Qty: {formatQuantity(item)}
                  </div>
                  
                  {/* Regular lens prescription details */}
                  {item.details && (
                    <div className="grid grid-cols-4 gap-2">
                      {item.details.sph && (
                        <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">SPH</div>
                          <div className="font-bold text-gray-900 dark:text-white">{item.details.sph}</div>
                        </div>
                      )}
                      {item.details.cyl && (
                        <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">CYL</div>
                          <div className="font-bold text-gray-900 dark:text-white">{item.details.cyl}</div>
                        </div>
                      )}
                      {item.details.axis && (
                        <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">AXIS</div>
                          <div className="font-bold text-gray-900 dark:text-white">{item.details.axis}</div>
                        </div>
                      )}
                      {item.details.addition && (
                        <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">ADD</div>
                          <div className="font-bold text-gray-900 dark:text-white">{item.details.addition}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Frame specific details */}
          {item.type === 'Frame' && (
            <div className="text-gray-600 dark:text-gray-400">
              <div className="text-xs mb-2">
                Qty: {item.quantity}
              </div>
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
          {item.type === 'Contact Lens' && (
            <div className="text-gray-600 dark:text-gray-400">
              <div className="text-xs mb-2">
                Qty: {item.quantity}
              </div>
              {item.details?.power && (
                <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs border">
                  Power: {item.details.power}
                </span>
              )}
              {item.category && (
                <div className="mt-2">
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-600 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                    {item.category}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Accessories */}
          {item.type === 'Accessories' && (
            <div className="text-gray-600 dark:text-gray-400 text-xs">
              Qty: {item.quantity}
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

      {/* Edit Modal */}
      {showEditModal && (
        <LensEditModal
          vocId={vocId}
          itemIndex={itemIndex}
          item={item}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onItemUpdate();
          }}
        />
      )}
    </>
  );
};

export default VocItemRow;