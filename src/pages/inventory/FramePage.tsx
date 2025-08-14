import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart, Plus, Minus, Search, X, Filter, ChevronDown, ChevronUp, AlertTriangle, ArrowRightLeft, DollarSign, RefreshCw, FileSpreadsheet, Package } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ImageDisplay from '../../components/ui/imagedisplay';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import FrameForm, { FrameFormData } from '../../components/frame/FrameForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import TransferManagement from '../../components/transfer/TransferMangment';
import TransferStatusIndicator from '../../components/transfer/TransferStatusIndicator';
import toast from 'react-hot-toast';
import { formatCurrency, FrameCategory, FrameColor } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { deleteItemWithHistory, updateItemWithHistory } from '../../services/firebaseService';
import { doc as docRef, increment } from 'firebase/firestore';
import { usePermissions } from '../../hooks/useSidebarItem';

const FramePageWithTransfer: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  const navigate = useNavigate();
  
  const [frames, setFrames] = useState<FrameFormData[]>([]);
  const [filteredFrames, setFilteredFrames] = useState<FrameFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FrameCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers'>('inventory');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFrame, setEditingFrame] = useState<FrameFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [frameToDelete, setFrameToDelete] = useState<FrameFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [frameToSell, setFrameToSell] = useState<FrameFormData | null>(null);
  
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<FrameFormData | null>(null);

  // Restock dialog states
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [frameToRestock, setFrameToRestock] = useState<FrameFormData | null>(null);
  const [restockData, setRestockData] = useState({
    qty: 0,
    reason: '',
    supplier: ''
  });
  
  // Enhanced search states
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    code: '',
    name: '',
    priceMin: '',
    priceMax: '',
    qtyMin: '',
    qtyMax: '',
    stockStatus: ''
  });
  
  const { user } = useAuth();
  const { canManageFrames, canEditFrames, canDeleteFrames, canAddFrames, canAccessStore, canViewTransfers } = usePermissions();

  // Check store access on component mount
  useEffect(() => {
    if (store && !canAccessStore(store)) {
      toast.error(`You don't have access to ${store.toUpperCase()} store`);
      navigate('/dashboard');
      return;
    }
  }, [store, canAccessStore, navigate]);

  // Original quantity map to track sold quantities
  const [originalQtyMap, setOriginalQtyMap] = useState<Record<string, number>>({});
  // Original color quantities map
  const [originalColorQtyMap, setOriginalColorQtyMap] = useState<Record<string, Record<string, number>>>({});

  const frameCategories: FrameCategory[] = ['Eyeglasses', 'Sunglasses', 'Promotion', 'Ready', 'Ready BB', 'Error'];
  const stockStatuses = [
    { value: '', label: 'All Stock' },
    { value: 'in-stock', label: 'In Stock (>0)' },
    { value: 'low-stock', label: 'Low Stock (≤2)' },
    { value: 'out-of-stock', label: 'Out of Stock (0)' },
    { value: 'high-stock', label: 'High Stock (>10)' }
  ];

  // Natural sort function for frame codes
  const naturalSort = (a: string, b: string): number => {
    const regex = /([a-zA-Z]+)(\d+)/;
    const aMatch = a.match(regex);
    const bMatch = b.match(regex);
    
    if (aMatch && bMatch) {
      const [, aText, aNumStr] = aMatch;
      const [, bText, bNumStr] = bMatch;
      
      // Compare text part first
      if (aText !== bText) {
        return aText.localeCompare(bText);
      }
      
      // If text is same, compare numbers numerically
      return parseInt(aNumStr) - parseInt(bNumStr);
    }
    
    // Fallback to regular string comparison
    return a.localeCompare(b);
  };

  // Helper function to display quantity with proper zero handling
  // Display quantity as "0" if all values are zero or undefined
  const displayQuantity = (qty: number | undefined | null): string => {
    if (qty === undefined || qty === null || isNaN(qty) || qty === 0) {
      return "0";
    }
    return String(qty);
  };

  // Enhanced filter function
  const applyFilters = (framesList: FrameFormData[]) => {
    let filtered = [...framesList];

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(frame => frame.category === selectedCategory);
    }

    // Search filters
    if (searchFilters.code) {
      filtered = filtered.filter(frame => 
        frame.code.toLowerCase().includes(searchFilters.code.toLowerCase())
      );
    }

    if (searchFilters.name) {
      filtered = filtered.filter(frame => 
        frame.name.toLowerCase().includes(searchFilters.name.toLowerCase())
      );
    }

    if (searchFilters.priceMin) {
      filtered = filtered.filter(frame => frame.price >= parseFloat(searchFilters.priceMin));
    }

    if (searchFilters.priceMax) {
      filtered = filtered.filter(frame => frame.price <= parseFloat(searchFilters.priceMax));
    }

    if (searchFilters.qtyMin) {
      filtered = filtered.filter(frame => (frame.qty || 0) >= parseFloat(searchFilters.qtyMin));
    }

    if (searchFilters.qtyMax) {
      filtered = filtered.filter(frame => (frame.qty || 0) <= parseFloat(searchFilters.qtyMax));
    }

    if (searchFilters.stockStatus) {
      switch (searchFilters.stockStatus) {
        case 'in-stock':
          filtered = filtered.filter(frame => (frame.qty || 0) > 0);
          break;
        case 'low-stock':
          filtered = filtered.filter(frame => (frame.qty || 0) > 0 && (frame.qty || 0) <= 2);
          break;
        case 'out-of-stock':
          filtered = filtered.filter(frame => (frame.qty || 0) === 0);
          break;
        case 'high-stock':
          filtered = filtered.filter(frame => (frame.qty || 0) > 10);
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
      code: '',
      name: '',
      priceMin: '',
      priceMax: '',
      qtyMin: '',
      qtyMax: '',
      stockStatus: ''
    });
    setSelectedCategory(null);
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return Object.values(searchFilters).some(value => value !== '') ||
           selectedCategory !== null;
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory) count++;
    count += Object.values(searchFilters).filter(value => value !== '').length;
    return count;
  };

  // Set up real-time listener
  useEffect(() => {
    if (!store || !canAccessStore(store) || activeTab !== 'inventory') return;

    let frameQuery = query(
      collection(db, 'frames'),
      where('store', '==', store)
    );

    // Create real-time listener
    const unsubscribe = onSnapshot(frameQuery, (snapshot) => {
      const framesData = snapshot.docs.map(doc => {
        const data = doc.data();
        // If transferInQty is an array of objects, sum only those with matching name
        let transferInQty = 0;
        if (Array.isArray(data.transferInQtyDetails) && data.name) {
          transferInQty = data.transferInQtyDetails
        .filter((item: any) => item.name === data.name)
        .reduce((sum: number, item: any) => sum + (Number(item.qty) || 0), 0);
        } else {
          transferInQty = Number(data.transferInQty) || 0;
        }
        return {
          id: doc.id,
          ...data,
          qty: Number(data.qty) || 0,
          price: Number(data.price) || 0,
          prices: data.prices || [data.price || 0],
          priceLabels: data.priceLabels || ['Regular Price'],
          totalQty: Number(data.originalQty) || Number(data.qty) || 0,
          soldQty: Number(data.soldQty) || 0,
          transferInQty,
          transferOutQty: Number(data.transferOutQty) || 0,
          restockQty: Number(data.restockQty) || 0,
          colors: data.colors || {},
          originalColorQtys: data.originalColorQtys || data.colors || {}
        } as FrameFormData;
      });
      
      setFrames(framesData);
      
      // Update quantity maps
      const qtyMap: Record<string, number> = {};
      const colorQtyMap: Record<string, Record<string, number>> = {};
      
      framesData.forEach(frame => {
        if (frame.id) {
          qtyMap[frame.id] = frame.originalQty || frame.totalQty || frame.qty || 0;
          colorQtyMap[frame.id] = frame.originalColorQtys || frame.colors || {};
        }
      });
      
      setOriginalQtyMap(qtyMap);
      setOriginalColorQtyMap(colorQtyMap);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching frames:', error);
      toast.error('Failed to fetch frames');
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [store, canAccessStore, activeTab]);

  // Apply filters when data or filters change
  useEffect(() => {
    if (activeTab === 'inventory') {
      const filtered = applyFilters(frames);
      setFilteredFrames(filtered);
    }
  }, [frames, selectedCategory, searchFilters, activeTab]);

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
            You don't have permission to access the {store?.toUpperCase()} store frames.
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
  
  const handleAddFrame = () => {
    if (!canAddFrames) {
      toast.error('You do not have permission to add frames');
      return;
    }
    setEditingFrame(null);
    setIsFormModalOpen(true);
  };

  // Restock function for Frames
  const handleRestockFrame = (frame: FrameFormData) => {
    if (!canManageFrames) {
      toast.error('You do not have permission to restock frames');
      return;
    }
    setFrameToRestock(frame);
    setRestockData({
      qty: 0,
      reason: '',
      supplier: ''
    });
    setRestockDialogOpen(true);
  };

  // Process restock for Frames
  const processRestock = async () => {
    if (!frameToRestock) return;

    if (restockData.qty <= 0) {
      toast.error('Please enter valid restock quantity');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const frameRef = docRef(db, 'frames', frameToRestock.id!);
      
      // CORRECT INVENTORY LOGIC:
      // Original Qty = Initial Stock (Never Changes)
      // Restock Qty = Total Restocked Amount
      // Sold Qty = Total Sold Amount  
      // Remaining = Original + Restock - Sold
      
      await updateDoc(frameRef, {
        restockQty: increment(restockData.qty),
        qty: increment(restockData.qty),
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add restock record for tracking
      await addDoc(collection(db, 'restockHistory'), {
        itemId: frameToRestock.id,
        itemType: 'Frame',
        name: frameToRestock.name,
        code: frameToRestock.code,
        restockQty: restockData.qty,
        reason: restockData.reason,
        supplier: restockData.supplier,
        store: frameToRestock.store,
        staffEmail: user?.email || 'demo@example.com',
        date: serverTimestamp(),
        price: frameToRestock.price,
      });

      toast.success(`✅ Successfully restocked ${restockData.qty} pieces of ${frameToRestock.name}!`);
      setRestockDialogOpen(false);
      setFrameToRestock(null);
      
    } catch (error) {
      console.error('❌ Error restocking frame:', error);
      toast.error('Failed to restock frame. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh function
  const handleRefresh = () => {
    setLoading(true);
    // The useEffect will automatically trigger and reload data when loading state changes
    toast.success('Refreshing frames data...');
  };

  // Fixed Export to Excel function with proper UTF-8 encoding for Myanmar text
  const handleExportExcel = () => {
    try {
      // Create Excel-like CSV data with proper headers
      const headers = [
        'Code',
        'Name (အမည်)',
        'Category (အမျိုးအစား)',
        'Total Qty (စုစုပေါင်းအရေအတွက်)',
        'Sold Qty (ရောင်းပြီး)',
        'Transfer In (လွှဲပေးရရှိ)',
        'Transfer Out (လွှဲပေး)',
        'Restock Qty (ပြန်ဖြည့်)',
        'Current Qty (လက်ရှိအရေအတွက်)',
        'Price MMK (ဈေးနှုန်း)',
        'Colors (အရောင်များ)'
      ];

      // Sort frames by code using natural sorting before export
      const sortedFrames = [...filteredFrames].sort((a, b) => naturalSort(a.code || '', b.code || ''));

      const csvData = sortedFrames.map(frame => [
        frame.code || '',
        frame.name || '',
        frame.category || '',
        displayQuantity(originalQtyMap[frame.id || ''] || frame.qty),
        displayQuantity(frame.soldQty),
        displayQuantity(frame.transferInQty),
        displayQuantity(frame.transferOutQty),
        displayQuantity(frame.restockQty),
        displayQuantity(frame.qty),
        (frame.price || 0).toLocaleString(),
        Object.entries(frame.colors || {})
          .filter(([_, qty]) => qty && qty > 0)
          .map(([color, qty]) => `${color}(${qty})`)
          .join(', ')
      ]);

      // Add BOM for proper UTF-8 encoding (this fixes Myanmar text display in Excel)
      const BOM = '\uFEFF';
      const csvContent = BOM + [headers, ...csvData]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n'); // Use \r\n for better Excel compatibility

      // Create blob with proper UTF-8 encoding
      const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });

      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `frames-${store}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up memory
        
        toast.success('📊 Frames data exported successfully with Myanmar text support! (Sorted by code: EG1, EG2, EG3...)');
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error exporting data to Excel');
    }
  };
  
  const handleEditFrame = (frame: FrameFormData) => {
    if (!canEditFrames) {
      toast.error('You do not have permission to edit frames');
      return;
    }
    setEditingFrame(frame);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteFrame = (frame: FrameFormData) => {
    if (!canDeleteFrames) {
      toast.error('You do not have permission to delete frames');
      return;
    }
    setFrameToDelete(frame);
    setDeleteDialogOpen(true);
  };
  
 const handleSellFrame = async (frame: FrameFormData) => {
  if (!canManageFrames) {
    toast.error('You do not have permission to sell frames');
    return;
  }
  const remainingQty = frame.qty || 0;
  if (remainingQty <= 0) {
    toast.error('No items available to sell');
    return;
  }
  setFrameToSell(frame);
  setSellDialogOpen(true);
};
  
  const handleViewDetail = (frame: FrameFormData) => {
    setSelectedFrame(frame);
    setDetailViewOpen(true);
  };

  const handleFormSubmit = async (data: FrameFormData) => {
    if (!store) return;

    try {
      setIsSubmitting(true);

      if (editingFrame?.id) {
        if (!canEditFrames) {
          toast.error('You do not have permission to edit frames');
          return;
        }

        // Calculate quantity changes
        const prevOriginalQty = originalQtyMap[editingFrame.id] ?? editingFrame.qty ?? 0;
        const prevQty = editingFrame.qty ?? 0;
        const prevSoldQty = editingFrame.soldQty ?? 0;
        const newOriginalQty = data.totalQty;
        const newSoldQty = prevSoldQty;
        const newRemainingQty = data.totalQty - newSoldQty;

        // Track all changes
        const changes = Object.entries(data)
          .filter(([key, value]) => {
            const oldValue = editingFrame[key as keyof FrameFormData];
            return value !== oldValue && !['id', 'updatedAt'].includes(key);
          })
          .map(([field, newValue]) => ({
            field,
            oldValue: String(editingFrame[field as keyof FrameFormData] || ''),
            newValue: String(newValue || '')
          }));

        // Add quantity changes if they're different
        if (newOriginalQty !== prevOriginalQty) {
          changes.push({
            field: 'originalQty',
            oldValue: String(prevOriginalQty),
            newValue: String(newOriginalQty)
          });
          changes.push({
            field: 'qty',
            oldValue: String(prevQty),
            newValue: String(newRemainingQty)
          });
        }

        await updateItemWithHistory(
          'frames',
          editingFrame.id,
          editingFrame,
          {
            ...data,
            qty: newRemainingQty,
            originalQty: newOriginalQty,
            totalQty: newOriginalQty,
            soldQty: newSoldQty,
            remainingQty: newRemainingQty,
            restockQty: editingFrame.restockQty || 0,
            updatedAt: serverTimestamp(),
          },
          store,
          user?.email || '',
          changes
        );

        toast.success('Frame updated successfully');
      } else {
        if (!canAddFrames) {
          toast.error('You do not have permission to add frames');
          return;
        }

        // For new items
        const newFrame = {
          ...data,
          totalQty: data.totalQty,
          soldQty: 0,
          transferInQty: 0,
          transferOutQty: 0,
          restockQty: 0,
          remainingQty: data.totalQty,
          originalQty: data.totalQty,
          qty: data.totalQty,
          store,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'frames'), newFrame);
        toast.success('New frame added successfully');
      }

      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving frame:', error);
      toast.error('Failed to save frame');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!frameToDelete?.id || !store || !canDeleteFrames) return;
    
    try {
      await deleteItemWithHistory(
        'frames',
        frameToDelete.id,
        frameToDelete,
        store,
        user?.email || ''
      );
      
      // Update local state
      setOriginalQtyMap(prev => {
        const newMap = { ...prev };
        delete newMap[frameToDelete.id || ''];
        return newMap;
      });
      
      setOriginalColorQtyMap(prev => {
        const newMap = { ...prev };
        delete newMap[frameToDelete.id || ''];
        return newMap;
      });
      
      toast.success('Frame deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting frame:', error);
      toast.error('Failed to delete frame');
    }
  };
const confirmSell = async (quantity: number) => {
  if (!frameToSell?.id || !store || !canManageFrames) return;
  
  try {
    const frameRef = doc(db, 'frames', frameToSell.id);
    const frameDoc = await getDoc(frameRef);
    
    if (!frameDoc.exists()) {
      toast.error('Frame no longer exists');
      return;
    }

    const frameData = frameDoc.data();
    const currentQty = frameData.qty || 0;
    
    if (quantity > currentQty) {
      toast.error('Cannot sell more than available quantity');
      return;
    }
    
    const newQty = currentQty - quantity;
    const newSoldQty = (frameData.soldQty || 0) + quantity;

    // Track changes
    const changes = [
      {
        field: 'qty',
        oldValue: String(currentQty),
        newValue: String(newQty)
      },
      {
        field: 'soldQty',
        oldValue: String(frameData.soldQty || 0),
        newValue: String(newSoldQty)
      }
    ];

    await updateItemWithHistory(
      'frames',
      frameToSell.id,
      frameToSell,
      {
        qty: newQty,
        soldQty: newSoldQty,
        updatedAt: serverTimestamp(),
      },
      store,
      user?.email || '',
      changes
    );
    
    // Create sale record
    await addDoc(collection(db, 'sales'), {
      itemId: frameToSell.id,
      itemName: frameToSell.name,
      itemType: 'Frame',
      category: frameToSell.category,
      store,
      quantity,
      unitPrice: frameToSell.price,
      totalPrice: frameToSell.price * quantity,
      date: serverTimestamp(),
      soldBy: user?.email || '',
    });
    
    toast.success(`Sold ${quantity} ${frameToSell.name} successfully`);
    setSellDialogOpen(false);
  } catch (error) {
    console.error('Error selling frame:', error);
    toast.error('Failed to process sale');
  }
};

  const handleColorQuantityChange = async (color: string, change: number) => {
    if (!selectedFrame?.id || !store || !canEditFrames) {
      toast.error('You do not have permission to modify quantities');
      return;
    }

    try {
      const currentColors = selectedFrame.colors || {};
      const currentQty = parseInt(String(selectedFrame.qty)) || 0;
      
      if (change < 0) {
        toast.error('Total quantity cannot be decreased');
        return;
      }

      const newColorQty = Math.max(0, (currentColors[color] || 0) + change);
      const newTotalQty = currentQty + change;

      const newColors = {
        ...currentColors,
        [color]: newColorQty
      };

      // Track changes
      const changes = [
        {
          field: `colors.${color}`,
          oldValue: String(currentColors[color] || 0),
          newValue: String(newColorQty)
        },
        {
          field: 'qty',
          oldValue: String(currentQty),
          newValue: String(newTotalQty)
        }
      ];

      // Update original color quantities if not set
      const currentOriginalColorQtys = originalColorQtyMap[selectedFrame.id] || { ...currentColors };
      if (!originalColorQtyMap[selectedFrame.id]) {
        currentOriginalColorQtys[color] = newColorQty;
        setOriginalColorQtyMap(prev => ({
          ...prev,
          [selectedFrame.id!]: currentOriginalColorQtys
        }));
      }

      await updateItemWithHistory(
        'frames',
        selectedFrame.id,
        selectedFrame,
        {
          colors: newColors,
          qty: newTotalQty,
          originalColorQtys: currentOriginalColorQtys,
          updatedAt: serverTimestamp(),
        },
        store,
        user?.email || '',
        changes
      );

      toast.success(`Updated ${color} quantity successfully`);
    } catch (error) {
      console.error('Error updating color quantity:', error);
      toast.error('Failed to update quantity');
    }
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
  
// In FramePage.tsx, replace the frameColumns definition with this:
const frameColumns = [
  { key: 'code', header: 'Code', sortable: true },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'category', header: 'Category', sortable: true },
  { 
    key: 'colors', 
    header: 'Colors', 
    render: (row: FrameFormData) => {
      const colorCount = Object.values(row.colors || {}).filter(qty => qty && qty > 0).length;
      return `${colorCount} colors`;
    }
  },
  { 
    key: 'totalQty', 
    header: 'Total Qty', 
    sortable: true,
    render: (row: FrameFormData) => (
      <span className="font-medium text-blue-600 dark:text-blue-400">
        {displayQuantity(originalQtyMap[row.id || ''] || row.qty)}
      </span>
    )
  },
  { 
    key: 'soldQty', 
    header: 'Sold Qty', 
    sortable: true,
    render: (row: FrameFormData) => {
      const soldQty = row.soldQty || 0;
      return (
        <span className="font-medium text-red-600 dark:text-red-400">
          {displayQuantity(soldQty)}
        </span>
      );
    }
  },
  { 
    key: 'transferStatus', 
    header: 'Transfer Status (လွှဲပြောင်းမှု)', 
    render: (row: FrameFormData) => {
      const transferInQty = row.transferInQty || 0;
      const transferOutQty = row.transferOutQty || 0;
      
      if (transferInQty === 0 && transferOutQty === 0) {
        return (
          <div className="text-center">
            <span className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border">
              No Transfers
              <br />
              <span className="text-xs opacity-75">လွှဲပြောင်းမှုမရှိ</span>
            </span>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {/* Transfer In */}
          {transferInQty > 0 && (
            <div className="text-center space-y-1">
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800">
                ⬇ IN: {transferInQty} units
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                from other stores ရောက်လာ
              </div>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Status: Received ✓
              </div>
            </div>
          )}

          {/* Transfer Out */}
          {transferOutQty > 0 && (
            <div className="text-center space-y-1">
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                ⬆ OUT: {transferOutQty} units
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                to other stores ပို့လိုက်
              </div>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Status: Sent ✓
              </div>
            </div>
          )}

          {/* Current Store Badge */}
          <div className="text-center">
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
              📦 {store?.toUpperCase()} Store
            </div>
          </div>

          {/* Net Effect Summary */}
          {(transferInQty > 0 || transferOutQty > 0) && (
            <div className="text-center">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                (transferInQty - transferOutQty) > 0 
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                  : (transferInQty - transferOutQty) < 0
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                  : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}>
                Net: {transferInQty - transferOutQty > 0 ? '+' : ''}{transferInQty - transferOutQty}
              </div>
            </div>
          )}
        </div>
      );
    }
  },
  { 
    key: 'restockQty', 
    header: 'Restock Qty', 
    sortable: true,
    sortType: 'number',
    getValue: (row: FrameFormData) => row.restockQty || 0,
    render: (row: FrameFormData) => {
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
    key: 'remainingQty', 
    header: 'Current Qty', 
    sortable: true,
    render: (row: FrameFormData) => {
      const qty = row.qty || 0;
      const isLowStock = qty <= 2;
      const isOutOfStock = qty === 0;
      return (
        <span className={`font-medium ${
          isOutOfStock 
            ? 'text-red-600 dark:text-red-400' 
            : isLowStock 
            ? 'text-yellow-600 dark:text-yellow-400' 
            : 'text-green-600 dark:text-green-400'
        }`}>
          {displayQuantity(qty)}
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
    header: 'Pricing', 
    sortable: true, 
    render: (row: FrameFormData) => {
      const prices = row.prices || [row.price || 0];
      const labels = row.priceLabels || ['Regular Price'];
      
      if (prices.length === 1) {
        return formatCurrency(prices[0]);
      }
      
      return (
        <div className="space-y-1">
          {prices.slice(0, 2).map((price, index) => (
            <div key={index} className="text-xs">
              <span className="text-gray-600 dark:text-gray-400">{labels[index]}:</span>
              <span className="font-medium ml-1">{formatCurrency(price)}</span>
            </div>
          ))}
          {prices.length > 2 && (
            <div className="text-xs text-blue-600 dark:text-blue-400">
              +{prices.length - 2} more
            </div>
          )}
        </div>
      );
    }
  },
  // Only show actions for admin and owner
  ...((['admin', 'owner'].includes(user?.role) || 
      ['yannaing190792@gmail.com', 'kyawwinhtun564@gmail.com','wpy.muse@gmail.com'].includes(user?.email)) ? [{
    key: 'actions',
    header: 'Actions',
    render: (row: FrameFormData) => {
      return (
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
          
          {canEditFrames && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleEditFrame(row)}
              className="p-1.5"
              title="Edit Frame"
            >
              <Edit size={14} />
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSellFrame(row)}
            className="p-1.5"
            disabled={(row.qty || 0) <= 0}
            title="Sell Frame"
          >
            <ShoppingCart size={14} />
          </Button>

          {/* Restock - Available for ALL frames */}
          {canManageFrames && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestockFrame(row)}
              className="p-1.5 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900 dark:hover:text-green-300"
              title="Restock Frame (Add Inventory)"
            >
              <Package size={14} />
            </Button>
          )}
          
          {canDeleteFrames && (
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => handleDeleteFrame(row)}
              className="p-1.5"
              title="Delete Frame"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      );
    },
  }] : [])
];

  const tabs = [
    {
      id: 'inventory' as const,
      label: 'Frame Inventory',
      icon: <Eye className="h-4 w-4" />,
      description: 'Manage frame inventory and stock'
    },
    ...(canViewTransfers ? [{
      id: 'transfers' as const,
      label: 'Transfer Management',
      icon: <ArrowRightLeft className="h-4 w-4" />,
      description: 'Manage frame transfers between stores'
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto p-4 space-y-6">
        <Header title={`Frame Management - ${store?.toUpperCase()}`} />

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
       {canManageFrames && (
  <SellItemDialog
    isOpen={sellDialogOpen}
    onClose={() => setSellDialogOpen(false)}
    itemName={frameToSell?.name || ''}
    maxQuantity={frameToSell?.qty || 0}
    onSell={confirmSell}
  />
)}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
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
                  Frame Category
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  <Button
                    variant={selectedCategory === null ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    All Categories
                  </Button>
                  {frameCategories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="w-full transition-all duration-200 hover:scale-[0.98]"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <Input
                    label="Search Code"
                    value={searchFilters.code}
                    onChange={(e) => updateSearchFilter('code', e.target.value)}
                    placeholder="Enter frame code..."
                    className="transition-all duration-200 focus:scale-[1.02]"
                  />
                  <Input
                    label="Search Name"
                    value={searchFilters.name}
                    onChange={(e) => updateSearchFilter('name', e.target.value)}
                    placeholder="Enter frame name..."
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
                  Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredFrames.length}</span> of{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{frames.length}</span> frames
                  {hasActiveFilters() && (
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
                  
                  {canAddFrames && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleAddFrame}
                      className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                    >
                      <PlusCircle size={16} />
                      Add Frame
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
                  data={filteredFrames}
                  columns={frameColumns}
                  filterKey="name"
                  itemsPerPage={25}
                  searchable={false}
                  additionalFilters={[]}
                />
              </div>
            )}
          </div>
        ) : (
          <TransferManagement store={store!} />
        )}

        {/* Modals and Dialogs - Only render if user has permissions */}
        {(canAddFrames || canEditFrames) && (
          <FormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setEditingFrame(null);
            }}
            title={editingFrame ? 'Edit Frame' : 'Add Frame'}
          >
            <FrameForm
              onSubmit={handleFormSubmit}
              initialData={editingFrame || undefined}
              isSubmitting={isSubmitting}
            />
          </FormModal>
        )}
        
        {canDeleteFrames && (
          <DeleteConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            itemName={frameToDelete?.name || ''}
            onDelete={confirmDelete}
          />
        )}
        
        {canManageFrames && (
          <SellItemDialog
            isOpen={sellDialogOpen}
            onClose={() => setSellDialogOpen(false)}
            itemName={frameToSell?.name || ''}
            maxQuantity={frameToSell?.qty || 0}
            onSell={confirmSell}
          />
        )}
        
        <FormModal
          isOpen={detailViewOpen}
          onClose={() => setDetailViewOpen(false)}
          title="Frame Details"
        >
          {selectedFrame && (
            <div>
              <div className="space-y-6">
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <ImageDisplay
                    src={selectedFrame.imageUrl}
                    alt={selectedFrame.name}
                    showStorageIndicator={true}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-gray-700 dark:text-gray-300">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</p>
                    <p className="font-semibold text-lg break-all">{selectedFrame.code}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-medium">{selectedFrame.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</p>
                    <p className="font-medium">{selectedFrame.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Quantity</p>
                    <p className="font-medium">{displayQuantity(originalQtyMap[selectedFrame.id || ''] || selectedFrame.qty)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sold Quantity</p>
                    <p className="font-medium text-red-600 dark:text-red-400">
                      {displayQuantity(selectedFrame.soldQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transfer In</p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      +{displayQuantity(selectedFrame.transferInQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transfer Out</p>
                    <p className="font-medium text-orange-600 dark:text-orange-400">
                      -{displayQuantity(selectedFrame.transferOutQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Restock Quantity</p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      +{displayQuantity(selectedFrame.restockQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Quantity</p>
                    <p className="font-medium">{displayQuantity(selectedFrame.qty)}</p>
                  </div>
                </div>

                {/* Enhanced Pricing Display */}
                {selectedFrame.prices && selectedFrame.prices.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <DollarSign size={20} />
                      Pricing Options
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedFrame.prices.map((price, index) => (
                        <div key={index} className="bg-white dark:bg-gray-700 p-3 rounded-lg border">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {selectedFrame.priceLabels?.[index] || `Price ${index + 1}`}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                            {formatCurrency(price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quantity Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Quantity</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {displayQuantity(originalQtyMap[selectedFrame.id || ''] || selectedFrame.qty)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sold Quantity</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {displayQuantity(selectedFrame.soldQty)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transfer In</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        +{displayQuantity(selectedFrame.transferInQty)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transfer Out</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        -{displayQuantity(selectedFrame.transferOutQty)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Restock Quantity</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        +{displayQuantity(selectedFrame.restockQty)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Quantity</p>
                      <p className={`text-2xl font-bold ${(selectedFrame.qty || 0) <= 2 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'} flex items-center`}>
                        {/* Minus button */}
                        {canEditFrames && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleColorQuantityChange('total', -1)}
                            className="p-1 mr-2"
                            disabled={!canEditFrames || (selectedFrame.qty || 0) <= 0}
                            title="Decrease Total Quantity"
                          >
                            <Minus size={16} />
                          </Button>
                        )}
                        {displayQuantity(selectedFrame.qty)}
                        {/* Plus button */}
                        {canEditFrames && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleColorQuantityChange('total', 1)}
                            className="p-1 ml-2"
                            disabled={!canEditFrames}
                            title="Increase Total Quantity"
                          >
                            <Plus size={16} />
                          </Button>
                        )}
                        {(selectedFrame.qty || 0) <= 2 && (selectedFrame.qty || 0) > 0 && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded-full">
                            Low Stock
                          </span>
                        )}
                        {(selectedFrame.qty || 0) === 0 && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded-full">
                            Out of Stock
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Color Distribution</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(selectedFrame.colors || {}).map(([color, qty]) => {
                      const originalColorQty = originalColorQtyMap[selectedFrame.id || '']?.[color] || qty || 0;
                      const soldColorQty = originalColorQty - (qty || 0);

                      return (
                        <div key={color} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{color}</p>
                          <div className="grid grid-cols-3 gap-1 text-xs mb-2">
                            <div>Total: {displayQuantity(originalColorQty)}</div>
                            <div className="text-orange-500">
                              Sold: {displayQuantity(soldColorQty)}
                              {/* Show edit button for sold qty if editing is allowed */}
                              {canEditFrames && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="ml-1 p-0.5"
                                  title="Edit Sold Qty"
                                  onClick={() => {
                                    // You can implement a modal or inline edit for sold qty here
                                    toast('Edit Sold Qty in Edit Frame Form');
                                  }}
                                >
                                  <Edit size={12} />
                                </Button>
                              )}
                            </div>
                            <div className="text-green-500">Remain: {displayQuantity(qty)}</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleColorQuantityChange(color, -1)}
                              className="p-1"
                              disabled={!canEditFrames}
                            >
                              <Minus size={14} />
                            </Button>
                            <span className="text-lg font-semibold text-gray-900 dark:text-white mx-2">
                              {displayQuantity(qty)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleColorQuantityChange(color, 1)}
                              className="p-1"
                              disabled={!canEditFrames}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Action buttons in detail view - only show if user has permissions */}
                {canManageFrames && (
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t">
                    {canEditFrames && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDetailViewOpen(false);
                          handleEditFrame(selectedFrame);
                        }}
                        className="transition-all duration-200 hover:scale-[0.98]"
                      >
                        <Edit size={16} className="mr-2" />
                        Edit Frame
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => {
                        setDetailViewOpen(false);
                        handleSellFrame(selectedFrame);
                      }}
                      disabled={(selectedFrame.qty || 0) <= 0}
                      className="transition-all duration-200 hover:scale-[0.98]"
                    >
                      <ShoppingCart size={16} className="mr-2" />
                      Sell Frame
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </FormModal>

        {/* Restock Dialog - For ALL frames */}
        {canManageFrames && (
          <FormModal
            isOpen={restockDialogOpen}
            onClose={() => {
              setRestockDialogOpen(false);
              setFrameToRestock(null);
            }}
            title={`Restock Frame - ${frameToRestock?.name || ''}`}
          >
            <div className="space-y-4">
              {frameToRestock && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p><strong>Current Stock:</strong></p>
                    <p className="mt-2"><strong>Code:</strong> {frameToRestock.code}</p>
                    <p><strong>Category:</strong> {frameToRestock.category}</p>
                    <p><strong>Total Remaining:</strong> {frameToRestock.qty || 0} pcs</p>
                    <p><strong>Price:</strong> {formatCurrency(frameToRestock.price)}</p>
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
                    Total: +{restockData.qty} → {(frameToRestock?.qty || 0) + restockData.qty} pcs
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRestockDialogOpen(false);
                    setFrameToRestock(null);
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

export default FramePageWithTransfer;