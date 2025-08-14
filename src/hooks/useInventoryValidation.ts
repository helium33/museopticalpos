import { useState, useCallback } from 'react';
import { validateVOCInventory, ValidationResult, autoFixInventoryIssues } from '../lib/InventoryValidation';
import { VocItem } from '../types/voc';
import toast from 'react-hot-toast';

export const useInventoryValidation = () => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const validateInventory = useCallback(async (items: VocItem[]): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      const result = await validateVOCInventory(items);
      setValidationResult(result);
      
      if (!result.isValid) {
        setShowValidationModal(true);
        toast.error(`Inventory validation failed for ${result.errors.length} items`);
      } else if (result.warnings.length > 0) {
        toast.warning(`Validation completed with ${result.warnings.length} warnings`);
      } else {
        toast.success('All items validated successfully');
      }
      
      return result;
    } catch (error) {
      console.error('Validation error:', error);
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [error.message || 'Unknown validation error'],
        warnings: [],
        itemResults: []
      };
      
      setValidationResult(errorResult);
      toast.error('Validation failed due to system error');
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const retryValidation = useCallback(async (items: VocItem[]): Promise<ValidationResult> => {
    toast.loading('Retrying validation...', { id: 'retry-validation' });
    
    try {
      const result = await validateInventory(items);
      toast.dismiss('retry-validation');
      
      if (result.isValid) {
        setShowValidationModal(false);
        toast.success('Validation successful on retry');
      } else {
        toast.error('Validation still failing - please check inventory');
      }
      
      return result;
    } catch (error) {
      toast.dismiss('retry-validation');
      toast.error('Retry failed');
      throw error;
    }
  }, [validateInventory]);

  const continueWithValidation = useCallback(() => {
    setShowValidationModal(false);
    toast.success('Continuing with current validation results');
    return validationResult;
  }, [validationResult]);

  const cancelValidation = useCallback(() => {
    setShowValidationModal(false);
    setValidationResult(null);
    toast.info('Validation cancelled');
  }, []);

  const autoFixItems = useCallback((items: VocItem[]): VocItem[] => {
    if (!validationResult) return items;
    
    const fixedItems = autoFixInventoryIssues(items, validationResult);
    const fixedCount = fixedItems.filter((item, index) => 
      item.isFOC !== items[index].isFOC || item.quantity !== items[index].quantity
    ).length;
    
    if (fixedCount > 0) {
      toast.success(`Auto-fixed ${fixedCount} items`);
    }
    
    return fixedItems;
  }, [validationResult]);

  const resetValidation = useCallback(() => {
    setValidationResult(null);
    setShowValidationModal(false);
    setIsValidating(false);
  }, []);

  return {
    validationResult,
    isValidating,
    showValidationModal,
    validateInventory,
    retryValidation,
    continueWithValidation,
    cancelValidation,
    autoFixItems,
    resetValidation
  };
};