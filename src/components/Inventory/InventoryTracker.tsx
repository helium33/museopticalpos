import React, { createContext, useContext, useState, useCallback } from 'react';

interface InventoryContextType {
  refreshInventory: () => void;
  lastUpdate: number;
  isUpdating: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventoryContext = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventoryContext must be used within an InventoryProvider');
  }
  return context;
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isUpdating, setIsUpdating] = useState(false);

  const refreshInventory = useCallback(() => {
    setIsUpdating(true);
    setLastUpdate(Date.now());
    
    // Reset updating state after a short delay
    setTimeout(() => {
      setIsUpdating(false);
    }, 1000);
  }, []);

  return (
    <InventoryContext.Provider value={{ refreshInventory, lastUpdate, isUpdating }}>
      {children}
    </InventoryContext.Provider>
  );
};