import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Package, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface YangonAccessoriesFormData {
  accessoryCode: string;
  itemName: string;
  category: string;
  transferIn: number;
  transferOut: number;
  price: number;
  description?: string;
}

interface YangonAccessoriesFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: YangonAccessoriesFormData) => void;
  initialData?: Partial<YangonAccessoriesFormData>;
  isEditing?: boolean;
}

const YangonAccessoriesForm: React.FC<YangonAccessoriesFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<YangonAccessoriesFormData>({
    accessoryCode: initialData?.accessoryCode || '',
    itemName: initialData?.itemName || '',
    category: initialData?.category || 'General Accessories',
    qty: initialData?.qty || 0,
    transferIn: initialData?.transferIn || 0,
    transferOut: initialData?.transferOut || 0,
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    description: initialData?.description || ''
  });

  const [errors, setErrors] = useState<Partial<YangonAccessoriesFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'Cleaning Supplies', label: 'Cleaning Supplies', color: 'bg-blue-100 text-blue-800' },
    { value: 'Repair Tools', label: 'Repair Tools', color: 'bg-green-100 text-green-800' },
    { value: 'Storage', label: 'Storage', color: 'bg-purple-100 text-purple-800' },
    { value: 'Frame Parts', label: 'Frame Parts', color: 'bg-orange-100 text-orange-800' },
    { value: 'General Accessories', label: 'General Accessories', color: 'bg-gray-100 text-gray-800' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<YangonAccessoriesFormData> = {};

    if (!formData.accessoryCode.trim()) {
      newErrors.accessoryCode = 'Accessory code is required';
    }

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (formData.qty < 0) {
      newErrors.qty = 'Quantity cannot be negative';
    }

    if (formData.transferIn < 0) {
      newErrors.transferIn = 'Transfer in cannot be negative';
    }

    if (formData.transferOut < 0) {
      newErrors.transferOut = 'Transfer out cannot be negative';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (formData.cost && formData.cost < 0) {
      newErrors.cost = 'Cost cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        accessoryCode: '',
        itemName: '',
        category: 'General Accessories',
        transferIn: 0,
        transferOut: 0,
        price: 0,
        description: ''
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof YangonAccessoriesFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Accessory Item' : 'Add New Accessory Item'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Yangon Office Accessories Management
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Accessory Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Accessory Code *
            </label>
            <Input
              type="text"
              value={formData.accessoryCode}
              onChange={(e) => handleInputChange('accessoryCode', e.target.value)}
              placeholder="e.g., YGN-ACC-001"
              className={errors.accessoryCode ? 'border-red-500' : ''}
            />
            {errors.accessoryCode && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.accessoryCode}
              </p>
            )}
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Name *
            </label>
            <Input
              type="text"
              value={formData.itemName}
              onChange={(e) => handleInputChange('itemName', e.target.value)}
              placeholder="Enter item name"
              className={errors.itemName ? 'border-red-500' : ''}
            />
            {errors.itemName && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.itemName}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter item description (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <motion.button
                  key={category.value}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleInputChange('category', category.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium
                    ${formData.category === category.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${category.color}`}>
                      {category.label}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity *
              </label>
              <Input
                type="number"
                min="0"
                value={formData.qty}
                onChange={(e) => handleInputChange('qty', parseInt(e.target.value) || 0)}
                placeholder="0"
                className={errors.qty ? 'border-red-500' : ''}
              />
              {errors.qty && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.qty}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transfer In
              </label>
              <Input
                type="number"
                min="0"
                value={formData.transferIn}
                onChange={(e) => handleInputChange('transferIn', parseInt(e.target.value) || 0)}
                className={errors.transferIn ? 'border-red-500' : ''}
              />
              {errors.transferIn && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.transferIn}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transfer Out
              </label>
              <Input
                type="number"
                min="0"
                value={formData.transferOut}
                onChange={(e) => handleInputChange('transferOut', parseInt(e.target.value) || 0)}
                className={errors.transferOut ? 'border-red-500' : ''}
              />
              {errors.transferOut && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.transferOut}
                </p>
              )}
            </div>
          </div>

          {/* Calculated Fields - Read Only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Quantity (Readonly)
              </label>
              <Input
                type="number"
                value={formData.qty + formData.transferIn - formData.transferOut}
                readOnly
                className="bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Calculated: Quantity + Transfer In - Transfer Out
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remaining Quantity (Readonly)
              </label>
              <Input
                type="number"
                value={formData.qty + formData.transferIn - formData.transferOut}
                readOnly
                className="bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Will be Total Qty - Sold Qty (0 when first created)
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price (MMK) *
              </label>
              <Input
                type="number"
                min="1"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseInt(e.target.value) || 0)}
                placeholder="0"
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.price}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cost (MMK)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.cost || 0}
                onChange={(e) => handleInputChange('cost', parseInt(e.target.value) || 0)}
                placeholder="0"
                className={errors.cost ? 'border-red-500' : ''}
              />
              {errors.cost && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.cost}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Save')}
              </Button>
            </motion.div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default YangonAccessoriesForm;