import React, { useState, useEffect } from 'react';
import { Eye, AlertCircle, Expand, MapPin, Stethoscope, Bell, ToggleLeft, ToggleRight, RotateCcw, Plus, Minus, Lock, Unlock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { LensType, BifocalType, SMSBifocalType, YangonOrderSubType, YangonOrderBifocalType, STORES, roundToHalf, validateHalfIncrement, cleanDataForFirebase, deductErrorQuantityFromMatchingLens, deductQuantityFromMatchingLensForSMS } from '../../lib/utils';
import { createLensNotification, isStaffUser } from '../../services/notification';
import { useAuth } from '../../context/AuthContext';

export interface LensFormData {
  id?: string;
  code: string;
  type: LensType;
  bifocalType?: BifocalType;
  smsBifocalType?: SMSBifocalType;
  yangonOrderSubType?: YangonOrderSubType;
  yangonOrderBifocalType?: YangonOrderBifocalType;
  category: string;
  qty: number;
  rightQty?: number;
  leftQty?: number;
  rightSoldQty?: number;
  leftSoldQty?: number;
  originalRightQty?: number;
  originalLeftQty?: number;
  originalQty?: number;
  restockedQty?: number; // New field for tracking restocked quantity
  restockedRightQty?: number; // New field for tracking restocked right quantity (flattop)
  restockedLeftQty?: number; // New field for tracking restocked left quantity (flattop)
  price: number;
  sph?: string;
  cyl?: string;
  axis?: string;
  addition?: string;
  Right?: string;
  Left?: string;
  rightAxis?: string;
  leftAxis?: string;
  rightCyl?: string;
  leftCyl?: string;
  errorReason?: string;
  store?: string;
  samePowerBothEyes?: boolean;
  yangonOrderName?: string;
}

interface LensFormProps {
  onSubmit: (data: LensFormData) => void;
  initialData?: LensFormData;
  isSubmitting: boolean;
}

const LensForm: React.FC<LensFormProps> = ({ onSubmit, initialData, isSubmitting }) => {
  const { user, userRole, isAdmin } = useAuth();
  const [formData, setFormData] = useState<LensFormData>({
    code: '',
    type: 'Single Vision',
    category: '',
    qty: 0,
    rightQty: 0,
    leftQty: 0,
    rightSoldQty: 0,
    leftSoldQty: 0,
    originalRightQty: 0,
    originalLeftQty: 0,
    originalQty: 0,
    restockedQty: 0,
    restockedRightQty: 0,
    restockedLeftQty: 0,
    price: 0,
    store: 'win',
    samePowerBothEyes: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorWarning, setShowErrorWarning] = useState(false);
  const [showSMSWarning, setShowSMSWarning] = useState(false);
  const [showStaffWarning, setShowStaffWarning] = useState(false);
  const [isTotalQtyLocked, setIsTotalQtyLocked] = useState(true); // Total Qty locked by default

  // Check if current user is staff
  const isCurrentUserStaff = user?.email ? isStaffUser(user.email, userRole, isAdmin) : false;

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        rightSoldQty: initialData.rightSoldQty || 0,
        leftSoldQty: initialData.leftSoldQty || 0,
        originalRightQty: initialData.originalRightQty || initialData.rightQty || 0,
        originalLeftQty: initialData.originalLeftQty || initialData.leftQty || 0,
        originalQty: initialData.originalQty || initialData.qty || 0,
        restockedQty: initialData.restockedQty || 0,
        restockedRightQty: initialData.restockedRightQty || 0,
        restockedLeftQty: initialData.restockedLeftQty || 0,
        samePowerBothEyes: initialData.samePowerBothEyes || false,
      });
    }
  }, [initialData]);

  // Show warnings based on lens type and user role
  useEffect(() => {
    setShowErrorWarning(formData.type === 'Error');
    setShowSMSWarning(formData.type === 'SMS');
    setShowStaffWarning(isCurrentUserStaff && !initialData); // Only show for new entries by staff
  }, [formData.type, isCurrentUserStaff, initialData]);

  const singleVisionCategories = [
    'bb 1.56', 'bb 1.61', 'bb 1.67',
    'bbpg 1.56', 'bbpg 1.61', 'pg',
    'anti flash', 'anti glare',
    'photo pink', 'photo blue', 'photo purple', 'photo brown',
    'cr', 'mc'
  ];

  const fuseCategories = [
    'bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse'
  ];

  const flattopCategories = [
    'mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop'
  ];

  const multifocalCategories = [
    'bb multifocal', 'bbpg multifocal', 'bb multifocal ff', 'bbpg multifocal ff'
  ];

  const errorReasons = [
    'Auto စက် Error', 'KKT', 'KCMA', 'KMMT', 'မှန်မှားထုတ်'
  ];

  const getAvailableCategories = () => {
    if (formData.type === 'Single Vision') return singleVisionCategories;
    if (formData.type === 'Bifocal' && formData.bifocalType === 'Fuse') return fuseCategories;
    if (formData.type === 'Bifocal' && formData.bifocalType === 'Flattop') return flattopCategories;
    if (formData.type === 'Bifocal' && formData.bifocalType === 'Multifocal') return multifocalCategories;
    if (formData.type === 'SMS') {
      // SMS can use both single vision and bifocal categories
      if (formData.smsBifocalType === 'Fuse') return fuseCategories;
      if (formData.smsBifocalType === 'Flattop') return flattopCategories;
      if (formData.smsBifocalType === 'Multifocal') return multifocalCategories;
      return singleVisionCategories; // Default to single vision categories
    }
    if (formData.type === 'Error') {
      // For error lenses, show categories based on what type of lens had the error
      if (formData.bifocalType === 'Fuse') return fuseCategories;
      if (formData.bifocalType === 'Flattop') return flattopCategories;
      if (formData.bifocalType === 'Multifocal') return multifocalCategories;
      return singleVisionCategories; // Default to single vision categories
    }
    if (formData.type === 'Yangon Order') {
      // For Yangon Order, show categories based on sub type
      if (formData.yangonOrderSubType === 'Single Vision') return singleVisionCategories;
      if (formData.yangonOrderSubType === 'Bifocal') {
        if (formData.yangonOrderBifocalType === 'Fuse') return fuseCategories;
        if (formData.yangonOrderBifocalType === 'Flattop') return flattopCategories;
        return [...fuseCategories, ...flattopCategories]; // Show all bifocal categories if no specific type
      }
      if (formData.yangonOrderSubType === 'Multifocal') return multifocalCategories;
      return singleVisionCategories; // Default to single vision
    }
    return [];
  };

  // Check if yangon order fields should be shown
  const shouldShowYangonOrderFields = () => {
    return formData.type === 'Yangon Order';
  };

  const updateField = (field: keyof LensFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Handle quantity fields with 0.5 increments
      if (field === 'rightQty' || field === 'leftQty' || field === 'qty') {
        const numValue = parseFloat(value) || 0;
        const roundedValue = roundToHalf(numValue);
        updated[field] = roundedValue;
        
        // Auto-calculate ORIGINAL quantities for Flattop bifocal lenses - rightQty/leftQty represent ORIGINAL stock
        if (field === 'rightQty' || field === 'leftQty') {
          if ((updated.type === 'Bifocal' && updated.bifocalType === 'Flattop') || 
              (updated.type === 'Error' && updated.bifocalType === 'Flattop') ||
              (updated.type === 'SMS' && updated.smsBifocalType === 'Flattop') ||
              (updated.type === 'Yangon Order' && updated.yangonOrderSubType === 'Bifocal' && updated.yangonOrderBifocalType === 'Flattop') ||
              (updated.type === 'Yangon Order' && updated.yangonOrderSubType === 'Multifocal')) {
            
            // For flattop lenses: rightQty and leftQty represent ORIGINAL quantities
            updated.originalRightQty = updated.rightQty || 0;
            updated.originalLeftQty = updated.leftQty || 0;
            updated.originalQty = roundToHalf((updated.rightQty || 0) + (updated.leftQty || 0));
            
            // For NEW lenses, set remaining qty equal to original qty initially
            if (!initialData) {
              updated.qty = updated.originalQty; // Total remaining = Total original initially
            }
          }
        }
      }
      
      // Reset dependent fields when type changes
      if (field === 'type') {
        updated.bifocalType = undefined;
        updated.smsBifocalType = undefined;
        updated.yangonOrderSubType = undefined;
        updated.yangonOrderBifocalType = undefined;
        updated.category = '';
        updated.errorReason = '';
        updated.samePowerBothEyes = false;
        updated.yangonOrderName = '';
        
        // Only enable right/left quantities for Flattop bifocal types
        if (value === 'Bifocal') {
          // Reset to 0 for now, will be enabled when bifocalType is set to Flattop
          updated.rightQty = 0;
          updated.leftQty = 0;
          updated.rightSoldQty = 0;
          updated.leftSoldQty = 0;
          updated.originalRightQty = 0;
          updated.originalLeftQty = 0;
        } else {
          // For non-bifocal types, set these to 0
          updated.rightQty = 0;
          updated.leftQty = 0;
          updated.rightSoldQty = 0;
          updated.leftSoldQty = 0;
          updated.originalRightQty = 0;
          updated.originalLeftQty = 0;
        }
      }
      
      // Reset category when bifocal type changes
      if (field === 'bifocalType' || field === 'smsBifocalType' || field === 'yangonOrderSubType' || field === 'yangonOrderBifocalType') {
        updated.category = '';
        updated.yangonOrderName = '';
        
        // Only enable right/left quantities for Flattop types and Yangon Order Multifocal
        if ((updated.type === 'Bifocal' && field === 'bifocalType' && value === 'Flattop') ||
            (updated.type === 'Error' && field === 'bifocalType' && value === 'Flattop') ||
            (updated.type === 'SMS' && field === 'smsBifocalType' && value === 'Flattop') ||
            (updated.type === 'Yangon Order' && field === 'yangonOrderBifocalType' && value === 'Flattop') ||
            (updated.type === 'Yangon Order' && field === 'yangonOrderSubType' && value === 'Multifocal')) {
          updated.rightQty = updated.rightQty || 0;
          updated.leftQty = updated.leftQty || 0;
          updated.qty = roundToHalf((updated.rightQty || 0) + (updated.leftQty || 0));
        } else {
          // For non-Flattop bifocal types and non-Multifocal yangon orders, reset right/left quantities
          updated.rightQty = 0;
          updated.leftQty = 0;
          updated.rightSoldQty = 0;
          updated.leftSoldQty = 0;
          updated.originalRightQty = 0;
          updated.originalLeftQty = 0;
        }
      }

      // Handle same power toggle
      if (field === 'samePowerBothEyes' && value === true) {
        // Copy left eye values to right eye
        updated.Right = updated.Left;
        updated.rightAxis = updated.leftAxis;
        updated.rightCyl = updated.leftCyl;
      }

      // Auto-sync right eye values when same power is enabled
      if (formData.samePowerBothEyes && (field === 'Left' || field === 'leftAxis' || field === 'leftCyl')) {
        if (field === 'Left') updated.Right = value;
        if (field === 'leftAxis') updated.rightAxis = value;
        if (field === 'leftCyl') updated.rightCyl = value;
      }
      
      return updated;
    });
    
    // Clear field-specific errors when user makes changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Reset quantity function
  const resetQuantities = () => {
    if (shouldShowBifocalQuantities()) {
      updateField('rightQty', 0);
      updateField('leftQty', 0);
      updateField('qty', 0);
      updateField('rightSoldQty', 0);
      updateField('leftSoldQty', 0);
      updateField('originalRightQty', 0);
      updateField('originalLeftQty', 0);
      updateField('originalQty', 0);
    } else {
      updateField('qty', 0);
      updateField('originalQty', 0);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    }

    // Category validation - required for all types except Error without bifocal type
    const needsCategory = formData.type === 'Single Vision' || 
                         (formData.type === 'Bifocal' && formData.bifocalType) ||
                         (formData.type === 'SMS') ||
                         (formData.type === 'Error' && (formData.bifocalType || !formData.bifocalType)) ||
                         (formData.type === 'Yangon Order' && formData.yangonOrderSubType);
    
    if (needsCategory && !formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    // Bifocal type validation
    if (formData.type === 'Bifocal' && !formData.bifocalType) {
      newErrors.bifocalType = 'Bifocal type is required';
    }

    // Yangon Order validations
    if (formData.type === 'Yangon Order') {
      if (!formData.yangonOrderSubType) {
        newErrors.yangonOrderSubType = 'Yangon Order sub type is required';
      }
      if (formData.yangonOrderSubType === 'Bifocal' && !formData.yangonOrderBifocalType) {
        newErrors.yangonOrderBifocalType = 'Bifocal type is required for Yangon Order Bifocal';
      }
      if (!formData.yangonOrderName?.trim()) {
        newErrors.yangonOrderName = 'Customer/Order name is required for Yangon Order';
      }
    }

    // Error reason validation
    if (formData.type === 'Error' && !formData.errorReason) {
      newErrors.errorReason = 'Error reason is required';
    }

    // Quantity validation - Only for Flattop bifocal types and Yangon Order Multifocal
    const isFlattopBifocal = (formData.type === 'Bifocal' && formData.bifocalType === 'Flattop') ||
                            (formData.type === 'Error' && formData.bifocalType === 'Flattop') ||
                            (formData.type === 'SMS' && formData.smsBifocalType === 'Flattop') ||
                            (formData.type === 'Yangon Order' && formData.yangonOrderBifocalType === 'Flattop') ||
                            (formData.type === 'Yangon Order' && formData.yangonOrderSubType === 'Multifocal');
    
    if (isFlattopBifocal) {
      if ((formData.rightQty || 0) < 0) {
        newErrors.rightQty = 'Right quantity cannot be negative';
      }
      if ((formData.leftQty || 0) < 0) {
        newErrors.leftQty = 'Left quantity cannot be negative';
      }
      if (!validateHalfIncrement(formData.rightQty || 0)) {
        newErrors.rightQty = 'Right quantity must be in 0.5 increments (0.5, 1, 1.5, 2, etc.)';
      }
      if (!validateHalfIncrement(formData.leftQty || 0)) {
        newErrors.leftQty = 'Left quantity must be in 0.5 increments (0.5, 1, 1.5, 2, etc.)';
      }
      if ((formData.rightQty || 0) + (formData.leftQty || 0) === 0) {
        newErrors.qty = 'Total quantity must be greater than 0';
      }
    } else {
      if (formData.qty <= 0) {
        newErrors.qty = 'Quantity must be greater than 0';
      }
      if (!validateHalfIncrement(formData.qty)) {
        newErrors.qty = 'Quantity must be in 0.5 increments (0.5, 1, 1.5, 2, etc.)';
      }
    }

    // Price validation
    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Prepare data for submission
    let submitData = { ...formData };
    
    // Only for Flattop bifocal lenses and Yangon Order Multifocal, ensure quantities are properly set
    const isFlattopBifocal = (submitData.type === 'Bifocal' && submitData.bifocalType === 'Flattop') ||
                            (submitData.type === 'Yangon Order' && submitData.yangonOrderSubType === 'Multifocal') ||
                            (submitData.type === 'Error' && submitData.bifocalType === 'Flattop') ||
                            (submitData.type === 'SMS' && submitData.smsBifocalType === 'Flattop') ||
                            (submitData.type === 'Yangon Order' && submitData.yangonOrderBifocalType === 'Flattop');
    
    if (isFlattopBifocal) {
      submitData.qty = roundToHalf((submitData.rightQty || 0) + (submitData.leftQty || 0));
      
      // Set original quantities if this is a new lens
      if (!initialData) {
        submitData.originalRightQty = submitData.rightQty || 0;
        submitData.originalLeftQty = submitData.leftQty || 0;
        submitData.originalQty = submitData.qty;
        submitData.rightSoldQty = 0;
        submitData.leftSoldQty = 0;
      }
    } else {
      // For non-Flattop lenses, set bifocal-specific fields to 0
      submitData.rightQty = 0;
      submitData.leftQty = 0;
      submitData.rightSoldQty = 0;
      submitData.leftSoldQty = 0;
      submitData.originalRightQty = 0;
      submitData.originalLeftQty = 0;
      
      // Ensure quantity is in 0.5 increments
      submitData.qty = roundToHalf(submitData.qty);
      
      if (!initialData) {
        submitData.originalQty = submitData.qty;
      }
    }

    // CRITICAL FIX: Clean data to remove undefined values before sending to Firebase
    const cleanedData = cleanDataForFirebase(submitData);
    
    // Call the parent onSubmit function
    onSubmit(cleanedData);
    
    // NEW FEATURE: Create notification if staff member is adding/updating lens data
    if (user?.email && isCurrentUserStaff) {
      try {
        const action = initialData ? 'updated' : 'added';
        await createLensNotification(user.email, cleanedData, action);
      } catch (error) {
        console.error('Error creating staff notification:', error);
        // Don't prevent the lens operation if notification fails
      }
    }
    
    // CRITICAL NEW FEATURE: If this is a new error lens, increment error quantity in matching lens
    if (!initialData && cleanedData.type === 'Error') {
      try {
        const deductionResult = await deductErrorQuantityFromMatchingLens(cleanedData);
        if (deductionResult.success) {
          console.log('Successfully incremented error quantity in matching lens:', deductionResult.message);
        } else {
          console.warn('Could not find matching lens to increment error quantity:', deductionResult.message);
        }
      } catch (error) {
        console.error('Error during error quantity increment:', error);
        // Don't prevent the error lens creation if increment fails
      }
    }

    // ENHANCED FEATURE: If this is a new SMS lens, deduct from matching inventory
    if (!initialData && cleanedData.type === 'SMS') {
      try {
        const deductionResult = await deductQuantityFromMatchingLensForSMS(cleanedData);
        if (deductionResult.success) {
          console.log('Successfully deducted quantity from matching lens inventory for SMS:', deductionResult.message);
        } else {
          console.warn('Could not find matching lens to deduct from - SMS lens created without inventory deduction:', deductionResult.message);
        }
      } catch (error) {
        console.error('Error during SMS inventory deduction:', error);
        // Don't prevent the SMS lens creation if deduction fails
      }
    }
  };

  // Quick quantity buttons for common values
  const QuickQuantityButtons: React.FC<{ 
    value: number; 
    onChange: (value: number) => void; 
    label: string;
  }> = ({ value, onChange, label }) => {
    const commonValues = [0.5, 1, 1.5, 2, 2.5, 3, 5, 10];
    
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div className="flex flex-wrap gap-1">
          {commonValues.map(qty => (
            <button
              key={qty}
              type="button"
              onClick={() => onChange(qty)}
              className={`
                px-2 py-1 text-xs rounded border transition-colors
                ${value === qty 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }
              `}
            >
              {qty}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Increment/Decrement component for Total Qty and Remaining Qty
  const IncrementDecrementField: React.FC<{
    value: number;
    onChange: (value: number) => void;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    helpText?: string;
    variant?: 'total' | 'remaining';
    isLocked?: boolean;
    onToggleLock?: () => void;
    showLockButton?: boolean;
  }> = ({ 
    value, 
    onChange, 
    label, 
    min = 0, 
    max = 999, 
    step = 0.5, 
    disabled = false, 
    helpText, 
    variant = 'total',
    isLocked = false,
    onToggleLock,
    showLockButton = false
  }) => {
    
    const handleIncrement = () => {
      const newValue = Math.min(max, roundToHalf(value + step));
      onChange(newValue);
    };
    
    const handleDecrement = () => {
      const newValue = Math.max(min, roundToHalf(value - step));
      onChange(newValue);
    };
    
    const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = parseFloat(e.target.value) || 0;
      const clampedValue = Math.min(max, Math.max(min, roundToHalf(inputValue)));
      onChange(clampedValue);
    };
    
    const isFieldDisabled = disabled || isLocked;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          {showLockButton && onToggleLock && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleLock}
              className={`p-1.5 ${
                isLocked 
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                  : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
              title={isLocked ? 'Click to unlock Total Qty editing' : 'Click to lock Total Qty (constant)'}
            >
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </Button>
          )}
        </div>
        
        <div className={`flex items-center gap-2 p-3 rounded-lg border-2 ${
          isLocked 
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-75'
            : variant === 'total' 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
        }`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDecrement}
            disabled={isFieldDisabled || value <= min}
            className="p-2 min-w-0"
            title={isLocked ? 'Total Qty is locked (constant)' : 'Decrease quantity'}
          >
            <Minus size={14} />
          </Button>
          
          <Input
            type="number"
            value={value}
            onChange={handleDirectInput}
            disabled={isFieldDisabled}
            min={min}
            max={max}
            step={step}
            className={`text-center font-bold text-lg ${
              isLocked 
                ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                : variant === 'total' 
                ? 'border-blue-300 focus:border-blue-500' 
                : 'border-green-300 focus:border-green-500'
            }`}
            title={isLocked ? 'Total Qty is locked (constant)' : 'Enter quantity directly'}
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleIncrement}
            disabled={isFieldDisabled || value >= max}
            className="p-2 min-w-0"
            title={isLocked ? 'Total Qty is locked (constant)' : 'Increase quantity'}
          >
            <Plus size={14} />
          </Button>
        </div>
        
        {helpText && (
          <div className={`text-xs ${
            isLocked 
              ? 'text-gray-500 dark:text-gray-400'
              : variant === 'total' 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            {isLocked && '🔒 '}{helpText}
            {isLocked && ' (Locked - click lock icon to edit)'}
          </div>
        )}
      </div>
    );
  };

  // Check if category selection should be shown
  const shouldShowCategorySelection = () => {
    return formData.type === 'Single Vision' || 
           (formData.type === 'Bifocal' && formData.bifocalType) ||
           (formData.type === 'SMS') ||
           formData.type === 'Error' ||
           (formData.type === 'Yangon Order' && formData.yangonOrderSubType);
  };

  // Check if bifocal quantities should be shown (only for Flattop and Yangon Order Multifocal)
  const shouldShowBifocalQuantities = () => {
    return (formData.type === 'Bifocal' && formData.bifocalType === 'Flattop') || 
           (formData.type === 'Error' && formData.bifocalType === 'Flattop') ||
           (formData.type === 'SMS' && formData.smsBifocalType === 'Flattop') ||
           (formData.type === 'Yangon Order' && formData.yangonOrderBifocalType === 'Flattop') ||
           (formData.type === 'Yangon Order' && formData.yangonOrderSubType === 'Multifocal');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Staff Notification Warning */}
      {showStaffWarning && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-amber-800 dark:text-amber-200 font-medium mb-2">
                Staff Data Entry Notification
              </h4>
              <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">
                As a staff member, when you add this lens data:
              </p>
              <ul className="text-amber-700 dark:text-amber-300 text-sm space-y-1 ml-4">
                <li>• <strong>Administrators and owners</strong> will be automatically notified</li>
                <li>• <strong>Your entry will be logged</strong> in the activity feed for review</li>
                <li>• <strong>All lens details</strong> including type, category, quantity, and price will be recorded</li>
                <li>• <strong>Store location</strong> and timestamp will be tracked</li>
              </ul>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-2 font-medium">
                This ensures proper oversight and quality control of inventory data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Warning */}
      {showErrorWarning && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Expand className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-red-800 dark:text-red-200 font-medium mb-2">
                Error Lens - Inventory Deduction
              </h4>
              <p className="text-red-700 dark:text-red-300 text-sm mb-2">
                Creating an error lens will automatically deduct the specified quantity from matching lens inventory:
              </p>
              <ul className="text-red-700 dark:text-red-300 text-sm space-y-1 ml-4">
                <li>• <strong>Single Vision errors:</strong> Deducts from Single Vision lens with matching prescription and category</li>
                <li>• <strong>Bifocal errors:</strong> Deducts from Bifocal lens with matching prescription, category, and bifocal type</li>
                <li>• <strong>Left/Right quantities:</strong> For Flattop bifocal errors, specify which eye(s) had the error</li>
              </ul>
              <p className="text-red-700 dark:text-red-300 text-sm mt-2 font-medium">
                Make sure the error quantities match the actual defective lenses.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ENHANCED SMS Warning with Detailed Matching Logic */}
      {showSMSWarning && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-800 dark:text-blue-200 font-medium mb-2">
                SMS (Special Medical Service) - Automatic Inventory Deduction
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                Creating an SMS lens will automatically search and deduct from matching lens inventory:
              </p>
              
              <div className="space-y-3">
                {/* Single Vision SMS */}
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Single Vision SMS:</h5>
                  <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1 ml-4">
                    <li>• Matches <strong>Single Vision</strong> lenses</li>
                    <li>• Same <strong>category</strong> (bb 1.56, cr, mc, etc.)</li>
                    <li>• Same <strong>SPH, CYL, AXIS</strong> values</li>
                    <li>• Deducts the SMS quantity from matching lens</li>
                  </ul>
                </div>

                {/* Bifocal SMS */}
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Bifocal SMS:</h5>
                  <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1 ml-4">
                    <li>• Matches <strong>Bifocal</strong> lenses with same type (Fuse/Flattop/Multifocal)</li>
                    <li>• Same <strong>category</strong> (bbfuse, crflattop, etc.)</li>
                    <li>• <strong>Fuse/Multifocal:</strong> Matches SPH + Addition</li>
                    <li>• <strong>Flattop:</strong> Matches SPH, Addition + detailed L/R measurements</li>
                    <li>• <strong>Left/Right deduction:</strong> For Flattop SMS, deducts from specific eye quantities</li>
                  </ul>
                </div>
              </div>

              <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-800 rounded border-l-4 border-blue-500">
                <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                  <strong>Note:</strong> If no matching lens is found, the SMS lens will still be created, 
                  but no inventory will be deducted. Check the system logs for deduction results.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Lens Code *"
          value={formData.code}
          onChange={(e) => updateField('code', e.target.value)}
          error={errors.code}
          placeholder="Enter lens code"
        />
        
        <Select
          label="Store *"
          value={formData.store || ''}
          onChange={(e) => updateField('store', e.target.value)}
          options={STORES.map(store => ({ value: store, label: store.toUpperCase() }))}
        />
      </div>

      {/* Type Selection */}
      <div className="space-y-4">
        <Select
          label="Lens Type *"
          value={formData.type}
          onChange={(e) => updateField('type', e.target.value as LensType)}
          options={[
            { value: 'Single Vision', label: 'Single Vision' },
            { value: 'Bifocal', label: 'Bifocal' },
            { value: 'SMS', label: 'SMS (Shwe Muse)' },
            { value: 'Error', label: 'Error' },
            { value: 'Yangon Order', label: 'Yangon Order' },
          ]}
        />

        {/* Yangon Order Sub Type Selection */}
        {formData.type === 'Yangon Order' && (
          <Select
            label="Yangon Order Sub Type *"
            value={formData.yangonOrderSubType || ''}
            onChange={(e) => updateField('yangonOrderSubType', e.target.value as YangonOrderSubType)}
            options={[
              { value: '', label: 'Select sub type...' },
              { value: 'Single Vision', label: 'Single Vision' },
              { value: 'Bifocal', label: 'Bifocal' },
              { value: 'Multifocal', label: 'Multifocal' },
            ]}
            error={errors.yangonOrderSubType}
          />
        )}

        {/* Yangon Order Bifocal Type Selection */}
        {formData.type === 'Yangon Order' && formData.yangonOrderSubType === 'Bifocal' && (
          <Select
            label="Bifocal Type *"
            value={formData.yangonOrderBifocalType || ''}
            onChange={(e) => updateField('yangonOrderBifocalType', e.target.value as YangonOrderBifocalType)}
            options={[
              { value: '', label: 'Select bifocal type...' },
              { value: 'Fuse', label: 'Fuse' },
              { value: 'Flattop', label: 'Flattop' },
            ]}
            error={errors.yangonOrderBifocalType}
          />
        )}

        {/* Bifocal Type Selection - Show for Bifocal and Error types */}
        {(formData.type === 'Bifocal' || formData.type === 'Error') && (
          <Select
            label={formData.type === 'Error' ? 'Original Lens Type (Optional)' : 'Bifocal Type *'}
            value={formData.bifocalType || ''}
            onChange={(e) => updateField('bifocalType', e.target.value as BifocalType)}
            options={[
              { value: '', label: formData.type === 'Error' ? 'Single Vision Error' : 'Select bifocal type...' },
              { value: 'Fuse', label: 'Fuse' },
              { value: 'Flattop', label: 'Flattop' },
              { value: 'Multifocal', label: 'Multifocal' },
            ]}
            error={errors.bifocalType}
          />
        )}

        {/* SMS Bifocal Type Selection - Show for SMS type */}
        {formData.type === 'SMS' && (
          <Select
            label="SMS Type (Optional)"
            value={formData.smsBifocalType || ''}
            onChange={(e) => updateField('smsBifocalType', e.target.value as SMSBifocalType)}
            options={[
              { value: '', label: 'Single Vision SMS' },
              { value: 'Fuse', label: 'Bifocal SMS - Fuse' },
              { value: 'Flattop', label: 'Bifocal SMS - Flattop' },
              { value: 'Multifocal', label: 'Bifocal SMS - Multifocal' },
            ]}
          />
        )}

        {/* Error Reason Selection */}
        {formData.type === 'Error' && (
          <Select
            label="Error Reason *"
            value={formData.errorReason || ''}
            onChange={(e) => updateField('errorReason', e.target.value)}
            options={[
              { value: '', label: 'Select error reason...' },
              ...errorReasons.map(reason => ({ value: reason, label: reason }))
            ]}
            error={errors.errorReason}
          />
        )}

        {/* Category Selection - Show when appropriate */}
        {shouldShowCategorySelection() && (
          <Select
            label="Category *"
            value={formData.category}
            onChange={(e) => updateField('category', e.target.value)}
            options={[
              { value: '', label: 'Select category...' },
              ...getAvailableCategories().map(cat => ({ value: cat, label: cat.toUpperCase() }))
            ]}
            error={errors.category}
          />
        )}
      </div>

      {/* Yangon Order Fields */}
      {shouldShowYangonOrderFields() && (
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                Yangon Order Specifications
              </h3>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Customer/Order Name *"
                value={formData.yangonOrderName || ''}
                onChange={(e) => updateField('yangonOrderName', e.target.value)}
                error={errors.yangonOrderName}
                placeholder="Enter customer or order name"
                className="border-orange-300 focus:border-orange-500"
              />
            </div>
            
            <div className="mt-3 text-sm text-orange-700 dark:text-orange-300">
              <strong>Note:</strong> This name will be used for Yangon order identification and processing.
            </div>
          </div>
        </div>
      )}

      {/* Quantity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye size={20} />
            Quantity Information
            {formData.type === 'Error' && (
              <span className="text-sm font-normal text-red-600 dark:text-red-400">
                (Will be deducted from inventory)
              </span>
            )}
            {formData.type === 'SMS' && (
              <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
                (Will be deducted from inventory)
              </span>
            )}
          </h3>
          
          {/* Reset Quantity Button */}
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

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <AlertCircle size={16} />
            <span>Quantities must be in 0.5 increments (0.5, 1, 1.5, 2, 2.5, etc.)</span>
          </div>
        </div>

        {shouldShowBifocalQuantities() ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                <AlertCircle size={16} />
                <span><strong>
                  {formData.type === 'Yangon Order' && formData.yangonOrderSubType === 'Multifocal' 
                    ? 'Yangon Order Multifocal:' 
                    : 'Flattop Bifocal:'
                  }
                </strong> Left and Right quantities are tracked separately</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <QuickQuantityButtons
                  value={formData.rightQty || 0}
                  onChange={(value) => {
                    updateField('rightQty', value);
                    // updateField automatically calculates qty and originalQty for flattop lenses
                  }}
                  label={`Right Eye ORIGINAL Qty Quick Select ${formData.type === 'Error' ? '(Error Qty)' : formData.type === 'SMS' ? '(SMS Qty)' : ''}`}
                />
                <Input
                  label={`Right Eye ORIGINAL Quantity * ${formData.type === 'Error' ? '(Error Qty)' : formData.type === 'SMS' ? '(SMS Qty)' : ''}`}
                  type="number"
                  value={formData.rightQty || 0}
                  onChange={(e) => {
                    const valueNum = parseFloat(e.target.value) || 0;
                    updateField('rightQty', valueNum);
                    // updateField automatically calculates originalQty from rightQty + leftQty
                  }}
                  error={errors.rightQty}
                  min="0"
                  step="0.5"
                  className="border-blue-300 focus:border-blue-500"
                  placeholder="0.5, 1, 1.5, 2..."
                />
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>🔄 Auto-calculation:</strong> Right original + Left original = Total original quantity
                  <br />
                  {formData.type === 'Error'
                    ? 'Original error pieces for right eye'
                    : formData.type === 'SMS'
                    ? 'Original SMS pieces for right eye'
                    : 'Original stock pieces for right eye (0.5 increments)'
                  }
                </div>
              </div>

              <div className="space-y-3">
                <QuickQuantityButtons
                  value={formData.leftQty || 0}
                  onChange={(value) => {
                    updateField('leftQty', value);
                    // updateField automatically calculates originalQty from rightQty + leftQty
                  }}
                  label={`Left Eye ORIGINAL Qty Quick Select ${formData.type === 'Error' ? '(Error Qty)' : formData.type === 'SMS' ? '(SMS Qty)' : ''}`}
                />
                <Input
                  label={`Left Eye ORIGINAL Quantity * ${formData.type === 'Error' ? '(Error Qty)' : formData.type === 'SMS' ? '(SMS Qty)' : ''}`}
                  type="number"
                  value={formData.leftQty || 0}
                  onChange={(e) => {
                    const valueNum = parseFloat(e.target.value) || 0;
                    updateField('leftQty', valueNum);
                    // updateField automatically calculates originalQty from rightQty + leftQty
                  }}
                  error={errors.leftQty}
                  min="0"
                  step="0.5"
                  className="border-green-300 focus:border-green-500"
                  placeholder="0.5, 1, 1.5, 2..."
                />
                <div className="text-sm text-green-600 dark:text-green-400">
                  <strong>🔄 Auto-calculation:</strong> Right original + Left original = Total original quantity
                  <br />
                  {formData.type === 'Error'
                    ? 'Original error pieces for left eye'
                    : formData.type === 'SMS'
                    ? 'Original SMS pieces for left eye'
                    : 'Original stock pieces for left eye (0.5 increments)'
                  }
                </div>
              </div>
            </div>

            {/* Total Quantity Display - READ-ONLY for Flattop lenses */}
            <div className={`p-4 rounded-lg border-2 ${
              formData.type === 'Error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                : formData.type === 'SMS'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                : formData.type === 'Yangon Order'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                : 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formData.type === 'Error' ? 'Total ORIGINAL Error Quantity:' :
                      formData.type === 'SMS' ? 'Total ORIGINAL SMS Quantity:' :
                      formData.type === 'Yangon Order' ? 'Total ORIGINAL Yangon Order Quantity:' : 'Total ORIGINAL Quantity:'}
                  </span>
                  <span className="text-xs bg-purple-200 dark:bg-purple-600 text-purple-600 dark:text-purple-300 px-2 py-1 rounded-full">
                    🔒 AUTO-CALCULATED
                  </span>
                </div>
                <span className={`text-xl font-bold ${
                  formData.type === 'Error'
                    ? 'text-red-600 dark:text-red-400'
                    : formData.type === 'SMS'
                    ? 'text-blue-600 dark:text-blue-400'
                    : formData.type === 'Yangon Order'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-purple-600 dark:text-purple-400'
                }`}>
                  {roundToHalf((formData.rightQty || 0) + (formData.leftQty || 0))} pieces
                </span>
              </div>
              <div className="mt-3 flex items-center justify-center gap-4 text-sm font-medium">
                <span className="text-blue-600 dark:text-blue-400">Right: {formData.rightQty || 0}</span>
                <span className="text-gray-400">+</span>
                <span className="text-green-600 dark:text-green-400">Left: {formData.leftQty || 0}</span>
                <span className="text-gray-400">=</span>
                <span className={`${
                  formData.type === 'Error'
                    ? 'text-red-600 dark:text-red-400'
                    : formData.type === 'SMS'
                    ? 'text-blue-600 dark:text-blue-400'
                    : formData.type === 'Yangon Order'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-purple-600 dark:text-purple-400'
                }`}>Total: {roundToHalf((formData.rightQty || 0) + (formData.leftQty || 0))}</span>
              </div>
              <div className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400">
                <span className="flex items-center justify-center gap-1">
                  🔒 <strong>Auto-calculated ORIGINAL quantity:</strong> Right original + Left original = Total original quantity (READ-ONLY)
                </span>
              </div>
              <div className="mt-2 text-xs text-center text-blue-600 dark:text-blue-400">
                <span>
                  💡 <strong>Note:</strong> This represents your original stock allocation. Remaining quantities (for sales tracking) are managed separately.
                </span>
              </div>
              {errors.qty && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.qty}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* For existing lenses (editing), show Total Qty and Remaining Qty with increment/decrement */}
            {initialData ? (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                      Inventory Management - Edit Mode
                      {shouldShowBifocalQuantities() && (
                        <span className="text-sm font-normal text-purple-600 dark:text-purple-300 ml-2">
                          (Left/Right Quantities)
                        </span>
                      )}
                    </h4>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    {isAdmin ? (
                      <>
                        • <strong>Total Qty</strong> = Original stock allocation (constant) - as admin, you can unlock to modify<br/>
                        • <strong>{shouldShowBifocalQuantities() ? 'Left/Right Available Qty' : 'Remaining Qty'}</strong> = Current available stock - independent of Total Qty<br/>
                        • <strong>{shouldShowBifocalQuantities() ? 'Left/Right Restock Qty' : 'Restock Qty'}</strong> = Additional stock added - increases Available stock without affecting Total Qty<br/>
                        • Use increment/decrement buttons for precise inventory management
                      </>
                    ) : (
                      <>
                        • <strong>Total Qty</strong> = Original stock allocation (read-only for non-admin users)<br/>
                        • <strong>{shouldShowBifocalQuantities() ? 'Left/Right Available Qty' : 'Remaining Qty'}</strong> = Current available stock - can be adjusted for sales/restocking<br/>
                        • <strong>Restock</strong> = Add new stock without changing original Total Qty allocation<br/>
                        • Perfect for managing daily inventory operations
                      </>
                    )}
                  </p>
                </div>

                {shouldShowBifocalQuantities() ? (
                  /* FLATTOP/BIFOCAL LENSES - Left/Right Quantities */
                  <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                        <AlertCircle size={16} />
                        <span><strong>Flattop/Bifocal Inventory:</strong> Left and Right quantities managed separately with independent restock capabilities</span>
                      </div>
                    </div>

                    {/* Left/Right Inventory Management */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* RIGHT EYE MANAGEMENT */}
                      <div className="space-y-4">
                        <h5 className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                          👁️ Right Eye Inventory
                        </h5>
                        <div className="grid grid-cols-1 gap-4">
                          {/* Right Total Qty - READ-ONLY for flattop lenses */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              Right Total Qty (Auto-calculated)
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full">
                                🔒 READ-ONLY
                              </span>
                            </label>
                            <div className="p-3 rounded-lg border-2 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600">
                              <div className="text-center font-bold text-lg text-blue-600 dark:text-blue-400">
                                {formData.originalRightQty || 0} pieces
                              </div>
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                              🔄 <strong>Auto-calculated:</strong> Set automatically when right quantity is entered
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              Sold: {formData.rightSoldQty || 0} pieces
                            </div>
                          </div>

                          {/* Right Restock Qty */}
                          <IncrementDecrementField
                            value={formData.restockedRightQty || 0}
                            onChange={(value) => {
                              const currentRightQty = formData.rightQty || 0;
                              const currentRestockedRight = formData.restockedRightQty || 0;
                              const difference = value - currentRestockedRight;
                              
                              updateField('restockedRightQty', value);
                              const newRightQty = Math.max(0, currentRightQty + difference);
                              updateField('rightQty', newRightQty);
                              updateField('restockedQty', (formData.restockedLeftQty || 0) + value);
                              updateField('qty', (formData.leftQty || 0) + newRightQty);
                              
                              // Update sold quantity when restocking
                              const totalRight = (formData.originalRightQty || 0) + value;
                              const soldRight = Math.max(0, totalRight - newRightQty);
                              updateField('rightSoldQty', soldRight);
                            }}
                            label="Right Restock Qty"
                            min={0}
                            helpText={`Additional right eye stock. Restocked: ${formData.restockedRightQty || 0} pcs (increases remaining qty)`}
                            variant="remaining"
                          />

                          {/* Right Available Qty */}
                          <IncrementDecrementField
                            value={formData.rightQty || 0}
                            onChange={(value) => {
                              updateField('rightQty', value);
                              updateField('qty', value + (formData.leftQty || 0));
                            }}
                            label="Right Available Qty"
                            min={0}
                            helpText={`Right eye available stock. Current: ${formData.rightQty || 0} pcs`}
                            variant="remaining"
                          />
                        </div>
                      </div>

                      {/* LEFT EYE MANAGEMENT */}
                      <div className="space-y-4">
                        <h5 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                          👁️ Left Eye Inventory
                        </h5>
                        <div className="grid grid-cols-1 gap-4">
                          {/* Left Total Qty - READ-ONLY for flattop lenses */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              Left Total Qty (Auto-calculated)
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 px-2 py-1 rounded-full">
                                🔒 READ-ONLY
                              </span>
                            </label>
                            <div className="p-3 rounded-lg border-2 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600">
                              <div className="text-center font-bold text-lg text-green-600 dark:text-green-400">
                                {formData.originalLeftQty || 0} pieces
                              </div>
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 text-center">
                              🔄 <strong>Auto-calculated:</strong> Set automatically when left quantity is entered
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              Sold: {formData.leftSoldQty || 0} pieces
                            </div>
                          </div>

                          {/* Left Restock Qty */}
                          <IncrementDecrementField
                            value={formData.restockedLeftQty || 0}
                            onChange={(value) => {
                              const currentLeftQty = formData.leftQty || 0;
                              const currentRestockedLeft = formData.restockedLeftQty || 0;
                              const difference = value - currentRestockedLeft;
                              
                              updateField('restockedLeftQty', value);
                              updateField('leftQty', Math.max(0, currentLeftQty + difference));
                              updateField('restockedQty', (formData.restockedRightQty || 0) + value);
                              updateField('qty', (formData.rightQty || 0) + Math.max(0, currentLeftQty + difference));
                            }}
                            label="Left Restock Qty"
                            min={0}
                            helpText={`Additional left eye stock. Added: ${formData.restockedLeftQty || 0} pcs`}
                            variant="remaining"
                          />

                          {/* Left Available Qty */}
                          <IncrementDecrementField
                            value={formData.leftQty || 0}
                            onChange={(value) => {
                              updateField('leftQty', value);
                              updateField('qty', (formData.rightQty || 0) + value);
                              
                              // Calculate sold quantity: Total + Restocked - Available  
                              const totalLeft = (formData.originalLeftQty || 0) + (formData.restockedLeftQty || 0);
                              const soldLeft = Math.max(0, totalLeft - value);
                              updateField('leftSoldQty', soldLeft);
                            }}
                            label="Left Remaining Qty"
                            min={0}
                            helpText={`Left eye remaining stock. Available: ${formData.leftQty || 0} pcs | Sold: ${Math.max(0, ((formData.originalLeftQty || 0) + (formData.restockedLeftQty || 0)) - (formData.leftQty || 0))} pcs`}
                            variant="remaining"
                          />
                        </div>
                      </div>
                    </div>

                    {/* FLATTOP/BIFOCAL POS Summary */}
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-600">
                      <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-3 flex items-center gap-2">
                        📊 Flattop/Bifocal POS Summary
                      </h5>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        {/* Right Eye Summary */}
                        <div className="col-span-2 lg:col-span-4 mb-2">
                          <h6 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">👁️ Right Eye</h6>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                              <div className="font-bold text-blue-600 dark:text-blue-400">{formData.originalRightQty || 0}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                              <div className="font-bold text-purple-600 dark:text-purple-400">{formData.restockedRightQty || 0}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Restocked</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                              <div className="font-bold text-orange-600 dark:text-orange-400">{formData.rightSoldQty || 0}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Sold</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                              <div className="font-bold text-green-600 dark:text-green-400">{formData.rightQty || 0}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Remaining</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Left Eye Summary */}
                        <div className="col-span-2 lg:col-span-4">
                          <h6 className="font-semibold text-green-600 dark:text-green-400 mb-2">👁️ Left Eye</h6>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                              <div className="font-bold text-blue-600 dark:text-blue-400">{formData.originalLeftQty || 0}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                              <div className="font-bold text-purple-600 dark:text-purple-400">{formData.restockedLeftQty || 0}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Restocked</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                              <div className="font-bold text-orange-600 dark:text-orange-400">{formData.leftSoldQty || 0}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Sold</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm">
                              <div className="font-bold text-green-600 dark:text-green-400">{formData.leftQty || 0}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Aviblable</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Combined Totals */}
                        <div className="col-span-2 lg:col-span-4 mt-3 pt-3 border-t border-purple-200 dark:border-purple-600">
                          <h6 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">📊 Combined Totals</h6>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm border-2 border-blue-200 dark:border-blue-600">
                              <div className="font-bold text-blue-600 dark:text-blue-400">{(formData.originalRightQty || 0) + (formData.originalLeftQty || 0)}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Total Original</div>
                              <div className="text-xs text-blue-500 dark:text-blue-300">🔄 Auto-calc</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm border-2 border-purple-200 dark:border-purple-600">
                              <div className="font-bold text-purple-600 dark:text-purple-400">{(formData.restockedRightQty || 0) + (formData.restockedLeftQty || 0)}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Restocked</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm border-2 border-orange-200 dark:border-orange-600">
                              <div className="font-bold text-orange-600 dark:text-orange-400">{(formData.rightSoldQty || 0) + (formData.leftSoldQty || 0)}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Sold</div>
                            </div>
                            <div className="text-center p-2 bg-white dark:bg-gray-600 rounded shadow-sm border-2 border-green-200 dark:border-green-600">
                              <div className="font-bold text-green-600 dark:text-green-400">{(formData.rightQty || 0) + (formData.leftQty || 0)}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Remaining</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-purple-600 dark:text-purple-400 text-center">
                        💡 <strong>Flattop Auto-calculation Logic:</strong> Total Original = Right Original + Left Original (READ-ONLY) | Total Current = Right Current + Left Current (READ-ONLY) | Only individual Right/Left quantities can be modified
                      </div>
                    </div>
                  </div>
                ) : (
                  /* REGULAR LENSES - Single Quantity */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Quantity Field - Admin can edit with lock/unlock, others read-only */}
                    {isAdmin ? (
                      /* Admin users get lock/unlock functionality */
                      <IncrementDecrementField
                        value={formData.originalQty || 0}
                        onChange={(value) => {
                          // Only allow changes when unlocked - Total Qty is original stock allocation
                          if (!isTotalQtyLocked) {
                            updateField('originalQty', value);
                            // Don't automatically change remaining qty when changing original allocation
                          }
                        }}
                        label="Total Qty (Original Stock) - ADMIN"
                        min={0}
                        helpText={`Original stock allocation. Sold: ${formData.soldQty || 0} pcs. As admin, you can unlock to edit.`}
                        variant="total"
                        isLocked={isTotalQtyLocked}
                        onToggleLock={() => setIsTotalQtyLocked(!isTotalQtyLocked)}
                        showLockButton={true}
                      />
                    ) : (
                      /* Non-admin users get completely read-only Total Qty */
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Total Qty (Original Stock)
                        </label>
                        <div className="p-3 rounded-lg border-2 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                          <div className="text-center font-bold text-lg text-gray-600 dark:text-gray-400">
                            {formData.originalQty || 0} pieces
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          📖 Original stock allocation (constant). Only admins can modify.
                        </div>
                      </div>
                    )}

                    {/* Restock Quantity Field - For adding new stock */}
                    <IncrementDecrementField
                      value={formData.restockedQty || 0}
                      onChange={(value) => {
                        // When restock qty changes, add to remaining qty
                        const currentRemaining = formData.qty || 0;
                        const currentRestocked = formData.restockedQty || 0;
                        const difference = value - currentRestocked;
                        
                        updateField('restockedQty', value);
                        updateField('qty', Math.max(0, currentRemaining + difference));
                      }}
                      label="Restock Qty (Additional Stock)"
                      min={0}
                      helpText={`Additional stock added. Increases Remaining Qty without changing Total Qty. Added: ${formData.restockedQty || 0} pcs`}
                      variant="remaining"
                    />

                    {/* Remaining Quantity Field - Current available stock */}
                    <IncrementDecrementField
                      value={formData.qty || 0}
                      onChange={(value) => {
                        // Remaining qty is independent - can be adjusted for sales or restocking
                        updateField('qty', value);
                      }}
                      label="Remaining Qty (Available Stock)"
                      min={0}
                      helpText={`Current available stock for sale. Independent of Total Qty. Available: ${formData.qty || 0} pcs`}
                      variant="remaining"
                    />
                  </div>
                )}

                {/* Regular POS Inventory Summary - only for non-bifocal lenses */}
                {!shouldShowBifocalQuantities() && (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                      📊 POS Inventory Summary
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                        <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">{formData.originalQty || 0}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Total Qty</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">Original Stock</div>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                        <div className="font-bold text-purple-600 dark:text-purple-400 text-lg">{formData.restockedQty || 0}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Restocked</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">Additional Stock</div>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                        <div className="font-bold text-orange-600 dark:text-orange-400 text-lg">{formData.soldQty || 0}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Sold Qty</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">Total Sold</div>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                        <div className="font-bold text-green-600 dark:text-green-400 text-lg">{formData.qty || 0}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">Available</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">For Sale</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 text-center">
                      💡 <strong>POS Logic:</strong> Total Qty = Original Stock (constant) | Restocking increases Available Stock | Selling increases Sold Qty
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* For new lenses (adding), show regular quantity input */
              <div className="space-y-3">
                <QuickQuantityButtons
                  value={formData.qty}
                  onChange={(value) => {
                    updateField('qty', value);
                    updateField('originalQty', value);
                  }}
                  label={`Quick Quantity Select ${formData.type === 'Error' ? '(Error Qty)' : formData.type === 'SMS' ? '(SMS Qty)' : ''}`}
                />
                <Input
                  label={`Quantity * ${formData.type === 'Error' ? '(Error Qty)' : formData.type === 'SMS' ? '(SMS Qty)' : ''}`}
                  type="number"
                  value={formData.qty}
                  onChange={(e) => {
                    const valueNum = parseFloat(e.target.value) || 0;
                    updateField('qty', valueNum);
                    updateField('originalQty', valueNum);
                  }}
                  error={errors.qty}
                  min="0"
                  step="0.5"
                  placeholder="0.5, 1, 1.5, 2..."
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.type === 'Error'
                    ? 'Error quantity in 0.5 increments (will deduct from inventory)'
                    : formData.type === 'SMS'
                    ? 'SMS quantity in 0.5 increments (will deduct from inventory)'
                    : 'Enter quantity in 0.5 increments (0.5, 1, 1.5, 2, etc.)'
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prescription Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Prescription Information
          {(formData.type === 'Error' || formData.type === 'SMS') && (
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
              (Used to match with inventory)
            </span>
          )}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="SPH"
            value={formData.sph || ''}
            onChange={(e) => updateField('sph', e.target.value)}
            placeholder="Sphere power"
          />
          
          {(formData.type === 'Bifocal' || 
            (formData.type === 'Error' && formData.bifocalType) ||
            (formData.type === 'SMS' && formData.smsBifocalType) ||
            (formData.type === 'Yangon Order' && (formData.yangonOrderSubType === 'Bifocal' || formData.yangonOrderSubType === 'Multifocal'))) ? (
            <Input
              label="Addition"
              value={formData.addition || ''}
              onChange={(e) => updateField('addition', e.target.value)}
              placeholder="Addition power"
            />
          ) : (
            <>
              <Input
                label="CYL"
                value={formData.cyl || ''}
                onChange={(e) => updateField('cyl', e.target.value)}
                placeholder="Cylinder power"
              />
              <Input
                label="Axis"
                value={formData.axis || ''}
                onChange={(e) => updateField('axis', e.target.value)}
                placeholder="Axis degree"
              />
            </>
          )}
        </div>

        {(formData.type === 'Bifocal' || 
          (formData.type === 'Error' && formData.bifocalType) ||
          (formData.type === 'SMS' && formData.smsBifocalType) ||
          (formData.type === 'Yangon Order' && (formData.yangonOrderSubType === 'Bifocal' || formData.yangonOrderSubType === 'Multifocal'))) && (
          <div className="space-y-4">
            {/* Same Power Toggle - Show for all Multifocal and Flattop types */}
            {(shouldShowBifocalQuantities() || 
              (formData.type === 'Bifocal' && formData.bifocalType === 'Multifocal') ||
              (formData.type === 'Error' && formData.bifocalType === 'Multifocal') ||
              (formData.type === 'SMS' && formData.smsBifocalType === 'Multifocal') ||
              (formData.type === 'Yangon Order' && formData.yangonOrderSubType === 'Multifocal')) && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateField('samePowerBothEyes', !formData.samePowerBothEyes)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {formData.samePowerBothEyes ? (
                    <ToggleRight className="h-5 w-5 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                  Both eyes have same power
                </button>
                {formData.samePowerBothEyes && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                    Right eye values will auto-sync with left eye
                  </span>
                )}
              </div>
            )}

            {/* Always show detailed measurement fields for ALL Multifocal and BB Flattop lenses */}
            {(shouldShowBifocalQuantities() || 
              (formData.type === 'Bifocal' && formData.bifocalType === 'Multifocal') ||
              (formData.type === 'Error' && formData.bifocalType === 'Multifocal') ||
              (formData.type === 'SMS' && formData.smsBifocalType === 'Multifocal') ||
              (formData.type === 'Yangon Order' && formData.yangonOrderSubType === 'Multifocal')) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200">Detailed Eye Measurements</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Eye Measurements */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">L</span>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Left Eye</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">S</span>
                        </div>
                        <Input
                          label="SPH (Sphere)"
                          value={formData.Left || ''}
                          onChange={(e) => {
                            updateField('Left', e.target.value);
                            if (formData.samePowerBothEyes) {
                              updateField('Right', e.target.value);
                            }
                          }}
                          placeholder="e.g., -2.00, +1.50"
                          className="flex-1"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                          <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">C</span>
                        </div>
                        <Input
                          label="CYL (Cylinder)"
                          value={formData.leftCyl || ''}
                          onChange={(e) => {
                            updateField('leftCyl', e.target.value);
                            if (formData.samePowerBothEyes) {
                              updateField('rightCyl', e.target.value);
                            }
                          }}
                          placeholder="e.g., -0.75, -1.25"
                          className="flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-md flex items-center justify-center">
                          <span className="text-orange-600 dark:text-orange-400 text-xs font-semibold">A</span>
                        </div>
                        <Input
                          label="AXIS (Degrees)"
                          value={formData.leftAxis || ''}
                          onChange={(e) => {
                            updateField('leftAxis', e.target.value);
                            if (formData.samePowerBothEyes) {
                              updateField('rightAxis', e.target.value);
                            }
                          }}
                          placeholder="e.g., 180, 90, 45"
                          className="flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                          <span className="text-red-600 dark:text-red-400 text-xs font-semibold">+</span>
                        </div>
                        <Input
                          label="ADD (Addition)"
                          value={formData.leftAddition || ''}
                          onChange={(e) => {
                            updateField('leftAddition', e.target.value);
                            if (formData.samePowerBothEyes) {
                              updateField('rightAddition', e.target.value);
                            }
                          }}
                          placeholder="e.g., +1.00, +2.50"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Eye Measurements */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">R</span>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Right Eye</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">S</span>
                        </div>
                        <Input
                          label="SPH (Sphere)"
                          value={formData.samePowerBothEyes ? (formData.Left || '') : (formData.Right || '')}
                          onChange={(e) => updateField('Right', e.target.value)}
                          placeholder="e.g., -2.00, +1.50"
                          disabled={formData.samePowerBothEyes}
                          className={`flex-1 ${formData.samePowerBothEyes ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                          <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">C</span>
                        </div>
                        <Input
                          label="CYL (Cylinder)"
                          value={formData.samePowerBothEyes ? (formData.leftCyl || '') : (formData.rightCyl || '')}
                          onChange={(e) => updateField('rightCyl', e.target.value)}
                          placeholder="e.g., -0.75, -1.25"
                          disabled={formData.samePowerBothEyes}
                          className={`flex-1 ${formData.samePowerBothEyes ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-md flex items-center justify-center">
                          <span className="text-orange-600 dark:text-orange-400 text-xs font-semibold">A</span>
                        </div>
                        <Input
                          label="AXIS (Degrees)"
                          value={formData.samePowerBothEyes ? (formData.leftAxis || '') : (formData.rightAxis || '')}
                          onChange={(e) => updateField('rightAxis', e.target.value)}
                          placeholder="e.g., 180, 90, 45"
                          disabled={formData.samePowerBothEyes}
                          className={`flex-1 ${formData.samePowerBothEyes ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                          <span className="text-red-600 dark:text-red-400 text-xs font-semibold">+</span>
                        </div>
                        <Input
                          label="ADD (Addition)"
                          value={formData.samePowerBothEyes ? (formData.leftAddition || '') : (formData.rightAddition || '')}
                          onChange={(e) => updateField('rightAddition', e.target.value)}
                          placeholder="e.g., +1.00, +2.50"
                          disabled={formData.samePowerBothEyes}
                          className={`flex-1 ${formData.samePowerBothEyes ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Measurement Guide */}
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-900 text-xs font-bold">ℹ</span>
                    </div>
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium mb-2">Measurement Guide:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-blue-100 rounded text-blue-600 text-center text-xs font-semibold">S</span>
                          <span>SPH: Sphere power for nearsighted (-) or farsighted (+)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-purple-100 rounded text-purple-600 text-center text-xs font-semibold">C</span>
                          <span>CYL: Cylinder power for astigmatism correction</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-orange-100 rounded text-orange-600 text-center text-xs font-semibold">A</span>
                          <span>AXIS: Direction of astigmatism (0-180 degrees)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 bg-red-100 rounded text-red-600 text-center text-xs font-semibold">+</span>
                          <span>ADD: Additional power for reading (bifocal/multifocal)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Price */}
      <Input
        label="Price (MMK) *"
        type="number"
        value={formData.price}
        onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
        error={errors.price}
        min="0"
        step="100"
      />

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="submit"
          variant={formData.type === 'Error' ? 'danger' : formData.type === 'SMS' ? 'primary' : 'primary'}
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Lens' : 
           formData.type === 'Error' ? 'Create Error Lens' : 
           formData.type === 'SMS' ? 'Create SMS Lens' : 
           formData.type === 'Yangon Order' ? 'Create Yangon Order' : 'Add Lens'}
        </Button>
      </div>
    </form>
  );
};

export default LensForm;