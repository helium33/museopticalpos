import { useState, useCallback } from 'react';
import { VOC, VocItem } from '../../types/voc';
import { calculateVocAmount, returnItemsToInventory } from '../lib/InventoryCalculation';

export const useVocManagement = () => {
  const [vocs, setVocs] = useState<VOC[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create VOC with error handling and 50% discount
  const createVoc = useCallback(async (vocData: Omit<VOC, 'id' | 'totalAmount' | 'originalAmount'>) => {
    setLoading(true);
    setError(null);

    try {
      // Calculate amounts with error discount
      const amountCalculation = calculateVocAmount(vocData.items, vocData.discount || 0);
      
      const newVoc: VOC = {
        ...vocData,
        id: `voc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        totalAmount: amountCalculation.totalAmount,
        originalAmount: amountCalculation.originalAmount,
        errorDiscount: amountCalculation.totalErrorDiscount,
        status: 'active'
      };

      setVocs(prev => [...prev, newVoc]);
      
      // Here you would typically save to database
      // await saveVocToDatabase(newVoc);
      
      return newVoc;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create VOC');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Return VOC to inventory
  const returnVocToInventory = useCallback(async (vocId: string) => {
    setLoading(true);
    setError(null);

    try {
      const voc = vocs.find(v => v.id === vocId);
      if (!voc) {
        throw new Error('VOC not found');
      }

      // Calculate items to return to inventory
      const returnData = returnItemsToInventory(voc.items);
      
      // Update VOC status
      setVocs(prev => prev.map(v => 
        v.id === vocId 
          ? { ...v, status: 'returned' as const }
          : v
      ));

      // Here you would typically:
      // 1. Update inventory quantities
      // 2. Update VOC status in database
      // 3. Log the return transaction
      
      console.log('Returning to inventory:', {
        vocNumber: voc.vocNumber,
        soldItems: returnData.soldItemsToReturn,
        errorItems: returnData.errorItemsToReturn,
        totalSoldQuantity: returnData.totalSoldQuantity,
        totalErrorQuantity: returnData.totalErrorQuantity
      });

      return returnData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return VOC to inventory');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [vocs]);

  // Delete VOC
  const deleteVoc = useCallback(async (vocId: string) => {
    setLoading(true);
    setError(null);

    try {
      setVocs(prev => prev.filter(v => v.id !== vocId));
      
      // Here you would typically delete from database
      // await deleteVocFromDatabase(vocId);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete VOC');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update VOC
  const updateVoc = useCallback(async (vocId: string, updates: Partial<VOC>) => {
    setLoading(true);
    setError(null);

    try {
      setVocs(prev => prev.map(v => {
        if (v.id === vocId) {
          const updatedVoc = { ...v, ...updates };
          
          // Recalculate amounts if items changed
          if (updates.items) {
            const amountCalculation = calculateVocAmount(updates.items, updates.discount || v.discount || 0);
            updatedVoc.totalAmount = amountCalculation.totalAmount;
            updatedVoc.originalAmount = amountCalculation.originalAmount;
            updatedVoc.errorDiscount = amountCalculation.totalErrorDiscount;
          }
          
          return updatedVoc;
        }
        return v;
      }));
      
      // Here you would typically update in database
      // await updateVocInDatabase(vocId, updates);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update VOC');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get VOC by ID
  const getVocById = useCallback((vocId: string) => {
    return vocs.find(v => v.id === vocId);
  }, [vocs]);

  // Get VOCs with errors
  const getVocsWithErrors = useCallback(() => {
    return vocs.filter(v => v.items.some(item => item.hasError));
  }, [vocs]);

  // Get VOC statistics
  const getVocStatistics = useCallback(() => {
    const totalVocs = vocs.length;
    const activeVocs = vocs.filter(v => v.status === 'active').length;
    const returnedVocs = vocs.filter(v => v.status === 'returned').length;
    const vocsWithErrors = getVocsWithErrors().length;
    
    const totalRevenue = vocs
      .filter(v => v.status === 'active')
      .reduce((sum, v) => sum + v.totalAmount, 0);
    
    const totalErrorDiscount = vocs
      .filter(v => v.status === 'active')
      .reduce((sum, v) => sum + (v.errorDiscount || 0), 0);

    return {
      totalVocs,
      activeVocs,
      returnedVocs,
      vocsWithErrors,
      totalRevenue,
      totalErrorDiscount,
      errorRate: totalVocs > 0 ? (vocsWithErrors / totalVocs) * 100 : 0
    };
  }, [vocs, getVocsWithErrors]);

  return {
    vocs,
    loading,
    error,
    createVoc,
    returnVocToInventory,
    deleteVoc,
    updateVoc,
    getVocById,
    getVocsWithErrors,
    getVocStatistics
  };
};