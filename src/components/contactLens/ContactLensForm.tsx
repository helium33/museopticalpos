import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { RotateCcw, Eye, Lock, Unlock, Plus, Minus } from 'lucide-react';

export type ContactLensCategory = 'မျက်ကပ်အကြည်' | 'Pretty and Shinning' | 'F.l' | 'Big Eye Black' | 'Ms plane' | 'Ms ပါဝါ color';

export interface ContactLensFormData {
  id?: string;
  code: string;
  name: string;
  category: ContactLensCategory;
  qty: number;
  soldQty: number;
  remainingQty: number;
  restockedQty?: number;
  originalQty?: number;
  price: number;
  imageUrl?: string;
  power?: string;
  store?: string;
  isCancelled?: boolean;
  cancelReason?: string;
  cancelNote?: string;
}

interface ContactLensFormProps {
  onSubmit: (data: ContactLensFormData) => void;
  initialData?: ContactLensFormData;
  isSubmitting?: boolean;
}

const ContactLensForm: React.FC<ContactLensFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const [showStockModal, setShowStockModal] = useState(false);
  const [pendingData, setPendingData] = useState<ContactLensFormData | null>(null);
  const [isTotalQtyLocked, setIsTotalQtyLocked] = useState(true);
  
  const isAdmin = true;
  const isEditMode = !!initialData;

  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContactLensFormData>({
    defaultValues: initialData || {
      code: '',
      name: '',
      category: 'မျက်ကပ်အကြည်',
      qty: 0,
      soldQty: 0,
      remainingQty: 0,
      restockedQty: 0,
      originalQty: 0,
      price: 0,
      imageUrl: '',
      store: 'win',
      isCancelled: false,
    },
  });

  const watchQty = watch('qty');
  const watchSoldQty = watch('soldQty');
  const watchRestockedQty = watch('restockedQty');
  const watchRemainingQty = watch('remainingQty');
  const watchOriginalQty = watch('originalQty');

  // Compact Quantity Control Component
  interface QuantityControlProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    isLocked?: boolean;
    onToggleLock?: () => void;
    showLockButton?: boolean;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
    disabled?: boolean;
    helpText?: string;
  }

  const QuantityControl: React.FC<QuantityControlProps> = ({
    label,
    value,
    onChange,
    min = 0,
    isLocked = false,
    onToggleLock,
    showLockButton = false,
    variant = 'primary',
    disabled = false,
    helpText
  }) => {
    const isDisabled = disabled || (showLockButton && isLocked);
    
    const variantStyles = {
      primary: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200',
      secondary: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200',
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
      info: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200'
    };

    const buttonStyles = {
      primary: 'bg-blue-500 hover:bg-blue-600 text-white',
      secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
      success: 'bg-green-500 hover:bg-green-600 text-white',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      info: 'bg-purple-500 hover:bg-purple-600 text-white'
    };

    return (
      <div className={`p-3 rounded-lg border ${variantStyles[variant]} transition-all duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold truncate pr-2">
            {label}
          </label>
          {showLockButton && onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              className={`p-1 rounded transition-colors ${
                isLocked 
                  ? 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20' 
                  : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
              }`}
              title={isLocked ? 'Click to unlock' : 'Click to lock'}
            >
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Decrease Button */}
          <button
            type="button"
            onClick={() => !isDisabled && onChange(Math.max(min, value - 1))}
            disabled={isDisabled || value <= min}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold transition-all ${
              isDisabled || value <= min
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : `${buttonStyles[variant]} hover:scale-105 active:scale-95`
            }`}
          >
            <Minus size={12} />
          </button>
          
          {/* Value Display */}
          <div className="flex-1 min-w-0">
            <input
              type="number"
              value={value}
              onChange={(e) => !isDisabled && onChange(Math.max(min, parseInt(e.target.value) || 0))}
              disabled={isDisabled}
              min={min}
              className={`w-full px-2 py-1.5 text-center text-sm font-semibold border rounded-md ${
                isDisabled 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
                  : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              } dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300`}
            />
          </div>
          
          {/* Increase Button */}
          <button
            type="button"
            onClick={() => !isDisabled && onChange(value + 1)}
            disabled={isDisabled}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold transition-all ${
              isDisabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : `${buttonStyles[variant]} hover:scale-105 active:scale-95`
            }`}
          >
            <Plus size={12} />
          </button>
          
          {/* Current Value Badge */}
          <div className={`px-2 py-1 rounded text-xs font-bold border ${
            variant === 'primary' ? 'bg-blue-100 border-blue-300 text-blue-800' :
            variant === 'success' ? 'bg-green-100 border-green-300 text-green-800' :
            variant === 'warning' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
            variant === 'info' ? 'bg-purple-100 border-purple-300 text-purple-800' :
            'bg-gray-100 border-gray-300 text-gray-800'
          } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300`}>
            {value}
          </div>
        </div>
        
        {/* Help Text */}
        {helpText && (
          <div className="text-xs opacity-75 mt-1">
            {helpText}
          </div>
        )}
      </div>
    );
  };

  // Auto-calculate remaining quantity for new items
  React.useEffect(() => {
    if (!isEditMode) {
      const qty = safeNumber(watchQty);
      const soldQty = safeNumber(watchSoldQty);
      const remainingQty = Math.max(0, qty - soldQty);
      setValue('remainingQty', remainingQty);
      setValue('originalQty', qty);
    }
  }, [watchQty, watchSoldQty, setValue, isEditMode]);

  const resetQuantities = () => {
    setValue('qty', 0);
    setValue('soldQty', 0);
    setValue('remainingQty', 0);
    setValue('restockedQty', 0);
    setValue('originalQty', 0);
  };

  const onSubmitHandler = (data: ContactLensFormData) => {
    if (initialData && data.remainingQty > (initialData.remainingQty + (data.restockedQty || 0))) {
      setPendingData(data);
      setShowStockModal(true);
    } else {
      onSubmit(data);
    }
  };

  const categories = [
    { value: 'မျက်ကပ်အကြည်', label: 'မျက်ကပ်အကြည်' },
    { value: 'Pretty and Shinning', label: 'Pretty and Shinning' },
    { value: 'F.l', label: 'F.l' },
    { value: 'Big Eye Black', label: 'Big Eye Black' },
    { value: 'Ms plane', label: 'Ms plane' },
    { value: 'Ms ပါဝါ color', label: 'Ms ပါဝါ color' }
  ];

  const stores = [
    { value: 'win', label: 'Win' },
    { value: 'pwint', label: 'Pwint' },
    { value: 'yangon', label: 'Yangon' },
    { value: 'main', label: 'Main Store' }
  ];

  return (
    <>
      <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye size={18} />
            Contact Lens Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Code"
              {...register('code', { required: 'Code is required' })}
              error={errors.code?.message}
            />
            <Input
              label="Name"
              {...register('name', { required: 'Name is required' })}
              error={errors.name?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              options={categories}
              {...register('category', { required: 'Category is required' })}
              error={errors.category?.message}
            />
            <Select
              label="Store"
              options={stores}
              {...register('store', { required: 'Store is required' })}
              error={errors.store?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Power"
              {...register('power')}
              placeholder="e.g., -2.00, +1.50"
            />
            <Input
              label="Price"
              type="number"
              min={0}
              step="0.01"
              {...register('price', { 
                required: 'Price is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Price must be 0 or greater' }
              })}
              error={errors.price?.message}
            />
          </div>
        </div>

        {/* Quantity Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Eye size={18} />
              Inventory Management
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetQuantities}
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <RotateCcw size={14} />
              Reset
            </Button>
          </div>

          {isEditMode ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Edit Mode:</strong> {isAdmin ? 'Admin can modify all quantities' : 'Use restock to add inventory'}
                </p>
              </div>

              {/* Compact Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Original Quantity */}
                {isAdmin ? (
                  <QuantityControl
                    label="📦 Original"
                    value={safeNumber(watchOriginalQty) || safeNumber(watchQty)}
                    onChange={(value) => {
                      if (!isTotalQtyLocked) {
                        setValue('originalQty', value);
                        setValue('qty', value);
                      }
                    }}
                    variant="primary"
                    isLocked={isTotalQtyLocked}
                    onToggleLock={() => setIsTotalQtyLocked(!isTotalQtyLocked)}
                    showLockButton={true}
                    helpText={`Total allocated: ${safeNumber(watchOriginalQty) || safeNumber(watchQty)}`}
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      📦 Original Qty
                    </label>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                        {safeNumber(watchOriginalQty) || safeNumber(watchQty)}
                      </div>
                      <span className="text-xs text-gray-500">Read-only</span>
                    </div>
                  </div>
                )}

                {/* Restock Quantity */}
                <QuantityControl
                  label="🔄 Restock"
                  value={safeNumber(watchRestockedQty)}
                  onChange={(value) => {
                    const currentRemaining = safeNumber(watchRemainingQty);
                    const currentRestocked = safeNumber(watchRestockedQty);
                    const restockDifference = value - currentRestocked;
                    
                    setValue('restockedQty', value);
                    setValue('remainingQty', Math.max(0, currentRemaining + restockDifference));
                  }}
                  variant="info"
                  helpText={`Added: +${safeNumber(watchRestockedQty)}`}
                />

                {/* Sold Quantity - Read Only in Edit Mode */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200">
                  <label className="text-sm font-semibold text-orange-800 dark:text-orange-200 block mb-2">
                    🛒 Sold
                  </label>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {safeNumber(watchSoldQty)}
                    </div>
                    <span className="text-xs text-orange-600 dark:text-orange-400">Via POS only</span>
                  </div>
                </div>

                {/* Available Quantity */}
                <QuantityControl
                  label="✅ Available"
                  value={safeNumber(watchRemainingQty)}
                  onChange={(value) => setValue('remainingQty', value)}
                  variant="success"
                  helpText={`Ready for sale: ${safeNumber(watchRemainingQty)}`}
                />
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-sm">📊 Inventory Summary</h5>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center p-2 bg-white dark:bg-gray-600 rounded border">
                    <div className="font-bold text-blue-600 text-sm">{safeNumber(watchOriginalQty) || safeNumber(watchQty)}</div>
                    <div className="text-blue-600 font-medium">Original</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-600 rounded border">
                    <div className="font-bold text-purple-600 text-sm">+{safeNumber(watchRestockedQty)}</div>
                    <div className="text-purple-600 font-medium">Restocked</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-600 rounded border">
                    <div className="font-bold text-orange-600 text-sm">-{safeNumber(watchSoldQty)}</div>
                    <div className="text-orange-600 font-medium">Sold</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-600 rounded border">
                    <div className="font-bold text-green-600 text-sm">{safeNumber(watchRemainingQty)}</div>
                    <div className="text-green-600 font-medium">Available</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* New Item Quantity Input */
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>New Item:</strong> Set initial quantities for the contact lens
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuantityControl
                  label="📦 Total Qty"
                  value={safeNumber(watchQty)}
                  onChange={(value) => {
                    setValue('qty', value);
                    setValue('originalQty', value);
                    setValue('remainingQty', Math.max(0, value - safeNumber(watchSoldQty)));
                  }}
                  variant="primary"
                  helpText="Initial stock allocation"
                />

                <QuantityControl
                  label="🛒 Sold Qty"
                  value={safeNumber(watchSoldQty)}
                  onChange={(value) => {
                    setValue('soldQty', value);
                    setValue('remainingQty', Math.max(0, safeNumber(watchQty) - value));
                  }}
                  variant="warning"
                  helpText="Already sold units"
                />

                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200">
                  <label className="text-sm font-semibold text-green-800 dark:text-green-200 block mb-2">
                    ✅ Available
                  </label>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {safeNumber(watchRemainingQty)}
                    </div>
                    <span className="text-xs text-green-600 dark:text-green-400">Auto-calculated</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
          size="lg"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Contact Lens' : 'Add Contact Lens'}
        </Button>
      </form>

      {/* Stock Update Confirmation Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirm Inventory Update
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You're about to update the inventory. This action will change the available stock levels.
            </p>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowStockModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (pendingData) {
                    onSubmit(pendingData);
                    setShowStockModal(false);
                  }
                }}
              >
                Confirm Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactLensForm;