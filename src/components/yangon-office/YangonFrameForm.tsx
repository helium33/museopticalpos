import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Package, AlertCircle, Plus, Minus } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface CNumber {
  cNo: string;
  qty: number;
}

interface YangonFrameFormData {
  code: string;
  name: string;
  category: 'Eyeglasses' | 'Sunglasses' | 'Ready' | 'Ready BB' | 'Error';
  frameType: string;
  material: string;
  brand: string;
  qty: number;
  soldQty?: number;
  transferInQty: number;
  transferOutQty: number;
  totalQty?: number;
  remainingQty?: number;
  price: number;
  cost?: number;
  description?: string;
  image?: File;
  cNumbers: CNumber[];
}

interface YangonFrameFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: YangonFrameFormData) => void;
  initialData?: Partial<YangonFrameFormData>;
  isEditing?: boolean;
}

const YangonFrameForm: React.FC<YangonFrameFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<YangonFrameFormData>({
    code: initialData?.code || '',
    name: initialData?.name || '',
    category: initialData?.category || 'Eyeglasses',
    frameType: initialData?.frameType || 'Full Rim',
    material: initialData?.material || 'Metal',
    brand: initialData?.brand || 'Yangon Optical',
    qty: initialData?.qty || 0,
    transferInQty: initialData?.transferInQty || 0,
    transferOutQty: initialData?.transferOutQty || 0,
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    description: initialData?.description || '',
    cNumbers: initialData?.cNumbers || [{ cNo: 'C1', qty: 0 }],
  });

  const [errors, setErrors] = useState<Partial<YangonFrameFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'Eyeglasses', label: 'Eyeglasses', color: 'bg-blue-100 text-blue-800' },
    { value: 'Sunglasses', label: 'Sunglasses', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Ready', label: 'Ready', color: 'bg-green-100 text-green-800' },
    { value: 'Ready BB', label: 'Ready BB', color: 'bg-purple-100 text-purple-800' },
    { value: 'Error', label: 'Error', color: 'bg-red-100 text-red-800' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<YangonFrameFormData> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Frame code is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (!formData.frameType.trim()) {
      newErrors.frameType = 'Frame type is required';
    }

    if (!formData.material.trim()) {
      newErrors.material = 'Material is required';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'Brand is required';
    }

    if (formData.qty < 0) {
      newErrors.qty = 'Quantity cannot be negative';
    }

    if (formData.transferInQty < 0) {
      newErrors.transferInQty = 'Transfer in cannot be negative';
    }

    if (formData.transferOutQty < 0) {
      newErrors.transferOutQty = 'Transfer out cannot be negative';
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
      setFormData({
        code: '',
        name: '',
        category: 'Eyeglasses',
        frameType: 'Full Rim',
        material: 'Metal',
        brand: 'Yangon Optical',
        qty: 0,
        transferInQty: 0,
        transferOutQty: 0,
        price: 0,
        cost: 0,
        description: '',
        cNumbers: [{ cNo: 'C1', qty: 0 }],
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // C Number management functions
  const handleInputChange = (
    field: keyof YangonFrameFormData,
    value: string | number
  ): void => {
    setFormData((prev: YangonFrameFormData) => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors && errors[field]) {
      setErrors((prev: Partial<YangonFrameFormData>) => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const addCNumber = (): void => {
    if (formData.cNumbers.length < 5) {
      const newCNo = `C${formData.cNumbers.length + 1}`;
      setFormData((prev: YangonFrameFormData) => ({
        ...prev,
        cNumbers: [...prev.cNumbers, { cNo: newCNo, qty: 0 }]
      }));
    }
  };

  const removeCNumber = (index: number): void => {
    if (formData.cNumbers.length > 1) {
      setFormData((prev: YangonFrameFormData) => ({
        ...prev,
        cNumbers: prev.cNumbers.filter((_: CNumber, i: number) => i !== index)
      }));
    }
  };

  const updateCNumber = (
    index: number,
    field: keyof CNumber,
    value: string | number
  ): void => {
    setFormData((prev: YangonFrameFormData) => ({
      ...prev,
      cNumbers: prev.cNumbers.map((cNum: CNumber, i: number) =>
        i === index ? { ...cNum, [field]: value } : cNum
      )
    }));
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Frame Item' : 'Add New Frame Item'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Yangon Office Frame Management
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
          {/* Basic Information Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Frame Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frame Code *
              </label>
              <Input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="e.g., YGN-EG-001"
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.code}
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
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter item name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.name}
                </p>
              )}
            </div>
          </div>

          {/* Basic Information Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frame Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frame Type *
              </label>
              <select
                value={formData.frameType}
                onChange={(e) => handleInputChange('frameType', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.frameType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="Full Rim">Full Rim</option>
                <option value="Semi Rim">Semi Rim</option>
                <option value="Rimless">Rimless</option>
              </select>
              {errors.frameType && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.frameType}
                </p>
              )}
            </div>

            {/* Material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Material *
              </label>
              <select
                value={formData.material}
                onChange={(e) => handleInputChange('material', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.material ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="Metal">Metal</option>
                <option value="Plastic">Plastic</option>
                <option value="Titanium">Titanium</option>
                <option value="Acetate">Acetate</option>
                <option value="Mixed">Mixed</option>
              </select>
              {errors.material && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.material}
                </p>
              )}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand *
              </label>
              <Input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="Brand name"
                className={errors.brand ? 'border-red-500' : ''}
              />
              {errors.brand && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.brand}
                </p>
              )}
            </div>
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
                  onClick={() => handleInputChange('category', category.value as YangonFrameFormData['category'])}
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

          {/* Quantities and Pricing */}
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
                value={formData.transferInQty}
                onChange={(e) => handleInputChange('transferInQty', parseInt(e.target.value) || 0)}
                placeholder="0"
                className={errors.transferInQty ? 'border-red-500' : ''}
              />
              {errors.transferInQty && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.transferInQty}
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
                value={formData.transferOutQty}
                onChange={(e) => handleInputChange('transferOutQty', parseInt(e.target.value) || 0)}
                placeholder="0"
                className={errors.transferOutQty ? 'border-red-500' : ''}
              />
              {errors.transferOutQty && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.transferOutQty}
                </p>
              )}
            </div>
          </div>

          {/* Calculated Fields - Read Only */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Quantity (Readonly)
              </label>
              <Input
                type="number"
                value={safeNumber(formData.qty) + safeNumber(formData.transferInQty) - safeNumber(formData.transferOutQty)}
                readOnly
                className="bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Calculated: Quantity + Transfer In - Transfer Out
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sold Quantity (Readonly)
              </label>
              <Input
                type="number"
                value={safeNumber(formData.soldQty)}
                readOnly
                className="bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Updated when items are sold
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remaining Quantity (Readonly)
              </label>
              <Input
                type="number"
                value={(safeNumber(formData.qty) + safeNumber(formData.transferInQty) - safeNumber(formData.transferOutQty)) - safeNumber(formData.soldQty)}
                readOnly
                className="bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Total Qty - Sold Qty
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description or notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* C Numbers Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                C Numbers & Quantities
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCNumber}
                disabled={formData.cNumbers.length >= 5}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add C Number
              </Button>
            </div>
            <div className="space-y-3">
              {formData.cNumbers.map((cNum, index) => (
                <div key={index} className="flex items-end gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                  <div className="flex-1">
                    <Input
                      label={`C Number ${index + 1}`}
                      value={cNum.cNo}
                      onChange={(e) => updateCNumber(index, 'cNo', e.target.value)}
                      placeholder="e.g., C1, C2, C3"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label={`Quantity ${index + 1}`}
                      type="number"
                      min={0}
                      value={cNum.qty}
                      onChange={(e) => updateCNumber(index, 'qty', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  {formData.cNumbers.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeCNumber(index)}
                      className="flex items-center gap-2"
                    >
                      <Minus size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Calculated Values Display */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Calculated Values
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">C Numbers Total:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formData.cNumbers.reduce((sum, c) => sum + c.qty, 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Transfer Total:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formData.transferIn - formData.transferOut}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {Math.max(formData.cNumbers.reduce((sum, c) => sum + c.qty, 0), formData.transferIn - formData.transferOut)}
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

export default YangonFrameForm;