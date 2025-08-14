import { useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Custom hook for real-time inventory synchronization
 * Ensures all components stay in sync with inventory changes
 */
export const useInventorySync = (onInventoryUpdate?: () => void) => {
  const syncInventory = useCallback(() => {
    console.log('🔄 Inventory sync triggered');
    if (onInventoryUpdate) {
      onInventoryUpdate();
    }
  }, [onInventoryUpdate]);

  useEffect(() => {
    console.log('📡 Setting up inventory sync listener');
    
    // Listen to lens inventory changes
    const lensQuery = query(
      collection(db, 'lenses'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      lensQuery,
      (snapshot) => {
        if (!snapshot.metadata.hasPendingWrites && !snapshot.metadata.fromCache) {
          console.log('📊 Inventory data updated from server');
          syncInventory();
        }
      },
      (error) => {
        console.error('❌ Error in inventory sync:', error);
      }
    );

    return () => {
      console.log('🔌 Cleaning up inventory sync listener');
      unsubscribe();
    };
  }, [syncInventory]);

  return { syncInventory };
};