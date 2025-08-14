import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Store, ItemType, PaymentType, PaymentMethod, generateVocNumber, CustomerType, CustomerGender, formatCurrency, formatYuan } from '../../lib/utils';
import {  updateCompleteInventoryForVOC, validateVOCInventory } from '../../lib/InventoryUtlis';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, Trash2, RefreshCw, Eye, Edit, MapPin, Stethoscope, ChevronLeft, ChevronRight, DollarSign, Percent, Calendar, AlertTriangle, CheckCircle, Filter, X, FileText } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { updateStockOnVocCreate, validateStockAvailability, VocItem } from '../../lib/stockults';
import ErrorTracker from '../../components/ui/ErrorTracker';
import { VocData,  ERROR_CATEGORIES } from '../../type/Vocerror';
import { 
  calculateSoldQuantity, 
  validateErrorQuantity 
} from '../../lib/InventoryCalculation';
// import { db } from '../../lib/firebase';


interface VocFormProps {
  store: Store;
  onSuccess: () => void;
}

interface FormVocItem {
  type: ItemType;
  id: string;
  name: string;
  quantity: number;
  price: number;
  selectedPriceLabel?: string;
  category: string;
  store: Store;
  isBifocal: boolean;
  isSingleVision: boolean;
  isSMS: boolean;
  isSMSBifocal: boolean;
  isYangonOrder: boolean;
  yangonOrderName: string;
  itemDiscount: number;
  isFOC: boolean;
  errorQuantity: number;
  customTotal?: number | null;
  hasError?: boolean;
  details?: {
    sph?: string | null;
    cyl?: string | null;
    axis?: string | null;
    addition?: string | null;
    color?: string | null;
    power?: string | null;
    yangonOrderName?: string | null;
    Right?: string | null;
    Left?: string | null;
    rightAxis?: string | null;
    leftAxis?: string | null;
    rightCyl?: string | null;
    leftCyl?: string | null;
    rightQty?: number | null;
    leftQty?: number | null;
  };
}

interface FormValues {
  vocNumber: string;
  customerName: string;
  customerPhone: string;
  customerType: CustomerType;
  customerGender: CustomerGender;
  customerAge: number;
  paymentType: PaymentType;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  depositAmount: number;
  paymentMethod: PaymentMethod;
  yuanAmount: number;
  cashAmount: number;
  kpayAmount: number;
  mmkAmount: number;
  discount: number;
  notes: string;
  items: FormVocItem[];
  salePerson?: string;
  deliveryDate?: string;
}

// Helper function to extract form data
function extractFormData(form: HTMLFormElement): any {
  const formData = new FormData(form);
  // Extract and return form data in the expected format
  // This should be implemented based on your form structure
  return {
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    customerAddress: formData.get('customerAddress'),
    items: [] // Extract items from form
  };
}

const VocForm: React.FC<VocFormProps> = ({ store, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<ItemType>('Lens');
  const [selectedSubType, setSelectedSubType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [yuanRate, setYuanRate] = useState(300);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [customTotal, setCustomTotal] = useState<string>('');
  
  // Add VOC date state
  const [vocDate, setVocDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vocTime, setVocTime] = useState(format(new Date(), 'HH:mm'));
  
  // Enhanced pagination state with better defaults
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15); // User requested 15 items per page
  
  // Separate search fields for lens prescriptions
  const [sphSearch, setSphSearch] = useState('');
  const [cylSearch, setCylSearch] = useState('');
  const [axisSearch, setAxisSearch] = useState('');
  const [additionSearch, setAdditionSearch] = useState('');
  const [yangonOrderNameSearch, setYangonOrderNameSearch] = useState('');

  // Enhanced filtering state
  const [showFilters, setShowFilters] = useState(false);
  const [storeFilter, setStoreFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // all, available, low-stock, out-of-stock

  // Error tracking states
  const [isError, setIsError] = useState(false);
  const [errorStore, setErrorStore] = useState('');
  const [errorCategory, setErrorCategory] = useState('');
  const [errorDescription, setErrorDescription] = useState('');

  // Check if current store is Yangon
  const isYangonStore = store?.toLowerCase() === 'yangon';

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      vocNumber: '',
      customerName: '',
      customerPhone: '',
      customerType: 'Original' as CustomerType,
      customerGender: 'Male' as CustomerGender,
      customerAge: 0,
      paymentType: 'Full' as PaymentType,
      totalAmount: 0,
      paidAmount: 0,
      balance: 0,
      depositAmount: 0,
      paymentMethod: 'Cash' as PaymentMethod,
      yuanAmount: 0,
      cashAmount: 0,
      kpayAmount: 0,
      mmkAmount: 0,
      discount: 0,
      notes: '',
      items: [],
    },
  });

  useEffect(() => {
    if (typeof generateVocNumber === 'function') {
      setValue('vocNumber', generateVocNumber(store as Store));
    }
  }, [store, setValue]);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  });

  const paymentType = watch('paymentType');
  const paymentMethod = watch('paymentMethod');
  const selectedItems = watch('items');
  const discount = watch('discount') || 0;
  const yuanAmount = watch('yuanAmount') || 0;
  const cashAmount = watch('cashAmount') || 0;
  const kpayAmount = watch('kpayAmount') || 0;
  const mmkAmount = watch('mmkAmount') || 0;
  
  // Calculate total error quantity
  const totalErrorQuantity = selectedItems.reduce((sum, item) => sum + (item.errorQuantity || 0), 0);
  const hasErrors = selectedItems.some(item => item.hasError);
  
  // Calculate subtotal from selected items (including individual item discounts)
  const subtotal = selectedItems.reduce((sum, item) => {
    if (item.isFOC) return sum;
    
    const itemTotal = item.customTotal || (item.price * item.quantity);
    const itemDiscount = item.itemDiscount || 0;
    const finalItemTotal = Math.max(itemTotal - itemDiscount, 0);
    
    return sum + finalItemTotal;
  }, 0);

  // Calculate total individual item discounts
  const totalItemDiscounts = selectedItems.reduce((sum, item) => {
    return sum + (item.itemDiscount || 0);
  }, 0);
  
  // Calculate total amount based on payment method - Keep Yuan separate
  useEffect(() => {
    let calculatedTotal = Math.max(subtotal - discount, 0);
    
    // For mixed payment methods, calculate based on individual amounts
    if (paymentMethod === 'Cash+KPay') {
      calculatedTotal = cashAmount + kpayAmount;
    } else if (paymentMethod === 'Cash+Yuan') {
      // Cash + Yuan: Keep Yuan separate, don't convert to MMK for total
      calculatedTotal = cashAmount + yuanAmount; // Store Yuan as-is, not converted
    } else if (paymentMethod === 'Yuan+KPay') {
      // Yuan + KPay: Keep Yuan separate, don't convert to MMK for total
      calculatedTotal = yuanAmount + kpayAmount; // Store Yuan as-is, not converted
    } else if (paymentMethod === 'Yuan') {
      // Pure Yuan payment: Store Yuan amount directly + any additional MMK
      calculatedTotal = yuanAmount + mmkAmount;
    }
    
    setValue('totalAmount', calculatedTotal);
    
    if (paymentType === 'Full') {
      setValue('paidAmount', calculatedTotal);
      setValue('balance', 0);
    } else {
      const depositAmount = watch('depositAmount') || 0;
      setValue('balance', calculatedTotal - depositAmount);
      setValue('paidAmount', depositAmount);
    }
  }, [subtotal, discount, paymentType, paymentMethod, yuanAmount, cashAmount, kpayAmount, mmkAmount, setValue, watch]);

  useEffect(() => {
    fetchItems();
  }, [store, selectedItemType, selectedSubType, selectedCategory, storeFilter]); // Re-fetches when filters change

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedItemType, selectedSubType, selectedCategory, searchTerm, sphSearch, cylSearch, axisSearch, additionSearch, yangonOrderNameSearch, storeFilter, availabilityFilter]);

  const getCollectionName = () => {
    switch (selectedItemType) {
      case 'Lens': return 'lenses';
      case 'Frame': return 'frames';
      case 'Accessories': return 'accessories';
      case 'Contact Lens': return 'contactLenses';
      default: return 'lenses';
    }
  };

  // Helper function to check if a lens is bifocal (only bifocal needs left/right display)
  const isBifocalLens = (item: any) => {
    return item.category && (
      item.category.toLowerCase().includes('fuse') || 
      item.category.toLowerCase().includes('flattop') ||
      item.category.toLowerCase().includes('bifocal')
    );
  };

  // Helper function to check if a lens is single vision (no left/right display needed)
  const isSingleVisionLens = (item: any) => {
    return item.type === 'Single Vision' && selectedItemType === 'Lens';
  };

  // Helper function to check if a lens is SMS - DISABLED for Yangon store
  const isSMSLens = (item: any) => {
    if (isYangonStore) return false; // Disable SMS for Yangon store
    return item.type === 'SMS' && selectedItemType === 'Lens';
  };

  // Helper function to check if a lens is SMS bifocal - DISABLED for Yangon store
  const isSMSBifocalLens = (item: any) => {
    if (isYangonStore) return false; // Disable SMS bifocal for Yangon store
    return item.type === 'SMS' && item.smsBifocalType && selectedItemType === 'Lens';
  };

  // Helper function to check if a lens is Yangon Order
  const isYangonOrderLens = (item: any) => {
    return item.type === 'Yangon Order' && selectedItemType === 'Lens';
  };

  // Helper function to check if Yangon Order is bifocal/multifocal
  const isYangonOrderBifocal = (item: any) => {
    if (!isYangonOrderLens(item)) return false;
    return item.yangonOrderSubType === 'Bifocal' || item.yangonOrderSubType === 'Multifocal';
  };

  // Helper function to format lens quantity display
  const formatLensQuantity = (quantity: number, itemType: string, isBifocal?: boolean, isSingleVision?: boolean, isSMS?: boolean, isYangonOrder?: boolean) => {
    if (itemType === 'Lens') {
      if (isBifocal || isSingleVision || isSMS || isYangonOrder) {
        return `${quantity.toFixed(1)} pairs`;
      } else {
        return `${quantity.toFixed(1)} pcs`;
      }
    }
    return `${quantity} pcs`;
  };

  // Helper function to get real-time available quantity for an item
  const getAvailableQuantity = (itemId: string): number => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;

    // Calculate how much is already selected in the current VOC
    const selectedQuantity = selectedItems
      .filter(selectedItem => selectedItem.id === itemId && !selectedItem.isFOC) // Exclude FOC items from stock calculation
      .reduce((sum, selectedItem) => sum + selectedItem.quantity, 0);

    // Return remaining available quantity
    return Math.max(0, item.remainingQty - selectedQuantity);
  };

  // Helper function to check if adding quantity would exceed available stock
  const canAddQuantity = (itemId: string, quantityToAdd: number, isFOC: boolean = false): boolean => {
    // FOC items don't affect stock, so always allow them
    if (isFOC) return true;
    
    const availableQty = getAvailableQuantity(itemId);
    return availableQty >= quantityToAdd;
  };

  // Helper function to get stock status with detailed info
  const getStockStatus = (item: any) => {
    const availableQty = getAvailableQuantity(item.id);
    const selectedQty = selectedItems
      .filter(selectedItem => selectedItem.id === item.id && !selectedItem.isFOC) // Exclude FOC items from stock calculation
      .reduce((sum, selectedItem) => sum + selectedItem.quantity, 0);

    return {
      originalStock: item.remainingQty,
      selectedInVOC: selectedQty,
      availableNow: availableQty,
      isOutOfStock: availableQty <= 0,
      isLowStock: availableQty > 0 && availableQty <= 2,
      isPartiallySelected: selectedQty > 0 && availableQty > 0,
      isFullySelected: selectedQty > 0 && availableQty <= 0
    };
  };

  const fetchItems = async () => {
    try {
      setInventoryLoading(true);
      
      let itemsQuery = query(
        collection(db, getCollectionName())
      );

      if (selectedItemType === 'Lens') {
        if (selectedSubType) {
          // For Yangon store, filter out SMS types
          if (isYangonStore && selectedSubType === 'SMS') {
            setItems([]);
            setInventoryLoading(false);
            return;
          }
          itemsQuery = query(itemsQuery, where('type', '==', selectedSubType));
        }
        
        if (selectedCategory) {
          // Filter by category for lenses
          itemsQuery = query(itemsQuery, where('category', '==', selectedCategory));
        }
        
        // For lenses, also filter by store if no category is selected
        if (!selectedCategory && storeFilter) {
          itemsQuery = query(itemsQuery, where('store', '==', storeFilter));
        }
      } else {
        // For non-lens items, filter by current store
        itemsQuery = query(itemsQuery, where('store', '==', store));
        
        // Apply category filter for non-lens items
        if (selectedCategory) {
          itemsQuery = query(itemsQuery, where('category', '==', selectedCategory));
        }
      }

      const snapshot = await getDocs(itemsQuery);
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        remainingQty: doc.data().qty || 0,
        originalQty: doc.data().originalQty || doc.data().qty || 0,
        soldQty: doc.data().soldQty || 0,
        rightQty: doc.data().rightQty || 0,
        leftQty: doc.data().leftQty || 0,
        rightSoldQty: doc.data().rightSoldQty || 0,
        leftSoldQty: doc.data().leftSoldQty || 0,
        store: doc.data().store || store,
        yangonOrderName: doc.data().yangonOrderName || '',
        smsBifocalType: doc.data().smsBifocalType || null,
        yangonOrderSubType: doc.data().yangonOrderSubType || null,
        yangonOrderBifocalType: doc.data().yangonOrderBifocalType || null,
        // Enhanced prescription fields for Yangon Orders
        Right: doc.data().Right || '',
        Left: doc.data().Left || '',
        rightAxis: doc.data().rightAxis || '',
        leftAxis: doc.data().leftAxis || '',
        rightCyl: doc.data().rightCyl || '',
        leftCyl: doc.data().leftCyl || '',
        // Multiple pricing support
        prices: doc.data().prices || [],
        priceLabels: doc.data().priceLabels || [],
      }));
      
      // Filter out SMS items for Yangon store
      const filteredItems = isYangonStore 
        ? itemsData.filter(item => item.type !== 'SMS')
        : itemsData;
      
      const sortedItems = filteredItems.sort((a, b) => {
        // First sort by store for lenses
        if (selectedItemType === 'Lens') {
          if (a.store < b.store) return -1;
          if (a.store > b.store) return 1;
        }
        // Then sort by availability and name
        if ((a.remainingQty > 0) && (b.remainingQty <= 0)) return -1;
        if ((a.remainingQty <= 0) && (b.remainingQty > 0)) return 1;
        return a.name?.localeCompare(b.name) || 0;
      });
      
      setItems(sortedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setInventoryLoading(false);
    }
  };

  // Enhanced filtering function with multiple criteria
  const filteredItems = () => {
    let filtered = items;

    // Apply text search
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const nameMatch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const codeMatch = item.code?.toLowerCase().includes(searchTerm.toLowerCase());
        const storeMatch = item.store?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || codeMatch || storeMatch;
      });
    }

    // Apply prescription search for lenses
    if (selectedItemType === 'Lens') {
      if (sphSearch) {
        filtered = filtered.filter(item => 
          item.sph?.toString().toLowerCase().includes(sphSearch.toLowerCase())
        );
      }
      if (cylSearch) {
        filtered = filtered.filter(item => 
          item.cyl?.toString().toLowerCase().includes(cylSearch.toLowerCase())
        );
      }
      if (axisSearch) {
        filtered = filtered.filter(item => 
          item.axis?.toString().toLowerCase().includes(axisSearch.toLowerCase())
        );
      }
      if (additionSearch) {
        filtered = filtered.filter(item => 
          item.addition?.toString().toLowerCase().includes(additionSearch.toLowerCase())
        );
      }
      if (yangonOrderNameSearch) {
        filtered = filtered.filter(item => 
          item.yangonOrderName?.toLowerCase().includes(yangonOrderNameSearch.toLowerCase())
        );
      }
    }

    // Apply store filter for lenses
    if (selectedItemType === 'Lens' && storeFilter) {
      filtered = filtered.filter(item => item.store === storeFilter);
    }

    // Apply availability filter
    if (availabilityFilter !== 'all') {
      filtered = filtered.filter(item => {
        const stockStatus = getStockStatus(item);
        switch (availabilityFilter) {
          case 'available':
            return stockStatus.availableNow > 2;
          case 'low-stock':
            return stockStatus.isLowStock;
          case 'out-of-stock':
            return stockStatus.isOutOfStock;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSphSearch('');
    setCylSearch('');
    setAxisSearch('');
    setAdditionSearch('');
    setYangonOrderNameSearch('');
    setStoreFilter('');
    setAvailabilityFilter('all');
    setSelectedCategory('');
    setSelectedSubType('');
  };

  // Enhanced pagination calculations
  const totalFilteredItems = filteredItems().length;
  const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems().slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  // Add this before the main validation in onSubmit




  // Generate page numbers for pagination with better logic
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7; // Show more pages for better navigation
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Add item with comprehensive stock validation


    const handleAddItem = (e: React.MouseEvent, item: any, selectedPrice?: number, selectedPriceLabel?: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Add validation to ensure item has required fields
      if (!item.name && !item.code) {
        toast.error('Invalid item data - missing name or code');
        return;
      }
      
      // Require ID for inventory update
      if (!item.id || item.id.trim() === '' || item.id === 'undefined' || item.id === 'null') {
        toast.error(`Cannot add ${item.name || item.code} - missing valid ID for inventory update`);
        return;
      }
      
      const price = selectedPrice || item.price || 0;
      const priceLabel = selectedPriceLabel || 'Default';
      
      const newItem: FormVocItem = {
        type: selectedItemType,
        id: item.id,
        name: item.name || item.code,
        quantity: 1,
        price: price,
        selectedPriceLabel: priceLabel,
        category: item.category || '',
        store: store,
        isBifocal: isBifocalLens(item),
        isSingleVision: isSingleVisionLens(item),
        isSMS: isSMSLens(item),
        isSMSBifocal: isSMSBifocalLens(item),
        isYangonOrder: isYangonOrderLens(item),
        yangonOrderName: item.yangonOrderName || '',
        itemDiscount: 0,
        hasError: false,
        isFOC: false,
        errorQuantity: 0,
        customTotal: null,
        details: {
          sph: item.sph || null,
          cyl: item.cyl || null,
          axis: item.axis || null,
          addition: item.addition || null,
          color: item.color || null,
          power: item.power || null,
          yangonOrderName: item.yangonOrderName || null,
          Right: item.Right || null,
          Left: item.Left || null,
          rightAxis: item.rightAxis || null,
          leftAxis: item.leftAxis || null,
          rightCyl: item.rightCyl || null,
          leftCyl: item.leftCyl || null,
          rightQty: null,
          leftQty: null,
        },
      };
  
      append(newItem);
      toast.success(`Added ${item.name || item.code} to VOC`);
    };
  
    // Handle quantity change
    const handleQuantityChange = (index: number, newQuantity: number) => {
      const currentItem = selectedItems[index];
      
      if (newQuantity < 0) {
        toast.error('Quantity cannot be negative');
        return;
      }
  
      // Check stock availability for non-FOC items
      if (!currentItem.isFOC && !canAddQuantity(currentItem.id, newQuantity)) {
        const availableQty = getAvailableQuantity(currentItem.id);
        toast.error(`Only ${availableQty} pieces available for ${currentItem.name}`);
        return;
      }
  
      update(index, {
        ...currentItem,
        quantity: newQuantity
      });
    };
  
    // Handle error quantity change
    const handleErrorQuantityChange = (index: number, errorQuantity: number) => {
      const currentItem = selectedItems[index];
      
      if (errorQuantity < 0) {
        toast.error('Error quantity cannot be negative');
        return;
      }
  
      if (errorQuantity > currentItem.quantity) {
        toast.error('Error quantity cannot exceed total quantity');
        return;
      }
  
      update(index, {
        ...currentItem,
        errorQuantity: errorQuantity,
        hasError: errorQuantity > 0
      });
    };
  // Individual eye quantity changes with better validation
  const handleEyeQuantityChange = (index: number, eye: 'right' | 'left', change: number) => {
    const currentItem = selectedItems[index];
    
    if (!currentItem.isBifocal && !currentItem.isSMSBifocal && !currentItem.isYangonOrder) return;

    const currentRightQty = currentItem.details?.rightQty || 0;
    const currentLeftQty = currentItem.details?.leftQty || 0;
    const eyeIncrement = 0.5;
    
    let newRightQty = currentRightQty;
    let newLeftQty = currentLeftQty;
    
    if (eye === 'right') {
      newRightQty = Math.max(0, parseFloat((currentRightQty + (change * eyeIncrement)).toFixed(1)));
    } else {
      newLeftQty = Math.max(0, parseFloat((currentLeftQty + (change * eyeIncrement)).toFixed(1)));
    }
    
    const newTotalQuantity = parseFloat((newRightQty + newLeftQty).toFixed(1));
    
    if (newTotalQuantity <= 0) {
      remove(index);
      toast.success(`Removed ${currentItem.name} from VOC`);
      return;
    }

    // Check stock only if item is not FOC and we're increasing quantity
    if (change > 0 && !currentItem.isFOC) {
      const totalIncrease = newTotalQuantity - currentItem.quantity;
      if (!canAddQuantity(currentItem.id, totalIncrease, false)) {
        const stockStatus = getStockStatus({ id: currentItem.id });
        toast.error(`Cannot add more ${currentItem.name}. Only ${stockStatus.availableNow} remaining`);
        return;
      }
    }

    update(index, {
      ...currentItem,
      quantity: newTotalQuantity,
      details: {
        ...currentItem.details,
        rightQty: newRightQty,
        leftQty: newLeftQty,
      }
    });

    // Show updated stock info
    if (!currentItem.isFOC) {
      const stockStatus = getStockStatus({ id: currentItem.id });
      toast.success(`Updated ${eye} eye quantity for ${currentItem.name}. ${stockStatus.availableNow} remaining`);
    } else {
      toast.success(`Updated ${eye} eye quantity for ${currentItem.name} (FOC)`);
    }
  };

  const handleCustomTotalChange = (index: number, customTotal: string) => {
    const currentItem = selectedItems[index];
    const numericTotal = customTotal === '' ? null : parseFloat(customTotal);
    
    update(index, {
      ...currentItem,
      customTotal: numericTotal
    });
  };

  // Handle individual item discount change
  const handleItemDiscountChange = (index: number, discount: string) => {
    const currentItem = selectedItems[index];
    const numericDiscount = discount === '' ? 0 : parseFloat(discount);
    
    update(index, {
      ...currentItem,
      itemDiscount: numericDiscount
    });
  };

  const createCustomerRecord = async (data: any) => {
    try {
      const customerData = {
        number: data.vocNumber,
        name: data.customerName,
        type: data.customerType,
        gender: data.customerGender,
        age: data.customerAge,
        phone: data.customerPhone,
        store: store,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'customers'), customerData);
    } catch (error) {
      console.error('Error creating customer record:', error);
      toast.error('Note: Failed to create customer record');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!data.vocNumber.trim()) {
        console.warn('VOC creation failed: VOC number is required');
        toast.error('VOC number is required');
        return;
      }
      
      if (data.items.length === 0) {
        console.warn('VOC creation failed: No items selected');
        toast.error('Please select at least one item');
        return;
      }

      // Validate staff information
      if (!data.salePerson?.trim()) {
        console.warn('VOC creation failed: Sale person is required');
        toast.error('Sale person name is required');
        return;
      }

      if (!data.eyeTest?.trim()) {
        console.warn('VOC creation failed: Eye test staff is required');
        toast.error('Eye test staff name is required');
        return;
      }

      if (!data.fitting?.trim()) {
        console.warn('VOC creation failed: Fitting staff is required');
        toast.error('Fitting staff name is required');
        return;
      }

      // Process items with error quantities
      const processedItems = data.items.map((item: any) => {
        const errorQty = item.errorQuantity || 0;
        const soldQty = item.quantity - errorQty;

        // Validate error quantity does not exceed total quantity
        if (errorQty > item.quantity) {
          const warnMessage = `Error quantity for item ${item.name} (${errorQty}) exceeds total quantity (${item.quantity})`;
          console.warn(warnMessage);
          toast.error(`Error quantity for item ${item.name} cannot exceed total quantity.`);
          throw new Error(warnMessage);
        }
        
        // Price adjustments for error items
        if (errorQty > 0 && !item.isFOC) {
          const soldItemsPrice = soldQty * item.price;
          const errorItemsPrice = errorQty * item.price * 0.5;
          item.customTotal = soldItemsPrice + errorItemsPrice;
          console.log(`Item ${item.name} adjusted: Sold=${soldQty} at 100%, Error=${errorQty} at 50%, Total=${item.customTotal}`);
        } else if (errorQty >= item.quantity * 0.5 && !item.isFOC) {
          item.customTotal = item.quantity * item.price * 0.5;
          console.warn(`Item ${item.name} has high error quantity (${errorQty}/${item.quantity}), applying 50% discount to entire quantity`);
        }
        
        return {
          ...item,
          soldQuantity: soldQty,
          errorQuantity: errorQty
        };
      });
      
      data.items = processedItems;

      // Inventory validation
      console.log('🔍 Starting inventory validation...');
      const validationResult = await validateVOCInventory(data.items);
      
      if (!validationResult.isValid) {
        console.warn('❌ Inventory validation failed:', validationResult.errors);
        toast.error(`Inventory validation failed: ${validationResult.errors.join(', ')}`);
        return;
      }

      console.log('✅ Inventory validation passed');

      // Create VOC timestamp
      const selectedDateTime = new Date(`${vocDate}T${vocTime}`);
      const customTimestamp = Timestamp.fromDate(selectedDateTime);

      // Create VOC data
      const vocData = {
        ...data,
        store,
        staffEmail: user?.email || '',
        createdAt: customTimestamp,
        vocDate: vocDate,
        vocTime: vocTime,
      };

      console.log('🚀 Creating VOC with data:', vocData);
      const vocRef = await addDoc(collection(db, 'vouchers'), vocData);
      console.log('✅ VOC created successfully with ID:', vocRef.id);

      // Update inventory
      console.log('🔄 Starting inventory updates...');
      const inventoryResult = await updateCompleteInventoryForVOC(data.items);
      
      if (inventoryResult.success) {
        console.log(`✅ Inventory updates completed (${inventoryResult.successCount}/${data.items.length})`);
        toast.success(`VOC created successfully for ${format(selectedDateTime, 'MMM dd, yyyy HH:mm')}
Staff: Sale Person: ${data.salePerson}, Eye Test: ${data.eyeTest}, Fitting: ${data.fitting}
Inventory updated successfully!`, {
          duration: 6000,
        });
      } else {
        console.warn(`⚠️ Some inventory updates failed (${inventoryResult.successCount}/${data.items.length}):`, inventoryResult.errors);
        toast.error(`VOC created but ${inventoryResult.errors.length} inventory updates failed`, {
          duration: 8000,
        });
      }
      
      console.log('🔄 Refreshing inventory data after VOC creation...');
      await fetchItems();
      console.log('✅ Inventory data refreshed');
      
      // Create customer record
      await createCustomerRecord(data);
      
      // Reset form
      reset({
        vocNumber: typeof generateVocNumber === 'function' ? generateVocNumber(store as Store) : '',
        customerName: '',
        customerPhone: '',
        customerType: 'Original' as CustomerType,
        customerGender: 'Male' as CustomerGender,
        customerAge: 0,
        paymentType: 'Full' as PaymentType,
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
        depositAmount: 0,
        paymentMethod: 'Cash' as PaymentMethod,
        yuanAmount: 0,
        cashAmount: 0,
        kpayAmount: 0,
        mmkAmount: 0,
        discount: 0,
        notes: '',
        salePerson: '',
        eyeTest: '',
        fitting: '',
        items: [],
      });
      
      setVocDate(format(new Date(), 'yyyy-MM-dd'));
      setVocTime(format(new Date(), 'HH:mm'));
      
      onSuccess();
      
    } catch (error) {
      console.error('❌ Error creating VOC:', error);
      toast.error(`Failed to create VOC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Price selection modal for frames with multiple prices
  const [priceSelectionModal, setPriceSelectionModal] = useState<{
    isOpen: boolean;
    item: any;
  }>({ isOpen: false, item: null });

  const handleFrameAddWithPriceSelection = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (item.prices && item.prices.length > 1) {
      setPriceSelectionModal({ isOpen: true, item });
    } else {
      handleAddItem(e, item);
    }
  };

  const handlePriceSelection = (price: number, priceLabel: string) => {
    if (priceSelectionModal.item) {
      const fakeEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;
      handleAddItem(fakeEvent, priceSelectionModal.item, price, priceLabel);
      setPriceSelectionModal({ isOpen: false, item: null });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create VOC</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic form content would go here */}
        <div className="text-center">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create VOC'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VocForm;
      totalAmount: 0,
      discount: 0,
      finalAmount: 0,
      paymentMethod: 'Cash',
      notes: '',
      store: 'win',
      hasErrors: false,
      totalErrorQuantity: 0,
      totalSoldAmount: 0,
      totalErrorAmount: 0
    }
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const addItem = () => {
    const newItem: VocItem = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      type: 'Lens',
      price: 0,
      hasError: false,
      errorQuantity: 0,
      isFOC: false,
      itemDiscount: 0
    };
    
    setVocData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (index: number, field: keyof VocItem, value: any) => {
    setVocData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      
      // Validate error quantity if it's being updated
      if (field === 'errorQuantity') {
        const validation = validateErrorQuantity(updatedItems[index], value);
        if (!validation.isValid) {
          setErrors(prev => ({ ...prev, [`item_${index}_error`]: validation.message || '' }));
          return prev;
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`item_${index}_error`];
            return newErrors;
          });
        }
      }
      
      // Calculate amounts
      const amounts = {
        subtotal: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        totalSoldAmount: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        totalErrorAmount: 0,
        totalAmount: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
      
      return {
        ...prev,
        items: updatedItems,
        totalSoldAmount: amounts.totalSoldAmount,
        totalErrorAmount: amounts.totalErrorAmount,
        totalAmount: amounts.totalAmount,
        finalAmount: amounts.totalAmount - prev.discount,
        hasErrors: updatedItems.some(item => item.hasError && (item.errorQuantity || 0) > 0),
        totalErrorQuantity: updatedItems.reduce((sum, item) => sum + (item.errorQuantity || 0), 0)
      };
    });
  };

  const removeItem = (index: number) => {
    setVocData(prev => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      const amounts = {
        subtotal: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        totalSoldAmount: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        totalErrorAmount: 0,
        totalAmount: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
      
      return {
        ...prev,
        items: updatedItems,
        totalSoldAmount: amounts.totalSoldAmount,
        totalErrorAmount: amounts.totalErrorAmount,
        totalAmount: amounts.totalAmount,
        finalAmount: amounts.totalAmount - prev.discount
      };
    });
  };

  const handleDiscountChange = (discount: number) => {
    setVocData(prev => ({
      ...prev,
      discount,
      finalAmount: prev.totalAmount - discount
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors: { [key: string]: string } = {};
    
    if (!vocData.vocNumber) newErrors.vocNumber = 'VOC Number is required';
    if (!vocData.customerName) newErrors.customerName = 'Customer Name is required';
    if (!vocData.deliveryDate) newErrors.deliveryDate = 'Delivery Date is required';
    
    vocData.items.forEach((item, index) => {
      if (!item.name) newErrors[`item_${index}_name`] = 'Item name is required';
      if (item.quantity <= 0) newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      if (!item.price && !item.isFOC) newErrors[`item_${index}_price`] = 'Price is required for non-FOC items';
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Calculate final amounts before saving
    const amounts = {
      subtotal: vocData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      total: vocData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      totalSoldAmount: vocData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      totalErrorAmount: 0,
      totalAmount: vocData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };
    const finalVocData = {
      ...vocData,
      totalSoldAmount: amounts.totalSoldAmount,
      totalErrorAmount: amounts.totalErrorAmount,
      totalAmount: amounts.totalAmount,
      finalAmount: amounts.totalAmount - vocData.discount,
      items: vocData.items.map(item => ({
        ...item,
        soldQuantity: calculateSoldQuantity(item),
        totalPrice: item.price * item.quantity
      }))
    };

    
    
    onSave(finalVocData);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create VOC</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VOC Number *
            </label>
            <input
              type="text"
              value={vocData.vocNumber}
              onChange={(e) => setVocData(prev => ({ ...prev, vocNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter VOC number"
            />
            {errors.vocNumber && <p className="text-red-500 text-xs mt-1">{errors.vocNumber}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={vocData.customerName}
              onChange={(e) => setVocData(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter customer name"
            />
            {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={vocData.phoneNumber}
              onChange={(e) => setVocData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Date
            </label>
            <input
              type="date"
              value={vocData.orderDate}
              onChange={(e) => setVocData(prev => ({ ...prev, orderDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Date *
            </label>
            <input
              type="date"
              value={vocData.deliveryDate}
              onChange={(e) => setVocData(prev => ({ ...prev, deliveryDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.deliveryDate && <p className="text-red-500 text-xs mt-1">{errors.deliveryDate}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store
            </label>
            <select
              value={vocData.store}
              onChange={(e) => setVocData(prev => ({ ...prev, store: e.target.value as 'win' | 'pwint' | 'yangon' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="win">Win</option>
              <option value="pwint">Pwint</option>
              <option value="yangon">Yangon</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            value={vocData.address}
            onChange={(e) => setVocData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Enter customer address"
          />
        </div>

        {/* Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {vocData.items.map((item, index) => (
              <div key={item.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter item name"
                    />
                    {errors[`item_${index}_name`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Lens">Lens</option>
                      <option value="Frame">Frame</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Contact Lens">Contact Lens</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors[`item_${index}_quantity`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_quantity`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Error Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      max={item.quantity}
                      value={item.errorQuantity || 0}
                      onChange={(e) => updateItem(index, 'errorQuantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors[`item_${index}_error`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_error`]}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Unit {!item.isFOC && '*'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price || 0}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      disabled={item.isFOC}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    {errors[`item_${index}_price`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_price`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Discount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.itemDiscount || 0}
                      onChange={(e) => updateItem(index, 'itemDiscount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Error Category
                    </label>
                    <select
                      value={item.errorCategory || ''}
                      onChange={(e) => updateItem(index, 'errorCategory', e.target.value)}
                      disabled={!item.errorQuantity || item.errorQuantity === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select error category</option>
                      {ERROR_CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={item.isFOC || false}
                      onChange={(e) => updateItem(index, 'isFOC', e.target.checked)}
                      className="mr-2"
                    />
                    FOC (Free of Charge)
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={item.hasError || false}
                      onChange={(e) => updateItem(index, 'hasError', e.target.checked)}
                      className="mr-2"
                    />
                    Has Error
                  </label>
                </div>

                {/* Display calculated values */}
                <div className="bg-blue-50 p-3 rounded-md mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-700">Sold Quantity: </span>
                      <span className="text-green-800">{calculateSoldQuantity(item)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-red-700">Error Quantity: </span>
                      <span className="text-red-800">{item.errorQuantity || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Sold Amount: </span>
                      <span className="text-blue-800">{(item.price * item.quantity).toFixed(2)} MMK</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Minus className="w-4 h-4 mr-1" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-green-700 font-medium">Total Sold Amount:</span>
                <span className="text-green-800 font-semibold">{vocData.totalSoldAmount?.toFixed(2) || '0.00'} MMK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-700 font-medium">Total Error Amount:</span>
                <span className="text-red-800 font-semibold">{vocData.totalErrorAmount?.toFixed(2) || '0.00'} MMK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Discount:</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={vocData.discount}
                  onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                />
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Final Amount:</span>
                <span className="text-blue-600">{vocData.finalAmount.toFixed(2)} MMK</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={vocData.paymentMethod}
                  onChange={(e) => setVocData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Payment">Mobile Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={vocData.notes || ''}
                  onChange={(e) => setVocData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          {vocData.hasErrors && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium">
                  This VOC contains {vocData.totalErrorQuantity} error items
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            className="flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            <Save className="w-5 h-5 mr-2" />
            Save VOC
          </button>
        </div>
      </form>
    </div>
  );
};


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockErrors, setStockErrors] = useState<string[]>([]);

  // Handle form submission
  // Removed duplicate handleSubmit function to resolve redeclaration error.

  return (
    <>
      {/* Price Selection Modal */}
      {priceSelectionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Select Price for {priceSelectionModal.item?.name}
            </h3>
            <div className="space-y-3">
              {priceSelectionModal.item?.prices?.map((price: number, index: number) => (
                <button
                  key={index}
                  onClick={() => handlePriceSelection(price, priceSelectionModal.item.priceLabels?.[index] || `Price ${index + 1}`)}
                  className="w-full p-3 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {priceSelectionModal.item.priceLabels?.[index] || `Price ${index + 1}`}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      {formatCurrency(price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setPriceSelectionModal({ isOpen: false, item: null })}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* VOC Date and Time Selection */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
              VOC Date & Time
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                VOC Date
              </label>
              <Input
                type="date"
                value={vocDate}
                onChange={(e) => setVocDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="border-blue-300 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                VOC Time
              </label>
              <Input
                type="time"
                value={vocTime}
                onChange={(e) => setVocTime(e.target.value)}
                className="border-blue-300 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-2 text-sm text-blue-600 dark:text-blue-300">
            This VOC will be saved for: <span className="font-medium">
              {format(new Date(`${vocDate}T${vocTime}:00`), 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              label="VOC Number"
              {...register('vocNumber', { required: 'VOC number is required' })}
              error={errors.vocNumber?.message}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute right-2 top-8"
              onClick={() => {
                if (typeof generateVocNumber === 'function') {
                  setValue('vocNumber', generateVocNumber(store as Store));
                }
              }}
              title="Generate new VOC number"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
          <Input
            label="Customer Name"
            {...register('customerName', { required: 'Customer name is required' })}
            error={errors.customerName?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Customer Phone"
            {...register('customerPhone')}
          />
          <Select
            label="Customer Type"
            options={[
              { value: 'Original', label: 'Original' },
              { value: 'Membership', label: 'Membership' },
            ]}
            {...register('customerType')}
          />
          <Select
            label="Customer Gender"
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
            ]}
            {...register('customerGender')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Customer Age"
            type="number"
            min={0}
            {...register('customerAge', {
              valueAsNumber: true,
              required: 'Age is required',
              min: { value: 0, message: 'Age must be 0 or greater' }
            })}
            error={errors.customerAge?.message}
          />
          <Select
            label="Payment Type"
            options={[
              { value: 'Full', label: 'Full Payment' },
              { value: 'Deposit', label: 'Deposit' },
            ]}
            {...register('paymentType')}
          />
          <Select
            label="Payment Method"
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'KPay', label: 'KPay' },
              { value: 'Yuan', label: 'Yuan' },
              { value: 'Cash+KPay', label: 'Cash + KPay' },
              { value: 'Cash+Yuan', label: 'Cash + Yuan' },
              { value: 'Yuan+KPay', label: 'Yuan + KPay' },
            ]}
            {...register('paymentMethod')}
          />
        </div>

        {paymentMethod === 'Cash+KPay' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cash Amount"
              type="number"
              min={0}
              {...register('cashAmount', {
                valueAsNumber: true,
                required: 'Cash amount is required',
                min: { value: 0, message: 'Amount must be 0 or greater' }
              })}
              error={errors.cashAmount?.message}
            />
            <Input
              label="KPay Amount"
              type="number"
              min={0}
              {...register('kpayAmount', {
                valueAsNumber: true,
                required: 'KPay amount is required',
                min: { value: 0, message: 'Amount must be 0 or greater' }
              })}
              error={errors.kpayAmount?.message}
            />
          </div>
        )}

        {paymentMethod === 'Yuan+KPay' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Yuan Amount"
                type="number"
                min={0}
                step="0.01"
                {...register('yuanAmount', {
                  valueAsNumber: true,
                  required: 'Yuan amount is required',
                  min: { value: 0, message: 'Amount must be 0 or greater' }
                })}
                error={errors.yuanAmount?.message}
              />
              <Input
                label="Yuan Rate (for reference)"
                type="number"
                min={0}
                value={yuanRate}
                onChange={(e) => setYuanRate(Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-700"
                disabled
              />
            </div>
            <Input
              label="KPay Amount"
              type="number"
              min={0}
              {...register('kpayAmount', {
                valueAsNumber: true,
                required: 'KPay amount is required',
                min: { value: 0, message: 'Amount must be 0 or greater' }
              })}
              error={errors.kpayAmount?.message}
            />
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Yuan amount will be stored separately and not converted to MMK in cash totals.
              </p>
            </div>
          </div>
        )}

        {paymentMethod === 'Cash+Yuan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Yuan Amount"
                type="number"
                min={0}
                step="0.01"
                {...register('yuanAmount', {
                  valueAsNumber: true,
                  required: 'Yuan amount is required',
                  min: { value: 0, message: 'Amount must be 0 or greater' }
                })}
                error={errors.yuanAmount?.message}
              />
              <Input
                label="Yuan Rate (for reference)"
                type="number"
                min={0}
                value={yuanRate}
                onChange={(e) => setYuanRate(Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-700"
                disabled
              />
            </div>
            <Input
              label="Cash Amount (MMK)"
              type="number"
              min={0}
              {...register('cashAmount', {
                valueAsNumber: true,
                required: 'Cash amount is required',
                min: { value: 0, message: 'Amount must be 0 or greater' }
              })}
              error={errors.cashAmount?.message}
            />
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Yuan amount will be stored separately and not converted to MMK in cash totals.
              </p>
            </div>
          </div>
        )}

        {paymentMethod === 'Yuan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Yuan Amount"
                type="number"
                min={0}
                step="0.01"
                {...register('yuanAmount', {
                  valueAsNumber: true,
                  required: 'Yuan amount is required',
                  min: { value: 0, message: 'Amount must be 0 or greater' }
                })}
                error={errors.yuanAmount?.message}
              />
              <Input
                label="Yuan Rate (for reference)"
                type="number"
                min={0}
                value={yuanRate}
                onChange={(e) => setYuanRate(Number(e.target.value))}
                className="bg-gray-50 dark:bg-gray-700"
                disabled
              />
              <Input
                label="MMK Amount (Optional)"
                type="number"
                min={0}
                {...register('mmkAmount', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Amount must be 0 or greater' }
                })}
                error={errors.mmkAmount?.message}
              />
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Yuan amount will be stored separately and not converted to MMK. 
                {yuanAmount > 0 && (
                  <span className="block mt-1">
                    Current: {formatYuan(yuanAmount)} Yuan{mmkAmount > 0 ? ` + ${formatCurrency(mmkAmount)} MMK` : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {paymentType === 'Deposit' && (
          <Input
            label="Deposit Amount"
            type="number"
            min={0}
            {...register('depositAmount', {
              valueAsNumber: true,
              validate: value => value > 0 || 'Deposit amount must be greater than 0',
            })}
            error={errors.depositAmount?.message}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Overall Discount"
            type="number"
            min={0}
            max={subtotal}
            {...register('discount', {
              valueAsNumber: true,
              min: 0,
              max: subtotal,
            })}
            error={errors.discount?.message}
          />
          <Input
            label="Subtotal (After Item Discounts)"
            type="number"
            value={subtotal}
            disabled
          />
          <Input
            label="Total Item Discounts"
            type="number"
            value={totalItemDiscounts}
            disabled
          />
          <Input
            label="Final Total"
            type="number"
            value={Math.max(subtotal - discount, 0)}
            disabled
          />
        </div>

        {/* Error Tracking Section */}
        // Add this section before the items section in the form
<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
  <div className="flex items-center gap-2 mb-4">
    <AlertTriangle className="w-5 h-5 text-red-600" />
    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Error Tracking</h3>
  </div>

  {/* Error Toggle */}
  <div className="mb-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isError}
        onChange={(e) => setIsError(e.target.checked)}
        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
      <span className="text-sm font-medium text-red-700 dark:text-red-300">
        This VOC contains errors
      </span>
    </label>
  </div>

  {/* Error Details (shown only when error is enabled) */}
  {isError && (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Error Store */}
        <div>
          <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
            Error Store *
          </label>
          <select
            value={errorStore}
            onChange={(e) => setErrorStore(e.target.value)}
            className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
            required={isError}
          >
            <option value="">Select Error Store</option>
            <option value="win">Win</option>
            <option value="pwint">Pwint</option>
            <option value="yangon">Yangon</option>
          </select>
        </div>

        {/* Error Category */}
        <div>
          <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
            Error Category *
          </label>
          <select
            value={errorCategory}
            onChange={(e) => setErrorCategory(e.target.value)}
            className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
            required={isError}
          >
            <option value="">Select Error Category</option>
            <option value="kkt">KKT</option>
            <option value="kcma">KCMA</option>
            <option value="kmmt">KMMT</option>
            <option value="wrong_production">မှန်မှားထုတ်</option>
            <option value="factory_error">Factory Error</option>
            <option value="auto_machine_error">Auto စက် Error</option>
            <option value="power_error">ပါဝါမှား</option>
          </select>
        </div>
      </div>

      {/* Error Description */}
      <div>
        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
          Error Description
        </label>
        <textarea
          value={errorDescription}
          onChange={(e) => setErrorDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
          placeholder="Describe the error details..."
        />
      </div>

      {/* Error Rate Information */}
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded p-3">
        <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Error Rate Calculation</h4>
        <p className="text-sm text-red-700 dark:text-red-300">
          Example: If 1 item was sold but 0.5 error occurred, the error rate will be calculated and displayed in the VOC list.
        </p>
      </div>
    </div>
  )}
</div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Items</h3>

          {/* Enhanced Item Type Selection */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['Lens', 'Frame', 'Accessories', 'Contact Lens'].map(type => (
              <Button
                key={type}
                type="button"
                variant={selectedItemType === type ? 'primary' : 'outline'}
                onClick={() => {
                  setSelectedItemType(type as ItemType);
                  setSelectedSubType('');
                  setSelectedCategory('');
                  clearAllFilters();
                }}
                className="transition-all duration-200"
              >
                {type}
              </Button>
            ))}
          </div>

          {/* Enhanced Lens Sub-type and Category Selection */}
          {selectedItemType === 'Lens' && (
            <div className="space-y-4 mb-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selectedSubType === '' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedSubType('');
                    setSelectedCategory('');
                  }}
                >
                  All Types
                </Button>
                <Button
                  type="button"
                  variant={selectedSubType === 'Single Vision' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedSubType('Single Vision');
                    setSelectedCategory('');
                  }}
                >
                  Single Vision
                </Button>
                <Button
                  type="button"
                  variant={selectedSubType === 'Bifocal' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedSubType('Bifocal');
                    setSelectedCategory('');
                  }}
                >
                  Bifocal
                </Button>
                {!isYangonStore && (
                  <Button
                    type="button"
                    variant={selectedSubType === 'SMS' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedSubType('SMS');
                      setSelectedCategory('');
                    }}
                    className="bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
                  >
                    <div className="flex items-center gap-1">
                      <Stethoscope size={12} />
                      SMS
                    </div>
                  </Button>
                )}
                <Button
                  type="button"
                  variant={selectedSubType === 'Yangon Order' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedSubType('Yangon Order');
                    setSelectedCategory('');
                  }}
                  className="bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200"
                >
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    Yangon Order
                  </div>
                </Button>
              </div>

              {/* Category Selection for Different Lens Types */}
              {selectedSubType === 'Single Vision' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedCategory === '' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('')}
                  >
                    All
                  </Button>
                  {[
                    'yangon order', 
                    'bb 1.56', 'bb 1.61', 'bb 1.67', 'bbpg 1.56', 'bbpg 1.61', 'pg',
                    'anti flash', 'anti glare', 'photo pink', 'photo blue', 'photo purple',
                    'photo brown', 'cr', 'mc', 'error'
                  ].map(cat => (
                    <Button
                      key={cat}
                      type="button"
                      variant={selectedCategory === cat ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className={cat === 'yangon order' ? 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200' : ''}
                    >
                      {cat === 'yangon order' ? (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          {cat.toUpperCase()}
                        </div>
                      ) : (
                        cat.toUpperCase()
                      )}
                    </Button>
                  ))}
                </div>
              )}

              {selectedSubType === 'Bifocal' && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    type="button"
                    variant={selectedCategory === '' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('')}
                  >
                    All
                  </Button>
                  {[
                    'yangon order', 
                    'bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse',
                    'mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop', 'error'
                  ].map(cat => (
                    <Button
                      key={cat}
                      type="button"
                      variant={selectedCategory === cat ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className={cat === 'yangon order' ? 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200' : ''}
                    >
                      {cat === 'yangon order' ? (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          {cat.toUpperCase()}
                        </div>
                      ) : (
                        cat.toUpperCase()
                      )}
                    </Button>
                  ))}
                </div>
              )}

              {selectedSubType === 'SMS' && !isYangonStore && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    type="button"
                    variant={selectedCategory === '' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('')}
                  >
                    All
                  </Button>
                  {[
                    'yangon order', 
                    'bb 1.56', 'bb 1.61', 'bb 1.67', 'bbpg 1.56', 'bbpg 1.61', 'pg',
                    'anti flash', 'anti glare', 'photo pink', 'photo blue', 'photo purple',
                    'photo brown', 'cr', 'mc',
                    'bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse',
                    'mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop'
                  ].map(cat => (
                    <Button
                      key={cat}
                      type="button"
                      variant={selectedCategory === cat ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className={cat === 'yangon order' ? 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200' : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'}
                    >
                      {cat === 'yangon order' ? (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          {cat.toUpperCase()}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Stethoscope size={10} />
                          {cat.toUpperCase()}
                        </div>
                      )}
                    </Button>
                  ))}
                </div>
              )}

              {selectedSubType === 'Yangon Order' && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    type="button"
                    variant={selectedCategory === '' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('')}
                    className="bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200"
                  >
                    All Yangon Orders
                  </Button>
                  {[
                    'yangon order'
                  ].map(cat => (
                    <Button
                      key={cat}
                      type="button"
                      variant={selectedCategory === cat ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className="bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200"
                    >
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        {cat.toUpperCase()}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Frame Category Selection */}
          {selectedItemType === 'Frame' && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                type="button"
                variant={selectedCategory === '' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('')}
              >
                All
              </Button>
              {['Eyeglasses', 'Sunglasses', 'Promotion', 'Ready', 'Ready BB'].map(cat => (
                <Button
                  key={cat}
                  type="button"
                  variant={selectedCategory === cat ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}

          {/* Enhanced Contact Lens Category Selection */}
          {selectedItemType === 'Contact Lens' && (
            <div className="space-y-3 mb-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selectedCategory === '' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('');
                    setSearchTerm('');
                  }}
                >
                  All Categories
                </Button>
                {[
                  'မျက်ကပ်အကြည်',
                  'Pretty and Shinning',
                  'F.l',
                  'Big Eye Black',
                  'Ms plane',
                  'Ms ပါဝါ color',
                ].map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    variant={selectedCategory === cat ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSearchTerm('');
                    }}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Accessories Category Selection */}
          {selectedItemType === 'Accessories' && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                type="button"
                variant={selectedCategory === '' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('')}
              >
                All
              </Button>
              {['Cleaning Kit', 'Case', 'Strap', 'Cloth', 'Solution', 'Other'].map(cat => (
                <Button
                  key={cat}
                  type="button"
                  variant={selectedCategory === cat ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
          {/* Enhanced Search and Filter Section */}
          <div className="space-y-4 mb-4">
            {/* Main Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                className="pl-10 pr-20"
                placeholder={
                  selectedItemType === 'Lens' 
                    ? "Search by name, code, or store..." 
                    : "Search by name or code..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1"
                >
                  <Filter size={14} />
                  Filters
                </Button>
                {(searchTerm || sphSearch || cylSearch || axisSearch || additionSearch || yangonOrderNameSearch || storeFilter || availabilityFilter !== 'all') && (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={clearAllFilters}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-4">
                {/* Lens-specific filters */}
                {selectedItemType === 'Lens' && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Prescription & Order Search
                      </h4>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setSphSearch('');
                          setCylSearch('');
                          setAxisSearch('');
                          setAdditionSearch('');
                          setYangonOrderNameSearch('');
                        }}
                        className="text-xs"
                      >
                        Clear Prescription
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Input
                        placeholder="SPH (e.g., -2.00)"
                        value={sphSearch}
                        onChange={(e) => setSphSearch(e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="CYL (e.g., -1.00)"
                        value={cylSearch}
                        onChange={(e) => setCylSearch(e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="AXIS (e.g., 90)"
                        value={axisSearch}
                        onChange={(e) => setAxisSearch(e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="ADD (e.g., +2.00)"
                        value={additionSearch}
                        onChange={(e) => setAdditionSearch(e.target.value)}
                        className="text-sm"
                      />
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <MapPin className="h-4 w-4 text-orange-500" />
                        </div>
                        <Input
                          placeholder="Yangon Order Name"
                          value={yangonOrderNameSearch}
                          onChange={(e) => setYangonOrderNameSearch(e.target.value)}
                          className="text-sm pl-8 border-orange-300 focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Store Filter for Lenses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        label="Filter by Store"
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        options={[
                          { value: '', label: 'All Stores' },
                          { value: 'win', label: 'Win Store' },
                          { value: 'pwint', label: 'Pwint Store' },
                          { value: 'yangon', label: 'Yangon Store' },
                        ]}
                      />
                      <Select
                        label="Filter by Availability"
                        value={availabilityFilter}
                        onChange={(e) => setAvailabilityFilter(e.target.value)}
                        options={[
                          { value: 'all', label: 'All Items' },
                          { value: 'available', label: 'Available (>2)' },
                          { value: 'low-stock', label: 'Low Stock (1-2)' },
                          { value: 'out-of-stock', label: 'Out of Stock (0)' },
                        ]}
                      />
                    </div>
                  </>
                )}

                {/* General availability filter for non-lens items */}
                {selectedItemType !== 'Lens' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      label="Filter by Availability"
                      value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'All Items' },
                        { value: 'available', label: 'Available (>2)' },
                        { value: 'low-stock', label: 'Low Stock (1-2)' },
                        { value: 'out-of-stock', label: 'Out of Stock (0)' },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Pagination Info and Controls */}
          {totalFilteredItems > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-medium">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalFilteredItems)} of {totalFilteredItems} items
                  </span>
                  <span className="block sm:inline sm:ml-2 text-blue-600 dark:text-blue-300">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-blue-700 dark:text-blue-300">Items per page:</label>
                  <Select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '10', label: '10' },
                      { value: '15', label: '15' },
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                    ]}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Quick pagination controls */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Prev
                </Button>
                
                <span className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border rounded">
                  {currentPage} / {totalPages}
                </span>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {inventoryLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : currentItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentItems.map(item => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-md ${
                        stockStatus.isOutOfStock ? 'opacity-60 border-red-300 bg-red-50 dark:bg-red-900/10' : 
                        stockStatus.isLowStock ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10' : 
                        stockStatus.isPartiallySelected ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10' : 
                        'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                      } ${isBifocalLens(item) ? 'border-l-4 border-l-purple-500' : ''} ${isSingleVisionLens(item) ? 'border-l-4 border-l-blue-500' : ''} ${
                        isSMSLens(item) ? 'border-l-4 border-l-blue-400' : ''
                      } ${
                        isYangonOrderLens(item) ? 'border-l-4 border-l-orange-500' : ''
                      } ${
                        item.category === 'yangon order' ? 'border-t-4 border-t-orange-500' : ''
                      }`}
                      onClick={(e) => selectedItemType === 'Frame' ? handleFrameAddWithPriceSelection(e, item) : handleAddItem(e, item)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h3>
                            {isBifocalLens(item) && (
                              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                                <Eye size={12} />
                                Bifocal
                              </span>
                            )}
                            {isSingleVisionLens(item) && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                                <Eye size={12} />
                                Single Vision
                              </span>
                            )}
                            {isSMSLens(item) && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                                <Stethoscope size={12} />
                                SMS
                              </span>
                            )}
                            {isSMSBifocalLens(item) && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                                <Stethoscope size={12} />
                                SMS Bifocal
                              </span>
                            )}
                            {isYangonOrderLens(item) && (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full flex items-center gap-1">
                                <MapPin size={12} />
                                Yangon Order
                              </span>
                            )}
                            {item.category === 'yangon order' && (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full flex items-center gap-1">
                                <MapPin size={12} />
                                Yangon Order
                              </span>
                            )}
                          </div>
                          
                          {/* Show Yangon Order Name if available */}
                          {(isYangonOrderLens(item) || item.category === 'yangon order') && item.yangonOrderName && (
                            <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
                              <div className="flex items-center gap-1 text-orange-800 dark:text-orange-200">
                                <MapPin size={14} />
                                <span className="font-medium text-sm">{item.yangonOrderName}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          {/* Enhanced stock status display */}
                          <div className="space-y-1">
                            <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 justify-end ${
                              stockStatus.isOutOfStock ? 'bg-red-100 text-red-800' :
                              stockStatus.isLowStock ? 'bg-yellow-100 text-yellow-800' :
                              stockStatus.isPartiallySelected ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {stockStatus.isOutOfStock ? <AlertTriangle size={10} /> :
                               stockStatus.isPartiallySelected ? <AlertTriangle size={10} /> :
                               <CheckCircle size={10} />}
                              {stockStatus.availableNow} available
                            </span>
                            {stockStatus.selectedInVOC > 0 && (
                              <div className="text-xs text-orange-600 bg-orange-50 px-1 py-0.5 rounded text-right">
                                {stockStatus.selectedInVOC} in current VOC
                              </div>
                            )}
                            <div className="text-xs text-gray-500 text-right">
                              Total: {stockStatus.originalStock}
                            </div>
                          </div>
                          
                          {/* Show individual eye quantities for bifocal lenses */}
                          {(isBifocalLens(item) || isSMSBifocalLens(item) || isYangonOrderBifocal(item)) && (
                            <div className="text-xs text-gray-600 mt-1 text-right">
                              <div>R: {item.rightQty || 0} | L: {item.leftQty || 0}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {item.code && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Code: {item.code}</p>
                      )}
                      
                      {selectedItemType === 'Lens' && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {/* Enhanced prescription display for Yangon Orders */}
                          {isYangonOrderLens(item) || item.category === 'yangon order' ? (
                            <div className="space-y-1">
                              <p className="font-medium text-orange-700 dark:text-orange-300">Yangon Order Prescription:</p>
                              {isYangonOrderBifocal(item) ? (
                                <div className="space-y-1">
                                  <p>SPH: {item.sph || '-'} | ADD: {item.addition || '-'}</p>
                                  {item.Right && <p className="text-blue-600 dark:text-blue-400">Right Eye: {item.Right}</p>}
                                  {item.Left && <p className="text-green-600 dark:text-green-400">Left Eye: {item.Left}</p>}
                                  {item.rightCyl && <p className="text-blue-600 dark:text-blue-400">Right CYL: {item.rightCyl}</p>}
                                  {item.leftCyl && <p className="text-green-600 dark:text-green-400">Left CYL: {item.leftCyl}</p>}
                                  {item.rightAxis && <p className="text-blue-600 dark:text-blue-400">Right AXIS: {item.rightAxis}</p>}
                                  {item.leftAxis && <p className="text-green-600 dark:text-green-400">Left AXIS: {item.leftAxis}</p>}
                                </div>
                              ) : (
                                <p>SPH: {item.sph || '-'} | CYL: {item.cyl || '-'} | AXIS: {item.axis || '-'}</p>
                              )}
                            </div>
                          ) : (
                            <p>SPH: {item.sph || '-'} | CYL: {item.cyl || '-'} | AXIS: {item.axis || '-'}</p>
                          )}
                          {item.addition && !isYangonOrderLens(item) && <p>Addition: {item.addition}</p>}
                          {item.category && <p>Material: {item.category}</p>}
                          <p className={`${isYangonOrderLens(item) || item.category === 'yangon order' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            Store: {item.store}
                          </p>
                          {item.type && (
                            <p className={`font-medium ${
                              item.type === 'SMS' ? 'text-blue-600 dark:text-blue-400' : 
                              item.type === 'Yangon Order' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              Type: {item.type}
                              {item.type === 'SMS' && item.smsBifocalType && ` (${item.smsBifocalType})`}
                              {item.type === 'Yangon Order' && item.yangonOrderSubType && ` (${item.yangonOrderSubType})`}
                            </p>
                          )}
                          {(isBifocalLens(item) || isSingleVisionLens(item) || isSMSLens(item) || isYangonOrderLens(item)) && (
                            <p className={`font-medium ${isYangonOrderLens(item) ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'}`}>
                              Sold in 0.5 increments
                            </p>
                          )}
                        </div>
                      )}
                      
                      {selectedItemType === 'Frame' && item.color && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Color: {item.color}</p>
                      )}
                      
                      {selectedItemType === 'Contact Lens' && item.power && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Power: {item.power}</p>
                      )}
                      
                      <div className="mt-3 flex justify-between items-center">
                        {/* Enhanced pricing display for frames */}
                        {selectedItemType === 'Frame' && item.prices && item.prices.length > 1 ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">Multiple prices available</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {formatCurrency(Math.min(...item.prices))} - {formatCurrency(Math.max(...item.prices))}
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(item.price)}
                            {selectedItemType === 'Lens' && <span className="text-xs text-gray-500"> /piece</span>}
                          </span>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant={stockStatus.isOutOfStock ? "outline" : "primary"}
                          onClick={(e) => selectedItemType === 'Frame' ? handleFrameAddWithPriceSelection(e, item) : handleAddItem(e, item)}
                          className={`transition-transform hover:scale-105 ${
                            stockStatus.isOutOfStock ? 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100' : 'hover:bg-blue-600'
                          }`}
                          title={stockStatus.isOutOfStock ? 'Out of stock - will add as FOC' : 
                                 stockStatus.isLowStock ? 'Low stock' : 
                                 stockStatus.isPartiallySelected ? `${stockStatus.selectedInVOC} already in VOC` : 
                                 'Add to VOC'}
                        >
                          <Plus size={16} />
                          {stockStatus.isOutOfStock && <span className="ml-1 text-xs">FOC</span>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Enhanced Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) => (
                        <React.Fragment key={index}>
                          {page === '...' ? (
                            <span className="px-2 py-1 text-gray-500">...</span>
                          ) : (
                            <Button
                              type="button"
                              variant={currentPage === page ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className="min-w-[2.5rem]"
                            >
                              {page}
                            </Button>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {totalFilteredItems} total items
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center space-y-3">
                <Search className="h-12 w-12 text-gray-300" />
                <div className="space-y-1">
                  <p className="text-lg font-medium">No items found</p>
                  {(searchTerm || sphSearch || cylSearch || axisSearch || additionSearch || yangonOrderNameSearch || storeFilter || availabilityFilter !== 'all') ? (
                    <div className="text-sm space-y-1">
                      <p>Try adjusting your search terms or filters</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={clearAllFilters}
                        className="mt-2"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm">No items available for the selected category</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selected Items Section - Enhanced */}
          {fields.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-lg">Selected Items ({fields.length})</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total: {formatCurrency(subtotal)}
                </div>
              </div>
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const stockStatus = getStockStatus({ id: field.id });
                  return (
                    <div key={field.id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      stockStatus.isPartiallySelected ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/10 dark:border-orange-700' :
                      field.isFOC ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/10 dark:border-blue-700' :
                      'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                    }`}>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{field.name}</p>
                            {field.selectedPriceLabel && field.selectedPriceLabel !== 'Regular Price' && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                {field.selectedPriceLabel}
                              </span>
                            )}
                            {field.isFOC && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                FOC
                              </span>
                            )}
                            {field.isBifocal && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                                <Eye size={10} />
                                Bifocal
                              </span>
                            )}
                            {field.isSingleVision && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                                <Eye size={10} />
                                Single Vision
                              </span>
                            )}
                            {field.isSMS && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                                <Stethoscope size={10} />
                                SMS
                              </span>
                            )}
                            {field.isSMSBifocal && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                                <Stethoscope size={10} />
                                SMS Bifocal
                              </span>
                            )}
                            {field.isYangonOrder && (
                              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full flex items-center gap-1">
                                <MapPin size={10} />
                                Yangon Order
                              </span>
                            )}
                            {field.category === 'yangon order' && (
                              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full flex items-center gap-1">
                                <MapPin size={10} />
                                Yangon Order
                              </span>
                            )}
                            {!field.isFOC && stockStatus.isPartiallySelected && (
                              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full flex items-center gap-1">
                                <AlertTriangle size={10} />
                                {stockStatus.availableNow} left
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {editingItemIndex === index ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={customTotal}
                                  onChange={(e) => setCustomTotal(e.target.value)}
                                  placeholder="Custom total"
                                  className="w-24 h-8 text-sm"
                                />
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="primary"
                                  onClick={() => {
                                    handleCustomTotalChange(index, customTotal);
                                    setEditingItemIndex(null);
                                    setCustomTotal('');
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingItemIndex(null);
                                    setCustomTotal('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {field.isFOC ? 'FOC' : formatCurrency(field.customTotal || (field.price * field.quantity))}
                                </p>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingItemIndex(index);
                                    setCustomTotal(field.customTotal?.toString() || '');
                                  }}
                                  title="Edit total amount"
                                >
                                  <Edit size={12} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Show Yangon Order Name in selected items */}
                        {(field.isYangonOrder || field.category === 'yangon order') && field.yangonOrderName && (
                          <div className="mt-1 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
                            <div className="flex items-center gap-1 text-orange-800 dark:text-orange-200 text-sm">
                              <MapPin size={12} />
                              <span className="font-medium">{field.yangonOrderName}</span>
                            </div>
                          </div>
                        )}
                        
                        {field.details && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {field.type === 'Lens' && (
                              <>
                                {/* Enhanced prescription display for Yangon Orders */}
                                {field.isYangonOrder || field.category === 'yangon order' ? (
                                  <div className="space-y-1">
                                    <p className="font-medium text-orange-700 dark:text-orange-300">Yangon Order Prescription:</p>
                                    {(field.isBifocal || field.details.addition) ? (
                                      <div className="space-y-1">
                                        <p>SPH: {field.details.sph || '-'} | ADD: {field.details.addition || '-'}</p>
                                        {field.details.Right && <p className="text-blue-600 dark:text-blue-400">Right Eye: {field.details.Right}</p>}
                                        {field.details.Left && <p className="text-green-600 dark:text-green-400">Left Eye: {field.details.Left}</p>}
                                        {field.details.rightCyl && <p className="text-blue-600 dark:text-blue-400">Right CYL: {field.details.rightCyl}</p>}
                                        {field.details.leftCyl && <p className="text-green-600 dark:text-green-400">Left CYL: {field.details.leftCyl}</p>}
                                        {field.details.rightAxis && <p className="text-blue-600 dark:text-blue-400">Right AXIS: {field.details.rightAxis}</p>}
                                        {field.details.leftAxis && <p className="text-green-600 dark:text-green-400">Left AXIS: {field.details.leftAxis}</p>}
                                      </div>
                                    ) : (
                                      <p>SPH: {field.details.sph || '-'} | CYL: {field.details.cyl || '-'} | AXIS: {field.details.axis || '-'}</p>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <p>SPH: {field.details.sph || '-'} | CYL: {field.details.cyl || '-'} | AXIS: {field.details.axis || '-'}</p>
                                    {field.details.addition && <p>Addition: {field.details.addition}</p>}
                                  </>
                                )}
                                <p className={`${field.isYangonOrder || field.category === 'yangon order' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  Store: {field.store}
                                </p>
                              </>
                            )}
                            {field.type === 'Frame' && field.details.color && (
                              <p>Color: {field.details.color}</p>
                            )}
                            {field.type === 'Contact Lens' && field.details.power && (
                              <p>Power: {field.details.power}</p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          {(field.isBifocal || field.isSMSBifocal || field.isYangonOrder) ? (
                            // Bifocal lenses, SMS bifocal, and Yangon Order bifocal get left/right controls
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  Total: {formatLensQuantity(field.quantity, field.type, field.isBifocal, field.isSingleVision, field.isSMS, field.isYangonOrder)}
                                </span>
                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border rounded-lg p-1">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={() => handleQuantityChange(index, -1)}
                                    className="h-6 w-6 p-0 hover:bg-red-50"
                                  >
                                    <Minus size={12} />
                                  </Button>
                                  <span className="px-2 py-1 text-sm font-medium min-w-[3rem] text-center">
                                    {field.quantity.toFixed(1)}
                                  </span>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={() => handleQuantityChange(index, 1)}
                                    className="h-6 w-6 p-0 hover:bg-green-50"
                                    disabled={!field.isFOC && !canAddQuantity(field.id, 0.5, false)}
                                    title={!field.isFOC && !canAddQuantity(field.id, 0.5, false) ? 'Not enough stock available' : 'Increase quantity'}
                                  >
                                    <Plus size={12} />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Individual eye controls for bifocal, SMS bifocal, and Yangon Order bifocal only */}
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-600">Right:</span>
                                  <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 border rounded p-1">
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      onClick={() => handleEyeQuantityChange(index, 'right', -1)}
                                      className="h-5 w-5 p-0 hover:bg-red-50"
                                    >
                                      <Minus size={10} />
                                    </Button>
                                    <span className="px-1 py-0.5 text-xs min-w-[2rem] text-center font-mono">
                                      {(field.details?.rightQty || 0).toFixed(1)}
                                    </span>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      onClick={() => handleEyeQuantityChange(index, 'right', 1)}
                                      className="h-5 w-5 p-0 hover:bg-green-50"
                                      disabled={!field.isFOC && !canAddQuantity(field.id, 0.5, false)}
                                      title={!field.isFOC && !canAddQuantity(field.id, 0.5, false) ? 'Not enough stock available' : 'Increase right eye quantity'}
                                    >
                                      <Plus size={10} />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-600">Left:</span>
                                  <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 border rounded p-1">
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      onClick={() => handleEyeQuantityChange(index, 'left', -1)}
                                      className="h-5 w-5 p-0 hover:bg-red-50"
                                    >
                                      <Minus size={10} />
                                    </Button>
                                    <span className="px-1 py-0.5 text-xs min-w-[2rem] text-center font-mono">
                                      {(field.details?.leftQty || 0).toFixed(1)}
                                    </span>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      onClick={() => handleEyeQuantityChange(index, 'left', 1)}
                                      className="h-5 w-5 p-0 hover:bg-green-50"
                                      disabled={!field.isFOC && !canAddQuantity(field.id, 0.5, false)}
                                      title={!field.isFOC && !canAddQuantity(field.id, 0.5, false) ? 'Not enough stock available' : 'Increase left eye quantity'}
                                    >
                                      <Plus size={10} />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Single vision, SMS single vision, Yangon Order single vision and other items - simple quantity controls
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Quantity: {formatLensQuantity(field.quantity, field.type, field.isBifocal, field.isSingleVision, field.isSMS, field.isYangonOrder)}
                              </span>
                              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border rounded-lg p-1">
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleQuantityChange(index, -1)}
                                  className="h-6 w-6 p-0 hover:bg-red-50"
                                >
                                  <Minus size={12} />
                                </Button>
                                <span className="px-2 py-1 text-sm font-medium min-w-[2rem] text-center">
                                  {field.type === 'Lens' ? field.quantity.toFixed(1) : field.quantity}
                                </span>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleQuantityChange(index, 1)}
                                  className="h-6 w-6 p-0 hover:bg-green-50"
                                  disabled={!field.isFOC && !canAddQuantity(field.id, field.type === 'Lens' ? 0.5 : 1, false)}
                                  title={!field.isFOC && !canAddQuantity(field.id, field.type === 'Lens' ? 0.5 : 1, false) ? 'Not enough stock available' : 'Increase quantity'}
                                >
                                  <Plus size={12} />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <Button
                            type="button"
                            size="sm"
                            variant={field.isFOC ? 'primary' : 'outline'}
                            onClick={() => {
                              update(index, {
                                ...field,
                                isFOC: !field.isFOC
                              });
                            }}
                            className="ml-2"
                          >
                            FOC
                          </Button>
                        </div>

                        {/* Individual Item Discount Section - Only show for non-FOC items */}
                        {!field.isFOC && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                            <div className="flex items-center gap-2">
                              <Percent size={14} className="text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Item Discount:</span>
                              <Input
                                type="number"
                                min={0}
                                max={field.customTotal || (field.price * field.quantity)}
                                value={field.itemDiscount || 0}
                                onChange={(e) => handleItemDiscountChange(index, e.target.value)}
                                className="w-20 h-6 text-sm"
                                placeholder="0"
                              />
                              <span className="text-sm text-yellow-700 dark:text-yellow-300">MMK</span>
                            </div>
                            {field.itemDiscount > 0 && (
                              <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                Item total after discount: {formatCurrency(Math.max((field.customTotal || (field.price * field.quantity)) - (field.itemDiscount || 0), 0))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Error Tracking */}
                        <ErrorTracker
                          item={field}
                          onUpdateItem={(updatedItem) => {
                            const updatedItems = [...selectedItems];
                            updatedItems[index] = updatedItem;
                            setValue('items', updatedItems);
                          }}
                        />
                        <div className="mt-2">
                          <Input
                            label="Error Quantity"
                            type="number"
                            min={0}
                            step={field.type === 'Lens' ? 0.5 : 1}
                            max={field.quantity}
                            value={field.errorQuantity || 0}
                            onChange={(e) => {
                              const errorQuantity = parseFloat(e.target.value) || 0;
                              if (errorQuantity > field.quantity) {
                                toast.error("Error quantity cannot exceed total quantity.");
                                return;
                              }
                              update(index, { ...field, errorQuantity });
                            }}
                            className="w-24 h-8 text-sm"
                          />
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="ml-4"
                        onClick={() => remove(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  );
                })}
                
                <div className="flex flex-col gap-2 p-3 border-t mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Items Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedItems.reduce((sum, item) => {
                        if (item.isFOC) return sum;
                        return sum + (item.customTotal || (item.price * item.quantity));
                      }, 0))}
                    </span>
                  </div>

                  {totalItemDiscounts > 0 && (
                    <div className="flex justify-between items-center text-orange-600">
                      <span className="font-medium">Total Item Discounts:</span>
                      <span className="font-medium">
                        -{formatCurrency(totalItemDiscounts)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Subtotal (After Item Discounts):</span>
                    <span className="font-medium">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span className="font-medium">Overall Discount:</span>
                      <span className="font-medium">
                        -{formatCurrency(discount)}
                      </span>
                    </div>
                  )}

                  {/* Show payment breakdown without converting Yuan to MMK */}
                  {paymentMethod.includes('Yuan') && yuanAmount > 0 && (
                    <div className="flex justify-between items-center text-blue-600">
                      <span className="font-medium">Yuan Payment:</span>
                      <span className="font-medium">
                        {formatYuan(yuanAmount)} Yuan
                      </span>
                    </div>
                  )}
                  
                  {paymentMethod.includes('KPay') && kpayAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-medium">KPay Payment:</span>
                      <span className="font-medium">{formatCurrency(kpayAmount)}</span>
                    </div>
                  )}
                  
                  {paymentMethod.includes('Cash') && cashAmount > 0 && (
                    <div className="flex justify-between items-center text-purple-600">
                      <span className="font-medium">Cash Payment:</span>
                      <span className="font-medium">{formatCurrency(cashAmount)}</span>
                    </div>
                  )}

                  {paymentMethod === 'Yuan' && mmkAmount > 0 && (
                    <div className="flex justify-between items-center text-gray-600">
                      <span className="font-medium">Additional MMK:</span>
                      <span className="font-medium">{formatCurrency(mmkAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="font-medium">Final Total:</span>
                    <span className="font-bold text-lg">
                      {paymentMethod === 'Yuan' 
                        ? `${formatYuan(yuanAmount)}${mmkAmount > 0 ? ` + ${formatCurrency(mmkAmount)}` : ''}`
                        : paymentMethod.includes('Yuan')
                        ? `${formatYuan(yuanAmount)} + ${formatCurrency(Math.max(subtotal - discount - yuanAmount, 0))}`
                        : formatCurrency(Math.max(subtotal - discount, 0))
                      }
                    </span>
                  </div>

                  {/* FOC Items Summary */}
                  {selectedItems.some(item => item.isFOC) && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>FOC Items:</strong> {selectedItems.filter(item => item.isFOC).length} items marked as Free of Charge
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Input
            label="Notes"
            {...register('notes')}
            placeholder="Any special instructions..."
            className="mt-4"
          />

          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset({
                  vocNumber: typeof generateVocNumber === 'function' ? generateVocNumber(store as Store) : '',
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
                  items: [],
                });
                clearAllFilters();
                setVocDate(format(new Date(), 'yyyy-MM-dd'));
                setVocTime(format(new Date(), 'HH:mm'));
              }}
            >
              Reset Form
            </Button>
            
            <Button
              type="submit"
              className="min-w-[120px]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Create VOC'
              )}
            </Button>
          </div>
        </div>
      
      {/* Display stock errors */}
      {stockErrors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-red-800 font-medium mb-2">Stock Issues:</h3>
          <ul className="list-disc list-inside text-red-700">
            {stockErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      </form>
    </>
  );
};

export default VocForm;