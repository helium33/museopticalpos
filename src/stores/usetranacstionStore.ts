import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  currentStore: string;
  setCurrentStore: (store: string) => void;
}

const useStoreStore = create<StoreState>()(
  persist(
    (set) => ({
      currentStore: 'win',
      setCurrentStore: (store) => set({ currentStore: store }),
    }),
    {
      name: 'store-storage',
    }
  )
);

export default useStoreStore;