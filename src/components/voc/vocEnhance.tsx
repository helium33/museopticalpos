import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { VocItem } from '../../types/voc';
import { useInventoryValidation } from '../../hooks/useInventoryValidation';
import InventoryValidationModal from '../';
import Button from '../ui/Button';
import { AlertTriangle, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface EnhancedVocFormProps {
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

const EnhancedVocForm: React.FC<EnhancedVocFormProps> = ({ onSubmit, loading = false }) => {
  const [selectedItems, setSelectedItems] = useState<VocItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    validationResult,
    isValidating,
    showValidationModal,
    validateInventory,
    retryValidation,
    continueWithValidation,
    cancelValidation,
    autoFixItems,
    resetValidation
  } = useInventoryValidation();

  const form = useForm({
    defaultValues: {
      vocNumber: '',
      customerName: '',
      items: [],
      
    }
  });

  const handleFormSubmit = useCallback(async (data: any) => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Step 1: Validate inventory
      console.log('🔍 Starting inventory validation...');
      const validationResult = await validateInventory(selectedItems);
      
      if (!validationResult.isValid) {
        console.warn('❌ Inventory validation failed, waiting for user decision...');
        // Modal is shown automatically by the hook
        return;
      }

      // Step 2: Proceed with VOC creation
      console.log('✅ Inventory validation passed, creating VOC...');
      await proceedWithVocCreation(data);
      
    } catch (error) {
      console.error('❌ Error in form submission:', error);
      toast.error(`Form submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedItems, validateInventory, onSubmit]);

  const proceedWithVocCreation = useCallback(async (data: any) => {
    try {
      const vocData = {
        ...data,
        items: selectedItems
      };
      
      await onSubmit(vocData);
      
      // Reset form and validation on success
      form.reset();
      setSelectedItems([]);
      resetValidation();
      
      toast.success('VOC created successfully!');
      
    } catch (error) {
      console.error('❌ VOC creation failed:', error);
      toast.error(`VOC creation failed: ${error.message}`);
    }
  }, [selectedItems, onSubmit, form, resetValidation]);

  const handleContinueAnyway = useCallback(async () => {
    const result = continueWithValidation();
    
    if (result) {
      // Auto-fix items if needed
      const fixedItems = autoFixItems(selectedItems);
      setSelectedItems(fixedItems);
      
      // Proceed with VOC creation
      const formData = form.getValues();
      await proceedWithVocCreation(formData);
    }
  }, [continueWithValidation, autoFixItems, selectedItems, form, proceedWithVocCreation]);

  const handleRetryValidation = useCallback(async () => {
    try {
      await retryValidation(selectedItems);
    } catch (error) {
      toast.error('Retry failed');
    }
  }, [retryValidation, selectedItems]);

  const handleCancelValidation = useCallback(() => {
    cancelValidation();
  }, [cancelValidation]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Create VOC with Enhanced Validation
        </h2>

        {/* Validation Status Display */}
        {validationResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            validationResult.isValid 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {validationResult.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${
                validationResult.isValid 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {validationResult.isValid 
                  ? 'All items validated successfully' 
                  : `Validation failed for ${validationResult.errors.length} items`
                }
              </span>
            </div>
            
            {validationResult.warnings.length > 0 && (
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                {validationResult.warnings.length} warnings found
              </div>
            )}
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic VOC Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                VOC Number
              </label>
              <input
                {...form.register('vocNumber', { required: 'VOC number is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter VOC number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Name
              </label>
              <input
                {...form.register('customerName', { required: 'Customer name is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter customer name"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                Selected Items ({selectedItems.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => validateInventory(selectedItems)}
                disabled={selectedItems.length === 0 || isValidating}
                className="flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                {isValidating ? 'Validating...' : 'Validate Inventory'}
              </Button>
            </div>

            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No items selected. Add items to continue.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                        {item.isFOC && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            FOC
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Quantity: {item.quantity} | Type: {item.type}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItems = selectedItems.filter((_, i) => i !== index);
                        setSelectedItems(newItems);
                        resetValidation();
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setSelectedItems([]);
                resetValidation();
              }}
            >
              Reset Form
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || isValidating || selectedItems.length === 0}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Create VOC'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Validation Modal */}
      {showValidationModal && validationResult && (
        <InventoryValidationModal
          validationResult={validationResult}
          onContinue={handleContinueAnyway}
          onCancel={handleCancelValidation}
          onRetry={handleRetryValidation}
          loading={isValidating}
        />
      )}
    </div>
  );
};

export default EnhancedVocForm;