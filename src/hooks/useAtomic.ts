// React hook for atomic inventory operations
import { useState, useCallback } from 'react';
import { 
  createVOCWithAtomicInventoryUpdate,
  deleteVOCWithAtomicInventoryRestore,
  validateInventoryBeforeVOC,
  VocItem,
  InventoryUpdateResult
} from '../utils/AtomicInventoryManager';
import toast from 'react-hot-toast';

export interface UseAtomicInventoryReturn {
  isProcessing: boolean;
  createVOC: (vocData: any, items: VocItem[]) => Promise<InventoryUpdateResult>;
  deleteVOC: (vocId: string, items: VocItem[]) => Promise<InventoryUpdateResult>;
  validateInventory: (items: VocItem[]) => Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>;
}

export function useAtomicInventory(): UseAtomicInventoryReturn {
  const [isProcessing, setIsProcessing] = useState(false);

  const createVOC = useCallback(async (vocData: any, items: VocItem[]): Promise<InventoryUpdateResult> => {
    setIsProcessing(true);
    
    try {
      console.log('🚀 Starting VOC creation with atomic inventory management');
      
      // Step 1: Validate inventory before proceeding
      const validation = await validateInventoryBeforeVOC(items);
      
      if (!validation.isValid) {
        toast.error(`Inventory validation failed:\n${validation.errors.join('\n')}`, {
          duration: 6000
        });
        return {
          success: false,
          message: 'Inventory validation failed',
          updatedItems: [],
          errors: validation.errors
        };
      }
      
      // Show warnings if any
      if (validation.warnings.length > 0) {
        toast.warning(`Inventory warnings:\n${validation.warnings.join('\n')}`, {
          duration: 4000
        });
      }
      
      // Step 2: Create VOC with atomic inventory updates
      const result = await createVOCWithAtomicInventoryUpdate(vocData, items);
      
      if (result.success) {
        toast.success(`✅ VOC created successfully!\n📦 Updated ${result.updatedItems.length} items`, {
          duration: 4000
        });
      } else {
        toast.error(`❌ VOC creation failed: ${result.message}`, {
          duration: 6000
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in VOC creation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.error(`❌ VOC creation failed: ${errorMessage}`, {
        duration: 6000
      });
      
      return {
        success: false,
        message: errorMessage,
        updatedItems: [],
        errors: [errorMessage]
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const deleteVOC = useCallback(async (vocId: string, items: VocItem[]): Promise<InventoryUpdateResult> => {
    setIsProcessing(true);
    
    try {
      console.log('🗑️ Starting VOC deletion with atomic inventory restoration');
      
      const result = await deleteVOCWithAtomicInventoryRestore(vocId, items);
      
      if (result.success) {
        toast.success(`✅ VOC deleted successfully!\n📦 Restored ${result.updatedItems.length} items`, {
          duration: 4000
        });
      } else {
        toast.error(`❌ VOC deletion failed: ${result.message}`, {
          duration: 6000
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in VOC deletion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.error(`❌ VOC deletion failed: ${errorMessage}`, {
        duration: 6000
      });
      
      return {
        success: false,
        message: errorMessage,
        updatedItems: [],
        errors: [errorMessage]
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const validateInventory = useCallback(async (items: VocItem[]) => {
    return await validateInventoryBeforeVOC(items);
  }, []);

  return {
    isProcessing,
    createVOC,
    deleteVOC,
    validateInventory
  };
}