import { useState, useEffect } from 'react';
import { VocData, getAllVocs, createVoc, deleteVoc } from '../lib/Voculits';
import { VocItem } from '../lib/stockults';

export const useVocs = () => {
  const [vocs, setVocs] = useState<VocData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVocs = async () => {
    try {
      setLoading(true);
      setError(null);
      const vocsData = await getAllVocs();
      setVocs(vocsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch VOCs');
      console.error('Error fetching VOCs:', err);
    } finally {
      setLoading(false);
    }
  };

  const addVoc = async (vocData: Omit<VocData, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      const vocId = await createVoc(vocData);
      
      // Immediately add the new VOC to local state
      const newVoc: VocData = {
        ...vocData,
        id: vocId,
        createdAt: new Date().toISOString()
      };
      
      setVocs(prevVocs => [newVoc, ...prevVocs]);
      return vocId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create VOC');
      throw err;
    }
  };

  const removeVoc = async (vocId: string, vocItems: VocItem[]) => {
    try {
      setError(null);
      await deleteVoc(vocId, vocItems);
      
      // Immediately remove from local state
      setVocs(prevVocs => prevVocs.filter(voc => voc.id !== vocId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete VOC');
      throw err;
    }
  };

  const refreshVocs = () => {
    fetchVocs();
  };

  useEffect(() => {
    fetchVocs();
  }, []);

  return {
    vocs,
    loading,
    error,
    addVoc,
    removeVoc,
    refreshVocs
  };
};