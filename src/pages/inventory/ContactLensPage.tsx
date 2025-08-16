import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart, Search, X, Filter, ChevronDown, ChevronUp, AlertTriangle, ArrowRightLeft, Package, RotateCcw, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import TransferManagement from '../../components/transfer/TransferMangment';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteItemWithHistory, updateItemWithHistory } from '../../services/firebaseService';
import { usePermissions } from '../../hooks/useSidebarItem';

// Define types
export type ContactLensCategory = 'မျက်ကပ်အကြည်' | 'Pretty and Shinning' | 'F.l' | 'Big Eye Black' | 'Ms plane' | 'Ms ပါဝါ color';

export interface ContactLensFormData {
  id?: string;
  code: string;
  name: string;
  category: ContactLensCategory;
  power?: string;
  qty: number;
  price: number;
  soldQty?: number;
  originalQty?: number;
  totalQty?: number;
  transferInQty?: number;
  transferOutQty?: number;
  restockQty?: number;
  store?: string;
  createdAt?: any;
  updatedAt?: any;
}

// RestockDialog component
const RestockDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  onRestock: (quantity: number) => void;
}> = ({ isOpen, onClose, itemName, onRestock }) => {
  const [quantity, setQuantity] = useState<number>(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0) {
      onRestock(quantity);
      setQuantity(1);
    }
  };

  const handleClose = () => {
    setQuantity(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Restock Item
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          How many units would you like to restock for <strong>{itemName}</strong>?
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Restock Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            required
            className="w-full"
          />
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Restock
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ContactLensForm component
const ContactLensForm: React.FC<{
  onSubmit: (data: ContactLensFormData) => void;
  initialData?: ContactLensFormData;
  isSubmitting: boolean;
}> = ({ onSubmit, initialData, isSubmitting }) => {
  const [formData, setFormData] = useState<ContactLensFormData>({
    code: initialData?.code || '',
    name: initialData?.name || '',
    category: initialData?.category || 'မျက်ကပ်အကြည်',
    power: initialData?.power || '',
    qty: initialData ? (initialData.originalQty || initialData.totalQty || initialData.qty || 0) : 0,
    price: initialData?.price || 0,
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        category: initialData.category || 'မျက်ကပ်အကြည်',
        power: initialData.power || '',
        qty: initialData.originalQty || initialData.totalQty || initialData.qty || 0,
        price: initialData.price || 0,
      });
    }
  }, [initialData]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.code.trim()) {
      toast.error('Code is required');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (formData.qty < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }
    
    if (formData.price < 0) {
      toast.error('Price cannot be negative');
      return;
    }
    
    onSubmit({
      ...formData,
      totalQty: formData.qty // Set totalQty to the entered quantity
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Code"
        value={formData.code}
        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
        required
      />
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
      />
      <Select
        label="Category"
        value={formData.category}
        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ContactLensCategory }))}
        options={[
          { value: 'မျက်ကပ်အကြည်', label: 'မျက်ကပ်အကြည်' },
          { value: 'Pretty and Shinning', label: 'Pretty and Shinning' },
          { value: 'F.l', label: 'F.l' },
          { value: 'Big Eye Black', label: 'Big Eye Black' },
          { value: 'Ms plane', label: 'Ms plane' },
          { value: 'Ms ပါဝါ color', label: 'Ms ပါဝါ color' }
        ]}
      />
      <Input
        label="Power"
        value={formData.power || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, power: e.target.value }))}
      />
      <Input
        label="Total Quantity"
        type="number"
        value={formData.qty}
        onChange={(e) => setFormData(prev => ({ ...prev, qty: Number(e.target.value) }))}
        required
        min={0}
      />
      <Input
        label="Price"
        type="number"
        value={formData.price}
        onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
        required
        min={0}
        step="0.01"
      />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving...' : 'Save Contact Lens'}
      </Button>
    </form>
  );
};

const ContactLensPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageContactLenses, canEditContactLenses, canDeleteContactLenses, canAddContactLenses, canAccessStore } = usePermissions();
  
  const [contactLenses, setContactLenses] = useState<ContactLensFormData[]>([]);
  const [filteredContactLenses, setFilteredContactLenses] = useState<ContactLensFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ContactLensCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers'>('inventory');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContactLens, setEditingContactLens] = useState<ContactLensFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactLensToDelete, setContactLensToDelete] = useState<ContactLensFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [contactLensToSell, setContactLensToSell] = useState<ContactLensFormData | null>(null);
  
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [contactLensToRestock, setContactLensToRestock] = useState<ContactLensFormData | null>(null);
  
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedContactLens, setSelectedContactLens] = useState<ContactLensFormData | null>(null);

  const [originalQtyMap, setOriginalQtyMap] = useState<Record<string, number>>({});

  // Search states
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    code: '',
    name: '',
    power: '',
    priceMin: '',
    priceMax: '',
    qtyMin: '',
    qtyMax: '',
    stockStatus: ''
  });

  // Helper function to display quantity with proper zero handling
  const displayQuantity = (qty: number | undefined | null): string => {
    return String(qty || 0);
  };

  const categories: ContactLensCategory[] = ['မျက်ကပ်အကြည်', 'Pretty and Shinning', 'F.l', 'Big Eye Black', 'Ms plane', 'Ms ပါဝါ color'];
  const stockStatuses = [
    { value: '', label: 'All Stock' },
    { value: 'in-stock', label: 'In Stock (>0)' },
    { value: 'low-stock', label: 'Low Stock (≤2)' },
    { value: 'out-of-stock', label: 'Out of Stock (0)' },
    { value: 'high-stock', label: 'High Stock (>10)' }
  ];

  // Check store access on component mount
  useEffect(() => {
    if (store && !canAccessStore(store)) {
      toast.error(`You don't have access to ${store.toUpperCase()} store`);
      navigate('/dashboard');
      return;
    }
  }, [store, canAccessStore, navigate]);

  // Memoized filter function for better performance
  const applyFilters = useCallback((contactLensesList: ContactLensFormData[]) => {
    let filtered = contactLensesList;

    if (selectedCategory) {
      filtered = filtered.filter(lens => lens.category === selectedCategory);
    }

    if (searchFilters.code) {
      const codeFilter = searchFilters.code.toLowerCase();
      filtered = filtered.filter(lens => 
        lens.code.toLowerCase().includes(codeFilter)
      );
    }

    if (searchFilters.name) {
      const nameFilter = searchFilters.name.toLowerCase();
      filtered = filtered.filter(lens => 
        lens.name.toLowerCase().includes(nameFilter)
      );
    }

    if (searchFilters.power) {
      const powerFilter = searchFilters.power.toLowerCase();
      filtered = filtered.filter(lens => 
        lens.power && lens.power.toLowerCase().includes(powerFilter)
      );
    }

    if (searchFilters.priceMin) {
      const minPrice = parseFloat(searchFilters.priceMin);
      filtered = filtered.filter(lens => lens.price >= minPrice);
    }

    if (searchFilters.priceMax) {
      const maxPrice = parseFloat(searchFilters.priceMax);
      filtered = filtered.filter(lens => lens.price <= maxPrice);
    }

    if (searchFilters.qtyMin) {
      const minQty = parseFloat(searchFilters.qtyMin);
      filtered = filtered.filter(lens => lens.qty >= minQty);
    }

    if (searchFilters.qtyMax) {
      const maxQty = parseFloat(searchFilters.qtyMax);
      filtered = filtered.filter(lens => lens.qty <= maxQty);
    }

    if (searchFilters.stockStatus) {
      switch (searchFilters.stockStatus) {
        case 'in-stock':
          filtered = filtered.filter(lens => lens.qty > 0);
          break;
        case 'low-stock':
          filtered = filtered.filter(lens => lens.qty > 0 && lens.qty <= 2);
          break;
        case 'out-of-stock':
          filtered = filtered.filter(lens => lens.qty === 0);
          break;
        case 'high-stock':
          filtered = filtered.filter(lens => lens.qty > 10);
          break;
      }
    }

    return filtered;
  }, [selectedCategory, searchFilters]);

  const updateSearchFilter = useCallback((key: string, value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchFilters({
      code: '',
      name: '',
      power: '',
      priceMin: '',
      priceMax: '',
      qtyMin: '',
      qtyMax: '',
      stockStatus: ''
    });
    setSelectedCategory(null);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.values(searchFilters).some(value => value !== '') ||
           selectedCategory !== null;
  }, [searchFilters, selectedCategory]);

  const getActiveFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory) count++;
    count += Object.values(searchFilters).filter(value => value !== '').length;
    return count;
  }, [searchFilters, selectedCategory]);

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

  // Set up real-time listener
  useEffect(() => {
    if (!store || !canAccessStore(store) || activeTab !== 'inventory') return;

    const contactLensQuery = query(
      collection(db, 'contactLenses'),
      where('store', '==', store)
    );

    const unsubscribe = onSnapshot(contactLensQuery, (snapshot) => {
      const contactLensesData = snapshot.docs.map(doc => {
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
        } as ContactLensFormData;
      });

      const qtyMap: Record<string, number> = {};
      contactLensesData.forEach(contactLens => {
        if (contactLens.id) {
          qtyMap[contactLens.id] = contactLens.originalQty || contactLens.totalQty || contactLens.qty;
        }
      });

      setOriginalQtyMap(qtyMap);
      setContactLenses(contactLensesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching contact lenses:', error);
      toast.error('Failed to fetch contact lenses');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [store, canAccessStore, activeTab]);

  // Apply filters when data or filters change
  useEffect(() => {
    if (activeTab === 'inventory') {
      const filtered = applyFilters(contactLenses);
      setFilteredContactLenses(filtered);
    }
  }, [contactLenses, selectedCategory, searchFilters, activeTab, applyFilters]);

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
            You don't have permission to access the {store?.toUpperCase()} store contact lenses.
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

  const handleFormSubmit = async (data: ContactLensFormData) => {
    if (!store || !user?.email) {
      toast.error('Store information or user email missing');
      return;
    }

    console.log('Form submit data:', data); // Debug log
    console.log('Editing contact lens:', editingContactLens); // Debug log
    try {
      setIsSubmitting(true);

      if (editingContactLens?.id) {
        if (!canEditContactLenses) {
          toast.error('You do not have permission to edit contact lenses');
          return;
        }

        // Calculate the difference in total quantity
        const totalQtyBefore = originalQtyMap[editingContactLens.id] ?? editingContactLens.totalQty ?? 0;
        const totalQtyAfter = data.totalQty ?? 0;
        const qtyDifference = totalQtyAfter - totalQtyBefore;

        // Sold qty is unchanged
        const soldQty = editingContactLens.soldQty || 0;

        // New remaining qty = previous remaining qty + difference in total qty
        const newRemainingQty = (editingContactLens.qty ?? 0) + qtyDifference;

        const updatedData = {
          ...data,
          totalQty: totalQtyAfter,
          soldQty: soldQty,
          qty: newRemainingQty,
          originalQty: totalQtyAfter,
          transferInQty: editingContactLens.transferInQty || 0,
          transferOutQty: editingContactLens.transferOutQty || 0,
          restockQty: editingContactLens.restockQty || 0,
          store,
          updatedAt: serverTimestamp(),
        };

        console.log('Updated data:', updatedData); // Debug log
        await updateItemWithHistory(
          'contactLenses',
          editingContactLens.id,
          editingContactLens,
          updatedData,
          store,
          user.email
        );

        toast.success('Contact lens updated successfully');
      } else {
        if (!canAddContactLenses) {
          toast.error('You do not have permission to add contact lenses');
          return;
        }

        // For new items, set all quantities equal
        const newContactLens = {
          ...data,
          totalQty: data.totalQty,
          soldQty: 0,
          qty: data.totalQty,
          originalQty: data.totalQty,
          transferInQty: 0,
          transferOutQty: 0,
          restockQty: 0,
          store,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        console.log('New contact lens data:', newContactLens); // Debug log
        await addDoc(collection(db, 'contactLenses'), newContactLens);
        toast.success('Contact lens added successfully');
      }

      setIsFormModalOpen(false);
      setEditingContactLens(null);
    } catch (error) {
      console.error('Error saving contact lens:', error);
      toast.error('Failed to save contact lens');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSell = async (quantity: number) => {
    if (!contactLensToSell?.id || !store || !user?.email || !canManageContactLenses) return;
    
    try {
      const newQty = contactLensToSell.qty - quantity;
      if (newQty < 0) {
        toast.error('Not enough quantity available');
        return;
      }
      
      const updatedData = {
        qty: newQty,
        soldQty: (contactLensToSell.soldQty || 0) + quantity,
        updatedAt: serverTimestamp(),
      };

      await updateItemWithHistory(
        'contactLenses',
        contactLensToSell.id,
        contactLensToSell,
        {
          ...contactLensToSell,
          ...updatedData
        },
        store,
        user.email,
        [
          {
            field: 'qty',
            oldValue: String(contactLensToSell.qty),
            newValue: String(newQty)
          },
          {
            field: 'soldQty',
            oldValue: String(contactLensToSell.soldQty || 0),
            newValue: String((contactLensToSell.soldQty || 0) + quantity)
          }
        ]
      );
      
      // Record the sale
      await addDoc(collection(db, 'sales'), {
        itemId: contactLensToSell.id,
        itemName: contactLensToSell.name,
        itemCode: contactLensToSell.code,
        itemType: 'Contact Lens',
        category: contactLensToSell.category,
        store,
        quantity,
        unitPrice: contactLensToSell.price,
        totalPrice: contactLensToSell.price * quantity,
        date: serverTimestamp(),
      });

      toast.success(`Sold ${quantity} units successfully`);
      setSellDialogOpen(false);
    } catch (error) {
      console.error('Error selling contact lens:', error);
      toast.error('Failed to process sale');
    }
  };

  const confirmRestock = async (quantity: number) => {
    if (!contactLensToRestock?.id || !store || !user?.email || !canEditContactLenses) return;
    
    try {
      const newQty = contactLensToRestock.qty + quantity;
      const newRestockQty = (contactLensToRestock.restockQty || 0) + quantity;
      
      const updatedData = {
        qty: newQty,
        restockQty: newRestockQty,
        updatedAt: serverTimestamp(),
      };

      await updateItemWithHistory(
        'contactLenses',
        contactLensToRestock.id,
        contactLensToRestock,
        {
          ...contactLensToRestock,
          ...updatedData
        },
        store,
        user.email,
        [
          {
            field: 'qty',
            oldValue: String(contactLensToRestock.qty),
            newValue: String(newQty)
          },
          {
            field: 'restockQty',
            oldValue: String(contactLensToRestock.restockQty || 0),
            newValue: String(newRestockQty)
          }
        ]
      );

      toast.success(`Restocked ${quantity} units successfully`);
      setRestockDialogOpen(false);
      setContactLensToRestock(null);
    } catch (error) {
      console.error('Error restocking contact lens:', error);
      toast.error('Failed to process restock');
    }
  };

  const confirmDelete = async () => {
    if (!contactLensToDelete?.id || !store || !user?.email || !canDeleteContactLenses) return;
    
    try {
      await deleteItemWithHistory(
        'contactLenses',
        contactLensToDelete.id,
        contactLensToDelete,
        store,
        user.email
      );
      
      setOriginalQtyMap(prev => {
        const newMap = { ...prev };
        delete newMap[contactLensToDelete.id];
        return newMap;
      });
      
      toast.success('Contact lens deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting contact lens:', error);
      toast.error('Failed to delete contact lens');
    }
  };

  const handleViewDetail = (contactLens: ContactLensFormData) => {
    setSelectedContactLens(contactLens);
    setDetailViewOpen(true);
  };

  const handleEditContactLens = (contactLens: ContactLensFormData) => {
    if (!canEditContactLenses) {
      toast.error('You do not have permission to edit contact lenses');
      return;
    }
    
    console.log('Editing contact lens:', contactLens); // Debug log
    setEditingContactLens(contactLens);
    setIsFormModalOpen(true);
  };

  const handleSellContactLens = (contactLens: ContactLensFormData) => {
    if (!canManageContactLenses) {
      toast.error('You do not have permission to sell contact lenses');
      return;
    }
    setContactLensToSell(contactLens);
    setSellDialogOpen(true);
  };

  const handleDeleteContactLens = (contactLens: ContactLensFormData) => {
    if (!canDeleteContactLenses) {
      toast.error('You do not have permission to delete contact lenses');
      return;
    }
    setContactLensToDelete(contactLens);
    setDeleteDialogOpen(true);
  };

  const handleRestockContactLens = (contactLens: ContactLensFormData) => {
    if (!canEditContactLenses) {
      toast.error('You do not have permission to restock contact lenses');
      return;
    }
    setContactLensToRestock(contactLens);
    setRestockDialogOpen(true);
  };

  const handleAddContactLens = () => {
    if (!canAddContactLenses) {
      toast.error('You do not have permission to add contact lenses');
      return;
    }
    setEditingContactLens(null);
    setIsFormModalOpen(true);
  };

  // Refresh function
  const handleRefresh = () => {
    setLoading(true);
    toast.success('Refreshing contact lenses data...');
  };

  // Export to Excel function
  const handleExportExcel = () => {
    try {
      // Create Excel-like CSV data
      const headers = [
        'Code',
        'Name',
        'Category',
        'Power',
        'Total Qty',
        'Sold Qty',
        'Remaining Qty',
        'Transfer In',
        'Transfer Out',
        'Restock Qty',
        'Price (MMK)'
      ];

      const csvData = filteredContactLenses.map(lens => [
        lens.code || '',
        lens.name || '',
        lens.category || '',
        lens.power || '',
        displayQuantity(originalQtyMap[lens.id || ''] || lens.qty),
        displayQuantity(lens.soldQty),
        displayQuantity(lens.qty),
        displayQuantity(lens.transferInQty),
        displayQuantity(lens.transferOutQty),
        displayQuantity(lens.restockQty),
        (lens.price || 0).toLocaleString()
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `contact-lenses-${store}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Contact lenses data exported successfully!');
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error exporting data to Excel');
    }
  };

  const contactLensColumns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { 
      key: 'power', 
      header: 'Power', 
      sortable: true,
      render: (row: ContactLensFormData) => row.power || '-'
    },
    { 
      key: 'totalQty', 
      header: 'Total Qty', 
      sortable: true,
      render: (row: ContactLensFormData) => (
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {displayQuantity(originalQtyMap[row.id || ''] || row.qty)}
        </span>
      )
    },
    { 
      key: 'soldQty', 
      header: 'Sold Qty', 
      sortable: true,
      render: (row: ContactLensFormData) => (
        <span className="font-medium text-orange-600 dark:text-orange-400">
          {displayQuantity(row.soldQty)}
        </span>
      )
    },
    { 
      key: 'transferInQty', 
      header: 'Transfer In', 
      sortable: true,
      render: (row: ContactLensFormData) => (
        <span className="font-medium text-green-600 dark:text-green-400">
          {displayQuantity(row.transferInQty)}
        </span>
      )
    },
    { 
      key: 'transferOutQty', 
      header: 'Transfer Out', 
      sortable: true,
      render: (row: ContactLensFormData) => (
        <span className="font-medium text-purple-600 dark:text-purple-400">
          {displayQuantity(row.transferOutQty)}
        </span>
      )
    },
    { 
      key: 'restockQty', 
      header: 'Restock Qty', 
      sortable: true,
      render: (row: ContactLensFormData) => (
        <span className="font-medium text-indigo-600 dark:text-indigo-400">
          {displayQuantity(row.restockQty)}
        </span>
      )
    },
    { 
      key: 'remainingQty', 
      header: 'Remaining Qty', 
      sortable: true,
      render: (row: ContactLensFormData) => {
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
            {displayQuantity(row.qty)}
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
      key: 'price', 
      header: 'Price', 
      sortable: true, 
      render: (row: ContactLensFormData) => formatCurrency(row.price)
    },
    // Conditionally render actions column based on permissions
    ...(canManageContactLenses ? [{
      key: 'actions',
      header: 'Actions',
      render: (row: ContactLensFormData) => (
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
          
          {canEditContactLenses && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleEditContactLens(row)}
                className="p-1.5"
                title="Edit Contact Lens"
              >
                <Edit size={14} />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRestockContactLens(row)}
                className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                title="Restock Contact Lens"
              >
                <RotateCcw size={14} />
              </Button>
            </>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSellContactLens(row)}
            className="p-1.5"
            disabled={row.qty <= 0}
            title="Sell Contact Lens"
          >
            <ShoppingCart size={14} />
          </Button>
          
          {canDeleteContactLenses && (
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => handleDeleteContactLens(row)}
              className="p-1.5"
              title="Delete Contact Lens"
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
        <Header title={`Contact Lens Management - ${store?.toUpperCase()}`} />

        {/* Store Contact Information */}
        {store && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  <span className="font-medium">{store.toUpperCase()} Store Contact:</span> {getStoreEmail(store)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Permission Notice for Read-Only Users */}
        {!canManageContactLenses && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                You have read-only access to contact lens data. Contact an administrator for editing permissions.
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-all duration-200">
            {/* Filter Section */}
            <div className="space-y-6">
              {/* Category Selection */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Filter size={20} />
                  Contact Lens Category
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  <Button 
                    variant={selectedCategory === null ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    All Categories
                  </Button>
                  
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="w-full transition-all duration-200 hover:scale-[0.98] text-xs"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Advanced Search Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Search size={20} className="text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Advanced Search
                    </h3>
                    {hasActiveFilters && (
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                        {getActiveFilterCount} active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
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
                    label="Search Code"
                    value={searchFilters.code}
                    onChange={(e) => updateSearchFilter('code', e.target.value)}
                    placeholder="Enter lens code..."
                    className="transition-all duration-200 focus:scale-[1.02]"
                  />
                  <Input
                    label="Search Name"
                    value={searchFilters.name}
                    onChange={(e) => updateSearchFilter('name', e.target.value)}
                    placeholder="Enter lens name..."
                    className="transition-all duration-200 focus:scale-[1.02]"
                  />
                  <Input
                    label="Search Power"
                    value={searchFilters.power}
                    onChange={(e) => updateSearchFilter('power', e.target.value)}
                    placeholder="Enter power value..."
                    className="transition-all duration-200 focus:scale-[1.02]"
                  />
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
                  Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredContactLenses.length}</span> of{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{contactLenses.length}</span> contact lenses
                  {hasActiveFilters && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">(filtered)</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                  >
                    <FileSpreadsheet size={16} />
                    Export Excel
                  </Button>
                  
                  {canAddContactLenses && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleAddContactLens}
                      className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                    >
                      <PlusCircle size={16} />
                      Add Contact Lens
                    </Button>
                  )}
                </div>
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
                  data={filteredContactLenses}
                  columns={contactLensColumns}
                  filterKey="code"
                  itemsPerPage={25}
                  searchable={false}
                  additionalFilters={[]}
                />
              </div>
            )}
          </div>
        ) : (
          <TransferManagement store={store || ''} />
        )}
        
        {/* Modals and Dialogs - Only render if user has permissions */}
        {canAddContactLenses && (
          <FormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setEditingContactLens(null);
            }}
            title={editingContactLens ? 'Edit Contact Lens' : 'Add Contact Lens'}
          >
            <ContactLensForm
              onSubmit={handleFormSubmit}
              initialData={editingContactLens || undefined}
              isSubmitting={isSubmitting}
            />
          </FormModal>
        )}
        
        {canDeleteContactLenses && (
          <DeleteConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            itemName={contactLensToDelete?.name || ''}
            onDelete={confirmDelete}
          />
        )}
        
        {canManageContactLenses && (
          <SellItemDialog
            isOpen={sellDialogOpen}
            onClose={() => setSellDialogOpen(false)}
            itemName={contactLensToSell?.name || ''}
            maxQuantity={contactLensToSell?.qty || 0}
            onSell={confirmSell}
          />
        )}
        
        {canEditContactLenses && (
          <RestockDialog
            isOpen={restockDialogOpen}
            onClose={() => {
              setRestockDialogOpen(false);
              setContactLensToRestock(null);
            }}
            itemName={contactLensToRestock?.name || ''}
            onRestock={confirmRestock}
          />
        )}
        
        <FormModal
          isOpen={detailViewOpen}
          onClose={() => setDetailViewOpen(false)}
          title="Contact Lens Details"
        >
          {selectedContactLens && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-gray-700 dark:text-gray-300">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</p>
                  <p className="font-semibold text-lg break-all">{selectedContactLens.code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium">{selectedContactLens.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</p>
                  <p className="font-medium">{selectedContactLens.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Power</p>
                  <p className="font-medium">{selectedContactLens.power || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Store</p>
                  <p className="font-medium capitalize">{selectedContactLens.store}</p>
                </div>
              </div>

              {/* Quantity Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quantity Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Quantity</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {displayQuantity(originalQtyMap[selectedContactLens.id || ''] || selectedContactLens.qty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sold Quantity</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {displayQuantity(selectedContactLens.soldQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transfer In</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {displayQuantity(selectedContactLens.transferInQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transfer Out</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {displayQuantity(selectedContactLens.transferOutQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Restock Quantity</p>
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      {displayQuantity(selectedContactLens.restockQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Quantity</p>
                    <p className={`text-xl font-bold ${selectedContactLens.qty <= 2 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {displayQuantity(selectedContactLens.qty)}
                      {selectedContactLens.qty <= 2 && selectedContactLens.qty > 0 && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded-full">
                          Low Stock
                        </span>
                      )}
                      {selectedContactLens.qty === 0 && (
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
                  {formatCurrency(selectedContactLens.price)}
                </p>
              </div>
              
              {/* Action buttons in detail view - only show if user has permissions */}
              {canManageContactLenses && (
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t">
                  {canEditContactLenses && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDetailViewOpen(false);
                          handleEditContactLens(selectedContactLens);
                        }}
                        className="transition-all duration-200 hover:scale-[0.98]"
                      >
                        <Edit size={16} className="mr-2" />
                        Edit Contact Lens
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDetailViewOpen(false);
                          handleRestockContactLens(selectedContactLens);
                        }}
                        className="transition-all duration-200 hover:scale-[0.98] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      >
                        <RotateCcw size={16} className="mr-2" />
                        Restock
                      </Button>
                    </>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => {
                      setDetailViewOpen(false);
                      handleSellContactLens(selectedContactLens);
                    }}
                    disabled={selectedContactLens.qty <= 0}
                    className="transition-all duration-200 hover:scale-[0.98]"
                  >
                    <ShoppingCart size={16} className="mr-2" />
                    Sell Contact Lens
                  </Button>
                </div>
              )}
            </div>
          )}
        </FormModal>
      </div>
    </div>
  );
};

export default ContactLensPage;