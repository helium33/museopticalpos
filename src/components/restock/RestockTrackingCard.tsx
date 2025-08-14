import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, startOfDay, endOfDay } from 'date-fns';
import { CheckCircle, XCircle, Eye, RefreshCw, AlertTriangle, Package, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/modals/FormModal';
import { toast } from 'react-hot-toast';

interface SoldItem {
  id: string;
  name: string;
  type: string;
  category: string;
  material?: string;
  soldQty: number;
  currentStock: number;
  originalQty: number;
  isRestocked: boolean;
  store: string;
  needsRestock: boolean;
  isFullyOut: boolean;
  sph?: string;
  cyl?: string;
  axis?: string;
  addition?: string;
  lastRestockDate?: string;
  rightQty?: number;
  leftQty?: number;
  rightSoldQty?: number;
  leftSoldQty?: number;
}

const LENS_CATEGORIES = {
  singleVision: [
    'bb 1.56', 'bb 1.61', 'bb 1.67',
    'bbpg 1.56', 'bbpg 1.61', 'pg',
    'anti flash', 'anti glare',
    'photo pink', 'photo blue', 'photo purple', 'photo brown',
    'cr', 'mc', 'yangon order'
  ],
  fuse: [
    'bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse',
    'yangon order'
  ],
  flattop: [
    'mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop',
    'yangon order'
  ]
};

const ALL_CATEGORIES = [
  ...LENS_CATEGORIES.singleVision,
  ...LENS_CATEGORIES.fuse,
  ...LENS_CATEGORIES.flattop
].filter((value, index, self) => self.indexOf(value) === index);

const LENS_MATERIALS = [
  'BB1.56', 'BB1.61', 'BB1.67', 'BBPG1.56', 'BBPG1.61', 'PG', 
  'CR', 'MC', 'Anti Flash', 'Anti Glare', 'Photo'
];

const RestockTrackingCard: React.FC = () => {
  const [soldItems, setSoldItems] = useState<SoldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stores, setStores] = useState<string[]>(['win', 'pwint', 'yangon']);
  const [restockingItem, setRestockingItem] = useState<string | null>(null);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<SoldItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(1);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [subTypeFilter, setSubTypeFilter] = useState<string>('All');
  const [showSubTypeFilter, setShowSubTypeFilter] = useState(false);
  const [materialFilter, setMaterialFilter] = useState<string>('All');
  const [showMaterialFilter, setShowMaterialFilter] = useState(false);

  useEffect(() => {
    fetchSoldItems();
  }, [dateFilter]);

  const fetchSoldItems = async () => {
    try {
      setLoading(true);
      setSoldItems([]);

      const selectedDate = new Date(dateFilter);
      const vocsQuery = query(
        collection(db, 'vouchers'),
        where('createdAt', '>=', startOfDay(selectedDate)),
        where('createdAt', '<=', endOfDay(selectedDate))
      );

      const vocsSnapshot = await getDocs(vocsQuery);
      const soldItemsMap: Record<string, SoldItem> = {};

      for (const vocDoc of vocsSnapshot.docs) {
        const vocData = vocDoc.data();
        const store = vocData.store;

        for (const item of vocData.items) {
          if (item.isFOC) continue;

          const key = `${item.id}-${store}-${item.type}`;
          if (!soldItemsMap[key]) {
            soldItemsMap[key] = {
              id: item.id,
              name: item.name,
              type: item.type,
              category: item.category || '',
              material: item.material || '',
              soldQty: 0,
              currentStock: 0,
              originalQty: 0,
              isRestocked: false,
              store: store,
              needsRestock: false,
              isFullyOut: false,
              sph: item.details?.sph,
              cyl: item.details?.cyl,
              axis: item.details?.axis,
              addition: item.details?.addition
            };
          }
          soldItemsMap[key].soldQty += item.quantity;
        }
      }

      const itemsWithStock = await Promise.all(
        Object.values(soldItemsMap).map(async (item) => {
          let collectionName = '';
          switch (item.type) {
            case 'Lens': collectionName = 'lenses'; break;
            case 'Frame': collectionName = 'frames'; break;
            case 'Accessories': collectionName = 'accessories'; break;
            case 'Contact Lens': collectionName = 'contactLenses'; break;
            default: collectionName = 'lenses';
          }

          const itemRef = doc(db, collectionName, item.id);
          const itemDoc = await getDoc(itemRef);

          if (itemDoc.exists()) {
            const itemData = itemDoc.data();
            let currentStock = itemData.qty || 0;
            let originalQty = itemData.originalQty || itemData.qty || 0;
            
            if (item.type === 'Lens' && (itemData.bifocalType || itemData.smsBifocalType)) {
              currentStock = (itemData.rightQty || 0) + (itemData.leftQty || 0);
              originalQty = (itemData.originalRightQty || 0) + (itemData.originalLeftQty || 0);
            }

            const isRestocked = currentStock >= originalQty;
            const needsRestock = currentStock < originalQty;
            const isFullyOut = currentStock === 0;
            
            return {
              ...item,
              currentStock,
              originalQty,
              isRestocked,
              needsRestock,
              isFullyOut,
              lastRestockDate: itemData.lastRestockDate || undefined,
              rightQty: itemData.rightQty,
              leftQty: itemData.leftQty,
              rightSoldQty: itemData.rightSoldQty,
              leftSoldQty: itemData.leftSoldQty
            };
          }

          return {
            ...item,
            currentStock: 0,
            originalQty: 0,
            isRestocked: false,
            needsRestock: true,
            isFullyOut: true
          };
        })
      );

      setSoldItems(itemsWithStock);
    } catch (error) {
      console.error('Error fetching sold items:', error);
      toast.error('Failed to fetch sold items');
    } finally {
      setLoading(false);
    }
  };

  const openRestockModal = (item: SoldItem) => {
    setCurrentItem(item);
    const diff = item.originalQty - item.currentStock;
    setRestockQty(diff > 0 ? Math.min(diff, 1) : 0.5);
    setRestockModalOpen(true);
  };

  const handleRestockItem = async () => {
    if (!currentItem || restockQty <= 0) return;
    
    try {
      setRestockingItem(currentItem.id);
      
      let collectionName = '';
      switch (currentItem.type) {
        case 'Lens': collectionName = 'lenses'; break;
        case 'Frame': collectionName = 'frames'; break;
        case 'Accessories': collectionName = 'accessories'; break;
        case 'Contact Lens': collectionName = 'contactLenses'; break;
        default: collectionName = 'lenses';
      }

      const itemRef = doc(db, collectionName, currentItem.id);
      const itemDoc = await getDoc(itemRef);

      if (itemDoc.exists()) {
        const itemData = itemDoc.data();
        const isBifocal = currentItem.type === 'Lens' && 
                         (itemData.bifocalType || itemData.smsBifocalType);
        
        let updateData: any = {
          lastRestockDate: format(new Date(), 'yyyy-MM-dd'),
          updatedAt: new Date()
        };

        if (isBifocal) {
          // For bifocal lenses, handle 0.5 increments
          if (restockQty % 1 === 0.5) {
            // Decide which side needs more stock
            const rightNeedsMore = (itemData.rightQty || 0) < (itemData.leftQty || 0);
            updateData.rightQty = (itemData.rightQty || 0) + (rightNeedsMore ? 0.5 : 0);
            updateData.leftQty = (itemData.leftQty || 0) + (rightNeedsMore ? 0 : 0.5);
          } else {
            // For whole numbers, split evenly
            updateData.rightQty = (itemData.rightQty || 0) + (restockQty / 2);
            updateData.leftQty = (itemData.leftQty || 0) + (restockQty / 2);
          }
          updateData.qty = updateData.rightQty + updateData.leftQty;
        } else {
          // For non-bifocal lenses, just add the quantity directly
          updateData.qty = (itemData.qty || 0) + restockQty;
        }

        await updateDoc(itemRef, updateData);

        await fetchSoldItems();
        toast.success(`Restocked ${restockQty} items successfully!`);
        setRestockModalOpen(false);
      }
    } catch (error) {
      console.error('Error restocking item:', error);
      toast.error('Failed to restock item');
    } finally {
      setRestockingItem(null);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value);
  };

  const toggleStore = (store: string) => {
    if (stores.includes(store)) {
      setStores(stores.filter(s => s !== store));
    } else {
      setStores([...stores, store]);
    }
  };

  const toggleDetails = (itemId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const filteredItems = (items: SoldItem[]) => {
    return items.filter(item => {
      const storeMatch = stores.includes(item.store);
      const categoryMatch = categoryFilter === 'All' || 
        (item.category && item.category.toLowerCase().includes(categoryFilter.toLowerCase()));
      
      const subTypeMatch = subTypeFilter === 'All' || 
        (item.type === 'Lens' && (
          (subTypeFilter === 'Single Vision' && LENS_CATEGORIES.singleVision.some(cat => item.category?.includes(cat))) ||
          (subTypeFilter === 'Fuse' && LENS_CATEGORIES.fuse.some(cat => item.category?.includes(cat))) ||
          (subTypeFilter === 'Flattop' && LENS_CATEGORIES.flattop.some(cat => item.category?.includes(cat)))
        ));
      
      const materialMatch = materialFilter === 'All' || 
        (item.material && item.material.toLowerCase().includes(materialFilter.toLowerCase()));
      
      return storeMatch && categoryMatch && subTypeMatch && materialMatch;
    });
  };

  const getCategoryBadgeColor = (category: string | undefined) => {
    if (!category) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('bb 1.56')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (lowerCategory.includes('bb 1.61')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (lowerCategory.includes('bb 1.67')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    if (lowerCategory.includes('bbpg')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    if (lowerCategory.includes('pg')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (lowerCategory.includes('anti')) return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
    if (lowerCategory.includes('photo')) return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
    if (lowerCategory.includes('cr')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    if (lowerCategory.includes('mc')) return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
    if (lowerCategory.includes('fuse')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    if (lowerCategory.includes('flattop')) return 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200';
    if (lowerCategory.includes('yangon order')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getLensType = (category: string | undefined) => {
    if (!category) return '';
    
    const lowerCategory = category.toLowerCase();
    if (LENS_CATEGORIES.singleVision.some(cat => lowerCategory.includes(cat))) return 'Single Vision';
    if (LENS_CATEGORIES.fuse.some(cat => lowerCategory.includes(cat))) return 'Fuse';
    if (LENS_CATEGORIES.flattop.some(cat => lowerCategory.includes(cat))) return 'Flattop';
    
    return '';
  };

  const needsRestockItems = filteredItems(soldItems.filter(item => 
    item.needsRestock && !item.isFullyOut
  ));

  const fullyOutItems = filteredItems(soldItems.filter(item => 
    item.isFullyOut
  ));

  const restockedItems = filteredItems(soldItems.filter(item => 
    item.isRestocked
  ));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Restock Tracking</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track items that need restocking based on sales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateFilter}
            onChange={handleDateChange}
            className="max-w-[180px]"
            max={format(new Date(), 'yyyy-MM-dd')}
          />
          <Button variant="outline" onClick={fetchSoldItems} loading={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {['win', 'pwint', 'yangon'].map(store => (
          <button
            key={store}
            onClick={() => toggleStore(store)}
            className={`px-3 py-1 text-sm rounded-full ${
              stores.includes(store)
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {store.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowSubTypeFilter(!showSubTypeFilter)}
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            Type: {subTypeFilter}
          </Button>
          {showSubTypeFilter && (
            <div className="absolute z-10 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-2 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setSubTypeFilter('All');
                    setShowSubTypeFilter(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded ${
                    subTypeFilter === 'All' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  All Types
                </button>
                {['Single Vision', 'Fuse', 'Flattop'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSubTypeFilter(type);
                      setShowSubTypeFilter(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded ${
                      subTypeFilter === type ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            Category: {categoryFilter}
          </Button>
          {showCategoryFilter && (
            <div className="absolute z-10 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-2 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setCategoryFilter('All');
                    setShowCategoryFilter(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded ${
                    categoryFilter === 'All' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  All Categories
                </button>
                {ALL_CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setCategoryFilter(category);
                      setShowCategoryFilter(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded ${
                      categoryFilter === category ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowMaterialFilter(!showMaterialFilter)}
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            Material: {materialFilter}
          </Button>
          {showMaterialFilter && (
            <div className="absolute z-10 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-2 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setMaterialFilter('All');
                    setShowMaterialFilter(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded ${
                    materialFilter === 'All' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  All Materials
                </button>
                {LENS_MATERIALS.map(material => (
                  <button
                    key={material}
                    onClick={() => {
                      setMaterialFilter(material);
                      setShowMaterialFilter(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded ${
                      materialFilter === material ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-red-800 dark:text-red-200">Fully Out</h3>
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-800 dark:text-red-200 mt-2">
            {fullyOutItems.length}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Items completely out of stock
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-amber-800 dark:text-amber-200">Needs Restock</h3>
            <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-2">
            {needsRestockItems.length}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Items below original quantity
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-green-800 dark:text-green-200">Restocked</h3>
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-2">
            {restockedItems.length}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Items fully restocked
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : soldItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No items sold on {format(new Date(dateFilter), 'MMMM d, yyyy')}
        </div>
      ) : (
        <div className="space-y-6">
          {fullyOutItems.length > 0 && (
            <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/20 p-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="font-medium text-red-800 dark:text-red-200">
                  Fully Out of Stock ({fullyOutItems.length})
                </h3>
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
                        Details
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Sold Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Store
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {fullyOutItems.map((item, index) => (
                      <React.Fragment key={`${item.id}-${item.store}-${index}`}>
                        <tr className="bg-red-50 dark:bg-red-900/20">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleDetails(item.id)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              >
                                {showDetails[item.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              {item.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.type}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.type === 'Lens' && (
                              <div className="flex flex-col gap-1">
                                <div className="space-y-1">
                                  {item.sph && <div>SPH: {item.sph}</div>}
                                  {item.cyl && <div>CYL: {item.cyl}</div>}
                                  {item.axis && <div>AXIS: {item.axis}</div>}
                                  {item.addition && <div>ADD: {item.addition}</div>}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {getLensType(item.category) && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                      {getLensType(item.category)}
                                    </span>
                                  )}
                                  {item.category && (
                                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeColor(item.category)}`}>
                                      {item.category}
                                    </span>
                                  )}
                                  {item.material && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                      {item.material}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.soldQty % 1 === 0 ? item.soldQty : item.soldQty.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {item.store.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openRestockModal(item)}
                              loading={restockingItem === item.id}
                              disabled={restockingItem === item.id}
                            >
                              Restock
                            </Button>
                          </td>
                        </tr>
                        {showDetails[item.id] && (
                          <tr className="bg-gray-50 dark:bg-gray-700">
                            <td colSpan={6} className="px-4 py-3 text-sm">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Original Quantity</p>
                                  <p className="font-medium">{item.originalQty % 1 === 0 ? item.originalQty : item.originalQty.toFixed(1)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Current Stock</p>
                                  <p className="font-medium text-red-600 dark:text-red-400">0 (Out of Stock)</p>
                                </div>
                                {item.lastRestockDate && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Restock</p>
                                    <p className="font-medium">{item.lastRestockDate}</p>
                                  </div>
                                )}
                                {item.type === 'Lens' && (
                                  <div className="col-span-2 md:col-span-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Prescription Details</p>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                      {item.sph && <div>SPH: <span className="font-medium">{item.sph}</span></div>}
                                      {item.cyl && <div>CYL: <span className="font-medium">{item.cyl}</span></div>}
                                      {item.axis && <div>AXIS: <span className="font-medium">{item.axis}</span></div>}
                                      {item.addition && <div>ADD: <span className="font-medium">{item.addition}</span></div>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {needsRestockItems.length > 0 && (
            <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-medium text-amber-800 dark:text-amber-200">
                  Needs Restock ({needsRestockItems.length})
                </h3>
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
                        Details
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Sold Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Last Restock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Store
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {needsRestockItems.map((item, index) => (
                      <React.Fragment key={`${item.id}-${item.store}-${index}`}>
                        <tr className="bg-amber-50 dark:bg-amber-900/20">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleDetails(item.id)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              >
                                {showDetails[item.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              {item.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.type}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.type === 'Lens' && (
                              <div className="flex flex-col gap-1">
                                <div className="space-y-1">
                                  {item.sph && <div>SPH: {item.sph}</div>}
                                  {item.cyl && <div>CYL: {item.cyl}</div>}
                                  {item.axis && <div>AXIS: {item.axis}</div>}
                                  {item.addition && <div>ADD: {item.addition}</div>}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {getLensType(item.category) && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                      {getLensType(item.category)}
                                    </span>
                                  )}
                                  {item.category && (
                                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeColor(item.category)}`}>
                                      {item.category}
                                    </span>
                                  )}
                                  {item.material && (
                                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                      {item.material}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.soldQty % 1 === 0 ? item.soldQty : item.soldQty.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.currentStock % 1 === 0 ? item.currentStock : item.currentStock?.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.lastRestockDate || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {item.store.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openRestockModal(item)}
                              loading={restockingItem === item.id}
                              disabled={restockingItem === item.id}
                            >
                              Restock
                            </Button>
                          </td>
                        </tr>
                        {showDetails[item.id] && (
                          <tr className="bg-gray-50 dark:bg-gray-700">
                            <td colSpan={8} className="px-4 py-3 text-sm">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Original Quantity</p>
                                  <p className="font-medium">{item.originalQty % 1 === 0 ? item.originalQty : item.originalQty.toFixed(1)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Current Stock</p>
                                  <p className="font-medium">{item.currentStock % 1 === 0 ? item.currentStock : item.currentStock?.toFixed(1)}</p>
                                </div>
                                {item.lastRestockDate && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Restock</p>
                                    <p className="font-medium">{item.lastRestockDate}</p>
                                  </div>
                                )}
                                {item.type === 'Lens' && (
                                  <div className="col-span-2 md:col-span-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Prescription Details</p>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                      {item.sph && <div>SPH: <span className="font-medium">{item.sph}</span></div>}
                                      {item.cyl && <div>CYL: <span className="font-medium">{item.cyl}</span></div>}
                                      {item.axis && <div>AXIS: <span className="font-medium">{item.axis}</span></div>}
                                      {item.addition && <div>ADD: <span className="font-medium">{item.addition}</span></div>}
                                    </div>
                                  </div>
                                )}
                                {(item.rightQty !== undefined || item.leftQty !== undefined) && (
                                  <>
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Right Qty</p>
                                      <p className="font-medium">{item.rightQty || 0}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Left Qty</p>
                                      <p className="font-medium">{item.leftQty || 0}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Restock Modal */}
          <Modal
            isOpen={restockModalOpen}
            onClose={() => setRestockModalOpen(false)}
            title={`Restock ${currentItem?.name || ''}`}
          >
            {currentItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current Stock</p>
                    <p className="font-semibold">{currentItem.currentStock}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Original Quantity</p>
                    <p className="font-semibold">{currentItem.originalQty}</p>
                  </div>
                </div>
                
                {currentItem.type === 'Lens' && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Lens Details</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {currentItem.sph && <div>SPH: <span className="font-semibold">{currentItem.sph}</span></div>}
                      {currentItem.cyl && <div>CYL: <span className="font-semibold">{currentItem.cyl}</span></div>}
                      {currentItem.axis && <div>AXIS: <span className="font-semibold">{currentItem.axis}</span></div>}
                      {currentItem.addition && <div>ADD: <span className="font-semibold">{currentItem.addition}</span></div>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {getLensType(currentItem.category) && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {getLensType(currentItem.category)}
                          </span>
                        </div>
                      )}
                      {currentItem.category && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                          <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeColor(currentItem.category)}`}>
                            {currentItem.category}
                          </span>
                        </div>
                      )}
                      {currentItem.material && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Material</p>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {currentItem.material}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Input
                  label="Quantity to Restock"
                  type="number"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  min={1}
                  max={currentItem.originalQty - currentItem.currentStock}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setRestockModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleRestockItem}
                    loading={restockingItem === currentItem.id}
                  >
                    Confirm Restock
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
};

export default RestockTrackingCard;