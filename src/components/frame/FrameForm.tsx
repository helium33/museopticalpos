import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { FrameCategory, FrameColor, CancelReason } from '../../lib/utils';
import { uploadCompressedImage, isBase64Image, getBase64Size, createPreviewUrl } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Image as ImageIcon, UploadIcon, AlertCircle, CheckCircle, Wifi, WifiOff, RotateCcw, Plus, Minus, DollarSign, Eye, Lock, Unlock } from 'lucide-react';

interface FrameFormProps {
  onSubmit: (data: FrameFormData) => void;
  initialData?: FrameFormData;
  isSubmitting?: boolean;
}

export interface FrameFormData {
  id?: string;
  code: string;
  name: string;
  category: FrameCategory;
  totalQty: number;
  soldQty: number;
  remainingQty: number;
  restockedQty?: number; // New field for tracking restocked quantity
  originalQty?: number; // Original stock allocation
  price: number;
  prices?: number[]; // Multiple price options
  priceLabels?: string[]; // Labels for each price
  imageUrl: string;
  colors: { [key in FrameColor]?: number };
  store?: string;
  isCancelled?: boolean;
  cancelReason?: CancelReason;
  cancelNote?: string;
  qty?: number;
}

const FrameForm: React.FC<FrameFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const [showStockModal, setShowStockModal] = useState(false);
  const [pendingData, setPendingData] = useState<FrameFormData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState(initialData?.imageUrl || '');
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    isBase64: boolean;
  } | null>(null);

  // Admin controls for restock functionality
  const [isTotalQtyLocked, setIsTotalQtyLocked] = useState(true);
  
  // Check if user is admin (you can replace this with your actual admin check)
  const isAdmin = true; // Replace with actual admin check logic

  // Multiple pricing state
  const [priceOptions, setPriceOptions] = useState<Array<{price: number, label: string}>>(
    initialData?.prices && initialData?.priceLabels 
      ? initialData.prices.map((price, index) => ({
          price,
          label: initialData.priceLabels?.[index] || `Price ${index + 1}`
        }))
      : [{ price: initialData?.price || 0, label: 'Regular Price' }]
  );

  const frameColors: FrameColor[] = [
    'Black', 'Gold', 'Silver', 'Brown', 'Blue', 
    'Red', 'Pink', 'Purple', 'Green', 'Other'
  ];

  const defaultColors = Object.fromEntries(frameColors.map(color => [color, 0])) as { [key in FrameColor]: number };

  // Helper function to display quantity with proper zero handling
  const displayQuantity = (qty: number | undefined | null): string => {
    if (qty === undefined || qty === null || isNaN(qty) || qty === 0) {
      return "0";
    }
    return String(qty);
  };

  // Helper function to safely get numeric values (fix for NaN issues)
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Update form field helper
  const updateField = (field: keyof FrameFormData, value: any) => {
    setValue(field, value, { shouldValidate: true });
  };

  // IncrementDecrementField Component for restock functionality
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
      <div className={`space-y-2 p-3 rounded-lg border-2 ${bgColor} ${borderColor}`}>
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
              } transition-colors touch-manipulation`}
              title={isLocked ? 'Click to unlock for editing' : 'Click to lock'}
            >
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          )}
        </div>
        
        {/* COMPACT Button and Input Layout */}
        <div className="flex items-center justify-center gap-2">
          {/* MINUS Button - Compact size */}
          <button
            type="button"
            onClick={() => !isDisabled && onChange(Math.max(min, value - 1))}
            disabled={isDisabled || value <= min}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-bold text-lg transition-colors touch-manipulation flex items-center justify-center ${
              isDisabled || value <= min
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 active:bg-red-300'
            }`}
            title={isDisabled ? (isLocked ? 'Locked - click lock icon to unlock' : 'Disabled') : 'Decrease quantity'}
          >
            −
          </button>
          
          {/* NUMBER INPUT - Fixed compact width */}
          <input
            type="number"
            value={value}
            onChange={(e) => !isDisabled && onChange(Math.max(min, parseInt(e.target.value) || 0))}
            disabled={isDisabled}
            min={min}
            className={`w-16 sm:w-20 px-2 py-2 border-2 rounded-lg text-center font-bold text-sm sm:text-base touch-manipulation ${
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
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-bold text-lg transition-colors touch-manipulation flex items-center justify-center ${
              isDisabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-green-100 hover:bg-green-200 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/40 active:bg-green-300'
            }`}
            title={isDisabled ? (isLocked ? 'Locked - click lock icon to unlock' : 'Disabled') : 'Increase quantity'}
          >
            +
          </button>
        </div>
        
        {/* COMPACT Help Text */}
        {helpText && (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            {helpText}
          </div>
        )}
      </div>
    );
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FrameFormData>({
    defaultValues: {
      code: '',
      name: '',
      category: 'Eyeglasses',
      totalQty: 0,
      soldQty: 0,
      remainingQty: 0,
      restockedQty: 0,
      originalQty: 0,
      price: 0,
      prices: [],
      priceLabels: [],
      imageUrl: '',
      colors: defaultColors,
      isCancelled: false,
      ...initialData
    },
  });

  const addPriceOption = () => {
    if (priceOptions.length < 5) {
      setPriceOptions([...priceOptions, { price: 0, label: `Price ${priceOptions.length + 1}` }]);
    } else {
      toast.error('Maximum 5 price options allowed');
    }
  };

  const removePriceOption = (index: number) => {
    if (priceOptions.length > 1) {
      const newOptions = priceOptions.filter((_, i) => i !== index);
      setPriceOptions(newOptions);
    } else {
      toast.error('At least one price option is required');
    }
  };

  const updatePriceOption = (index: number, field: 'price' | 'label', value: string | number) => {
    const newOptions = [...priceOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setPriceOptions(newOptions);
  };

  const onSubmitHandler = (data: FrameFormData) => {
    // Prepare price data
    const prices = priceOptions.map(option => option.price);
    const priceLabels = priceOptions.map(option => option.label);
    
    const formData = {
      ...data,
      price: prices[0] || 0, // Set main price as first option
      prices,
      priceLabels
    };

    if (initialData && data.totalQty > initialData.totalQty) {
      setPendingData(formData);
      setShowStockModal(true);
    } else {
      onSubmit(formData);
    }
  };

  // Reset quantity function - Always reset to 0
  const resetQuantities = () => {
    setValue('totalQty', 0);
    setValue('soldQty', 0);
    setValue('remainingQty', 0);
    
    // Force re-render by triggering validation
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
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }

    const originalSize = file.size;
    
    if (originalSize > 3 * 1024 * 1024) {
      toast.error('Image size should be less than 3MB for faster upload');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress('Processing image...');
      
      const immediatePreview = await createPreviewUrl(file);
      setPreviewUrl(immediatePreview);
      
      const toastId = toast.loading('Optimizing and uploading image...', { 
        duration: 0,
        style: {
          background: '#3B82F6',
          color: 'white',
        }
      });
      
      const path = `frames/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      setUploadProgress('Uploading...');
      const downloadUrl = await uploadCompressedImage(file, path);
      
      const isBase64 = isBase64Image(downloadUrl);
      let compressedSize: number;
      
      if (isBase64) {
        compressedSize = getBase64Size(downloadUrl);
        setUploadProgress('Stored locally');
        toast.success('Image processed and stored locally!', { 
          id: toastId,
          duration: 3000,
          icon: <WifiOff size={16} />
        });
      } else {
        compressedSize = originalSize * 0.4;
        setUploadProgress('Upload complete');
        toast.success('Image uploaded successfully!', { 
          id: toastId,
          duration: 3000,
          icon: <CheckCircle size={16} />
        });
      }
      
      setCompressionInfo({
        originalSize,
        compressedSize,
        isBase64
      });
      
      setValue('imageUrl', downloadUrl, { shouldValidate: true });
      setPreviewUrl(downloadUrl);
      
      if (immediatePreview.startsWith('blob:')) {
        URL.revokeObjectURL(immediatePreview);
      }
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      
      let errorMessage = 'Failed to process image';
      if (error.message?.includes('too large')) {
        errorMessage = 'Image too large - please use a smaller image';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network issue - please check your connection';
      }
      
      toast.error(errorMessage, { 
        duration: 4000,
        icon: <AlertCircle size={16} />
      });
      
      setPreviewUrl(initialData?.imageUrl || '');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const watchTotalQty = watch('totalQty');
  const watchSoldQty = watch('soldQty');
  const isCancelled = watch('isCancelled');

  React.useEffect(() => {
    const remainingQty = Math.max(0, (watchTotalQty || 0) - (watchSoldQty || 0));
    setValue('remainingQty', remainingQty);
  }, [watchTotalQty, watchSoldQty, setValue]);

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
    <>
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">
              Update Total Stock
            </h3>
            <p className="mb-4">
              Updating total quantity from {displayQuantity(initialData?.totalQty)} to {displayQuantity(pendingData?.totalQty)}.
              Remaining quantity will stay at {displayQuantity(initialData?.remainingQty)}.
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
                      remainingQty: (pendingData.totalQty || 0) - (initialData?.soldQty || 0)
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
      
      <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
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
            label="Store"
            options={stores}
            {...register('store')}
            error={errors.store?.message}
          />
          <Select
            label="Category"
            options={[
              { value: 'Eyeglasses', label: 'Eyeglasses' },
              { value: 'Sunglasses', label: 'Sunglasses' },
              { value: 'Promotion', label: 'Promotion' },
              { value: 'Ready', label: 'Ready' },
              { value: 'Ready BB', label: 'Ready BB' },
              { value: 'Error', label: 'Error' },
            ]}
            {...register('category', { required: 'Category is required' })}
            error={errors.category?.message}
          />
        </div>
        
        {/* Enhanced Multiple Pricing Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign size={20} />
              Pricing Options
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPriceOption}
              disabled={priceOptions.length >= 5}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add Price
            </Button>
          </div>

          <div className="space-y-3">
            {priceOptions.map((option, index) => (
              <div key={index} className="flex items-end gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                <div className="flex-1">
                  <Input
                    label={`Price Label ${index + 1}`}
                    value={option.label}
                    onChange={(e) => updatePriceOption(index, 'label', e.target.value)}
                    placeholder={`e.g., Regular, Wholesale, VIP`}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label={`Price ${index + 1} (MMK)`}
                    type="number"
                    min={0}
                    value={option.price}
                    onChange={(e) => updatePriceOption(index, 'price', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                {index === 0 && (
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                    Primary
                  </div>
                )}
                {index > 0 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removePriceOption(index)}
                    className="p-2"
                  >
                    <Minus size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {priceOptions.length > 1 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Price Summary:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {priceOptions.map((option, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">{option.label}:</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      {new Intl.NumberFormat('en-US').format(option.price)} MMK
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Frame Quantity Section with POS Restock System */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Eye size={20} />
              Frame Inventory Information
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

          {/* For existing frames (editing), show POS restock system */}
          {initialData ? (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                    Frame Inventory Management - Edit Mode
                  </h4>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {isAdmin ? (
                    <>
                      • <strong>Total Qty</strong> = Original frame allocation (constant) - as admin, you can unlock to modify<br/>
                      • <strong>Restock Qty</strong> = Additional frames added - increases Available stock without affecting Total Qty<br/>
                      • <strong>Available Qty</strong> = Current frames available for sale - independent of Total Qty<br/>
                      • Use increment/decrement buttons for precise frame inventory management
                    </>
                  ) : (
                    <>
                      • <strong>Total Qty</strong> = Original frame allocation (read-only for non-admin users)<br/>
                      • <strong>Available Qty</strong> = Current frames available - can be adjusted for sales/restocking<br/>
                      • <strong>Restock</strong> = Add new frames without changing original Total Qty allocation<br/>
                      • Perfect for managing daily frame operations
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Total Quantity Field - Admin can edit with lock/unlock, others read-only */}
                {isAdmin ? (
                  /* Admin users get lock/unlock functionality */
                  <IncrementDecrementField
                    value={safeNumber(watch('originalQty')) || safeNumber(watch('totalQty')) || 0}
                    onChange={(value) => {
                      // Only allow changes when unlocked - Total Qty is original frame allocation
                      if (!isTotalQtyLocked) {
                        updateField('originalQty', value);
                        updateField('totalQty', value);
                      }
                    }}
                    label="Total Qty (Original)"
                    min={0}
                    helpText={`Original: ${safeNumber(watch('soldQty'))} sold. Admin unlock to edit.`}
                    variant="total"
                    isLocked={isTotalQtyLocked}
                    onToggleLock={() => setIsTotalQtyLocked(!isTotalQtyLocked)}
                    showLockButton={true}
                  />
                ) : (
                  /* Non-admin users get completely read-only Total Qty */
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Qty (Original)
                    </label>
                    <div className="p-3 rounded-lg border-2 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      <div className="text-center font-bold text-lg text-gray-600 dark:text-gray-400">
                        {safeNumber(watch('originalQty')) || safeNumber(watch('totalQty')) || 0}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      📖 Original frames (admin only)
                    </div>
                  </div>
                )}

                {/* Restock Quantity Field - For adding new frames */}
                <IncrementDecrementField
                  value={safeNumber(watch('restockedQty')) || 0}
                  onChange={(value) => {
                    // When restock qty changes, add to remaining qty
                    const currentRemaining = safeNumber(watch('remainingQty')) || 0;
                    const currentRestocked = safeNumber(watch('restockedQty')) || 0;
                    const difference = value - currentRestocked;
                    
                    updateField('restockedQty', value);
                    updateField('remainingQty', Math.max(0, currentRemaining + difference));
                  }}
                  label="Restock Qty"
                  min={0}
                  helpText={`Added: ${safeNumber(watch('restockedQty')) || 0} frames`}
                  variant="remaining"
                />

                {/* Remaining Quantity Field - Current available frames */}
                <IncrementDecrementField
                  value={safeNumber(watch('remainingQty')) || 0}
                  onChange={(value) => {
                    // Remaining qty is independent - can be adjusted for sales or restocking
                    updateField('remainingQty', value);
                  }}
                  label="Available Qty"
                  min={0}
                  helpText={`Available: ${safeNumber(watch('remainingQty')) || 0} frames`}
                  variant="remaining"
                />
              </div>

              {/* Frame POS Inventory Summary - More Compact */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 text-center">
                  📊 Frame Inventory Summary
                </h5>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                    <div className="font-bold text-blue-600 dark:text-blue-400 text-xl">{safeNumber(watch('originalQty')) || safeNumber(watch('totalQty')) || 0}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Original</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                    <div className="font-bold text-purple-600 dark:text-purple-400 text-xl">{safeNumber(watch('restockedQty')) || 0}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Restocked</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                    <div className="font-bold text-orange-600 dark:text-orange-400 text-xl">{safeNumber(watch('soldQty')) || 0}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Sold</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                    <div className="font-bold text-green-600 dark:text-green-400 text-xl">{safeNumber(watch('remainingQty')) || 0}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Available</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* For new frames (adding), show regular quantity input */
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Total Quantity"
                  type="number"
                  min={0}
                  value={displayQuantity(watchTotalQty)}
                  {...register('totalQty', { 
                    required: 'Total quantity is required',
                    valueAsNumber: true,
                    min: { 
                      value: 0,
                      message: 'Quantity cannot be negative' 
                    }
                  })}
                  error={errors.totalQty?.message}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setValue('totalQty', value, { shouldValidate: true });
                    setValue('originalQty', value, { shouldValidate: true });
                    setValue('remainingQty', Math.max(0, value - (watchSoldQty || 0)), { shouldValidate: true });
                  }}
                />
                <Input
                  label="Sold Quantity"
                  type="number"
                  min={0}
                  max={watchTotalQty || 0}
                  value={displayQuantity(watchSoldQty)}
                  {...register('soldQty', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Cannot be negative' },
                    max: { 
                      value: watchTotalQty || 0,
                      message: 'Cannot exceed total quantity' 
                    }
                  })}
                  error={errors.soldQty?.message}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setValue('soldQty', value, { shouldValidate: true });
                    setValue('remainingQty', Math.max(0, (watchTotalQty || 0) - value), { shouldValidate: true });
                  }}
                />
                <Input
                  label="Remaining Quantity"
                  type="number"
                  disabled
                  value={displayQuantity(Math.max(0, (watchTotalQty || 0) - (watchSoldQty || 0)))}
                  className="bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </div>
          )}
        </div>

        {/* Color Distribution */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Color Distribution
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {frameColors.map(color => (
              <div key={color} className="space-y-1">
                <Input
                  label={color}
                  type="number"
                  min={0}
                  {...register(`colors.${color}`, { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Quantity must be positive' }
                  })}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setValue(`colors.${color}`, value);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Optimized Image Upload Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Frame Image
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 transition-colors hover:border-blue-400">
            <div className="flex flex-col items-center space-y-4">
              {previewUrl ? (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="Frame preview" 
                    className="w-48 h-48 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      console.error('Preview image failed to load');
                      setPreviewUrl('');
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-1 rounded-full">
                    {compressionInfo?.isBase64 ? (
                      <WifiOff size={16} className="text-orange-600" />
                    ) : (
                      <CheckCircle size={16} className="text-green-600" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon size={48} className="mx-auto text-gray-400 mb-2" />
                    <span className="text-gray-400">No image uploaded</span>
                  </div>
                </div>
              )}
              
              <div className="text-center space-y-2">
                <label className="cursor-pointer">
                  <div className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    uploading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                  } text-white shadow-md`}>
                    <UploadIcon size={18} />
                    {uploading ? uploadProgress || 'Processing...' : 'Upload Image'}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
                
                {compressionInfo && (
                  <div className={`text-xs p-2 rounded ${
                    compressionInfo.isBase64 
                      ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      {compressionInfo.isBase64 ? <WifiOff size={12} /> : <Wifi size={12} />}
                      {compressionInfo.isBase64 ? 'Local Storage' : 'Cloud Storage'} - 
                      Size: {(compressionInfo.compressedSize / 1024).toFixed(1)}KB
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supports JPG, PNG, WebP (max 3MB)<br/>
                  Images are automatically optimized for faster loading
                </p>
              </div>
            </div>
          </div>
          <input type="hidden" {...register('imageUrl')} />
          {errors.imageUrl && (
            <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isCancelled"
            {...register('isCancelled')}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isCancelled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Order Cancelled
          </label>
        </div>

        {isCancelled && (
          <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
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
              placeholder="Please provide details about the cancellation..."
            />
          </div>
        )}

        <div className="pt-6 border-t">
          <Button 
            type="submit" 
            className="w-full py-3 text-lg font-medium" 
            disabled={isSubmitting || uploading}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </div>
            ) : uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {uploadProgress || 'Processing...'}
              </div>
            ) : (
              initialData ? 'Update Frame' : 'Add Frame'
            )}
          </Button>
        </div>
      </form>
    </>
  );
};

export default FrameForm;