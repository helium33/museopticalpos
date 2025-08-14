import React from 'react';
import { motion } from 'framer-motion';
import { X, Package, Calendar, User, MapPin, Barcode } from 'lucide-react';
import Button from '../ui/Button';
import { YangonFrame } from '../../services/yangonFirebaseService';

interface YangonFrameDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  item: YangonFrame | null;
}

const YangonFrameDetailView: React.FC<YangonFrameDetailViewProps> = ({
  isOpen,
  onClose,
  item
}) => {
  if (!isOpen || !item) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Eyeglasses': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Sunglasses': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Ready BB': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {item.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Code: {item.code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Information */}
            <div className="space-y-6">
              {/* Image */}
              {item.image && (
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Category Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(item.category)}`}>
                  {item.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  item.store === 'yangon-office' 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {item.store === 'yangon-office' ? 'Yangon Head Office' : 'Yangon Store'}
                </span>
              </div>

              {/* Basic Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Frame Type
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {item.frameType}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Material
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {item.material}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Brand
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {item.brand}
                  </p>
                </div>

                {item.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {item.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Inventory & Metrics */}
            <div className="space-y-6">
              {/* Inventory Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Inventory Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Base Quantity</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {item.qty}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Quantity</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {item.totalQty}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sold Quantity</p>
                    <p className="text-xl font-semibold text-red-600">
                      {item.soldQty}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                    <p className="text-xl font-semibold text-green-600">
                      {item.totalQty - item.soldQty}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transfer Information */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Transfer Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Transfer In:</span>
                    <span className="text-sm font-medium text-green-600">
                      +{item.transferInQty}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Transfer Out:</span>
                    <span className="text-sm font-medium text-red-600">
                      -{item.transferOutQty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Pricing Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Selling Price:</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.price.toLocaleString()} MMK
                    </span>
                  </div>
                  {item.cost && item.cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Cost Price:</span>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {item.cost.toLocaleString()} MMK
                      </span>
                    </div>
                  )}
                  {item.cost && item.cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Profit Margin:</span>
                      <span className="text-sm font-medium text-green-600">
                        {item.cost > 0 ? Math.round(((item.price - item.cost) / item.price) * 100) : 0}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* System Information */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  System Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {item.createdAt.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {item.updatedAt.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Created By</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {item.createdBy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Barcode size={16} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Item ID</p>
                      <p className="text-sm font-mono text-gray-900 dark:text-white">
                        {item.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default YangonFrameDetailView;