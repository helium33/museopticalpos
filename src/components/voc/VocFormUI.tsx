import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Search, Plus, Minus, Trash2, RefreshCw, Eye, Edit, MapPin, Stethoscope, ChevronLeft, ChevronRight, DollarSign, Percent, Calendar, AlertTriangle, CheckCircle, Filter, X, FileText, Save, User, ChevronUp, ChevronDown, Glasses, Sun, Contact } from 'lucide-react';
import { format } from 'date-fns';

interface VocFormUIProps {
  store: string;
  onSuccess?: () => void;
}

const VocFormUI: React.FC<VocFormUIProps> = ({ store, onSuccess }) => {
  // UI State Management
  const [loading, setLoading] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState('Lens');
  const [selectedSubType, setSelectedSubType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [yuanRate, setYuanRate] = useState(300);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [customTotal, setCustomTotal] = useState('');
  
  // VOC date state
  const [vocDate, setVocDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vocTime, setVocTime] = useState(format(new Date(), 'HH:mm'));
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // Search fields for lens prescriptions
  const [sphSearch, setSphSearch] = useState('');
  const [cylSearch, setCylSearch] = useState('');
  const [axisSearch, setAxisSearch] = useState('');
  const [additionSearch, setAdditionSearch] = useState('');
  const [yangonOrderNameSearch, setYangonOrderNameSearch] = useState('');

  // Filtering state
  const [showFilters, setShowFilters] = useState(false);
  const [storeFilter, setStoreFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Error tracking states
  const [isError, setIsError] = useState(false);
  const [errorStore, setErrorStore] = useState('');
  const [errorCategory, setErrorCategory] = useState('');
  const [errorDescription, setErrorDescription] = useState('');

  // Form data state
  const [formData, setFormData] = useState({
    vocNumber: 'VOC-001',
    customerName: '',
    customerPhone: '',
    customerType: 'Original',
    customerGender: 'Male',
    customerAge: 0,
    paymentType: 'Full',
    totalAmount: 0,
    paidAmount: 0,
    balance: 0,
    depositAmount: 0,
    paymentMethod: 'Cash',
    yuanAmount: 0,
    cashAmount: 0,
    kpayAmount: 0,
    mmkAmount: 0,
    discount: 0,
    notes: '',
    salePerson: '',
    eyeTest: '',
    fitting: '',
    items: []
  });

  // Sample items for UI display with proper store distribution
  const sampleItems = [
    // Lens items
    { id: '1', name: 'Progressive Lens', type: 'Lens', category: 'Progressive', price: 50000, quantity: 10, store: 'Win' },
    { id: '2', name: 'Single Vision', type: 'Lens', category: 'Single Vision', price: 25000, quantity: 15, store: 'Pwint' },
    { id: '3', name: 'Bifocal Lens', type: 'Lens', category: 'Bifocal', price: 35000, quantity: 8, store: 'Yangon' },
    { id: '4', name: 'Anti-Glare Lens', type: 'Lens', category: 'Single Vision', price: 30000, quantity: 12, store: 'Win' },
    
    // Frame items - Eye glasses
    { id: '5', name: 'Classic Frame', type: 'Frame', category: 'Eye glasses', subCategory: 'Ready', price: 45000, quantity: 6, store: 'Win' },
    { id: '6', name: 'Designer Frame', type: 'Frame', category: 'Eye glasses', subCategory: 'Promotion', price: 60000, quantity: 4, store: 'Pwint' },
    { id: '7', name: 'Metal Frame', type: 'Frame', category: 'Eye glasses', subCategory: 'Ready BB', price: 55000, quantity: 7, store: 'Yangon' },
    
    // Frame items - Sunglasses
    { id: '8', name: 'Ray-Ban Sunglasses', type: 'Frame', category: 'Sunglasses', subCategory: 'Promotion', price: 80000, quantity: 5, store: 'Win' },
    { id: '9', name: 'Aviator Sunglasses', type: 'Frame', category: 'Sunglasses', subCategory: 'Ready', price: 65000, quantity: 3, store: 'Pwint' },
    { id: '10', name: 'Sport Sunglasses', type: 'Frame', category: 'Sunglasses', subCategory: 'Ready BB', price: 70000, quantity: 4, store: 'Yangon' },
    
    // Contact Lens items
    { id: '11', name: 'Daily Contact Lens', type: 'Contact Lens', category: 'Daily', price: 15000, quantity: 20, store: 'Win' },
    { id: '12', name: 'Monthly Contact Lens', type: 'Contact Lens', category: 'Monthly', price: 25000, quantity: 15, store: 'Pwint' },
    { id: '13', name: 'Colored Contact Lens', type: 'Contact Lens', category: 'Colored', price: 20000, quantity: 18, store: 'Yangon' },
    
    // Accessories
    { id: '14', name: 'Lens Cleaner', type: 'Accessories', category: 'Cleaning', price: 5000, quantity: 30, store: 'Win' },
    { id: '15', name: 'Frame Case', type: 'Accessories', category: 'Storage', price: 8000, quantity: 25, store: 'Pwint' },
    { id: '16', name: 'Lens Cloth', type: 'Accessories', category: 'Cleaning', price: 3000, quantity: 40, store: 'Yangon' },
  ];

  const [selectedItems, setSelectedItems] = useState([]);

  // UI Helper Functions
  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'Lens': return <Eye className="h-4 w-4" />;
      case 'Frame': return <Glasses className="h-4 w-4" />;
      case 'Contact Lens': return <Contact className="h-4 w-4" />;
      case 'Accessories': return <Plus className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    setTimeout(() => {
      setLoading(false);
      alert('VOC Form Submitted (UI Only)');
      if (onSuccess) onSuccess();
    }, 1000);
  };

  const addItemToVoc = (item: any) => {
    const newItem = {
      ...item,
      quantity: 1,
      errorQuantity: 0,
      itemDiscount: 0,
      isFOC: false,
      hasError: false,
      customTotal: null
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const removeItemFromVoc = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(newItems);
  };

  return (
    <>
      {/* Error Tracker */}
      {isError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Report Error
            </h3>
            <div className="space-y-4">
              <Select
                label="Error Store"
                value={errorStore}
                onChange={(e) => setErrorStore(e.target.value)}
                options={[
                  { value: '', label: 'Select Store' },
                  { value: 'yangon', label: 'Yangon' },
                  { value: 'mandalay', label: 'Mandalay' }
                ]}
              />
              <Select
                label="Error Category"
                value={errorCategory}
                onChange={(e) => setErrorCategory(e.target.value)}
                options={[
                  { value: '', label: 'Select Category' },
                  { value: 'form_error', label: 'Form Error' },
                  { value: 'kkt', label: 'KKT Error' },
                  { value: 'kcma', label: 'KCMA Error' },
                  { value: 'kmmt', label: 'KMMT Error' },
                  { value: 'eye_test', label: 'Eye Test Error' },
                  { value: 'fitting', label: 'Fitting Error' },
                  { value: 'factory', label: 'Factory Error' },
                  { value: 'wrong_delivery', label: 'Wrong Delivery' },
                  { value: 'wrong_lens_production', label: 'Wrong Lens Production' }
                ]}
              />
              <Input
                label="Error Description"
                value={errorDescription}
                onChange={(e) => setErrorDescription(e.target.value)}
                placeholder="Describe the error..."
              />
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsError(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    alert('Error reported (UI Only)');
                    setIsError(false);
                  }}
                  className="flex-1"
                >
                  Report Error
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-blue-600" />
              VOC Form - {store}
            </h2>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsError(true)}
              className="flex items-center"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Error
            </Button>
          </div>

          {/* VOC Number and Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              label="VOC Number"
              value={formData.vocNumber}
              onChange={(e) => setFormData({...formData, vocNumber: e.target.value})}
              required
            />
            <Input
              label="VOC Date"
              type="date"
              value={vocDate}
              onChange={(e) => setVocDate(e.target.value)}
              required
            />
            <Input
              label="VOC Time"
              type="time"
              value={vocTime}
              onChange={(e) => setVocTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Customer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Customer Name"
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              required
            />
            <Input
              label="Phone Number"
              value={formData.customerPhone}
              onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
              required
            />
            <Input
              label="Age"
              type="number"
              value={formData.customerAge}
              onChange={(e) => setFormData({...formData, customerAge: parseInt(e.target.value)})}
              min="0"
            />
            <Select
              label="Customer Type"
              value={formData.customerType}
              onChange={(e) => setFormData({...formData, customerType: e.target.value})}
              options={[
                { value: 'Original', label: 'Original' },
                { value: 'Referral', label: 'Referral' },
                { value: 'Return', label: 'Return' }
              ]}
            />
            <Select
              label="Gender"
              value={formData.customerGender}
              onChange={(e) => setFormData({...formData, customerGender: e.target.value})}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' }
              ]}
            />
          </div>
        </div>

        {/* Staff Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-green-600" />
            Staff Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Sale Person"
              value={formData.salePerson}
              onChange={(e) => setFormData({...formData, salePerson: e.target.value})}
              options={[
                { value: '', label: 'Select Sale Person' },
                { value: 'John Doe', label: 'John Doe' },
                { value: 'Jane Smith', label: 'Jane Smith' }
              ]}
              required
            />
            <Select
              label="Eye Test Staff"
              value={formData.eyeTest}
              onChange={(e) => setFormData({...formData, eyeTest: e.target.value})}
              options={[
                { value: '', label: 'Select Eye Test Staff' },
                { value: 'Dr. Wilson', label: 'Dr. Wilson' },
                { value: 'Dr. Brown', label: 'Dr. Brown' }
              ]}
              required
            />
            <Select
              label="Fitting Staff"
              value={formData.fitting}
              onChange={(e) => setFormData({...formData, fitting: e.target.value})}
              options={[
                { value: '', label: 'Select Fitting Staff' },
                { value: 'Mike Johnson', label: 'Mike Johnson' },
                { value: 'Sarah Davis', label: 'Sarah Davis' }
              ]}
              required
            />
          </div>
        </div>

        {/* Item Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Eye className="h-5 w-5 mr-2 text-purple-600" />
            Item Selection
          </h3>

          {/* Item Type Tabs */}
          <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
            {['Lens', 'Frame', 'Contact Lens', 'Accessories'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedItemType(type);
                  setSelectedSubType(''); // Reset subtype when changing main type
                  setSelectedCategory(''); // Reset category when changing main type
                }}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedItemType === type
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {getItemTypeIcon(type)}
                <span className="ml-2">{type}</span>
              </button>
            ))}
          </div>

          {/* Frame Sub-Type Tabs (Eye glasses vs Sunglasses) */}
          {selectedItemType === 'Frame' && (
            <div className="flex space-x-1 mb-4 bg-blue-50 p-1 rounded-lg">
              {['Eye glasses', 'Sunglasses'].map((subType) => (
                <button
                  key={subType}
                  type="button"
                  onClick={() => setSelectedSubType(subType)}
                  className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedSubType === subType
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {subType === 'Eye glasses' ? <Glasses className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span className="ml-2">{subType}</span>
                </button>
              ))}
            </div>
          )}

          {/* Category Filters for Frame */}
          {selectedItemType === 'Frame' && selectedSubType && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 mr-2">Categories:</span>
              {['Promotion', 'Ready', 'Ready BB'].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {/* Store Filter Tabs */}
          <div className="flex space-x-1 mb-4 bg-green-50 p-1 rounded-lg">
            <span className="text-sm font-medium text-gray-700 px-3 py-2">Store:</span>
            {['All', 'Win', 'Pwint', 'Yangon'].map((storeOption) => (
              <button
                key={storeOption}
                type="button"
                onClick={() => setStoreFilter(storeOption === 'All' ? '' : storeOption.toLowerCase())}
                className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  (storeOption === 'All' && storeFilter === '') || storeFilter === storeOption.toLowerCase()
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="h-4 w-4 mr-1" />
                {storeOption}
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input
                    label="SPH"
                    value={sphSearch}
                    onChange={(e) => setSphSearch(e.target.value)}
                    placeholder="e.g., -2.00"
                  />
                  <Input
                    label="CYL"
                    value={cylSearch}
                    onChange={(e) => setCylSearch(e.target.value)}
                    placeholder="e.g., -1.00"
                  />
                  <Input
                    label="AXIS"
                    value={axisSearch}
                    onChange={(e) => setAxisSearch(e.target.value)}
                    placeholder="e.g., 90"
                  />
                  <Input
                    label="Addition"
                    value={additionSearch}
                    onChange={(e) => setAdditionSearch(e.target.value)}
                    placeholder="e.g., +2.00"
                  />
                </div>
                <div className="flex space-x-3">
                  <Select
                    label="Store Filter"
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Stores' },
                      { value: 'yangon', label: 'Yangon' },
                      { value: 'mandalay', label: 'Mandalay' }
                    ]}
                  />
                  <Select
                    label="Availability"
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Items' },
                      { value: 'available', label: 'Available' },
                      { value: 'low-stock', label: 'Low Stock' },
                      { value: 'out-of-stock', label: 'Out of Stock' }
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {sampleItems
              .filter(item => {
                // Filter by item type
                if (item.type !== selectedItemType) return false;
                
                // Filter by store
                if (storeFilter && item.store.toLowerCase() !== storeFilter) return false;
                
                // Filter by search term
                if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                
                // Frame-specific filtering
                if (selectedItemType === 'Frame') {
                  // Filter by sub-type (Eye glasses vs Sunglasses)
                  if (selectedSubType && item.category !== selectedSubType) return false;
                  
                  // Filter by category (Promotion, Ready, Ready BB)
                  if (selectedCategory && item.subCategory !== selectedCategory) return false;
                }
                
                return true;
              })
              .map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      {getItemTypeIcon(item.type)}
                      <span className="ml-2 font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-gray-500">{item.category}</span>
                      {item.subCategory && (
                        <span className="text-xs text-blue-600 font-medium">{item.subCategory}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    <div>Price: {item.price.toLocaleString()} MMK</div>
                    <div>Available: {item.quantity} pcs</div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      Store: <span className="font-medium ml-1">{item.store}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addItemToVoc(item)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to VOC
                  </Button>
                </div>
              ))}
          </div>
          
          {/* No items message */}
          {sampleItems.filter(item => {
            if (item.type !== selectedItemType) return false;
            if (storeFilter && item.store.toLowerCase() !== storeFilter) return false;
            if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (selectedItemType === 'Frame') {
              if (selectedSubType && item.category !== selectedSubType) return false;
              if (selectedCategory && item.subCategory !== selectedCategory) return false;
            }
            return true;
          }).length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                No items found
              </div>
              <p className="text-sm text-gray-400">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing 1-{sampleItems.length} of {sampleItems.length} items
            </div>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of 1
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Selected Items ({selectedItems.length})
            </h3>
            <div className="space-y-3">
              {selectedItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getItemTypeIcon(item.type)}
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.category} - {item.price.toLocaleString()} MMK</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...selectedItems];
                        newItems[index].quantity = parseInt(e.target.value) || 1;
                        setSelectedItems(newItems);
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItemFromVoc(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Payment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Payment Type"
              value={formData.paymentType}
              onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
              options={[
                { value: 'Full', label: 'Full Payment' },
                { value: 'Partial', label: 'Partial Payment' }
              ]}
            />
            <Select
              label="Payment Method"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'KPay', label: 'KPay' },
                { value: 'Yuan', label: 'Yuan' },
                { value: 'Cash+KPay', label: 'Cash + KPay' },
                { value: 'Cash+Yuan', label: 'Cash + Yuan' },
                { value: 'Yuan+KPay', label: 'Yuan + KPay' }
              ]}
            />
            <Input
              label="Yuan Rate"
              type="number"
              value={yuanRate}
              onChange={(e) => setYuanRate(parseInt(e.target.value))}
              placeholder="300"
            />
            <Input
              label="Total Amount (MMK)"
              type="number"
              value={formData.totalAmount}
              onChange={(e) => setFormData({...formData, totalAmount: parseInt(e.target.value)})}
              readOnly
            />
            <Input
              label="Discount (MMK)"
              type="number"
              value={formData.discount}
              onChange={(e) => setFormData({...formData, discount: parseInt(e.target.value)})}
              min="0"
            />
            <Input
              label="Paid Amount (MMK)"
              type="number"
              value={formData.paidAmount}
              onChange={(e) => setFormData({...formData, paidAmount: parseInt(e.target.value)})}
              min="0"
            />
            {formData.paymentType === 'Partial' && (
              <Input
                label="Deposit Amount (MMK)"
                type="number"
                value={formData.depositAmount}
                onChange={(e) => setFormData({...formData, depositAmount: parseInt(e.target.value)})}
                min="0"
              />
            )}
            <Input
              label="Balance (MMK)"
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({...formData, balance: parseInt(e.target.value)})}
              readOnly
            />
          </div>

          {/* Payment Method Specific Fields */}
          {formData.paymentMethod.includes('Cash') && (
            <div className="mt-4">
              <Input
                label="Cash Amount (MMK)"
                type="number"
                value={formData.cashAmount}
                onChange={(e) => setFormData({...formData, cashAmount: parseInt(e.target.value)})}
                min="0"
              />
            </div>
          )}
          {formData.paymentMethod.includes('KPay') && (
            <div className="mt-4">
              <Input
                label="KPay Amount (MMK)"
                type="number"
                value={formData.kpayAmount}
                onChange={(e) => setFormData({...formData, kpayAmount: parseInt(e.target.value)})}
                min="0"
              />
            </div>
          )}
          {formData.paymentMethod.includes('Yuan') && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Yuan Amount"
                type="number"
                value={formData.yuanAmount}
                onChange={(e) => setFormData({...formData, yuanAmount: parseInt(e.target.value)})}
                min="0"
              />
              <Input
                label="MMK Amount"
                type="number"
                value={formData.mmkAmount}
                onChange={(e) => setFormData({...formData, mmkAmount: parseInt(e.target.value)})}
                min="0"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Notes</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Additional notes..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedItems.length} items selected
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedItems([]);
                  setFormData({
                    ...formData,
                    customerName: '',
                    customerPhone: '',
                    notes: '',
                    totalAmount: 0,
                    paidAmount: 0,
                    balance: 0
                  });
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Form
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedItems.length === 0}
                className="flex items-center"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Creating VOC...' : 'Create VOC'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
};

export default VocFormUI;