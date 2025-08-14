import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart, Search, X, Filter, ChevronDown, ChevronUp, AlertTriangle, ArrowRightLeft, Package, RotateCcw, RefreshCw, FileSpreadsheet } from 'lucide-react';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import ContactLensForm from '../../components/contactLens/ContactLensForm'
import { ContactLensFormData } from '../../components/contactLens/ContactLensForm';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';
import { 
  getContactLenses, 
  addContactLens, 
  updateContactLens, 
  deleteContactLens, 
  sellContactLens 
} from '../../services/contactLensService';
import { useAuth } from '../../context/AuthContext';

// Define types
export type ContactLensCategory = 'မျက်ကပ်အကြည်' | 'Pretty and Shinning' | 'F.l' | 'Big Eye Black' | 'Ms plane' | 'Ms ပါဝါ color';

const ContactLensPage: React.FC = () => {
  const { user } = useAuth();
  const store = 'win'; // You can make this dynamic based on route params
  const userEmail = user?.email || 'system@store.com';
  const [contactLenses, setContactLenses] = useState<ContactLensFormData[]>([]);
  const [filteredContactLenses, setFilteredContactLenses] = useState<ContactLensFormData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ContactLensCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers'>('inventory');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContactLens, setEditingContactLens] = useState<ContactLensFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactLensToDelete, setContactLensToDelete] = useState<ContactLensFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [contactLensToSell, setContactLensToSell] = useState<ContactLensFormData | null>(null);
  
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedContactLens, setSelectedContactLens] = useState<ContactLensFormData | null>(null);

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

  // Load contact lenses from Firebase
  const loadContactLenses = async () => {
    try {
      setLoading(true);
      const data = await getContactLenses(store);
      setContactLenses(data);
      setFilteredContactLenses(data);
    } catch (error) {
      console.error('Error loading contact lenses:', error);
      toast.error('Failed to load contact lenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactLenses();
  }, [store]);

  const categories: ContactLensCategory[] = ['မျက်ကပ်အကြည်', 'Pretty and Shinning', 'F.l', 'Big Eye Black', 'Ms plane', 'Ms ပါဝါ color'];
  const stockStatuses = [
    { value: '', label: 'All Stock' },
    { value: 'in-stock', label: 'In Stock (>0)' },
    { value: 'low-stock', label: 'Low Stock (≤2)' },
    { value: 'out-of-stock', label: 'Out of Stock (0)' },
    { value: 'high-stock', label: 'High Stock (>10)' }
  ];

  // Helper function to display quantity with proper zero handling
  const displayQuantity = (qty: number | undefined | null): string => {
    return String(qty || 0);
  };

  // Filter function
  const applyFilters = (contactLensesList: ContactLensFormData[]) => {
    let filtered = [...contactLensesList];

    if (selectedCategory) {
      filtered = filtered.filter(lens => lens.category === selectedCategory);
    }

    if (searchFilters.code) {
      filtered = filtered.filter(lens => 
        lens.code.toLowerCase().includes(searchFilters.code.toLowerCase())
      );
    }

    if (searchFilters.name) {
      filtered = filtered.filter(lens => 
        lens.name.toLowerCase().includes(searchFilters.name.toLowerCase())
      );
    }

    if (searchFilters.power) {
      filtered = filtered.filter(lens => 
        lens.power && lens.power.toLowerCase().includes(searchFilters.power.toLowerCase())
      );
    }

    if (searchFilters.priceMin) {
      filtered = filtered.filter(lens => lens.price >= parseFloat(searchFilters.priceMin));
    }

    if (searchFilters.priceMax) {
      filtered = filtered.filter(lens => lens.price <= parseFloat(searchFilters.priceMax));
    }

    if (searchFilters.qtyMin) {
      filtered = filtered.filter(lens => lens.remainingQty >= parseFloat(searchFilters.qtyMin));
    }

    if (searchFilters.qtyMax) {
      filtered = filtered.filter(lens => lens.remainingQty <= parseFloat(searchFilters.qtyMax));
    }

    if (searchFilters.stockStatus) {
      switch (searchFilters.stockStatus) {
        case 'in-stock':
          filtered = filtered.filter(lens => lens.remainingQty > 0);
          break;
        case 'low-stock':
          filtered = filtered.filter(lens => lens.remainingQty > 0 && lens.remainingQty <= 2);
          break;
        case 'out-of-stock':
          filtered = filtered.filter(lens => lens.remainingQty === 0);
          break;
        case 'high-stock':
          filtered = filtered.filter(lens => lens.remainingQty > 10);
          break;
      }
    }

    return filtered;
  };

  const updateSearchFilter = (key: string, value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllFilters = () => {
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
  };

  const hasActiveFilters = () => {
    return Object.values(searchFilters).some(value => value !== '') ||
           selectedCategory !== null;
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory) count++;
    count += Object.values(searchFilters).filter(value => value !== '').length;
    return count;
  };

  // Apply filters when data or filters change
  useEffect(() => {
    if (activeTab === 'inventory') {
      const filtered = applyFilters(contactLenses);
      setFilteredContactLenses(filtered);
    }
  }, [contactLenses, selectedCategory, searchFilters, activeTab]);

  const handleFormSubmit = async (data: ContactLensFormData) => {
    try {
      setIsSubmitting(true);
      
      if (editingContactLens?.id) {
        // Update existing contact lens
        await updateContactLens(editingContactLens.id, data, store, userEmail);
        await loadContactLenses(); // Reload data from Firebase
      } else {
        // Add new contact lens
        await addContactLens(data, store);
        await loadContactLenses(); // Reload data from Firebase
      }

      setIsFormModalOpen(false);
      setEditingContactLens(null);
    } catch (error) {
      console.error('Error saving contact lens:', error);
      // Error messages are handled in the service
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSell = async (quantity: number) => {
    if (!contactLensToSell?.id) return;
    
    try {
      await sellContactLens(contactLensToSell.id, quantity, store, userEmail);
      await loadContactLenses(); // Reload data from Firebase
      setSellDialogOpen(false);
    } catch (error) {
      console.error('Error selling contact lens:', error);
      // Error messages are handled in the service
    }
  };

  const confirmDelete = async () => {
    if (!contactLensToDelete?.id) return;
    
    try {
      await deleteContactLens(contactLensToDelete.id, store);
      await loadContactLenses(); // Reload data from Firebase
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting contact lens:', error);
      // Error messages are handled in the service
    }
  };

  const handleViewDetail = (contactLens: ContactLensFormData) => {
    setSelectedContactLens(contactLens);
    setDetailViewOpen(true);
  };

  const handleEditContactLens = (contactLens: ContactLensFormData) => {
    setEditingContactLens(contactLens);
    setIsFormModalOpen(true);
  };

  const handleSellContactLens = (contactLens: ContactLensFormData) => {
    setContactLensToSell(contactLens);
    setSellDialogOpen(true);
  };

  const handleDeleteContactLens = (contactLens: ContactLensFormData) => {
    setContactLensToDelete(contactLens);
    setDeleteDialogOpen(true);
  };

  const handleAddContactLens = () => {
    setEditingContactLens(null);
    setIsFormModalOpen(true);
  };

  const handleRefresh = async () => {
    try {
      await loadContactLenses();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  const handleExportExcel = () => {
    try {
      const headers = [
        'Code',
        'Name',
        'Category',
        'Power',
        'Original Qty',
        'Restocked Qty',
        'Sold Qty',
        'Available Qty',
        'Price (MMK)'
      ];

      const csvData = filteredContactLenses.map(lens => [
        lens.code || '',
        lens.name || '',
        lens.category || '',
        lens.power || '',
        displayQuantity(lens.originalQty),
        displayQuantity(lens.restockedQty),
        displayQuantity(lens.soldQty),
        displayQuantity(lens.remainingQty),
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
      key: 'originalQty', 
      header: 'Original Qty', 
      sortable: true,
      render: (row: ContactLensFormData) => (
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {displayQuantity(row.originalQty)}
        </span>
      )
    },
    { 
      key: 'restockedQty', 
      header: 'Restocked', 
      sortable: true,
      render: (row: ContactLensFormData) => (
        <span className="font-medium text-purple-600 dark:text-purple-400">
          {displayQuantity(row.restockedQty)}
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
      key: 'remainingQty', 
      header: 'Available Qty', 
      sortable: true,
      render: (row: ContactLensFormData) => {
        const isLowStock = row.remainingQty <= 2;
        const isOutOfStock = row.remainingQty === 0;
        return (
          <span className={`font-medium ${
            isOutOfStock 
              ? 'text-red-600 dark:text-red-400' 
              : isLowStock 
              ? 'text-yellow-600 dark:text-yellow-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            {displayQuantity(row.remainingQty)}
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
    {
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
            onClick={() => handleSellContactLens(row)}
            className="p-1.5"
            disabled={row.remainingQty <= 0}
            title="Sell Contact Lens"
          >
            <ShoppingCart size={14} />
          </Button>
          
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeleteContactLens(row)}
            className="p-1.5"
            title="Delete Contact Lens"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto p-4 space-y-6">
        <Header title={`Contact Lens Management - ${store?.toUpperCase()}`} />

        {/* Store Contact Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <span className="font-medium">{store.toUpperCase()} Store Contact:</span> winstore1717@gmail.com
              </p>
            </div>
          </div>
        </div>

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
                  
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleAddContactLens}
                    className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                  >
                    <PlusCircle size={16} />
                    Add Contact Lens
                  </Button>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ArrowRightLeft size={20} />
              Transfer Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400">Transfer management functionality will be implemented here.</p>
          </div>
        )}
        
        {/* Form Modal */}
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
        
        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          itemName={contactLensToDelete?.name || ''}
          onDelete={confirmDelete}
        />
        
        {/* Sell Item Dialog */}
        <SellItemDialog
          isOpen={sellDialogOpen}
          onClose={() => setSellDialogOpen(false)}
          itemName={contactLensToSell?.name || ''}
          maxQuantity={contactLensToSell?.remainingQty || 0}
          onSell={confirmSell}
        />
        
        {/* Detail View Modal */}
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Original Quantity</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {displayQuantity(selectedContactLens.originalQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Restocked</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {displayQuantity(selectedContactLens.restockedQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sold Quantity</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {displayQuantity(selectedContactLens.soldQty)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Quantity</p>
                    <p className={`text-xl font-bold ${selectedContactLens.remainingQty <= 2 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {displayQuantity(selectedContactLens.remainingQty)}
                      {selectedContactLens.remainingQty <= 2 && selectedContactLens.remainingQty > 0 && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded-full">
                          Low Stock
                        </span>
                      )}
                      {selectedContactLens.remainingQty === 0 && (
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
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t">
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
                  variant="primary"
                  onClick={() => {
                    setDetailViewOpen(false);
                    handleSellContactLens(selectedContactLens);
                  }}
                  disabled={selectedContactLens.remainingQty <= 0}
                  className="transition-all duration-200 hover:scale-[0.98]"
                >
                  <ShoppingCart size={16} className="mr-2" />
                  Sell Contact Lens
                </Button>
              </div>
            </div>
          )}
        </FormModal>
      </div>
    </div>
  );
};

export default ContactLensPage;