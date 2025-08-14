import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { CancelReason } from '../../lib/utils';
import { Upload, RotateCcw, Eye, Lock, Unlock } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface AccessoriesFormProps {
  onSubmit: (data: AccessoriesFormData) => void;
  initialData?: AccessoriesFormData;
  isSubmitting?: boolean;
}

export interface AccessoriesFormData {
  id?: string;
  name: string;
  code: string;
  totalQty: number;
  soldQty: number;
  remainingQty: number;
  restockedQty?: number;
  originalQty?: number;
  price: number;
  imageUrl: string;
  store?: string;
  isCancelled?: boolean;
  cancelReason?: CancelReason;
  cancelNote?: string;
  cost?: number;
  sku?: string;
}

const AccessoriesForm: React.FC<AccessoriesFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const [showStockModal, setShowStockModal] = useState(false);
  const [pendingData, setPendingData] = useState<AccessoriesFormData | null>(null);
  const [isTotalQtyLocked, setIsTotalQtyLocked] = useState(true);
  const isAdmin = true;

  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const updateField = (field: keyof AccessoriesFormData, value: any) => {
    setValue(field, value, { shouldValidate: true });
  };

  // UPDATED: IncrementDecrementField Component with Remaining Stock terminology
  interface IncrementDecrementFieldProps {
    value: number;
    onChange: (value: number) => void;
    label: string;
    min?: number;
    helpText?: string;
    variant?: 'total' | 'remaining';
    isLocked?: boolean;
    onToggleLock?: () => void;
    showLockButton?: boolean;
  }

  const IncrementDecrementField: React.FC<IncrementDecrementFieldProps> = ({
    value,
    onChange,
    label,
    min = 0,
    helpText,
    variant = 'remaining',
    isLocked = false,
    onToggleLock,
    showLockButton = false
  }) => {
    const isDisabled = showLockButton && isLocked;
    const bgColor = variant === 'total' 
      ? (isLocked ? 'bg-gray-100 dark:bg-gray-800' : 'bg-blue-50 dark:bg-blue-900/20')
      : 'bg-green-50 dark:bg-green-900/20';
    const borderColor = variant === 'total' 
      ? (isLocked ? 'border-gray-300 dark:border-gray-600' : 'border-blue-200 dark:border-blue-700')
      : 'border-green-200 dark:border-green-700';

    return (
      <div className={`space-y-3 p-4 rounded-lg border-2 ${bgColor} ${borderColor} max-w-xs`}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
            {label}
          </label>
          {showLockButton && onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              className={`p-1.5 rounded-md ${isLocked 
                ? 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20' 
                : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
              } transition-colors`}
              title={isLocked ? 'Click to unlock for editing' : 'Click to lock'}
            >
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          )}
        </div>
        
        {/* Compact Button and Input Layout */}
        <div className="flex items-center gap-2 max-w-full">
          {/* MINUS Button - Compact size */}
          <button
            type="button"
            onClick={() => !isDisabled && onChange(Math.max(min, value - 1))}
            disabled={isDisabled || value <= min}
            className={`w-8 h-8 rounded-md font-bold text-lg transition-colors flex-shrink-0 ${
              isDisabled || value <= min
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 active:bg-red-300'
            }`}
            title={isDisabled ? (isLocked ? 'Locked' : 'Disabled') : 'Decrease'}
          >
            −
          </button>
          
          {/* NUMBER INPUT - FIXED WIDTH to prevent expansion */}
          <input
            type="number"
            value={value}
            onChange={(e) => !isDisabled && onChange(Math.max(min, parseInt(e.target.value) || 0))}
            disabled={isDisabled}
            min={min}
            className={`w-16 px-2 py-2 border-2 rounded-md text-center font-bold text-sm flex-shrink-0 ${
              isDisabled 
                ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600'
                : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
          />
          
          {/* PLUS Button - Compact size */}
          <button
            type="button"
            onClick={() => !isDisabled && onChange(value + 1)}
            disabled={isDisabled}
            className={`w-8 h-8 rounded-md font-bold text-lg transition-colors flex-shrink-0 ${
              isDisabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-green-100 hover:bg-green-200 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/40 active:bg-green-300'
            }`}
            title={isDisabled ? (isLocked ? 'Locked' : 'Disabled') : 'Increase'}
          >
            +
          </button>
        </div>
        
        {/* Compact Help Text */}
        {helpText && (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {helpText}
          </div>
        )}
      </div>
    );
  };

  const onSubmitHandler = (data: AccessoriesFormData) => {
    if (initialData && data.totalQty > initialData.totalQty) {
      setPendingData(data);
      setShowStockModal(true);
    } else {
      onSubmit(data);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AccessoriesFormData>({
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      totalQty: initialData?.totalQty || 0,
      soldQty: initialData?.soldQty || 0,
      remainingQty: initialData?.remainingQty || 0,
      restockedQty: initialData?.restockedQty || 0,
      originalQty: initialData?.originalQty || 0,
      price: initialData?.price || 0,
      imageUrl: initialData?.imageUrl || '',
      store: initialData?.store || '',
      isCancelled: initialData?.isCancelled || false,
    },
  });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(initialData?.imageUrl || '');
  const watchTotalQty = watch('totalQty');
  const watchSoldQty = watch('soldQty');
  const isCancelled = watch('isCancelled');

  React.useEffect(() => {
    if (!initialData) {
      const remainingQty = Math.max(0, watchTotalQty - watchSoldQty);
      setValue('remainingQty', remainingQty, { shouldValidate: true });
    }
  }, [watchTotalQty, watchSoldQty, setValue, initialData]);

  const resetQuantities = () => {
    setValue('totalQty', 0);
    setValue('soldQty', 0);
    setValue('remainingQty', 0);
    
    setTimeout(() => {
      setValue('totalQty', 0, { shouldValidate: true });
      setValue('soldQty', 0, { shouldValidate: true });
      setValue('remainingQty', 0, { shouldValidate: true });
    }, 0);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const storageRef = ref(storage, `accessories/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setValue('imageUrl', downloadUrl);
      setPreviewUrl(downloadUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const cancelReasons = [
    { value: 'Customer Dissatisfied', label: 'Customer Dissatisfied' },
    { value: 'Error in Order', label: 'Error in Order' },
    { value: 'Out of Stock', label: 'Out of Stock' },
    { value: 'Price Dispute', label: 'Price Dispute' },
    { value: 'Other', label: 'Other' },
  ];

  const stores = [
    { value: 'main', label: 'Main Store' },
    { value: 'win', label: 'Win' },
    { value: 'pwint', label: 'Pwint' },
    { value: 'yangon', label: 'Yangon' },
    { value: 'kmmt', label: 'KMMT' },
    { value: 'yadnar', label: 'Yadnar' },
    { value: 'kkt', label: 'KKT' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Name"
          {...register('name', { required: 'Name is required' })}
          error={errors.name?.message}
        />
        <Input
          label="Code"
          {...register('code', { required: 'Code is required' })}
          error={errors.code?.message}
        />
      </div>

      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">
              Update Total Stock
            </h3>
            <p className="mb-4">
              Updating total quantity from {initialData?.totalQty} to {pendingData?.totalQty}.
              Remaining quantity will stay at {initialData?.remainingQty}.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowStockModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (pendingData) {
                    onSubmit({
                      ...pendingData,
                      remainingQty: initialData?.remainingQty || pendingData.remainingQty
                    });
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Store"
          options={stores}
          {...register('store', { required: 'Store is required' })}
          error={errors.store?.message}
        />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Product Image
          </label>
          <div className="flex flex-col items-center p-4 border-2 border-dashed rounded-lg">
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt="Accessory preview" 
                className="w-40 h-40 object-cover mb-4 rounded-lg"
              />
            )}
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Upload size={16} />
                {uploading ? 'Uploading...' : 'Upload Image'}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
            {errors.imageUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* UPDATED: Accessories Quantity Section with Remaining Stock Label */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye size={20} />
            Accessories Inventory Information
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetQuantities}
            className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
          >
            <RotateCcw size={16} />
            Reset Qty
          </Button>
        </div>

        {initialData ? (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                  Accessories Inventory Management - Edit Mode
                </h4>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                {isAdmin ? (
                  <>
                    • <strong>Total Qty</strong> = Original accessory allocation (constant) - as admin, you can unlock to modify<br/>
                    • <strong>Restock Qty</strong> = Additional accessories added - increases Remaining stock without affecting Total Qty<br/>
                    • <strong>Remaining Stock</strong> = Current accessories remaining for sale - independent of Total Qty<br/>
                    • Use compact increment/decrement buttons for precise accessory inventory management
                  </>
                ) : (
                  <>
                    • <strong>Total Qty</strong> = Original accessory allocation (read-only for non-admin users)<br/>
                    • <strong>Remaining Stock</strong> = Current accessories remaining - can be adjusted for sales/restocking<br/>
                    • <strong>Restock</strong> = Add new accessories without changing original Total Qty allocation<br/>
                    • Perfect for managing daily accessory operations
                  </>
                )}
              </p>
            </div>

            {/* Compact Grid Layout - prevents input overflow */}
            <div className="flex flex-wrap gap-4 justify-start">
              {/* Total Quantity Field - Compact Layout */}
              {isAdmin ? (
                <IncrementDecrementField
                  value={safeNumber(watch('originalQty')) || safeNumber(watch('totalQty')) || 0}
                  onChange={(value) => {
                    if (!isTotalQtyLocked) {
                      updateField('originalQty', value);
                      updateField('totalQty', value);
                    }
                  }}
                  label="📦 Total Qty (Admin)"
                  min={0}
                  helpText={`Original: ${safeNumber(watch('totalQty'))} | Sold: ${safeNumber(watch('soldQty'))}`}
                  variant="total"
                  isLocked={isTotalQtyLocked}
                  onToggleLock={() => setIsTotalQtyLocked(!isTotalQtyLocked)}
                  showLockButton={true}
                />
              ) : (
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📦 Total Qty (Original)
                  </label>
                  <div className="p-4 rounded-lg border-2 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <div className="text-center font-bold text-2xl text-gray-600 dark:text-gray-400">
                      {safeNumber(watch('originalQty')) || safeNumber(watch('totalQty')) || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">pieces</div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    📖 Original allocation (admin only)
                  </div>
                </div>
              )}

              {/* Restock Quantity Field - Compact */}
              <IncrementDecrementField
                value={safeNumber(watch('restockedQty')) || 0}
                onChange={(value) => {
                  const currentRemaining = safeNumber(watch('remainingQty')) || 0;
                  const currentRestocked = safeNumber(watch('restockedQty')) || 0;
                  const restockDifference = value - currentRestocked;
                  
                  updateField('restockedQty', value);
                  updateField('remainingQty', Math.max(0, currentRemaining + restockDifference));
                }}
                label="🔄 Restock (Add)"
                min={0}
                helpText={`Add: ${safeNumber(watch('restockedQty'))} | Remaining: ${safeNumber(watch('remainingQty'))}`}
                variant="remaining"
              />

              {/* UPDATED: Remaining Stock Field - Compact */}
              <IncrementDecrementField
                value={safeNumber(watch('remainingQty')) || 0}
                onChange={(value) => {
                  updateField('remainingQty', value);
                }}
                label="📦 Remaining Stock"
                min={0}
                helpText={`Stock remaining: ${safeNumber(watch('remainingQty'))} pieces in inventory`}
                variant="remaining"
              />
            </div>

            {/* UPDATED: Accessories Summary with Remaining Stock terminology */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border-2 border-green-200 dark:border-gray-600">
              <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                📊 Accessories POS Summary
              </h5>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm border-2 border-blue-200">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-xl">{safeNumber(watch('originalQty')) || safeNumber(watch('totalQty')) || 0}</div>
                  <div className="text-blue-600 dark:text-blue-400 text-xs font-semibold">📦 Total</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm border-2 border-purple-200">
                  <div className="font-bold text-purple-600 dark:text-purple-400 text-xl">{safeNumber(watch('restockedQty')) || 0}</div>
                  <div className="text-purple-600 dark:text-purple-400 text-xs font-semibold">🔄 Restock</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm border-2 border-orange-200">
                  <div className="font-bold text-orange-600 dark:text-orange-400 text-xl">{safeNumber(watch('soldQty')) || 0}</div>
                  <div className="text-orange-600 dark:text-orange-400 text-xs font-semibold">🛒 Sold</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm border-2 border-green-200">
                  <div className="font-bold text-green-600 dark:text-green-400 text-xl">{safeNumber(watch('remainingQty')) || 0}</div>
                  <div className="text-green-600 dark:text-green-400 text-xs font-semibold">📦 Remaining</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* For new accessories - Compact layout */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="max-w-xs">
                <Input
                  label="📦 Total Quantity"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...register('totalQty', { 
                    required: 'Total quantity is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Quantity cannot be negative' }
                  })}
                  error={errors.totalQty?.message}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setValue('totalQty', value, { shouldValidate: true });
                    setValue('originalQty', value, { shouldValidate: true });
                    setValue('remainingQty', Math.max(0, value - (watchSoldQty || 0)), { shouldValidate: true });
                  }}
                />
              </div>
              
              <div className="max-w-xs">
                <Input
                  label="🛒 Sold Quantity"
                  type="number"
                  min={0}
                  max={watchTotalQty}
                  placeholder="0"
                  {...register('soldQty', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Sold quantity cannot be negative' },
                    max: { value: watchTotalQty, message: 'Sold quantity cannot exceed total quantity' }
                  })}
                  error={errors.soldQty?.message}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setValue('soldQty', value, { shouldValidate: true });
                    setValue('remainingQty', Math.max(0, (watchTotalQty || 0) - value), { shouldValidate: true });
                  }}
                />
              </div>
              
              <div className="max-w-xs">
                <Input
                  label="📦 Remaining Stock"
                  type="number"
                  disabled
                  placeholder="0"
                  {...register('remainingQty')}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-calculated: Total - Sold
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price Section - Compact layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="max-w-xs">
          <Input
            label="💰 Price (Myanmar Kyat)"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            {...register('price', { 
              required: 'Price is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Price must be 0 or greater' }
            })}
            error={errors.price?.message}
          />
        </div>
        
        <div className="max-w-xs">
          <Input
            label="🏷️ Cost (Optional)"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            {...register('cost', { 
              valueAsNumber: true,
              min: { value: 0, message: 'Cost cannot be negative' }
            })}
            error={errors.cost?.message}
          />
        </div>
        
        <div className="max-w-xs">
          <Input
            label="📝 SKU/Code (Optional)"
            type="text"
            placeholder="ACC-001"
            {...register('sku')}
            className="uppercase"
          />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4 mt-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isCancelled"
            {...register('isCancelled')}
            className="rounded border-gray-300"
          />
          <label htmlFor="isCancelled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Order Cancelled
          </label>
        </div>

        {isCancelled && (
          <>
            <Select
              label="Cancellation Reason"
              options={cancelReasons}
              {...register('cancelReason', { 
                required: isCancelled ? 'Cancellation reason is required' : false 
              })}
              error={errors.cancelReason?.message}
            />
            
            <Input
              label="Cancellation Note"
              {...register('cancelNote', {
                required: isCancelled ? 'Cancellation note is required' : false
              })}
              error={errors.cancelNote?.message}
            />
          </>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting || uploading}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Accessory' : 'Add Accessory'}
      </Button>
    </form>
  );
};

export default AccessoriesForm;