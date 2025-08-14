import React, { useState } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Package, AlertTriangle, CheckCircle, XCircle, Loader, Database, TrendingUp, Filter } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { LensType, formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

interface BulkUpdateResult {
  success: boolean;
  updatedCount: number;
  errors: string[];
  totalFound: number;
}

interface LensSummary {
  id: string;
  code: string;
  currentQty: number;
  currentOriginalQty: number;
  price: number;
  type: string;
}

interface BulkQuantityUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: BulkUpdateResult) => void;
}

const BulkQuantityUpdateModal: React.FC<BulkQuantityUpdateModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<LensType | ''>('');
  const [selectedStore, setSelectedStore] = useState('');
  const [updateType, setUpdateType] = useState<'set' | 'add' | 'multiply'>('set');
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [updateOriginalQty, setUpdateOriginalQty] = useState(true);
  const [updateCurrentQty, setUpdateCurrentQty] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundLenses, setFoundLenses] = useState<LensSummary[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const categories = [
    'bb 1.56', 'bb 1.61', 'bb 1.67', 'bbpg 1.56', 'bbpg 1.61', 'pg',
    'anti flash', 'anti glare', 'photo pink', 'photo blue', 'photo purple', 'photo brown',
    'cr', 'mc', 'bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse',
    'mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop',
    'bb multifocal', 'bbpg multifocal', 'bb multifocal ff', 'bbpg multifocal ff',
    'factory error'
  ];

  const stores = ['win', 'naung', 'both'];
  const lensTypes: LensType[] = ['Single Vision', 'Bifocal', 'SMS', 'Error', 'Yangon Order'];

  // Preview lenses that will be affected
  const previewLenses = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category first');
      return;
    }

    setIsLoading(true);
    try {
      // Build query constraints
      let queryConstraints = [where('category', '==', selectedCategory)];
      
      if (selectedType) {
        queryConstraints.push(where('type', '==', selectedType));
      }
      
      if (selectedStore && selectedStore !== 'both') {
        queryConstraints.push(where('store', '==', selectedStore));
      }

      const q = query(collection(db, 'lenses'), ...queryConstraints);
      const snapshot = await getDocs(q);

      const lenses: LensSummary[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        lenses.push({
          id: doc.id,
          code: data.code,
          currentQty: data.qty || 0,
          currentOriginalQty: data.originalQty || 0,
          price: data.price || 0,
          type: data.type || 'Unknown'
        });
      });

      setFoundLenses(lenses);
      setShowPreview(true);
      
      if (lenses.length === 0) {
        toast.warning('No lenses found matching the criteria');
      } else {
        toast.success(`Found ${lenses.length} lenses matching criteria`);
      }
    } catch (error) {
      console.error('Error previewing lenses:', error);
      toast.error('Failed to preview lenses');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate what the new quantity will be for a lens
  const calculateNewQuantity = (currentQty: number): number => {
    switch (updateType) {
      case 'set':
        return newQuantity;
      case 'add':
        return currentQty + newQuantity;
      case 'multiply':
        return Math.round(currentQty * newQuantity * 2) / 2; // Round to 0.5 increments
      default:
        return currentQty;
    }
  };

  // Perform bulk update with batching for performance
  const performBulkUpdate = async () => {
    if (foundLenses.length === 0) {
      toast.error('No lenses to update. Please preview first.');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    const errors: string[] = [];
    const batchSize = 450; // Firestore batch limit is 500, so use 450 for safety

    try {
      // Process in batches to avoid Firestore limits
      for (let i = 0; i < foundLenses.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchLenses = foundLenses.slice(i, i + batchSize);

        batchLenses.forEach((lens) => {
          try {
            const lensRef = doc(db, 'lenses', lens.id);
            const updateData: any = {
              updatedAt: serverTimestamp(),
              lastBulkUpdate: serverTimestamp(),
              bulkUpdateReason: `${updateType} ${newQuantity} for category ${selectedCategory}`
            };

            // Update current quantity if requested
            if (updateCurrentQty) {
              const newCurrentQty = calculateNewQuantity(lens.currentQty);
              updateData.qty = Math.max(0, newCurrentQty); // Don't allow negative quantities
            }

            // Update original quantity if requested
            if (updateOriginalQty) {
              const newOriginalQty = calculateNewQuantity(lens.currentOriginalQty);
              updateData.originalQty = Math.max(0, newOriginalQty); // Don't allow negative quantities
            }

            batch.update(lensRef, updateData);
          } catch (error) {
            errors.push(`Failed to prepare update for lens ${lens.code}: ${error}`);
          }
        });

        // Commit this batch
        await batch.commit();
        successCount += batchLenses.length - batchLenses.filter((_, index) => 
          errors.some(error => error.includes(batchLenses[index].code))
        ).length;

        console.log(`Processed batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(foundLenses.length/batchSize)}`);
      }

      // Create audit log entry
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BULK_LENS_UPDATE',
          details: {
            category: selectedCategory,
            type: selectedType || 'All',
            store: selectedStore || 'All',
            updateType,
            newQuantity,
            affectedLenses: successCount,
            updateOriginalQty,
            updateCurrentQty,
            timestamp: new Date().toISOString()
          }
        })
      }).catch(err => console.warn('Audit log failed:', err));

      const result: BulkUpdateResult = {
        success: errors.length === 0,
        updatedCount: successCount,
        errors,
        totalFound: foundLenses.length
      };

      onComplete(result);
      
      if (errors.length === 0) {
        toast.success(`✅ Successfully updated ${successCount} lenses!`);
      } else {
        toast.error(`⚠️ Updated ${successCount} lenses with ${errors.length} errors`);
      }

      onClose();
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast.error(`Failed to perform bulk update: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Bulk Lens Quantity Update
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Update quantities for multiple lenses at once by category, type, or store
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose} className="p-2">
              <XCircle size={20} />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                  ⚠️ CRITICAL: Bulk Update Warning
                </h4>
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  This operation will modify multiple lens records simultaneously. 
                  <strong> Always preview before updating</strong> and ensure you have recent backups.
                  This action cannot be undone easily.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Criteria */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
              <Filter size={20} />
              Filter Criteria
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Category *"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'Select category...' },
                  ...categories.map(cat => ({ value: cat, label: cat.toUpperCase() }))
                ]}
              />
              
              <Select
                label="Lens Type (Optional)"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as LensType)}
                options={[
                  { value: '', label: 'All types' },
                  ...lensTypes.map(type => ({ value: type, label: type }))
                ]}
              />
              
              <Select
                label="Store (Optional)"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                options={[
                  { value: '', label: 'All stores' },
                  ...stores.map(store => ({ value: store, label: store.toUpperCase() }))
                ]}
              />
            </div>
          </div>

          {/* Update Configuration */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Update Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Select
                label="Update Type *"
                value={updateType}
                onChange={(e) => setUpdateType(e.target.value as 'set' | 'add' | 'multiply')}
                options={[
                  { value: 'set', label: 'Set to specific value' },
                  { value: 'add', label: 'Add to current value' },
                  { value: 'multiply', label: 'Multiply current value' }
                ]}
              />
              
              <Input
                label="Quantity Value *"
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                step="0.5"
                placeholder="Enter quantity value"
              />
            </div>

            {/* Update Options */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={updateOriginalQty}
                  onChange={(e) => setUpdateOriginalQty(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Update Original Qty (Total Stock)
                </span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={updateCurrentQty}
                  onChange={(e) => setUpdateCurrentQty(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Update Current Qty (Available Stock)
                </span>
              </label>
            </div>
          </div>

          {/* Preview Button */}
          <div className="flex justify-center">
            <Button
              onClick={previewLenses}
              disabled={!selectedCategory || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <Package size={16} />
              )}
              {isLoading ? 'Loading...' : 'Preview Affected Lenses'}
            </Button>
          </div>

          {/* Preview Results */}
          {showPreview && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                📋 Preview: {foundLenses.length} Lenses Found
              </h3>
              
              {foundLenses.length > 0 && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white dark:bg-gray-600 p-3 rounded text-center">
                      <div className="font-bold text-blue-600">{foundLenses.length}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total Lenses</div>
                    </div>
                    <div className="bg-white dark:bg-gray-600 p-3 rounded text-center">
                      <div className="font-bold text-green-600">
                        {foundLenses.reduce((sum, lens) => sum + lens.currentQty, 0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Current Total Qty</div>
                    </div>
                    <div className="bg-white dark:bg-gray-600 p-3 rounded text-center">
                      <div className="font-bold text-purple-600">
                        {foundLenses.reduce((sum, lens) => sum + calculateNewQuantity(lens.currentQty), 0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">New Total Qty</div>
                    </div>
                    <div className="bg-white dark:bg-gray-600 p-3 rounded text-center">
                      <div className="font-bold text-orange-600">
                        {formatCurrency(foundLenses.reduce((sum, lens) => sum + lens.price, 0))}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Total Value</div>
                    </div>
                  </div>

                  {/* Sample Lenses Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-center">Current Qty</th>
                          <th className="px-3 py-2 text-center">→ New Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {foundLenses.slice(0, 50).map((lens) => (
                          <tr key={lens.id} className="border-b border-gray-200 dark:border-gray-600">
                            <td className="px-3 py-2 font-mono">{lens.code}</td>
                            <td className="px-3 py-2">{lens.type}</td>
                            <td className="px-3 py-2 text-center">{lens.currentQty}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`font-bold ${
                                calculateNewQuantity(lens.currentQty) > lens.currentQty 
                                  ? 'text-green-600' 
                                  : calculateNewQuantity(lens.currentQty) < lens.currentQty
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                              }`}>
                                {calculateNewQuantity(lens.currentQty)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{formatCurrency(lens.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {foundLenses.length > 50 && (
                      <div className="p-3 text-center text-gray-500 bg-gray-50 dark:bg-gray-700">
                        ... and {foundLenses.length - 50} more lenses
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            
            <Button
              onClick={performBulkUpdate}
              disabled={!showPreview || foundLenses.length === 0 || isProcessing || (!updateOriginalQty && !updateCurrentQty)}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            >
              {isProcessing ? (
                <Loader className="animate-spin" size={16} />
              ) : (
                <CheckCircle size={16} />
              )}
              {isProcessing ? 'Updating...' : `Update ${foundLenses.length} Lenses`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkQuantityUpdateModal;