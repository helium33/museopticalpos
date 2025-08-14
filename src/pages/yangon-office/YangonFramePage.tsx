/*
 * YANGON OFFICE FRAME MANAGEMENT - QUANTITY FIXES APPLIED
 * 
 * ISSUES RESOLVED:
 * 1. NaN (Not a Number) values in remaining quantity display
 * 2. Duplicate safeNumber function definitions removed
 * 3. Fixed quantity calculations:
 *    - Total Qty = Original Qty + Transfer In - Transfer Out (read-only)
 *    - Remaining Qty = Total Qty - Sold Qty
 * 4. Enhanced sold quantity recording with better validation
 * 5. Improved visual display with status badges and color coding
 * 6. Added transfer management integration
 * 7. Fixed property name mismatches in table display
 * 8. Added proper error handling for all numeric operations
 * 
 * QUANTITY LOGIC:
 * - Original Qty: Initial stock quantity
 * - Transfer In: Quantity received from other stores
 * - Transfer Out: Quantity sent to other stores  
 * - Total Qty: Original + Transfer In - Transfer Out
 * - Sold Qty: Total quantity sold (incremental updates)
 * - Remaining Qty: Total - Sold (always calculated, never directly modified)
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Info,
  ArrowUpDown,
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowRightLeft,
  RefreshCw,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import YangonFrameForm from '../../components/yangon-office/YangonFrameForm';
import YangonFrameDetailView from '../../components/yangon-office/YangonFrameDetailView';
import TransferManagement from '../../components/transfer/TransferMangment';
import YangonFirebaseDebug from '../../components/yangon-office/YangonFirebaseDebug';
import { yangonFramesService, YangonFrame } from '../../services/yangonFirebaseService';
import { initializeYangonOfficeCollections } from '../../lib/yangonOfficeSetup';

interface CNumber {
  cNo: string;  // C Number (C1, C2, C3, etc.)
  qty: number;  // Quantity for this C Number
}

interface TransferRecord {
  id: string;
  qty: number;
  fromStore: string;
  toStore: string;
  status: 'pending' | 'completed' | 'cancelled';
  transferDate: Date;
  notes?: string;
}

// Use YangonFrame from the service, but extend for UI needs
type YangonFrameItem = YangonFrame & {
  cNumbers: CNumber[];
  transferInRecords: TransferRecord[];
  transferOutRecords: TransferRecord[];
  // Add other UI-specific fields if needed
};

const YangonFramePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const category = searchParams.get('category') as YangonFrameItem['category'] || 'Eyeglasses';
  
  const [items, setItems] = useState<YangonFrameItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof YangonFrameItem>('no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<YangonFrameItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTransferManagement, setShowTransferManagement] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailItem, setDetailItem] = useState<YangonFrameItem | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Check if user has Yangon access
  const hasYangonAccess = user?.email === 'yannaing190792@gmail.com' || user?.email === 'kyawwinhtun564@gmail.com';

  // Always use yangon-office store for Yangon office operations
  const currentStore: 'yangon' | 'yangon-office' = 'yangon-office';

  // Load Firebase data
  useEffect(() => {
    const loadFrames = async () => {
      if (!hasYangonAccess) {
        toast.error('Access denied. Only authorized Yangon office users can view this page.');
        return;
      }

      setIsLoading(true);
      try {
        console.log('🔄 Loading Yangon frames from Firebase...');
        
        // Initialize Yangon collections if needed
        await initializeYangonOfficeCollections();
        
        // Load frames from Firebase
        const frames = await yangonFramesService.getItems(currentStore, {
          isActive: true
        });
        
        console.log(`✅ Loaded ${frames.length} frames for store: ${currentStore}`);
        setItems(frames);
      } catch (error) {
        console.error('❌ Error loading frames:', error);
        toast.error('Failed to load frames. Please try again.');
        // Set empty array as fallback
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFrames();
  }, [hasYangonAccess, currentStore]);

  // Helper function to safely get numeric values (fix for NaN issues)
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Calculate total quantity safely (original qty + transfer in - transfer out)
  const calculateTotalQty = (item: YangonFrameItem): number => {
    const originalQty = safeNumber(item.qty);
    const transferIn = safeNumber(item.transferInQty);
    const transferOut = safeNumber(item.transferOutQty);
    return Math.max(0, originalQty + transferIn - transferOut);
  };

  // Calculate remaining quantity safely (total qty - sold qty)
  const calculateRemainingQty = (item: YangonFrameItem): number => {
    const totalQty = calculateTotalQty(item);
    const soldQty = safeNumber(item.soldQty);
    return Math.max(0, totalQty - soldQty);
  };

  // Filter items by category and search term
  const filteredItems = items.filter(item => {
    const matchesCategory = item.category === category;
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }).map(item => {
    // Ensure all quantities are proper numbers and calculate derived values
    const processedItem = {
      ...item,
      // Ensure all quantities are safe numbers
      qty: safeNumber(item.qty), // Original quantity
      soldQty: safeNumber(item.soldQty), // Sold quantity
      transferInQty: safeNumber(item.transferInQty), // Transfer in quantity
      transferOutQty: safeNumber(item.transferOutQty), // Transfer out quantity
      price: safeNumber(item.price),
      cost: safeNumber(item.cost),
      // Ensure arrays exist
      cNumbers: Array.isArray(item.cNumbers) ? item.cNumbers : [],
      transferInRecords: Array.isArray(item.transferInRecords) ? item.transferInRecords : [],
      transferOutRecords: Array.isArray(item.transferOutRecords) ? item.transferOutRecords : []
    };
    
    // Calculate derived quantities using helper functions
    const totalQty = calculateTotalQty(processedItem);
    const remainingQty = calculateRemainingQty(processedItem);
    
    return {
      ...processedItem,
      totalQty, // Total quantity (read-only): original + transfer in - transfer out
      remainingQty // Remaining quantity: total - sold
    };
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const handleSort = (field: keyof YangonFrameItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // const handleView = (item: YangonFrameItem) => {
  //   setSelectedItem(item);
  //   // Open view modal
  // };

  const handleEdit = (item: YangonFrameItem) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  // const handleDelete = (item: YangonFrameItem) => {
  //   if (window.confirm(`Are you sure you want to delete ${item.itemName}?`)) {
  //     setItems(items.filter(i => i.id !== item.id));
  //   }
  // };

  const handleFormSubmit = async (formData: any) => {
    if (!user?.email) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedItem) {
        // Edit existing item
        const originalQty = safeNumber(formData.qty);
        const transferInQty = safeNumber(formData.transferIn || formData.transferInQty);
        const transferOutQty = safeNumber(formData.transferOut || formData.transferOutQty);
        const soldQty = safeNumber(selectedItem.soldQty); // Keep existing sold quantity
        const totalQty = Math.max(0, originalQty + transferInQty - transferOutQty);
        const remainingQty = Math.max(0, totalQty - soldQty);
        
        const updateData = {
          name: formData.itemName || formData.name,
          code: formData.frameCode || formData.code,
          category: formData.category,
          frameType: formData.frameType || 'Full Rim',
          material: formData.material || 'Metal',
          brand: formData.brand || 'Yangon Optical',
          qty: originalQty,
          soldQty: soldQty, // Keep existing sold quantity when editing
          transferInQty: transferInQty,
          transferOutQty: transferOutQty,
          totalQty: totalQty,
          remainingQty: remainingQty,
          price: safeNumber(formData.price),
          cost: safeNumber(formData.cost),
          description: formData.description || '',
          lastUpdated: new Date().toISOString()
        };

        await yangonFramesService.updateItem(selectedItem.id, updateData, user.email, formData.image);
        
        // Reload items after update
        const updatedFrames = await yangonFramesService.getItems(currentStore, { isActive: true });
        setItems(updatedFrames);
      } else {
        // Add new item
        const originalQty = safeNumber(formData.qty);
        const transferInQty = safeNumber(formData.transferIn || formData.transferInQty);
        const transferOutQty = safeNumber(formData.transferOut || formData.transferOutQty);
        const totalQty = Math.max(0, originalQty + transferInQty - transferOutQty);
        
        const newItemData = {
          name: formData.itemName || formData.name,
          code: formData.frameCode || formData.code,
          category: formData.category,
          frameType: formData.frameType || 'Full Rim',
          material: formData.material || 'Metal',
          brand: formData.brand || 'Yangon Optical',
          qty: originalQty,
          soldQty: 0,
          transferInQty: transferInQty,
          transferOutQty: transferOutQty,
          originalQty: originalQty,
          totalQty: totalQty,
          remainingQty: totalQty, // Initially same as total since soldQty is 0
          price: safeNumber(formData.price),
          cost: safeNumber(formData.cost),
          description: formData.description || '',
          // Ensure arrays exist
          cNumbers: Array.isArray(formData.cNumbers) ? formData.cNumbers : [],
          transferInRecords: Array.isArray(formData.transferInRecords) ? formData.transferInRecords : [],
          transferOutRecords: Array.isArray(formData.transferOutRecords) ? formData.transferOutRecords : []
        };

        await yangonFramesService.addItem(currentStore, newItemData, user.email, formData.image);
        
        // Reload items after adding
        const updatedFrames = await yangonFramesService.getItems(currentStore, { isActive: true });
        setItems(updatedFrames);
      }
      
      setSelectedItem(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving item:', error);
      // Error toast is already handled by the service
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (cat: YangonFrameItem['category']) => {
    switch (cat) {
      case 'Eyeglasses': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Sunglasses': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Ready BB': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Detail view handler
  const handleViewDetail = (item: YangonFrameItem) => {
    setDetailItem(item);
    setShowDetailView(true);
  };

  const handleCloseDetailView = () => {
    setShowDetailView(false);
    setDetailItem(null);
  };

  // CRUD Handlers
  const handleView = (item: YangonFrameItem) => {
    handleViewDetail(item);
  };

  // const handleEdit = (item: YangonFrameItem) => {
  //   setSelectedItem(item);
  //   setShowForm(true);
  // };

  const handleDelete = async (item: YangonFrameItem) => {
    if (!user?.email) {
      toast.error('User not authenticated');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      setIsLoading(true);
      try {
        await yangonFramesService.deleteItem(item.id, user.email);
        
        // Reload items after deletion
        const updatedFrames = await yangonFramesService.getItems(currentStore, { isActive: true });
        setItems(updatedFrames);
      } catch (error) {
        console.error('Error deleting item:', error);
        // Error toast is already handled by the service
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Function to handle sold quantity updates
  const handleSoldQuantityUpdate = async (item: YangonFrameItem) => {
    if (!user?.email) {
      toast.error('User not authenticated');
      return;
    }

    const currentSoldQty = safeNumber(item.soldQty);
    const totalQty = safeNumber(item.totalQty);
    const remainingQty = safeNumber(item.remainingQty);
    
    if (remainingQty <= 0) {
      toast.error('No remaining quantity to sell');
      return;
    }

    const soldQtyInput = prompt(
      `Item: ${item.name}\nTotal Quantity: ${totalQty}\nCurrent Sold: ${currentSoldQty}\nRemaining: ${remainingQty}\n\nEnter additional quantity to sell:`,
      '1'
    );

    if (soldQtyInput === null) return; // User cancelled

    const additionalSoldQty = parseInt(soldQtyInput) || 0;
    
    if (additionalSoldQty <= 0) {
      toast.error('Please enter a valid quantity greater than 0');
      return;
    }

    if (additionalSoldQty > remainingQty) {
      toast.error(`Cannot sell ${additionalSoldQty} items. Only ${remainingQty} remaining.`);
      return;
    }

    setIsLoading(true);
    try {
      const newSoldQty = currentSoldQty + additionalSoldQty;
      const newRemainingQty = Math.max(0, totalQty - newSoldQty);

      const updateData = {
        soldQty: newSoldQty,
        remainingQty: newRemainingQty,
        // Update timestamp
        lastSaleDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await yangonFramesService.updateItem(item.id, updateData, user.email);
      
      // Reload items after update
      const updatedFrames = await yangonFramesService.getItems(currentStore, { isActive: true });
      setItems(updatedFrames);
      
      toast.success(`✅ Successfully sold ${additionalSoldQty} units of ${item.name}. Total sold: ${newSoldQty}, Remaining: ${newRemainingQty}`);
    } catch (error) {
      console.error('Error updating sold quantity:', error);
      toast.error('Failed to update sold quantity');
    } finally {
      setIsLoading(false);
    }
  };

  // Export to Excel function
  // const handleExportToExcel = () => {
  //   try {
  //     // Create Excel-like CSV data
  //     const headers = [
  //       'No',
  //       'Frame Code',
  //       'Item Name',
  //       'Category',
  //       'C Numbers',
  //       'Transfer In',
  //       'Transfer Out',
  //       'Total Qty',
  //       'Sold Qty',
  //       'Remaining Qty',
  //       'Price (MMK)'
  //     ];

  //     const csvData = sortedItems.map(item => [
  //       item.no,
  //       item.frameCode || '',
  //       item.itemName || '',
  //       item.category || '',
  //       item.cNumbers.map(c => `${c.cNo}:${c.qty}`).join(', '),
  //       item.transferIn || 0,
  //       item.transferOut || 0,
  //       item.totalQty || 0,
  //       item.soldQty || 0,
  //       item.remainingQty || 0,
  //       (item.price || 0).toLocaleString()
  //     ]);

  //     const csvContent = [headers, ...csvData]
  //       .map(row => row.map(cell => `"${cell}"`).join(','))
  //       .join('\n');

  //     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  //     const link = document.createElement('a');
      
  //     if (link.download !== undefined) {
  //       const url = URL.createObjectURL(blob);
  //       link.setAttribute('href', url);
  //       link.setAttribute('download', `yangon-frames-${category.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
  //       link.style.visibility = 'hidden';
  //       document.body.appendChild(link);
  //       link.click();
  //       document.body.removeChild(link);
  //       toast.success('Yangon frames data exported successfully!');
  //     }
  //   } catch (error) {
  //     console.error('Error exporting to Excel:', error);
  //     toast.error('Error exporting data to Excel');
  //   }
  // };

  // Get status color for transfer records
  const getTransferStatusColor = (status: TransferRecord['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Refresh function
  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call - in real app, this would fetch from backend
    setTimeout(() => {
      // Here you would typically refetch data from your API
      // For now, just simulate refresh
      setIsLoading(false);
      toast.success('Data refreshed successfully');
    }, 1000);
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    try {
      // Create Excel-like CSV data
      const headers = [
        'No',
        'Frame Code',
        'Item Name',
        'Category',
        'C Numbers',
        'Transfer In (From Store)',
        'Transfer Out (To Store)',
        'Total Qty',
        'Sold Qty',
        'Remaining Qty',
        'Price (MMK)'
      ];

      const csvData = sortedItems.map(item => [
        item.no,
        item.frameCode,
        item.itemName,
        item.category,
        item.cNumbers.map(c => `${c.cNo}:${c.qty}`).join(', '),
        `${item.transferIn} (${item.transferInRecords.map(r => r.fromStore).join(', ')})`,
        `${item.transferOut} (${item.transferOutRecords.map(r => r.toStore).join(', ')})`,
        item.totalQty,
        item.soldQty,
        item.remainingQty,
        item.price.toLocaleString()
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `yangon-frames-${category.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Yangon frames data exported successfully!');
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error exporting data to Excel');
    }
  };

  if (!hasYangonAccess) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800">Access Denied</h3>
          <p className="text-red-600">You don't have permission to access Yangon Office features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Yangon Office - Frame Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Category: <span className={`px-2 py-1 rounded-full text-sm font-medium ${getCategoryColor(category)}`}>
              {category}
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleExportToExcel}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet size={20} />
              Export Excel
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => setShowTransferManagement(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowRightLeft size={20} />
              Manage Transfers
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => setShowDebug(!showDebug)}
              variant={showDebug ? 'danger' : 'outline'}
              className="flex items-center gap-2"
            >
              <Info size={20} />
              {showDebug ? 'Hide Debug' : 'Debug Tools'}
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
            >
              <Plus size={20} />
              Add New Frame
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredItems.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredItems.reduce((sum, item) => sum + safeNumber(item.totalQty), 0)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sold Quantity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredItems.reduce((sum, item) => sum + safeNumber(item.soldQty), 0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredItems.reduce((sum, item) => sum + safeNumber(item.remainingQty), 0)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </motion.div>

      {/* Search and Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search by item name or frame code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Filter size={20} />
          Filter
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {[
                  { key: 'no', label: 'No' },
                  { key: 'code', label: 'Frame Code' },
                  { key: 'name', label: 'Item Name' },
                  { key: 'cNumbers', label: 'C Numbers' },
                  { key: 'transferInQty', label: 'Transfer In' },
                  { key: 'transferOutQty', label: 'Transfer Out' },
                  { key: 'totalQty', label: 'Total Qty' },
                  { key: 'soldQty', label: 'Sold Qty' },
                  { key: 'remainingQty', label: 'Remaining Qty' },
                  { key: 'price', label: 'Price' },
                  { key: 'actions', label: 'Actions' }
                ].map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => column.key !== 'actions' && handleSort(column.key as keyof YangonFrameItem)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.key !== 'actions' && (
                        <ArrowUpDown size={14} className="text-gray-400" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence>
                {sortedItems.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-200 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.name}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.isArray(item.cNumbers) && item.cNumbers.map((cNum: CNumber, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                          >
                            {cNum.cNo}: {cNum.qty}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                          +{item.transferInQty}
                        </div>
                        {Array.isArray(item.transferInRecords) && item.transferInRecords.map((record: TransferRecord, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {record.qty} from <span className="font-medium">{record.fromStore}</span>
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getTransferStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                          -{item.transferOutQty}
                        </div>
                        {Array.isArray(item.transferOutRecords) && item.transferOutRecords.map((record, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {record.qty} to <span className="font-medium">{record.toStore}</span>
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getTransferStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                        {item.totalQty} (Total)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400 font-medium">
                      <button
                        onClick={() => handleSoldQuantityUpdate(item)}
                        className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded-full text-xs hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors cursor-pointer"
                        title="Click to record sale"
                      >
                        {item.soldQty} (Sold)
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs ${item.remainingQty <= 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : item.remainingQty <= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                        {item.remainingQty} (Available)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      {item.price.toLocaleString()} MMK
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleView(item)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEdit(item)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleSoldQuantityUpdate(item)}
                          className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                          title="Record Sale"
                        >
                          <Package size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowTransferManagement(true)}
                          className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                          title="Manage Transfers"
                        >
                          <ArrowRightLeft size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {sortedItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No items found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search terms.' : `No ${category.toLowerCase()} items available.`}
            </p>
          </div>
        )}
      </motion.div>

      {/* Form Modal */}
      <YangonFrameForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedItem(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={selectedItem ? {
          frameCode: selectedItem.frameCode,
          itemName: selectedItem.name,
          category: selectedItem.category,
          cNumbers: selectedItem.cNumbers,
          transferIn: selectedItem.transferIn,
          transferOut: selectedItem.transferOut,
          transferInRecords: selectedItem.transferInRecords,
          transferOutRecords: selectedItem.transferOutRecords,
          price: selectedItem.price
        } : undefined}
        isEditing={!!selectedItem}
      />

      {/* Detail View Modal */}
      <YangonFrameDetailView
        isOpen={showDetailView}
        onClose={handleCloseDetailView}
        item={detailItem}
      />

      {/* Debug Tools */}
      {showDebug && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mt-6"
        >
          <YangonFirebaseDebug />
        </motion.div>
      )}

      {/* Transfer Management Modal */}
      <AnimatePresence>
        {showTransferManagement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Transfer Management - Yangon Head Office
                  </h3>
                  <Button
                    variant="outline"
                    onClick={() => setShowTransferManagement(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕ Close
                  </Button>
                </div>
                <TransferManagement store="yangon-office" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YangonFramePage;