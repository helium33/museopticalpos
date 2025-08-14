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
  Contact,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import YangonContentLensForm from '../../components/yangon-office/YangonContentLensForm';
import TransferManagement from '../../components/transfer/TransferMangment';
import { yangonContactLensesService, YangonContactLens } from '../../services/yangonFirebaseService';
import { initializeYangonOfficeCollections } from '../../lib/yangonOfficeSetup';

// Use YangonContactLens from the service, but extend for UI needs
type YangonContentLensItem = YangonContactLens & {
  no?: number; // UI field for display numbering
  lensCode?: string; // Alias for code
  itemName?: string; // Alias for name  
  transferIn?: number; // Alias for transferInQty
  transferOut?: number; // Alias for transferOutQty
  remainingQty?: number; // Calculated field
  category?: 'မျက်ကပ်အကြည်' | 'Ms မျက်ကပ်' | 'Ms ပါဝါ color' | 'Pretty and Shinning' | 'Big Eye Black'; // UI categories
  color?: string; // Additional field for contact lens color
}

const YangonContentLensPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const category = searchParams.get('category') as YangonContentLensItem['category'] || 'မျက်ကပ်အကြည်';
  
  const [items, setItems] = useState<YangonContentLensItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof YangonContentLensItem>('no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<YangonContentLensItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTransferManagement, setShowTransferManagement] = useState(false);

  // Check if user has Yangon access
  const hasYangonAccess = user?.email === 'yannaing190792@gmail.com' || user?.email === 'kyawwinhtun564@gmail.com';

  // Always use yangon-office store for Yangon office operations
  const currentStore: 'yangon' | 'yangon-office' = 'yangon-office';

  // Mock data for demonstration
  useEffect(() => {
    const mockData: YangonContentLensItem[] = [
      {
        id: '1',
        no: 1,
        lensCode: 'YGN-CL-001',
        itemName: 'Clear Contact Lens',
        category: 'မျက်ကပ်အကြည်',
        transferIn: 100,
        transferOut: 20,
        totalQty: 80,
        soldQty: 30,
        remainingQty: 50,
        price: 8000,
        power: '-2.00',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        no: 2,
        lensCode: 'YGN-MS-001',
        itemName: 'Ms Contact Lens',
        category: 'Ms မျက်ကပ်',
        transferIn: 50,
        transferOut: 10,
        totalQty: 40,
        soldQty: 15,
        remainingQty: 25,
        price: 12000,
        power: '-1.50',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        no: 3,
        lensCode: 'YGN-MSC-001',
        itemName: 'Ms Power Color Lens',
        category: 'Ms ပါဝါ color',
        transferIn: 30,
        transferOut: 5,
        totalQty: 25,
        soldQty: 8,
        remainingQty: 17,
        price: 15000,
        power: '-3.00',
        color: 'Blue',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '4',
        no: 4,
        lensCode: 'YGN-PS-001',
        itemName: 'Pretty Shinning Lens',
        category: 'Pretty and Shinning',
        transferIn: 40,
        transferOut: 8,
        totalQty: 32,
        soldQty: 12,
        remainingQty: 20,
        price: 18000,
        color: 'Green',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '5',
        no: 5,
        lensCode: 'YGN-BEB-001',
        itemName: 'Big Eye Black Lens',
        category: 'Big Eye Black',
        transferIn: 25,
        transferOut: 3,
        totalQty: 22,
        soldQty: 7,
        remainingQty: 15,
        price: 20000,
        color: 'Black',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    setItems(mockData);
  }, []);

  // Filter items by category and search term
  const filteredItems = items.filter(item => {
    const matchesCategory = item.category === category;
    const matchesSearch = (item.itemName || item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.lensCode || item.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
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

  const handleSort = (field: keyof YangonContentLensItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleView = (item: YangonContentLensItem) => {
    setSelectedItem(item);
    // Open view modal
  };

  const handleEdit = (item: YangonContentLensItem) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item: YangonContentLensItem) => {
    if (!user?.email) {
      toast.error('User not authenticated');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${item.itemName || item.name}?`)) {
      setIsLoading(true);
      try {
        await yangonContactLensesService.deleteItem(item.id, user.email);
        
        // Reload items after deletion
        const updatedContactLenses = await yangonContactLensesService.getItems(currentStore, { isActive: true });
        const mappedContactLenses = updatedContactLenses.map((lens, index) => ({
          ...lens,
          no: index + 1,
          lensCode: lens.code,
          itemName: lens.name,
          transferIn: lens.transferInQty,
          transferOut: lens.transferOutQty,
          remainingQty: lens.totalQty - lens.soldQty,
          category: lens.type as any || 'မျက်ကပ်အကြည်'
        }));
        setItems(mappedContactLenses);
      } catch (error) {
        console.error('Error deleting item:', error);
        // Error toast is already handled by the service
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!user?.email) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedItem) {
        // Edit existing item
        const updateData = {
          name: formData.itemName || formData.name,
          code: formData.lensCode || formData.code,
          brand: formData.brand || 'Yangon Optical',
          type: formData.category || formData.type,
          power: formData.power || '',
          qty: formData.qty || 0,
          transferInQty: formData.transferIn || formData.transferInQty || 0,
          transferOutQty: formData.transferOut || formData.transferOutQty || 0,
          price: formData.price || 0,
          cost: formData.cost || 0,
          description: formData.description || ''
        };

        await yangonContactLensesService.updateItem(selectedItem.id, updateData, user.email, formData.image);
        
        // Reload items after update
        const updatedContactLenses = await yangonContactLensesService.getItems(currentStore, { isActive: true });
        const mappedContactLenses = updatedContactLenses.map((lens, index) => ({
          ...lens,
          no: index + 1,
          lensCode: lens.code,
          itemName: lens.name,
          transferIn: lens.transferInQty,
          transferOut: lens.transferOutQty,
          remainingQty: lens.totalQty - lens.soldQty,
          category: lens.type as any || 'မျက်ကပ်အကြည်'
        }));
        setItems(mappedContactLenses);
      } else {
        // Add new item
        const newItemData = {
          name: formData.itemName || formData.name,
          code: formData.lensCode || formData.code,
          brand: formData.brand || 'Yangon Optical',
          type: formData.category || formData.type || 'မျက်ကပ်အကြည်',
          power: formData.power || '',
          qty: formData.qty || 0,
          soldQty: 0,
          transferInQty: formData.transferIn || formData.transferInQty || 0,
          transferOutQty: formData.transferOut || formData.transferOutQty || 0,
          originalQty: formData.qty || 0,
          totalQty: (formData.qty || 0) + (formData.transferIn || formData.transferInQty || 0) - (formData.transferOut || formData.transferOutQty || 0),
          price: formData.price || 0,
          cost: formData.cost || 0,
          description: formData.description || ''
        };

        await yangonContactLensesService.addItem(currentStore, newItemData, user.email, formData.image);
        
        // Reload items after adding
        const updatedContactLenses = await yangonContactLensesService.getItems(currentStore, { isActive: true });
        const mappedContactLenses = updatedContactLenses.map((lens, index) => ({
          ...lens,
          no: index + 1,
          lensCode: lens.code,
          itemName: lens.name,
          transferIn: lens.transferInQty,
          transferOut: lens.transferOutQty,
          remainingQty: lens.totalQty - lens.soldQty,
          category: lens.type as any || 'မျက်ကပ်အကြည်'
        }));
        setItems(mappedContactLenses);
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

  const getCategoryColor = (cat: YangonContentLensItem['category']) => {
    switch (cat) {
      case 'မျက်ကပ်အကြည်': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Ms မျက်ကပ်': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Ms ပါဝါ color': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Pretty and Shinning': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'Big Eye Black': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
            Yangon Office - Content Lens Management
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
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
            >
              <Plus size={20} />
              Add New Lens
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
            <Contact className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredItems.reduce((sum, item) => sum + item.totalQty, 0)}
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
                {filteredItems.reduce((sum, item) => sum + item.soldQty, 0)}
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
                {filteredItems.reduce((sum, item) => sum + (item.totalQty - (item.soldQty || 0)), 0)}
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
            placeholder="Search by item name or lens code..."
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
                  { key: 'lensCode', label: 'Lens Code' },
                  { key: 'itemName', label: 'Item Name' },
                  { key: 'power', label: 'Power' },
                  { key: 'color', label: 'Color' },
                  { key: 'transferIn', label: 'Transfer In' },
                  { key: 'transferOut', label: 'Transfer Out' },
                  { key: 'totalQty', label: 'Total Qty' },
                  { key: 'soldQty', label: 'Sold Qty' },
                  { key: 'remainingQty', label: 'Remaining Qty' },
                  { key: 'price', label: 'Price' },
                  { key: 'actions', label: 'Actions' }
                ].map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => column.key !== 'actions' && handleSort(column.key as keyof YangonContentLensItem)}
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
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {item.lensCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.itemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.power || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.color ? (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                          {item.color}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                      +{item.transferIn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                      -{item.transferOut}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      {item.totalQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400 font-medium">
                      {item.soldQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {item.remainingQty}
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
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                          title="More Info"
                        >
                          <Info size={16} />
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
            <Contact className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No items found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search terms.' : `No ${category} items available.`}
            </p>
          </div>
        )}
      </motion.div>

      {/* Form Modal */}
      <YangonContentLensForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedItem(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={selectedItem ? {
          lensCode: selectedItem.lensCode,
          itemName: selectedItem.itemName,
          category: selectedItem.category,
          transferIn: selectedItem.transferIn,
          transferOut: selectedItem.transferOut,
          price: selectedItem.price,
          power: selectedItem.power,
          color: selectedItem.color
        } : undefined}
        isEditing={!!selectedItem}
      />

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
                    Transfer Management - Yangon Head Office (Contact Lenses)
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

export default YangonContentLensPage;