import { useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import { StockItem } from '../../src/lib/stockults';

export const useStock = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStock = async () => {
    try {
      setLoading(true);
      setError(null);
      const querySnapshot = await getDocs(collection(db, 'lensStock'));
      const items: StockItem[] = [];
      
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as StockItem);
      });
      
      setStockItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock');
      console.error('Error fetching stock:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for stock changes
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'lensStock'),
      (snapshot) => {
        const items: StockItem[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as StockItem);
        });
        setStockItems(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        console.error('Error in stock listener:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshStock = () => {
    fetchStock();
  };

  return {
    stockItems,
    loading,
    error,
    refreshStock
  };
};