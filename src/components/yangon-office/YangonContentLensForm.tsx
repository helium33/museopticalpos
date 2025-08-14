import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Contact, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface YangonContentLensFormData {
  lensCode: string;
  itemName: string;
  category: 'မျက်ကပ်အကြည်' | 'Ms မျက်ကပ်' | 'Ms ပါဝါ color' | 'Pretty and Shinning' | 'Big Eye Black';
  transferIn: number;
  transferOut: number;
  price: number;
  power?: string;
  color?: string;
}

interface YangonContentLensFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: YangonContentLensFormData) => void;
  initialData?: Partial<YangonContentLensFormData>;
  isEditing?: boolean;
}

const YangonContentLensForm: React.FC<YangonContentLensFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<YangonContentLensFormData>({
    lensCode: initialData?.lensCode || '',
    itemName: initialData?.itemName || '',
    category: initialData?.category || 'မျက်ကပ်အကြည်',
    qty: initialData?.qty || 0,
    transferIn: initialData?.transferIn || 0,
    transferOut: initialData?.transferOut || 0,
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    power: initialData?.power || '',
    color: initialData?.color || ''
  });

  const [errors, setErrors] = useState<Partial<YangonContentLensFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'မျက်ကပ်အကြည်', label: 'မျက်ကပ်အကြည်', color: 'bg-blue-100 text-blue-800' },
    { value: 'Ms မျက်ကပ်', label: 'Ms မျက်ကပ်', color: 'bg-green-100 text-green-800' },
    { value: 'Ms ပါဝါ color', label: 'Ms ပါဝါ color', color: 'bg-purple-100 text-purple-800' },
    { value: 'Pretty and Shinning', label: 'Pretty and Shinning', color: 'bg-pink-100 text-pink-800' },
    { value: 'Big Eye Black', label: 'Big Eye Black', color: 'bg-gray-100 text-gray-800' }
  ];

  const commonPowers = [
    '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75', '-2.00', '-2.25', '-2.50', '-2.75', '-3.00',
    '-3.25', '-3.50', '-3.75', '-4.00', '-4.25', '-4.50', '-4.75', '-5.00', '-5.50', '-6.00',
    '+0.50', '+0.75', '+1.00', '+1.25', '+1.50', '+1.75', '+2.00', '+2.25', '+2.50', '+2.75', '+3.00'
  ];

  const commonColors = [
    'Clear', 'Blue', 'Green', 'Brown', 'Gray', 'Hazel', 'Violet', 'Black', 'Honey', 'Aqua'
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<YangonContentLensFormData> = {};

    if (!formData.lensCode.trim()) {
      newErrors.lensCode = 'Lens code is required';
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
        lensCode: '',
        itemName: '',
        category: 'မျက်ကပ်အကြည်',
        transferIn: 0,
        transferOut: 0,
        price: 0,
        power: '',
        color: ''
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof YangonContentLensFormData, value: string | number) => {
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
              <Contact className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Content Lens Item' : 'Add New Content Lens Item'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Yangon Office Content Lens Management
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
          {/* Lens Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lens Code *
            </label>
            <Input
              type="text"
              value={formData.lensCode}
              onChange={(e) => handleInputChange('lensCode', e.target.value)}
              placeholder="e.g., YGN-CL-001"
              className={errors.lensCode ? 'border-red-500' : ''}
            />
            {errors.lensCode && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.lensCode}
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
                  onClick={() => handleInputChange('category', category.value as YangonContentLensFormData['category'])}
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

          {/* Power and Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Power (Optional)
              </label>
              <div className="space-y-2">
                <Input
                  type="text"
                  value={formData.power}
                  onChange={(e) => handleInputChange('power', e.target.value)}
                  placeholder="e.g., -2.00"
                />
                <div className="flex flex-wrap gap-1">
                  {commonPowers.slice(0, 8).map((power) => (
                    <button
                      key={power}
                      type="button"
                      onClick={() => handleInputChange('power', power)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      {power}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color (Optional)
              </label>
              <div className="space-y-2">
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="e.g., Blue"
                />
                <div className="flex flex-wrap gap-1">
                  {commonColors.slice(0, 6).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange('color', color)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Transfer In/Out and Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {/* Calculated Values Display */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Calculated Values
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total Qty:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formData.transferIn - formData.transferOut}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Sold Qty:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">0</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formData.transferIn - formData.transferOut}
                </span>
              </div>
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

export default YangonContentLensForm;