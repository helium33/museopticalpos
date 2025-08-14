import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, query, where, collection, getDocs, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { trackItemHistory } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Edit3, Save, X, AlertCircle, Eye, ArrowRightLeft, Search, List, Filter } from 'lucide-react';

interface LensEditModalProps {
  vocId: string;
  itemIndex: number;
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

const LensEditModal: React.FC<LensEditModalProps> = ({ vocId, itemIndex, item, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchingLens, setSearchingLens] = useState(false);
  const [availableLenses, setAvailableLenses] = useState<any[]>([]);
  const [allLenses, setAllLenses] = useState<any[]>([]);
  const [selectedLens, setSelectedLens] = useState<any>(null);
  const [showAllLenses, setShowAllLenses] = useState(false);
  const [specifications, setSpecifications] = useState({
    sph: item.details?.sph || '',
    cyl: item.details?.cyl || '',
    axis: item.details?.axis || '',
    addition: item.details?.addition || ''
  });

  // Helper function to check if a lens is bifocal
  const isBifocalLens = (item: any) => {
    return item.category && (
      item.category.toLowerCase().includes('fuse') || 
      item.category.toLowerCase().includes('flattop') ||
      item.category.toLowerCase().includes('bifocal')
    );
  };

  // Helper function to check if item is Yangon order
  const isYangonOrder = (item: any) => {
    return item.category === 'yangon order' || item.isYangonOrder;
  };

  // Load lenses from the same category only
  useEffect(() => {
    const loadCategoryLenses = async () => {
      try {
        if (!item.category || !item.store) {
          return;
        }

        const lensesRef = collection(db, 'lenses');
        const q = query(
          lensesRef, 
          where('store', '==', item.store),
          where('category', '==', item.category)
        );
        const querySnapshot = await getDocs(q);
        
        const lenses = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setAllLenses(lenses);
      } catch (error) {
        console.error('Error loading category lenses:', error);
      }
    };

    loadCategoryLenses();
  }, [item.store, item.category]);

  // Function to search for lenses by specifications
  const searchLensesBySpecifications = async (sph: string, cyl: string, axis: string, addition: string) => {
    try {
      setSearchingLens(true);
      
      if (isYangonOrder(item)) {
        setAvailableLenses([]);
        return [];
      }
      
      const exactMatches = allLenses.filter(lens => 
        lens.sph === sph &&
        lens.cyl === cyl &&
        lens.axis === axis &&
        (addition ? lens.addition === addition : !lens.addition) &&
        (lens.qty || 0) > 0
      );
      
      setAvailableLenses(exactMatches);
      
      if (exactMatches.length === 1) {
        setSelectedLens(exactMatches[0]);
        toast.success(`Found 1 matching lens: ${exactMatches[0].name}`);
      } else if (exactMatches.length > 1) {
        toast.success(`Found ${exactMatches.length} matching lenses`);
      } else {
        toast.error('No exact matches found. Showing available lenses from same category.');
        const categoryLenses = allLenses.filter(lens => (lens.qty || 0) > 0);
        setAvailableLenses(categoryLenses);
      }
      
      return exactMatches;
    } catch (error) {
      console.error('Error searching lenses:', error);
      toast.error('Error searching for lenses');
      return [];
    } finally {
      setSearchingLens(false);
    }
  };

  const showAllAvailableLenses = () => {
    if (isYangonOrder(item)) {
      toast.info('Yangon orders do not require lens selection');
      return;
    }
    
    const lensesWithStock = allLenses.filter(lens => (lens.qty || 0) > 0);
    setAvailableLenses(lensesWithStock);
    setShowAllLenses(true);
    toast.info(`Showing ${lensesWithStock.length} available lenses`);
  };

  const handleSearchSpecifications = async () => {
    if (!specifications.sph || !specifications.cyl || !specifications.axis) {
      toast.error('SPH, CYL, and AXIS are required');
      return;
    }

    setShowAllLenses(false);
    await searchLensesBySpecifications(
      specifications.sph,
      specifications.cyl,
      specifications.axis,
      specifications.addition
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!specifications.sph || !specifications.cyl || !specifications.axis) {
        toast.error('SPH, CYL, and AXIS are required');
        return;
      }

      const originalSpecs = item.details || {};
      const hasChanged = 
        specifications.sph !== (originalSpecs.sph || '') ||
        specifications.cyl !== (originalSpecs.cyl || '') ||
        specifications.axis !== (originalSpecs.axis || '') ||
        specifications.addition !== (originalSpecs.addition || '');

      if (!hasChanged) {
        toast.info('No changes made');
        onClose();
        return;
      }

      if (isYangonOrder(item)) {
        const vocRef = doc(db, 'vouchers', vocId);
        const vocDoc = await getDoc(vocRef);
        
        if (!vocDoc.exists()) {
          toast.error('VOC not found');
          return;
        }

        const vocData = vocDoc.data();
        const updatedItems = [...vocData.items];

        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          details: {
            ...updatedItems[itemIndex].details,
            sph: specifications.sph,
            cyl: specifications.cyl,
            axis: specifications.axis,
            addition: specifications.addition
          }
        };

        await updateDoc(vocRef, {
          items: updatedItems,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email ?? 'unknown'
        });

        await trackItemHistory({
          itemId: vocData.id,
          itemType: 'voc',
          itemName: vocData.vocNumber,
          itemCode: vocData.vocNumber,
          action: 'edit',
          changes: [{
            field: 'lens_specifications',
            oldValue: `SPH: ${originalSpecs.sph || '-'}, CYL: ${originalSpecs.cyl || '-'}, AXIS: ${originalSpecs.axis || '-'}, Addition: ${originalSpecs.addition || '-'}`,
            newValue: `SPH: ${specifications.sph}, CYL: ${specifications.cyl}, AXIS: ${specifications.axis}, Addition: ${specifications.addition || '-'}`
          }],
          store: item.store,
          staffEmail: user?.email || 'unknown',
          totalQty: item.quantity,
          notes: `Yangon order lens specs updated`
        });

        toast.success('Specifications updated');
        onSuccess();
        return;
      }

      if (!selectedLens) {
        toast.error('Please select a lens');
        return;
      }

      const requiredQty = item.quantity;
      if (isBifocalLens(item)) {
        const rightQty = item.details?.rightQty || 0;
        const leftQty = item.details?.leftQty || 0;
        
        if ((selectedLens.rightQty || 0) < rightQty || (selectedLens.leftQty || 0) < leftQty) {
          toast.error(`Insufficient stock. Available: Right ${selectedLens.rightQty || 0}, Left ${selectedLens.leftQty || 0}. Required: Right ${rightQty}, Left ${leftQty}`);
          return;
        }
      } else {
        if ((selectedLens.qty || 0) < requiredQty) {
          toast.error(`Insufficient stock. Available: ${selectedLens.qty || 0}, Required: ${requiredQty}`);
          return;
        }
      }

      const vocRef = doc(db, 'vouchers', vocId);
      const vocDoc = await getDoc(vocRef);
      
      if (!vocDoc.exists()) {
        toast.error('VOC not found');
        return;
      }

      const vocData = vocDoc.data();
      const updatedItems = [...vocData.items];

      // Return stock to original lens
      const originalLensRef = doc(db, 'lenses', item.id);
      
      try {
        if (isBifocalLens(item)) {
          const rightQty = item.details?.rightQty || 0;
          const leftQty = item.details?.leftQty || 0;
          
          await updateDoc(originalLensRef, {
            qty: increment(requiredQty),
            soldQty: increment(-requiredQty),
            rightQty: increment(rightQty),
            leftQty: increment(leftQty),
            rightSoldQty: increment(-rightQty),
            leftSoldQty: increment(-leftQty),
            updatedAt: serverTimestamp()
          });
        } else {
          await updateDoc(originalLensRef, {
            qty: increment(requiredQty),
            soldQty: increment(-requiredQty),
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
        console.error('Failed to return stock:', err);
        toast.error('Failed to return stock');
        setSaving(false);
        return;
      }

      // Reduce stock from new lens
      const newLensRef = doc(db, 'lenses', selectedLens.id);
      
      try {
        if (isBifocalLens(item)) {
          const rightQty = item.details?.rightQty || 0;
          const leftQty = item.details?.leftQty || 0;
          
          await updateDoc(newLensRef, {
            qty: increment(-requiredQty),
            soldQty: increment(requiredQty),
            rightQty: increment(-rightQty),
            leftQty: increment(-leftQty),
            rightSoldQty: increment(rightQty),
            leftSoldQty: increment(leftQty),
            updatedAt: serverTimestamp()
          });
        } else {
          await updateDoc(newLensRef, {
            qty: increment(-requiredQty),
            soldQty: increment(requiredQty),
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
        // Revert original lens changes if new lens update fails
        try {
          if (isBifocalLens(item)) {
            const rightQty = item.details?.rightQty || 0;
            const leftQty = item.details?.leftQty || 0;
            
            await updateDoc(originalLensRef, {
              qty: increment(-requiredQty),
              soldQty: increment(requiredQty),
              rightQty: increment(-rightQty),
              leftQty: increment(-leftQty),
              rightSoldQty: increment(rightQty),
              leftSoldQty: increment(leftQty),
              updatedAt: serverTimestamp()
            });
          } else {
            await updateDoc(originalLensRef, {
              qty: increment(-requiredQty),
              soldQty: increment(requiredQty),
              updatedAt: serverTimestamp()
            });
          }
        } catch (revertErr) {
          console.error('Failed to revert:', revertErr);
        }
        
        toast.error('Failed to update stock');
        setSaving(false);
        return;
      }

      // Update VOC item
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        id: selectedLens.id,
        name: selectedLens.name,
        code: selectedLens.code || selectedLens.id,
        brand: selectedLens.brand,
        index: selectedLens.index,
        category: selectedLens.category,
        details: {
          ...updatedItems[itemIndex].details,
          sph: specifications.sph,
          cyl: specifications.cyl,
          axis: specifications.axis,
          addition: specifications.addition
        }
      };

      await updateDoc(vocRef, {
        items: updatedItems,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || 'unknown'
      });

      await trackItemHistory({
        itemId: vocData.id ?? '',
        itemType: 'voc',
        itemName: vocData.vocNumber ?? '',
        itemCode: vocData.vocNumber ?? '',
        action: 'edit',
        changes: [
          {
            field: 'lens_specifications',
            oldValue: `SPH: ${originalSpecs.sph || '-'}, CYL: ${originalSpecs.cyl || '-'}, AXIS: ${originalSpecs.axis || '-'}, Addition: ${originalSpecs.addition || '-'}`,
            newValue: `SPH: ${specifications.sph}, CYL: ${specifications.cyl}, AXIS: ${specifications.axis}, Addition: ${specifications.addition || '-'}`
          },
          {
            field: 'lens_id',
            oldValue: item.id ?? 'unknown',
            newValue: selectedLens.id ?? 'unknown'
          },
          {
            field: 'lens_name',
            oldValue: item.name ?? '',
            newValue: selectedLens.name ?? ''
          }
        ],
        store: item.store ?? '',
        staffEmail: user?.email ?? 'unknown',
        totalQty: requiredQty ?? 0,
        notes: `Lens specs updated. Inventory adjusted.`
      });

      toast.success('Lens updated successfully');
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Edit3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Lens Specifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update SPH, CYL, AXIS, and Addition values</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              disabled={saving}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Lens Information</p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                      Store: {item.store?.toUpperCase()}
                    </span>
                    {item.category && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded font-medium">
                        Category: {item.category}
                      </span>
                    )}
                    {item.brand && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                        Brand: {item.brand}
                      </span>
                    )}
                    {typeof item.index !== 'undefined' && (
                      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
                        Index: {item.index}
                      </span>
                    )}
                    {isYangonOrder(item) && (
                      <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded font-bold">
                        YANGON ORDER
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center p-2 bg-white dark:bg-gray-600 rounded border">
                      <div className="font-medium text-gray-600 dark:text-gray-400">SPH</div>
                      <div className="font-bold text-gray-900 dark:text-white">{item.details?.sph || '-'}</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-600 rounded border">
                      <div className="font-medium text-gray-600 dark:text-gray-400">CYL</div>
                      <div className="font-bold text-gray-900 dark:text-white">{item.details?.cyl || '-'}</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-600 rounded border">
                      <div className="font-medium text-gray-600 dark:text-gray-400">AXIS</div>
                      <div className="font-bold text-gray-900 dark:text-white">{item.details?.axis || '-'}</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-600 rounded border">
                      <div className="font-medium text-gray-600 dark:text-gray-400">ADD</div>
                      <div className="font-bold text-gray-900 dark:text-white">{item.details?.addition || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">New Specifications</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SPH <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={specifications.sph}
                      onChange={(e) => setSpecifications(prev => ({ ...prev, sph: e.target.value }))}
                      placeholder="e.g., +2.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CYL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={specifications.cyl}
                      onChange={(e) => setSpecifications(prev => ({ ...prev, cyl: e.target.value }))}
                      placeholder="e.g., -1.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      AXIS <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={specifications.axis}
                      onChange={(e) => setSpecifications(prev => ({ ...prev, axis: e.target.value }))}
                      placeholder="e.g., 90"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Addition
                    </label>
                    <input
                      type="text"
                      value={specifications.addition}
                      onChange={(e) => setSpecifications(prev => ({ ...prev, addition: e.target.value }))}
                      placeholder="e.g., +2.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {!isYangonOrder(item) && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={handleSearchSpecifications}
                      disabled={searchingLens || !specifications.sph || !specifications.cyl || !specifications.axis}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {searchingLens ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Search Exact Match
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={showAllAvailableLenses}
                      disabled={searchingLens}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <List className="w-4 h-4" />
                      Show Category Lenses
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {!isYangonOrder(item) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Available Lenses - Category: <span className="font-bold text-green-600">{item.category}</span>
                      </p>
                    </div>
                    {availableLenses.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {availableLenses.length} lens{availableLenses.length !== 1 ? 'es' : ''} found
                      </span>
                    )}
                  </div>

                  {availableLenses.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                      {availableLenses.map((lens) => (
                        <div
                          key={lens.id}
                          className={`p-3 rounded border cursor-pointer transition-all ${
                            selectedLens?.id === lens.id
                              ? 'bg-green-100 dark:bg-green-800 border-green-400 ring-2 ring-green-300'
                              : 'bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 hover:bg-green-50 dark:hover:bg-green-900/30'
                          }`}
                          onClick={() => setSelectedLens(lens)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lens.name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                  Stock: {lens.qty || 0}
                                </span>
                                {lens.brand && (
                                  <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                                    {lens.brand}
                                  </span>
                                )}
                                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded font-medium">
                                  {lens.category}
                                </span>
                              </div>
                            </div>
                            {selectedLens?.id === lens.id && (
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center ml-2">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-4 gap-1 text-xs">
                            <div className="text-center p-1 bg-gray-100 dark:bg-gray-500 rounded">
                              <div className="font-medium text-gray-600 dark:text-gray-300">SPH</div>
                              <div className="font-bold text-gray-900 dark:text-white">{lens.sph || '-'}</div>
                            </div>
                            <div className="text-center p-1 bg-gray-100 dark:bg-gray-500 rounded">
                              <div className="font-medium text-gray-600 dark:text-gray-300">CYL</div>
                              <div className="font-bold text-gray-900 dark:text-white">{lens.cyl || '-'}</div>
                            </div>
                            <div className="text-center p-1 bg-gray-100 dark:bg-gray-500 rounded">
                              <div className="font-medium text-gray-600 dark:text-gray-300">AXIS</div>
                              <div className="font-bold text-gray-900 dark:text-white">{lens.axis || '-'}</div>
                            </div>
                            <div className="text-center p-1 bg-gray-100 dark:bg-gray-500 rounded">
                              <div className="font-medium text-gray-600 dark:text-gray-300">ADD</div>
                              <div className="font-bold text-gray-900 dark:text-white">{lens.addition || '-'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No lenses found in category "{item.category}"</p>
                      <p className="text-xs mt-1">Try searching with different specifications</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!isYangonOrder(item) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mt-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Stock Management:</strong> Original lens stock will be returned and new lens stock will be reduced.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isYangonOrder(item) && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 p-4 mt-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    <strong>Yangon Order:</strong> No inventory changes will be made.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (!isYangonOrder(item) && !selectedLens)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LensEditModal;