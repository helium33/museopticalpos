import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart, Search, X, Filter, ChevronDown, ChevronUp, AlertTriangle, ArrowRightLeft, Package, Store, BarChart3, TrendingUp } from 'lucide-react';
import { collection, query, where, doc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import AccessoriesForm, { AccessoriesFormData } from '../../components/accessories/AccessoriesForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import TransferManagement from '../../components/transfer/TransferMangment';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { deleteItemWithHistory, updateItemWithHistory } from '../../services/firebaseService';
import { doc as docRef, updateDoc, increment } from 'firebase/firestore';
import { usePermissions } from '../../hooks/useSidebarItem';

interface StoreInventorySummary {
  store: string;
  totalItems: number;
  totalQty: number;
  soldQty: number;
  remainingQty: number;
  transferInQty: number;
  transferOutQty: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

const AccessoriesPage: React.FC = () => {
  const { store: storeParam } = useParams<{ store: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageAccessories, canEditAccessories, canDeleteAccessories, canAddAccessories, canAccessStore } = usePermissions();
  
  // Convert URL parameter to internal store identifier
  const store = storeParam === 'main-store' ? 'main' : storeParam;
  
  const [accessories, setAccessories] = useState<AccessoriesFormData[]>([]);
  const [filteredAccessories, setFilteredAccessories] = useState<AccessoriesFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers'>('inventory');
  const [inventoryView, setInventoryView] = useState<'summary' | 'detailed'>('summary');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<AccessoriesFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accessoryToDelete, setAccessoryToDelete] = useState<AccessoriesFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [accessoryToSell, setAccessoryToSell] = useState<AccessoriesFormData | null>(null);
  
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState<AccessoriesFormData | null>(null);

  // Restock dialog states
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [accessoryToRestock, setAccessoryToRestock] = useState<AccessoriesFormData | null>(null);
  const [restockData, setRestockData] = useState({
    qty: 0,
    reason: '',
    supplier: ''
  });

  const [originalQtyMap, setOriginalQtyMap] = useState<Record<string, number>>({});
  const [storeInventorySummary, setStoreInventorySummary] = useState<StoreInventorySummary[]>([]);

  // Enhanced search states
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    code: '',
    priceMin: '',
    priceMax: '',
    qtyMin: '',
    qtyMax: '',
    stockStatus: '',
    store: ''
  });

  const stockStatuses = [
    { value: '', label: 'All Stock' },
    { value: 'in-stock', label: 'In Stock (>0)' },
    { value: 'low-stock', label: 'Low Stock (≤2)' },
    { value: 'out-of-stock', label: 'Out of Stock (0)' },
    { value: 'high-stock', label: 'High Stock (>10)' }
  ];

  const storeOptions = [
    { value: '', label: 'All Stores' },
    { value: 'win', label: 'Win Store' },
    { value: 'pwint', label: 'Pwint Store' },
    { value: 'yangon', label: 'Yangon Store' },
    { value: 'main', label: 'Main Store' }
  ];

  // Check store access on component mount
  useEffect(() => {
    if (store && !canAccessStore(store)) {
      toast.error(`You don't have access to ${store.toUpperCase()} store`);
      navigate('/dashboard');
      return;
    }
  }, [store, canAccessStore, navigate]);

  // Calculate store inventory summary
  const calculateStoreInventorySummary = (accessoriesData: AccessoriesFormData[]) => {
    const stores = ['win', 'pwint', 'yangon', 'main'];
    const summary: StoreInventorySummary[] = stores.map(storeName => {
      const storeItems = accessoriesData.filter(item => item.store === storeName);
      
      return {
        store: storeName,
        totalItems: storeItems.length,
        totalQty: storeItems.reduce((sum, item) => sum + (originalQtyMap[item.id || ''] || item.totalQty || item.qty || 0), 0),
        soldQty: storeItems.reduce((sum, item) => sum + (item.soldQty || 0), 0),
        remainingQty: storeItems.reduce((sum, item) => sum + (item.qty || 0), 0),
        transferInQty: storeItems.reduce((sum, item) => sum + (item.transferInQty || 0), 0),
        transferOutQty: storeItems.reduce((sum, item) => sum + (item.transferOutQty || 0), 0),
        totalValue: storeItems.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0),
        lowStockItems: storeItems.filter(item => (item.qty || 0) > 0 && (item.qty || 0) <= 2).length,
        outOfStockItems: storeItems.filter(item => (item.qty || 0) === 0).length,
      };
    }).filter(summary => summary.totalItems > 0);

    setStoreInventorySummary(summary);
  };

  // Enhanced filter function
  const applyFilters = (accessoriesList: AccessoriesFormData[]) => {
    let filtered = [...accessoriesList];

    // Search filters
    if (searchFilters.name) {
      filtered = filtered.filter(accessory => 
        accessory.name.toLowerCase().includes(searchFilters.name.toLowerCase())
      );
    }

    if (searchFilters.code) {
      filtered = filtered.filter(accessory => 
        accessory.code.toLowerCase().includes(searchFilters.code.toLowerCase())
      );
    }

    if (searchFilters.store) {
      filtered = filtered.filter(accessory => accessory.store === searchFilters.store);
    }

    if (searchFilters.priceMin) {
      filtered = filtered.filter(accessory => accessory.price >= parseFloat(searchFilters.priceMin));
    }

    if (searchFilters.priceMax) {
      filtered = filtered.filter(accessory => accessory.price <= parseFloat(searchFilters.priceMax));
    }

    if (searchFilters.qtyMin) {
      filtered = filtered.filter(accessory => accessory.qty >= parseFloat(searchFilters.qtyMin));
    }

    if (searchFilters.qtyMax) {
      filtered = filtered.filter(accessory => accessory.qty <= parseFloat(searchFilters.qtyMax));
    }

    if (searchFilters.stockStatus) {
      switch (searchFilters.stockStatus) {
        case 'in-stock':
          filtered = filtered.filter(accessory => accessory.qty > 0);
          break;
        case 'low-stock':
          filtered = filtered.filter(accessory => accessory.qty > 0 && accessory.qty <= 2);
          break;
        case 'out-of-stock':
          filtered = filtered.filter(accessory => accessory.qty === 0);
          break;
        case 'high-stock':
          filtered = filtered.filter(accessory => accessory.qty > 10);
          break;
      }
    }

    return filtered;
  };

  // Update search filters
  const updateSearchFilter = (key: string, value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all search filters
  const clearAllFilters = () => {
    setSearchFilters({
      name: '',
      code: '',
      priceMin: '',
      priceMax: '',
      qtyMin: '',
      qtyMax: '',
      stockStatus: '',
      store: ''
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return Object.values(searchFilters).some(value => value !== '');
  };

  // Count active filters
  const getActiveFilterCount = () => {
    return Object.values(searchFilters).filter(value => value !== '').length;
  };

  // Get store-specific email display
  const getStoreEmail = (storeName: string) => {
    switch (storeName.toLowerCase()) {
      case 'win':
        return 'winvision1717@gmail.com';
      case 'pwint':
        return 'pwintoptical@gmail.com';
      case 'yangon':
        return 'ygnoptical@gmail.com';
      default:
        return '';
    }
  };

  // Get store display name
  const getStoreDisplayName = (storeName: string) => {
    switch (storeName.toLowerCase()) {
      case 'win':
        return 'Win Vision Store';
      case 'pwint':
        return 'Pwint Optical Store';
      case 'yangon':
        return 'Yangon Optical Store';
      case 'main':
        return 'Main Store';
      default:
        return storeName.toUpperCase();
    }
  };

  // Get store color
  const getStoreColor = (storeName: string) => {
    switch (storeName.toLowerCase()) {
      case 'win':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pwint':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'yangon':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'main':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };
  
  useEffect(() => {
    if (!store || !canAccessStore(store)) return;

    let accessoryQuery;
    
    // If Main Store, show data from all stores (win, pwint, yangon, main)
    if (store === 'main') {
      accessoryQuery = query(
        collection(db, 'accessories'),
        where('store', 'in', ['win', 'pwint', 'yangon', 'main'])
      );
    } else {
      accessoryQuery = query(
        collection(db, 'accessories'),
        where('store', '==', store)
      );
    }

    const unsubscribe = onSnapshot(accessoryQuery, (snapshot) => {
      const accessoriesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          qty: Number(data.qty) || 0,
          price: Number(data.price) || 0,
          totalQty: Number(data.originalQty) || Number(data.qty) || 0,
          soldQty: Number(data.soldQty) || 0,
          transferInQty: Number(data.transferInQty) || 0,
          transferOutQty: Number(data.transferOutQty) || 0,
          restockQty: Number(data.restockQty) || 0
        } as AccessoriesFormData;
      });

      const qtyMap: Record<string, number> = {};
      accessoriesData.forEach(accessory => {
        if (accessory.id) {
          qtyMap[accessory.id] = accessory.originalQty || accessory.totalQty || accessory.qty;
        }
      });

      setOriginalQtyMap(qtyMap);
      setAccessories(accessoriesData);
      
      // Calculate inventory summary for main store
      if (store === 'main') {
        calculateStoreInventorySummary(accessoriesData);
      }
      
      setLoading(false);
    }, (error) => {
      console.error('Error fetching accessories:', error);
      toast.error('Failed to fetch accessories');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [store, canAccessStore]);

  // Recalculate summary when originalQtyMap changes
  useEffect(() => {
    if (store === 'main' && accessories.length > 0) {
      calculateStoreInventorySummary(accessories);
    }
  }, [originalQtyMap, accessories, store]);

  // Apply filters when data or filters change
  useEffect(() => {
    const filtered = applyFilters(accessories);
    setFilteredAccessories(filtered);
  }, [accessories, searchFilters]);

  // Return early if user doesn't have access to this store
  if (store && !canAccessStore(store)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            You don't have permission to access the {store?.toUpperCase()} store accessories.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleAddAccessory = () => {
    if (!canAddAccessories) {
      toast.error('You do not have permission to add accessories');
      return;
    }
    setEditingAccessory(null);
    setIsFormModalOpen(true);
  };

  const handleEditAccessory = (accessory: AccessoriesFormData) => {
    if (!canEditAccessories) {
      toast.error('You do not have permission to edit accessories');
      return;
    }
    
    // FIXED: Map the actual remaining stock (qty) to remainingQty for the form
    const editingData = {
      ...accessory,
      remainingQty: accessory.qty || 0, // Map actual stock to remainingQty field
      totalQty: originalQtyMap[accessory.id || ''] || accessory.totalQty || accessory.qty || 0,
      originalQty: originalQtyMap[accessory.id || ''] || accessory.totalQty || accessory.qty || 0
    };
    
    setEditingAccessory(editingData);
    setIsFormModalOpen(true);
  };

  const handleDeleteAccessory = (accessory: AccessoriesFormData) => {
    if (!canDeleteAccessories) {
      toast.error('You do not have permission to delete accessories');
      return;
    }
    setAccessoryToDelete(accessory);
    setDeleteDialogOpen(true);
  };

  const handleSellAccessory = (accessory: AccessoriesFormData) => {
    if (!canManageAccessories) {
      toast.error('You do not have permission to sell accessories');
      return;
    }
    setAccessoryToSell(accessory);
    setSellDialogOpen(true);
  };

  const handleViewDetail = (accessory: AccessoriesFormData) => {
    setSelectedAccessory(accessory);
    setDetailViewOpen(true);
  };

  // Restock function for Accessories
  const handleRestockAccessory = (accessory: AccessoriesFormData) => {
    if (!canManageAccessories) {
      toast.error('You do not have permission to restock accessories');
      return;
    }
    setAccessoryToRestock(accessory);
    setRestockData({
      qty: 0,
      reason: '',
      supplier: ''
    });
    setRestockDialogOpen(true);
  };

  // Process restock for Accessories
  const processRestock = async () => {
    if (!accessoryToRestock) return;

    if (restockData.qty <= 0) {
      toast.error('Please enter valid restock quantity');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const accessoryRef = docRef(db, 'accessories', accessoryToRestock.id!);
      
      // CORRECT INVENTORY LOGIC:
      // Original Qty = Initial Stock (Never Changes)
      // Restock Qty = Total Restocked Amount
      // Sold Qty = Total Sold Amount  
      // Remaining = Original + Restock - Sold
      
      await updateDoc(accessoryRef, {
        restockQty: increment(restockData.qty),
        qty: increment(restockData.qty),
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add restock record for tracking
      await addDoc(collection(db, 'restockHistory'), {
        itemId: accessoryToRestock.id,
        itemType: 'Accessory',
        name: accessoryToRestock.name,
        code: accessoryToRestock.code,
        restockQty: restockData.qty,
        reason: restockData.reason,
        supplier: restockData.supplier,
        store: accessoryToRestock.store,
        staffEmail: user?.email || 'demo@example.com',
        date: serverTimestamp(),
        price: accessoryToRestock.price,
      });

      toast.success(`✅ Successfully restocked ${restockData.qty} pieces of ${accessoryToRestock.name}!`);
      setRestockDialogOpen(false);
      setAccessoryToRestock(null);
      
    } catch (error) {
      console.error('❌ Error restocking accessory:', error);
      toast.error('Failed to restock accessory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (data: AccessoriesFormData) => {
    if (!store || !user?.email) return;

    try {
      setIsSubmitting(true);

      if (editingAccessory?.id) {
        if (!canEditAccessories) {
          toast.error('You do not have permission to edit accessories');
          return;
        }

        // Calculate the difference in total quantity
        const totalQtyBefore = originalQtyMap[editingAccessory.id] ?? editingAccessory.totalQty ?? 0;
        const totalQtyAfter = data.totalQty ?? 0;
        const qtyDifference = totalQtyAfter - totalQtyBefore;

        // Sold qty is unchanged
        const soldQty = editingAccessory.soldQty || 0;

        // New remaining qty = previous remaining qty + difference in total qty
        const newRemainingQty = (editingAccessory.qty ?? 0) + qtyDifference;
        
        const changes = Object.entries(data)
          .filter(([key, value]) => {
            const oldValue = editingAccessory[key as keyof AccessoriesFormData];
            return value !== oldValue && !['id', 'updatedAt'].includes(key);
          })
          .map(([field, newValue]) => ({
            field,
            oldValue: String(editingAccessory[field as keyof AccessoriesFormData] || ''),
            newValue: String(newValue || '')
          }));
          
        const updatedData = {
          ...data,
          totalQty: totalQtyAfter,
          soldQty: soldQty,
          qty: newRemainingQty,
          originalQty: totalQtyAfter,
          transferInQty: editingAccessory.transferInQty || 0,
          transferOutQty: editingAccessory.transferOutQty || 0,
          updatedAt: serverTimestamp(),
        };

        await updateItemWithHistory(
          'accessories',
          editingAccessory.id,
          editingAccessory,
          updatedData,
          store,
          user.email
        );

        toast.success('Accessory updated successfully');
      } else {
        if (!canAddAccessories) {
          toast.error('You do not have permission to add accessories');
          return;
        }

        // For new items, set all quantities equal
        const newAccessory = {
          ...data,
          totalQty: data.totalQty,
          soldQty: 0,
          qty: data.totalQty,
          originalQty: data.totalQty,
          transferInQty: 0,
          transferOutQty: 0,
          store,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'accessories'), newAccessory);
        toast.success('New accessory added successfully');
      }

      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving accessory:', error);
      toast.error('Failed to save accessory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!accessoryToDelete?.id || !store || !user?.email || !canDeleteAccessories) return;
    
    try {
      await deleteItemWithHistory(
        'accessories',
        accessoryToDelete.id,
        accessoryToDelete,
        store,
        user.email
      );
      
      setOriginalQtyMap(prev => {
        const newMap = { ...prev };
        delete newMap[accessoryToDelete.id];
        return newMap;
      });
      
      toast.success('Accessory deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting accessory:', error);
      toast.error('Failed to delete accessory');
    }
  };

  const confirmSell = async (quantity: number) => {
    if (!accessoryToSell?.id || !store || !user?.email || !canManageAccessories) return;
    
    try {
      const newQty = accessoryToSell.qty - quantity;
      if (newQty < 0) {
        toast.error('Not enough quantity available');
        return;
      }
      
      const updatedData = {
        qty: newQty,
        soldQty: (accessoryToSell.soldQty || 0) + quantity,
        updatedAt: serverTimestamp(),
      };

      await updateItemWithHistory(
        'accessories',
        accessoryToSell.id,
        accessoryToSell,
        {
          ...accessoryToSell,
          ...updatedData
        },
        store,
        user.email,
        [
          {
            field: 'qty',
            oldValue: String(accessoryToSell.qty),
            newValue: String(newQty)
          },
          {
            field: 'soldQty',
            oldValue: String(accessoryToSell.soldQty || 0),
            newValue: String((accessoryToSell.soldQty || 0) + quantity)
          }
        ]
      );
      
      // Record the sale
      await addDoc(collection(db, 'sales'), {
        itemId: accessoryToSell.id,
        itemName: accessoryToSell.name,
        itemCode: accessoryToSell.code,
        itemType: 'Accessories',
        store,
        quantity,
        unitPrice: accessoryToSell.price,
        totalPrice: accessoryToSell.price * quantity,
        date: serverTimestamp(),
      });

      toast.success(`Sold ${quantity} units successfully`);
      setSellDialogOpen(false);
    } catch (error) {
      console.error('Error selling accessory:', error);
      toast.error('Failed to process sale');
    }
  };

  const accessoryColumns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'code', header: 'Code', sortable: true },
    // Conditionally show store column for Main Store view
    ...(store === 'main' ? [{
      key: 'store',
      header: 'Store',
      sortable: true,
      render: (row: AccessoriesFormData) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStoreColor(row.store || '')}`}>
          {getStoreDisplayName(row.store || 'UNKNOWN')}
        </span>
      )
    }] : []),
    { 
      key: 'totalQty', 
      header: 'Total Qty', 
      sortable: true,
      render: (row: AccessoriesFormData) => (
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {originalQtyMap[row.id || ''] || row.qty || 0}
        </span>
      )
    },
    { 
      key: 'soldQty', 
      header: 'Sold Qty', 
      sortable: true,
      render: (row: AccessoriesFormData) => (
        <span className="font-medium text-orange-600 dark:text-orange-400">
          {row.soldQty || 0}
        </span>
      )
    },
    { 
      key: 'transferInQty', 
      header: 'Transfer In', 
      sortable: true,
      render: (row: AccessoriesFormData) => (
        <span className="font-medium text-green-600 dark:text-green-400">
          {row.transferInQty || 0}
        </span>
      )
    },
    { 
      key: 'transferOutQty', 
      header: 'Transfer Out', 
      sortable: true,
      render: (row: AccessoriesFormData) => (
        <span className="font-medium text-purple-600 dark:text-purple-400">
          {row.transferOutQty || 0}
        </span>
      )
    },
    { 
      key: 'remainingQty', 
      header: 'Remaining Qty', 
      sortable: true,
      render: (row: AccessoriesFormData) => {
        const isLowStock = row.qty <= 2;
        const isOutOfStock = row.qty === 0;
        return (
          <span className={`font-medium ${
            isOutOfStock 
              ? 'text-red-600 dark:text-red-400' 
              : isLowStock 
              ? 'text-yellow-600 dark:text-yellow-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            {row.qty || 0}
            {isOutOfStock && (
              <span className="ml-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1 py-0.5 rounded">
                Out
              </span>
            )}
            {isLowStock && !isOutOfStock && (
              <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1 py-0.5 rounded">
                Low
              </span>
            )}
          </span>
        );
      }
    },
    { 
      key: 'restockQty', 
      header: 'Restock Qty', 
      sortable: true,
      sortType: 'number',
      getValue: (row: AccessoriesFormData) => row.restockQty || 0,
      render: (row: AccessoriesFormData) => {
        const restockQty = row.restockQty || 0;
        
        return (
          <div className="text-center">
            <div className={`font-medium ${
              restockQty > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {restockQty} pcs
            </div>
            {restockQty > 0 && (
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1 py-0.5 rounded">
                Restocked
              </span>
            )}
            {restockQty === 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                No Restock
              </span>
            )}
          </div>
        );
      }
    },
    { 
      key: 'price', 
      header: 'Price', 
      sortable: true, 
      render: (row: AccessoriesFormData) => formatCurrency(row.price)
    },
    // Conditionally render actions column based on permissions
    // Only show actions column for owner and admin
    ...((['yannaing190792@gmail.com', 'kyawwinhtun564@gmail.com', 'wpy.muse@gmail.com'].includes(user?.email || '')) ? [{
      key: 'actions',
      header: 'Actions',
      render: (row: AccessoriesFormData) => (
      <div className="flex space-x-1">
        <Button
        variant="outline"
        size="sm"
        onClick={() => handleViewDetail(row)}
        className="p-1.5"
        title="View Details"
        >
        <Eye size={14} />
        </Button>
        
        {canEditAccessories && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditAccessory(row)}
          className="p-1.5"
          title="Edit Accessory"
        >
          <Edit size={14} />
        </Button>
        )}
        
        <Button
        variant="outline"
        size="sm"
        onClick={() => handleSellAccessory(row)}
        className="p-1.5"
        disabled={row.qty <= 0}
        title="Sell Accessory"
        >
        <ShoppingCart size={14} />
        </Button>
        
        {/* Restock - Available for ALL accessories */}
        {canManageAccessories && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRestockAccessory(row)}
            className="p-1.5 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900 dark:hover:text-green-300"
            title="Restock Accessory (Add Inventory)"
          >
            <Package size={14} />
          </Button>
        )}
        
        {canDeleteAccessories && (
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleDeleteAccessory(row)}
          className="p-1.5"
          title="Delete Accessory"
        >
          <Trash2 size={14} />
        </Button>
        )}
      </div>
      ),
    }] : [])
    ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto p-4 space-y-6">
        <Header title={store === 'main' ? `Accessories Management - MAIN STORE (All Locations)` : `Accessories Management - ${store?.toUpperCase()}`} />

        {/* Store Contact Information */}
        {store && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Store className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                {store === 'main' ? (
                  <div className="text-blue-800 dark:text-blue-200 text-sm">
                    <span className="font-medium">MAIN STORE - Consolidated View:</span>
                    <div className="mt-1 space-y-1 text-xs">
                      <div>• Win Store: winvision1717@gmail.com</div>
                      <div>• Pwint Store: pwintoptical@gmail.com</div>
                      <div>• Yangon Store: ygnoptical@gmail.com</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    <span className="font-medium">{store.toUpperCase()} Store Contact:</span> {getStoreEmail(store)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Permission Notice for Read-Only Users */}
        {!canManageAccessories && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                You have read-only access to accessories data. Contact an administrator for editing permissions.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'inventory'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Package className="h-4 w-4" />
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'transfers'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Transfers
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' ? (
          <div className="space-y-6">
            {/* Main Store Inventory Summary */}
            {store === 'main' && storeInventorySummary.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Store-wise Inventory Summary
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={inventoryView === 'summary' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setInventoryView('summary')}
                      className="transition-all duration-200"
                    >
                      <BarChart3 size={14} className="mr-1" />
                      Summary
                    </Button>
                    <Button
                      variant={inventoryView === 'detailed' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setInventoryView('detailed')}
                      className="transition-all duration-200"
                    >
                      <TrendingUp size={14} className="mr-1" />
                      Detailed
                    </Button>
                  </div>
                </div>

                {inventoryView === 'summary' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {storeInventorySummary.map((summary) => (
                      <div
                        key={summary.store}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {getStoreDisplayName(summary.store)}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStoreColor(summary.store)}`}>
                            {summary.store.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Items</span>
                            <span className="font-bold text-gray-900 dark:text-white">{summary.totalItems}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Stock</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{summary.totalQty}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Remaining</span>
                            <span className="font-bold text-green-600 dark:text-green-400">{summary.remainingQty}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Sold</span>
                            <span className="font-bold text-orange-600 dark:text-orange-400">{summary.soldQty}</span>
                          </div>
                          
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Stock Value</span>
                              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(summary.totalValue)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-red-500">Out: {summary.outOfStockItems}</span>
                              <span className="text-yellow-500">Low: {summary.lowStockItems}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Store</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Qty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sold Qty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Remaining</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transfer In</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transfer Out</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alerts</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {storeInventorySummary.map((summary) => (
                          <tr key={summary.store} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStoreColor(summary.store)}`}>
                                {getStoreDisplayName(summary.store)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {summary.totalItems}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                              {summary.totalQty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600 dark:text-orange-400">
                              {summary.soldQty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                              {summary.remainingQty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                              {summary.transferInQty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600 dark:text-purple-400">
                              {summary.transferOutQty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600 dark:text-purple-400">
                              {formatCurrency(summary.totalValue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                {summary.outOfStockItems > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    {summary.outOfStockItems} Out
                                  </span>
                                )}
                                {summary.lowStockItems > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    {summary.lowStockItems} Low
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Accessories Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-all duration-200">
              {/* Filter Section */}
              <div className="space-y-6">
                {/* Advanced Search Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Search size={20} className="text-gray-600 dark:text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Advanced Search & Filters
                      </h3>
                      {hasActiveFilters() && (
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                          {getActiveFilterCount()} active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasActiveFilters() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllFilters}
                          className="flex items-center gap-1 transition-all duration-200 hover:scale-[0.98]"
                        >
                          <X size={14} />
                          Clear All
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchExpanded(!searchExpanded)}
                        className="flex items-center gap-1 transition-all duration-200 hover:scale-[0.98]"
                      >
                        <Search size={14} />
                        {searchExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {searchExpanded ? 'Hide' : 'Show'} Search
                      </Button>
                    </div>
                  </div>

                  {/* Basic Search Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <Input
                      label="Search Name"
                      value={searchFilters.name}
                      onChange={(e) => updateSearchFilter('name', e.target.value)}
                      placeholder="Enter accessory name..."
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                    <Input
                      label="Search Code"
                      value={searchFilters.code}
                      onChange={(e) => updateSearchFilter('code', e.target.value)}
                      placeholder="Enter accessory code..."
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                    {store === 'main' && (
                      <Select
                        label="Store Filter"
                        value={searchFilters.store}
                        onChange={(e) => updateSearchFilter('store', e.target.value)}
                        options={storeOptions}
                      />
                    )}
                    <Select
                      label="Stock Status"
                      value={searchFilters.stockStatus}
                      onChange={(e) => updateSearchFilter('stockStatus', e.target.value)}
                      options={stockStatuses}
                    />
                  </div>

                  {/* Expanded Search Options */}
                  {searchExpanded && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <Input
                          label="Min Price"
                          type="number"
                          value={searchFilters.priceMin}
                          onChange={(e) => updateSearchFilter('priceMin', e.target.value)}
                          placeholder="Min price..."
                          className="transition-all duration-200 focus:scale-[1.02]"
                        />
                        <Input
                          label="Max Price"
                          type="number"
                          value={searchFilters.priceMax}
                          onChange={(e) => updateSearchFilter('priceMax', e.target.value)}
                          placeholder="Max price..."
                          className="transition-all duration-200 focus:scale-[1.02]"
                        />
                        <Input
                          label="Min Quantity"
                          type="number"
                          value={searchFilters.qtyMin}
                          onChange={(e) => updateSearchFilter('qtyMin', e.target.value)}
                          placeholder="Min qty..."
                          className="transition-all duration-200 focus:scale-[1.02]"
                        />
                        <Input
                          label="Max Quantity"
                          type="number"
                          value={searchFilters.qtyMax}
                          onChange={(e) => updateSearchFilter('qtyMax', e.target.value)}
                          placeholder="Max qty..."
                          className="transition-all duration-200 focus:scale-[1.02]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Results Summary and Add Button */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredAccessories.length}</span> of{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">{accessories.length}</span> accessories
                    {hasActiveFilters() && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400">(filtered)</span>
                    )}
                  </div>

                  {canAddAccessories && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleAddAccessory}
                      className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                    >
                      <PlusCircle size={16} />
                      Add Accessory
                    </Button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="mt-6">
                  <DataTable
                    data={filteredAccessories}
                    columns={accessoryColumns}
                    filterKey="name"
                    itemsPerPage={25}
                    searchable={false}
                    additionalFilters={[]}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <TransferManagement store={store || ''} />
        )}
        
        {/* Modals and Dialogs - Only render if user has permissions */}
        {canAddAccessories && (
          <FormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setEditingAccessory(null);
            }}
            title={editingAccessory ? 'Edit Accessory' : 'Add Accessory'}
          >
            <AccessoriesForm
              onSubmit={handleFormSubmit}
              initialData={editingAccessory || undefined}
              isSubmitting={isSubmitting}
            />
          </FormModal>
        )}
        
        {canDeleteAccessories && (
          <DeleteConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            itemName={accessoryToDelete?.name || ''}
            onDelete={confirmDelete}
          />
        )}
        
        {canManageAccessories && (
          <SellItemDialog
            isOpen={sellDialogOpen}
            onClose={() => setSellDialogOpen(false)}
            itemName={accessoryToSell?.name || ''}
            maxQuantity={accessoryToSell?.qty || 0}
            onSell={confirmSell}
          />
        )}
        
        <FormModal
          isOpen={detailViewOpen}
          onClose={() => setDetailViewOpen(false)}
          title="Accessory Details"
        >
          {selectedAccessory && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-gray-700 dark:text-gray-300">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-semibold text-lg break-all">{selectedAccessory.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</p>
                  <p className="font-medium">{selectedAccessory.code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Store</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStoreColor(selectedAccessory.store || '')}`}>
                    {getStoreDisplayName(selectedAccessory.store || 'UNKNOWN')}
                  </span>
                </div>
              </div>

              {/* Quantity Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quantity Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Quantity</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {originalQtyMap[selectedAccessory.id || ''] || selectedAccessory.qty || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sold Quantity</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {selectedAccessory.soldQty || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transfer In</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {selectedAccessory.transferInQty || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transfer Out</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {selectedAccessory.transferOutQty || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Quantity</p>
                    <p className={`text-xl font-bold ${selectedAccessory.qty <= 2 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {selectedAccessory.qty || 0}
                      {selectedAccessory.qty <= 2 && selectedAccessory.qty > 0 && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded-full">
                          Low Stock
                        </span>
                      )}
                      {selectedAccessory.qty === 0 && (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded-full">
                          Out of Stock
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(selectedAccessory.price)}
                </p>
              </div>
              
              {/* Action buttons in detail view - only show if user has permissions */}
              {canManageAccessories && (
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t">
                  {canEditAccessories && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailViewOpen(false);
                        handleEditAccessory(selectedAccessory);
                      }}
                      className="transition-all duration-200 hover:scale-[0.98]"
                    >
                      <Edit size={16} className="mr-2" />
                      Edit Accessory
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => {
                      setDetailViewOpen(false);
                      handleSellAccessory(selectedAccessory);
                    }}
                    disabled={selectedAccessory.qty <= 0}
                    className="transition-all duration-200 hover:scale-[0.98]"
                  >
                    <ShoppingCart size={16} className="mr-2" />
                    Sell Accessory
                  </Button>
                </div>
              )}
            </div>
          )}
        </FormModal>

        {/* Restock Dialog - For ALL accessories */}
        {canManageAccessories && (
          <FormModal
            isOpen={restockDialogOpen}
            onClose={() => {
              setRestockDialogOpen(false);
              setAccessoryToRestock(null);
            }}
            title={`Restock Accessory - ${accessoryToRestock?.name || ''}`}
          >
            <div className="space-y-4">
              {accessoryToRestock && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p><strong>Current Stock:</strong></p>
                    <p className="mt-2"><strong>Code:</strong> {accessoryToRestock.code}</p>
                    <p><strong>Total Remaining:</strong> {accessoryToRestock.qty || 0} pcs</p>
                    <p><strong>Price:</strong> {formatCurrency(accessoryToRestock.price)}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Restock Quantity
                </label>
                <Input
                  type="number"
                  min="0"
                  value={restockData.qty}
                  onChange={(e) => setRestockData({...restockData, qty: parseInt(e.target.value) || 0})}
                  placeholder="Enter quantity to add..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Restock Reason
                </label>
                <Select
                  value={restockData.reason}
                  onChange={(e) => setRestockData({...restockData, reason: e.target.value})}
                  options={[
                    { value: '', label: 'Select reason...' },
                    { value: 'new-delivery', label: 'New Delivery' },
                    { value: 'supplier-restock', label: 'Supplier Restock' },
                    { value: 'return-to-stock', label: 'Return to Stock' },
                    { value: 'inventory-adjustment', label: 'Inventory Adjustment' },
                    { value: 'other', label: 'Other' }
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Supplier/Source (Optional)
                </label>
                <Input
                  value={restockData.supplier}
                  onChange={(e) => setRestockData({...restockData, supplier: e.target.value})}
                  placeholder="Enter supplier name or source..."
                  className="w-full"
                />
              </div>

              {/* Summary */}
              {restockData.qty > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    Restock Summary:
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2 font-medium">
                    Total: +{restockData.qty} → {(accessoryToRestock?.qty || 0) + restockData.qty} pcs
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRestockDialogOpen(false);
                    setAccessoryToRestock(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={processRestock}
                  disabled={isSubmitting || restockData.qty === 0 || !restockData.reason}
                  className="flex-1"
                >
                  {isSubmitting ? 'Processing...' : `Restock +${restockData.qty} pcs`}
                </Button>
              </div>
            </div>
          </FormModal>
        )}
      </div>
    </div>
  );
};

export default AccessoriesPage;