import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Save, AlertTriangle, CheckCircle, Package, RefreshCw, Calendar, TrendingDown, Eye, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../modals/FormModal';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface StockItem {
  id: string;
  name: string;
  code: string;
  type: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
  category: string;
  store: string;
  currentQty: number;
  originalQty: number;
  soldQty: number;
  transferInQty: number;
  transferOutQty: number;
  lastUpdated?: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
  needsEntry: boolean;
  lastEntryDate?: string;
  reason?: string;
}

interface DailyEntry {
  id: string;
  date: string;
  store: string;
  itemId: string;
  itemType: string;
  itemName: string;
  itemCode: string;
  previousQty: number;
  currentQty: number;
  difference: number;
  reason?: string;
  enteredBy: string;
  enteredAt: Date;
}

const STORES = ['win', 'pwint', 'yangon'];
const ITEM_TYPES = ['Lens', 'Frame', 'Accessories', 'Contact Lens'];
const REASONS = [
  'Stock Count',
  'Damaged Item',
  'Lost Item',
  'Expired Item',
  'Transfer Error',
  'System Error',
  'Customer Return',
  'Quality Issue',
  'Other'
];

const DailyStockEntry: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStore, setSelectedStore] = useState<string>('win');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<string>('All');
  
  // Modal states
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [entryQty, setEntryQty] = useState<number>(0);
  const [entryReason, setEntryReason] = useState<string>('Stock Count');
  const [customReason, setCustomReason] = useState<string>('');

  // Summary states
  const [summary, setSummary] = useState({
    totalItems: 0,
    enteredItems: 0,
    missingEntries: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });

  useEffect(() => {
    fetchStockData();
  }, [selectedDate, selectedStore, selectedItemType]);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStockItems(),
        fetchDailyEntries()
      ]);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockItems = async () => {
    const collections = ['lenses', 'frames', 'accessories', 'contactLenses'];
    const allItems: StockItem[] = [];

    for (const collectionName of collections) {
      const itemQuery = query(
        collection(db, collectionName),
        where('store', '==', selectedStore),
        orderBy('code')
      );

      const snapshot = await getDocs(itemQuery);
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const itemType = collectionName === 'lenses' ? 'Lens' :
                        collectionName === 'frames' ? 'Frame' :
                        collectionName === 'accessories' ? 'Accessories' : 'Contact Lens';

        if (selectedItemType === 'All' || selectedItemType === itemType) {
          const currentQty = data.qty || 0;
          const originalQty = data.originalQty || currentQty;
          const soldQty = data.soldQty || 0;
          const transferInQty = data.transferInQty || 0;
          const transferOutQty = data.transferOutQty || 0;

          allItems.push({
            id: doc.id,
            name: data.name || '',
            code: data.code || '',
            type: itemType,
            category: data.category || '',
            store: selectedStore,
            currentQty,
            originalQty,
            soldQty,
            transferInQty,
            transferOutQty,
            lastUpdated: data.lastUpdated,
            isLowStock: currentQty > 0 && currentQty <= 2,
            isOutOfStock: currentQty === 0,
            needsEntry: !data.lastEntryDate || data.lastEntryDate !== selectedDate,
            lastEntryDate: data.lastEntryDate
          });
        }
      });
    }

    setStockItems(allItems);
    updateSummary(allItems);
  };

  const fetchDailyEntries = async () => {
    const entriesQuery = query(
      collection(db, 'dailyStockEntries'),
      where('date', '==', selectedDate),
      where('store', '==', selectedStore),
      orderBy('enteredAt', 'desc')
    );

    const snapshot = await getDocs(entriesQuery);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DailyEntry));

    setDailyEntries(entries);
  };

  const updateSummary = (items: StockItem[]) => {
    const totalItems = items.length;
    const enteredItems = items.filter(item => !item.needsEntry).length;
    const missingEntries = items.filter(item => item.needsEntry).length;
    const lowStockItems = items.filter(item => item.isLowStock).length;
    const outOfStockItems = items.filter(item => item.isOutOfStock).length;

    setSummary({
      totalItems,
      enteredItems,
      missingEntries,
      lowStockItems,
      outOfStockItems
    });
  };

  const openEntryModal = (item: StockItem) => {
    setSelectedItem(item);
    setEntryQty(item.currentQty);
    setEntryReason('Stock Count');
    setCustomReason('');
    setEntryModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedItem || !user?.email) return;

    setSaving(true);
    try {
      const entryId = `${selectedDate}-${selectedStore}-${selectedItem.id}`;
      const finalReason = entryReason === 'Other' ? customReason : entryReason;
      
      const entryData: Omit<DailyEntry, 'id'> = {
        date: selectedDate,
        store: selectedStore,
        itemId: selectedItem.id,
        itemType: selectedItem.type,
        itemName: selectedItem.name,
        itemCode: selectedItem.code,
        previousQty: selectedItem.currentQty,
        currentQty: entryQty,
        difference: entryQty - selectedItem.currentQty,
        reason: finalReason,
        enteredBy: user.email,
        enteredAt: new Date()
      };

      // Save daily entry
      await setDoc(doc(db, 'dailyStockEntries', entryId), entryData);

      // Update item's last entry date and quantity if different
      const collectionName = selectedItem.type === 'Lens' ? 'lenses' :
                            selectedItem.type === 'Frame' ? 'frames' :
                            selectedItem.type === 'Accessories' ? 'accessories' : 'contactLenses';

      const updateData: any = {
        lastEntryDate: selectedDate,
        lastUpdated: new Date()
      };

      // Only update quantity if it's different
      if (entryQty !== selectedItem.currentQty) {
        updateData.qty = entryQty;
      }

      await setDoc(doc(db, collectionName, selectedItem.id), updateData, { merge: true });

      toast.success('Stock entry saved successfully');
      setEntryModalOpen(false);
      fetchStockData();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const getItemStatusColor = (item: StockItem) => {
    if (item.isOutOfStock) return 'text-red-600 dark:text-red-400';
    if (item.isLowStock) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getItemStatusBadge = (item: StockItem) => {
    if (item.isOutOfStock) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">Out</span>;
    }
    if (item.isLowStock) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">Low</span>;
    }
    return null;
  };

  const filteredItems = stockItems.filter(item => {
    if (selectedItemType !== 'All' && item.type !== selectedItemType) return false;
    return true;
  });

  const missingEntryItems = filteredItems.filter(item => item.needsEntry);
  const completedEntryItems = filteredItems.filter(item => !item.needsEntry);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Daily Stock Entry
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Record daily stock counts and track inventory changes
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchStockData}
            loading={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            label="Date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
          <Select
            label="Store"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            options={STORES.map(store => ({ value: store, label: store.toUpperCase() }))}
          />
          <Select
            label="Item Type"
            value={selectedItemType}
            onChange={(e) => setSelectedItemType(e.target.value)}
            options={[
              { value: 'All', label: 'All Types' },
              ...ITEM_TYPES.map(type => ({ value: type, label: type }))
            ]}
          />
          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={fetchStockData}
              loading={loading}
              className="w-full"
            >
              Load Data
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-blue-800 dark:text-blue-200">Total Items</h3>
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-2">
              {summary.totalItems}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-green-800 dark:text-green-200">Entered</h3>
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-2">
              {summary.enteredItems}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-red-800 dark:text-red-200">Missing</h3>
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-800 dark:text-red-200 mt-2">
              {summary.missingEntries}
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Low Stock</h3>
              <TrendingDown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mt-2">
              {summary.lowStockItems}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800 dark:text-gray-200">Out of Stock</h3>
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-2">
              {summary.outOfStockItems}
            </p>
          </div>
        </div>
      </div>

      {/* Missing Entries Section */}
      {missingEntryItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 border-b border-red-200 dark:border-red-800">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Missing Daily Entries ({missingEntryItems.length})
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              These items need daily stock count entries for {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Entry
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {missingEntryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.code}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {item.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getItemStatusColor(item)}`}>
                        {item.currentQty}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getItemStatusBadge(item)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {item.lastEntryDate ? format(new Date(item.lastEntryDate), 'MMM d') : 'Never'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openEntryModal(item)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Enter
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Entries Section */}
      {completedEntryItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 border-b border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completed Entries ({completedEntryItems.length})
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Items with daily entries for {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Entry
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {completedEntryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.code}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {item.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getItemStatusColor(item)}`}>
                        {item.currentQty}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getItemStatusBadge(item)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {item.lastEntryDate ? format(new Date(item.lastEntryDate), 'MMM d') : 'Never'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEntryModal(item)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      <Modal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        title={`Stock Entry - ${selectedItem?.name || ''}`}
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Item Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Code</p>
                  <p className="font-medium">{selectedItem.code}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-medium">{selectedItem.type}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Category</p>
                  <p className="font-medium">{selectedItem.category}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Current Stock</p>
                  <p className={`font-medium ${getItemStatusColor(selectedItem)}`}>
                    {selectedItem.currentQty} {getItemStatusBadge(selectedItem)}
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Stock Count"
              type="number"
              value={entryQty}
              onChange={(e) => setEntryQty(Number(e.target.value))}
              min={0}
              step={selectedItem.type === 'Lens' ? 0.5 : 1}
              required
            />

            <Select
              label="Reason"
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              options={REASONS.map(reason => ({ value: reason, label: reason }))}
              required
            />

            {entryReason === 'Other' && (
              <Input
                label="Custom Reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter custom reason..."
                required
              />
            )}

            {entryQty !== selectedItem.currentQty && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Difference:</strong> {entryQty - selectedItem.currentQty > 0 ? '+' : ''}{entryQty - selectedItem.currentQty}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setEntryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEntry}
                loading={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Entry
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DailyStockEntry;