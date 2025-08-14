import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Store, ItemType, PaymentType, PaymentMethod, generateVocNumber, CustomerType, CustomerGender, formatCurrency, formatPairQuantity, formatYuan, FrameCategory, ContactLensCategory } from '../../lib/utils';
import { updateCompleteInventoryForVOC, validateVOCInventory } from '../../lib/InventoryUtlis';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, Trash2, RefreshCw, Eye, Edit, MapPin, Stethoscope, ChevronLeft, ChevronRight, DollarSign, Percent, Calendar, AlertTriangle, CheckCircle, Filter, X, FileText, Save, User, ChevronUp, ChevronDown, Glasses, Sun, Contact, Package, ShoppingCart, Zap, Star, Sparkles, Heart, CheckCircle2 } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import ErrorTracker from '../ui/ErrorTracker';
import { VocData, ERROR_CATEGORIES } from '../../type/Vocerror';
import { 
  calculateSoldQuantity, 
  calculateVocAmount, 
  validateErrorQuantity 
} from '../../lib/InventoryCalculation';
import { VocItem } from '../../type/voc';

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
  discountPercentage: number; // New field for percentage discount
  hasError: boolean;
  isFOC: boolean;
  errorQuantity: number;
  customTotal?: number | null;
  errorSide?: 'left' | 'right' | 'both' | null;
  selectedSide?: 'left' | 'right' | 'both' | null; // For bifocal flattop side selection
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
    rightAddition?: string | null;
    leftAddition?: string | null;
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
  salePerson: string;
  eyeTest: string;
  fitting: string;
  items: FormVocItem[];
  errorCategory: string;
  errorDescription: string;
}

// Lens Categories Configuration - Made more inclusive
const LENS_CATEGORIES = {
  singleVision: [
    'bb 1.56', 'bb 1.61', 'bb 1.67',
    'bbpg 1.56', 'bbpg 1.61', 'pg',
    'anti flash', 'anti glare',
    'photo pink', 'photo blue', 'photo purple', 'photo brown',
    'cr', 'mc', 'single vision', 'sv'
  ],
  bifocal: {
    fuse: [
      'bbpgfuse', 'crfuse', 'mcfuse', 'pgfuse',
      'bbfuse', 'polarized fuse', 'transition fuse', 'fuse'
    ],
    flattop: [
      'mcflattop', 'crflattop', 'bbpgflattop',
      'bbflattop', 'polarized flattop', 'flattop'
    ]
  },
  multifocal: [
    'BB', 'MC', 'CR', 'BBPG', 'PG', 'multifocal', 'progressive'
  ]
};

// Animation keyframes for smooth transitions
const fadeInUp = {
  initial: { opacity: 0, transform: 'translateY(20px)' },
  animate: { opacity: 1, transform: 'translateY(0px)' },
  transition: { duration: 0.6, ease: 'easeOut' }
};

const slideInLeft = {
  initial: { opacity: 0, transform: 'translateX(-30px)' },
  animate: { opacity: 1, transform: 'translateX(0px)' },
  transition: { duration: 0.5, ease: 'easeOut' }
};

const scaleIn = {
  initial: { opacity: 0, transform: 'scale(0.95)' },
  animate: { opacity: 1, transform: 'scale(1)' },
  transition: { duration: 0.4, ease: 'easeOut' }
};

const VocForm: React.FC<VocFormProps> = ({ store, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<ItemType>('Lens');
  const [selectedSubType, setSelectedSubType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLensCategory, setSelectedLensCategory] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [allLensItems, setAllLensItems] = useState<any[]>([]); // Store all lens items separately
  const [searchTerm, setSearchTerm] = useState('');
  const [yuanRate, setYuanRate] = useState(300);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [customTotal, setCustomTotal] = useState<string>('');
  
  // Animation states
  const [isCreatingVoc, setIsCreatingVoc] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true);
  
  // Auto-customer creation
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  
  // Staff data
  const [staffList, setStaffList] = useState<{
    salePersons: string[];
    eyeTestStaff: string[];
    fittingStaff: string[];
  }>({
    salePersons: [],
    eyeTestStaff: [],
    fittingStaff: []
  });
  
  // Add VOC date state
  const [vocDate, setVocDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vocTime, setVocTime] = useState(format(new Date(), 'HH:mm'));
  
  // Enhanced pagination state with better defaults for lens data
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Separate search fields for lens prescriptions
  const [sphSearch, setSphSearch] = useState('');
  const [cylSearch, setCylSearch] = useState('');
  const [axisSearch, setAxisSearch] = useState('');
  const [additionSearch, setAdditionSearch] = useState('');
  const [yangonOrderNameSearch, setYangonOrderNameSearch] = useState('');
  
  // Enhanced lens prescription search fields
  const [rightEyeSearch, setRightEyeSearch] = useState('');
  const [leftEyeSearch, setLeftEyeSearch] = useState('');
  const [colorSearch, setColorSearch] = useState('');
  const [powerSearch, setPowerSearch] = useState('');
  const [rightAxisSearch, setRightAxisSearch] = useState('');
  const [leftAxisSearch, setLeftAxisSearch] = useState('');
  const [rightCylSearch, setRightCylSearch] = useState('');
  const [leftCylSearch, setLeftCylSearch] = useState('');
  const [rightAdditionSearch, setRightAdditionSearch] = useState('');
  const [leftAdditionSearch, setLeftAdditionSearch] = useState('');

  // Enhanced filtering state
  const [showFilters, setShowFilters] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [showLensPrescriptionSearch, setShowLensPrescriptionSearch] = useState(false);

  // Error tracking states
  const [isError, setIsError] = useState(false);
  const [errorStore, setErrorStore] = useState('');
  const [errorCategory, setErrorCategory] = useState('');
  const [errorDescription, setErrorDescription] = useState('');

  // Lens details modal states
  const [showLensDetailsModal, setShowLensDetailsModal] = useState(false);
  const [selectedLensForDetails, setSelectedLensForDetails] = useState<any>(null);
  const [lensDetailsForm, setLensDetailsForm] = useState({
    sph: '',
    cyl: '',
    axis: '',
    addition: '',
    rightEye: '',
    leftEye: '',
    rightAxis: '',
    leftAxis: '',
    rightCyl: '',
    leftCyl: '',
    rightAddition: '',
    leftAddition: '',
    color: '',
    power: '',
    yangonOrderName: '',
    rightQty: '',
    leftQty: ''
  });

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
      salePerson: '',
      eyeTest: '',
      fitting: '',
      items: [],
      errorCategory: '',
      errorDescription: '',
    },
  });

  // Initialize form animation with welcome sequence
  useEffect(() => {
    // Show welcome animation first
    setShowWelcomeAnimation(true);
    
    // Hide welcome animation and show form after 3 seconds
    const welcomeTimer = setTimeout(() => {
      setShowWelcomeAnimation(false);
      
      // Show form with animation after welcome disappears
      const formTimer = setTimeout(() => {
        setFormVisible(true);
      }, 300);
      
      return () => clearTimeout(formTimer);
    }, 3000);
    
    return () => clearTimeout(welcomeTimer);
  }, []);

  // Add keyboard shortcut for refresh (F5 or Ctrl+R)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
        event.preventDefault();
        refreshFormWithWelcome();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Function to refresh form with welcome animation
  const refreshFormWithWelcome = () => {
    setFormVisible(false);
    setShowWelcomeAnimation(true);
    
    // Reset form
    reset();
    setSelectedItems([]);
    
    // Hide welcome animation and show form after 3 seconds
    const welcomeTimer = setTimeout(() => {
      setShowWelcomeAnimation(false);
      
      // Show form with animation after welcome disappears
      const formTimer = setTimeout(() => {
        setFormVisible(true);
      }, 300);
      
      return () => clearTimeout(formTimer);
    }, 3000);
    
    return () => clearTimeout(welcomeTimer);
  };

  // Removed auto-generation of VOC number - users can now input their own VOC number

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
  const watchedErrorCategory = watch('errorCategory');
  const customerName = watch('customerName');
  
  // Calculate total error quantity
  const totalErrorQuantity = selectedItems.reduce((sum, item) => sum + (item.errorQuantity || 0), 0);
  const hasErrors = selectedItems.some(item => item.hasError);
  
  // Auto-suggest customers when name is typed
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerName && customerName.length > 2) {
        try {
          const customersQuery = query(
            collection(db, 'customers'),
            where('store', '==', store)
          );
          const snapshot = await getDocs(customersQuery);
          const customers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          const matches = customers.filter(customer => 
            customer.name.toLowerCase().includes(customerName.toLowerCase())
          );
          
          setCustomerSuggestions(matches);
          setShowCustomerSuggestions(matches.length > 0);
        } catch (error) {
          console.error('Error searching customers:', error);
        }
      } else {
        setShowCustomerSuggestions(false);
        setCustomerSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [customerName, store]);

  // Enhanced auto-create customer function
  const createCustomerRecord = async (data: any) => {
    try {
      // Check if customer already exists
      const existingCustomerQuery = query(
        collection(db, 'customers'),
        where('name', '==', data.customerName),
        where('store', '==', store)
      );
      
      const existingSnapshot = await getDocs(existingCustomerQuery);
      
      if (existingSnapshot.empty) {
        const customerData = {
          number: data.vocNumber,
          name: data.customerName,
          type: data.customerType,
          gender: data.customerGender,
          age: data.customerAge,
          phone: data.customerPhone,
          store: store,
          date: vocDate,
          address: '',
          wechatName: '',
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'customers'), customerData);
        toast.success(`✅ Customer "${data.customerName}" automatically added to customer database!`, {
          duration: 4000,
          icon: '👤'
        });
      } else {
        // Update existing customer if data has changed
        const existingCustomer = existingSnapshot.docs[0];
        const existingData = existingCustomer.data();
        
        const hasChanges = 
          existingData.phone !== data.customerPhone ||
          existingData.type !== data.customerType ||
          existingData.gender !== data.customerGender ||
          existingData.age !== data.customerAge;
          
        if (hasChanges) {
          await updateDoc(doc(db, 'customers', existingCustomer.id), {
            phone: data.customerPhone,
            type: data.customerType,
            gender: data.customerGender,
            age: data.customerAge,
            updatedAt: serverTimestamp(),
          });
          
          toast.success(`✅ Customer "${data.customerName}" details updated in database!`, {
            duration: 4000,
            icon: '🔄'
          });
        }
      }
    } catch (error) {
      console.error('Error creating/updating customer record:', error);
      toast.error('Note: Failed to save customer to database', {
        duration: 3000,
        icon: '⚠️'
      });
    }
  };

  // Select customer from suggestions
  const selectCustomer = (customer: any) => {
    setValue('customerName', customer.name);
    setValue('customerPhone', customer.phone || '');
    setValue('customerType', customer.type || 'Original');
    setValue('customerGender', customer.gender || 'Male');
    setValue('customerAge', customer.age || 0);
    setExistingCustomer(customer);
    setShowCustomerSuggestions(false);
    
    toast.success(`Customer details loaded: ${customer.name}`, {
      duration: 3000,
      icon: '✅'
    });
  };
  
  // FIXED: Calculate subtotal ONLY from sold quantities (excluding error quantities)
  const subtotal = selectedItems.reduce((sum, item) => {
    if (item.isFOC) return sum; // FOC items don't contribute to subtotal
    
    // Calculate sold quantity (total quantity - error quantity)
    const soldQuantity = Math.max(0, item.quantity - (item.errorQuantity || 0));
    
    // Only charge for sold quantities, not error quantities
    const soldAmount = item.customTotal !== null ? item.customTotal : (item.price * soldQuantity);
    
    // Apply item discount
    const itemDiscount = item.itemDiscount || 0;
    const finalItemTotal = Math.max(soldAmount - itemDiscount, 0);
    
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

  // Auto-calculate paid amount and balance when deposit amount changes
  const depositAmount = watch('depositAmount') || 0;
  useEffect(() => {
    if (paymentType === 'Deposit') {
      const totalAmount = watch('totalAmount') || 0;
      setValue('paidAmount', depositAmount);
      setValue('balance', totalAmount - depositAmount);
    }
  }, [depositAmount, paymentType, setValue, watch]);

  useEffect(() => {
    fetchItems();
    fetchStaffList();
  }, [store, selectedItemType]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedItemType, selectedSubType, selectedCategory, selectedLensCategory, searchTerm, sphSearch, cylSearch, axisSearch, additionSearch, yangonOrderNameSearch, availabilityFilter]);

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

  // Helper function to check if a lens is bifocal flattop (needs left/right selection)
  const isBifocalFlattopLens = (item: any) => {
    return item.category && item.category.toLowerCase().includes('flattop');
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
    return item.type === 'SMS' && !!item.smsBifocalType && selectedItemType === 'Lens';
  };

  // Helper function to check if a lens is Yangon Order
  // Helper function to check if a lens is Yangon Order
  const isYangonOrderLens = (item: any) => {
    // More robust Yangon Order detection: type, category, or yangonOrderName
    if (selectedItemType !== 'Lens') return false;
    return (
      item.type?.toLowerCase() === 'yangon order' ||
      item.category?.toLowerCase().includes('yangon') ||
      !!item.yangonOrderName
    );
  };

  // Helper function to get real-time available quantity for an item
  const getAvailableQuantity = (itemId: string): number => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;

    // Calculate how much is already selected in the current VOC
    // Both sold and error quantities consume inventory, so we use total quantity
    const selectedQuantity = selectedItems
      .filter(selectedItem => selectedItem.id === itemId && !selectedItem.isFOC) // Exclude FOC items from stock calculation
      .reduce((sum, selectedItem) => {
        // Total quantity includes both sold and error quantities
        // This is correct because both consume physical inventory
        return sum + selectedItem.quantity;
      }, 0);

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

  // Enhanced category display with proper icons and formatting
  const getCategoryDisplayName = (category: string, itemType: ItemType): string => {
    if (itemType === 'Frame') {
      switch (category?.toLowerCase()) {
        case 'eyeglasses':
        case 'eye glasses':
          return '👓 Eyeglasses';
        case 'sunglasses':
          return '🕶️ Sunglasses';
        case 'promotion':
          return '🎉 Promotion';
        case 'ready':
          return '✅ Ready';
        case 'ready bb':
          return '🔵 Ready BB';
        default: 
          return category || 'Other';
      }
    }
    
    if (itemType === 'Contact Lens') {
      switch (category) {
        case 'မျက်ကပ်အကြည်':
          return '👁️ မျက်ကပ်အကြည်';
        case 'Pretty and Shinning':
          return '✨ Pretty and Shinning';
        case 'F.l':
          return '🔍 F.l';
        case 'Big Eye Black':
          return '⚫ Big Eye Black';
        case 'Ms plane':
          return '📐 MS မျက်ကပ်အကြည်';
        case 'Ms ပါဝါ color':
          return '🎨 MS ပါဝါ Color';
        case 'Original':
          return '🔸 Original';
        case 'Premium':
          return '💎 Premium';
        default: 
          return category || 'Other';
      }
    }
    
    if (itemType === 'Lens') {
      return `🔍 ${category || 'Other'}`;
    }
    
    return category || 'Other';
  };

  // Enhanced error category display with proper formatting
  const getErrorCategoryDisplayName = (errorCategory: string): string => {
    const categoryMap: Record<string, string> = {
      'form_error': '📝 Form Error (50% discount)',
      'kkt': '🔧 KKT Error',
      'kcma': '⚙️ KCMA Error',
      'kmmt': '🛠️ KMMT Error',
      'eye_test': '👁️ Eye Test Error',
      'fitting': '🔧 Fitting Error',
      'factory': '🏭 Factory Error',
      'wrong_delivery': '📦 Wrong Delivery',
      'wrong_lens_production': '🔍 Wrong Lens Production',
      'unknown': '❓ Unknown Error'
    };
    
    return categoryMap[errorCategory] || `❓ ${errorCategory}`;
  };

  // Helper function to get item type icon
  const getItemTypeIcon = (itemType: ItemType) => {
    switch (itemType) {
      case 'Lens': return <Eye className="h-5 w-5" />;
      case 'Frame': return <Glasses className="h-5 w-5" />;
      case 'Contact Lens': return <Contact className="h-5 w-5" />;
      case 'Accessories': return <Package className="h-5 w-5" />;
      default: return <Eye className="h-5 w-5" />;
    }
  };

  // FIXED: Enhanced fetch items function with proper store filtering
  const fetchItems = async () => {
    try {
      setInventoryLoading(true);
      const collectionName = getCollectionName();
      
      console.log(`🔄 Fetching ${selectedItemType} items from collection: ${collectionName}`);
      
      let itemQuery;
      
      // FIXED: Apply store filtering based on item type
      if (selectedItemType === 'Lens') {
        // For lens items, fetch from all stores to ensure complete data
        itemQuery = collection(db, collectionName);
      } else {
        // FIXED: For Frame, Accessories, and Contact Lens - filter by current store only
        console.log(`🏪 Filtering ${selectedItemType} items for store: ${store}`);
        itemQuery = query(
          collection(db, collectionName),
          where('store', '==', store)
        );
      }
      
      const snapshot = await getDocs(itemQuery);
      let itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure all required fields are present with fallbacks
        name: doc.data().name || doc.data().code || 'Unknown Item',
        code: doc.data().code || doc.data().name || '',
        price: doc.data().price || 0,
        category: doc.data().category || '',
        type: doc.data().type || selectedItemType,
        store: doc.data().store || store,
        remainingQty: doc.data().qty || 0,
        soldQty: doc.data().soldQty || 0,
        errorQty: doc.data().errorQty || 0,
        originalQty: doc.data().originalQty || doc.data().qty || 0,
        // Lens specific fields
        sph: doc.data().sph || null,
        cyl: doc.data().cyl || null,
        axis: doc.data().axis || null,
        addition: doc.data().addition || null,
        color: doc.data().color || null,
        power: doc.data().power || null,
        Right: doc.data().Right || null,
        Left: doc.data().Left || null,
        rightAxis: doc.data().rightAxis || null,
        leftAxis: doc.data().leftAxis || null,
        rightCyl: doc.data().rightCyl || null,
        leftCyl: doc.data().leftCyl || null,
        rightAddition: doc.data().rightAddition || null,
        leftAddition: doc.data().leftAddition || null,
        yangonOrderName: doc.data().yangonOrderName || null,
        // Frame specific fields
        brand: doc.data().brand || null,
        model: doc.data().model || null,
        size: doc.data().size || null,
        // Contact lens specific fields
        diameter: doc.data().diameter || null,
        baseCurve: doc.data().baseCurve || null,
        // Additional fields
        description: doc.data().description || null,
        notes: doc.data().notes || null
      }));

      console.log(`📦 Fetched ${itemsData.length} ${selectedItemType} items from ${collectionName}`);
      
      // Debug: Show store distribution
      const storeDistribution = itemsData.reduce((acc, item) => {
        acc[item.store] = (acc[item.store] || 0) + 1;
        return acc;
      }, {});
      console.log(`🏪 Store distribution for ${selectedItemType}:`, storeDistribution);
      
      if (itemsData.length === 0) {
        console.warn(`⚠️ No ${selectedItemType} items found for store: ${store}`);
        toast.warning(`No ${selectedItemType} items found for ${store.toUpperCase()} store`);
        setItems([]);
        if (selectedItemType === 'Lens') {
          setAllLensItems([]);
        }
        return;
      }

      // Store all lens items separately for complete access
      if (selectedItemType === 'Lens') {
        setAllLensItems(itemsData);
      }

      // Show success message with item count and store filter info
      const storeInfo = selectedItemType === 'Lens' ? 'all stores' : `${store.toUpperCase()} store`;
      toast.success(`Loaded ${itemsData.length} ${selectedItemType} items from ${storeInfo}`, {
        duration: 2000,
        icon: '📦'
      });
      
      setItems(itemsData);
    } catch (error) {
      console.error('❌ Error fetching items:', error);
      toast.error(`Failed to fetch ${selectedItemType} items: ${error.message}`, {
        duration: 5000
      });
      setItems([]);
      if (selectedItemType === 'Lens') {
        setAllLensItems([]);
      }
    } finally {
      setInventoryLoading(false);
    }
  };

  // Manual refresh function for debugging
  const refreshInventory = async () => {
    console.log('🔄 Manual inventory refresh triggered');
    await fetchItems();
  };

  // Fetch staff list from database
  const fetchStaffList = async () => {
    try {
      // Predefined staff lists for each role
      const salePersons = [
        'Ei Ei Naing',
        'Thiri Naing', 
        'Zu',
        'Khaing Moe Oo',
        'Hnin Nu Wai',
        'Nan Ngin',
        'Aye Nadi Htun',
        "Yadanar"
      ];

      const eyeTestStaff = [
        'Ko Kyaw Tint',
        'Yadnar',
        'Hnin Nu Wai',
        'Kkt',
        'other shop'
      ];

      const fittingStaff = [
        'Ko Chit Min Aung',
        'Ko Kyaw Tint',
        'Other shop',
        'Buying Only Frame or Renu & Ready'
      ];

      setStaffList({
        salePersons,
        eyeTestStaff,
        fittingStaff
      });

      // Also try to fetch from database as backup
      const staffQuery = query(
        collection(db, 'staff'),
        where('store', '==', store),
        where('active', '==', true),
        orderBy('name')
      );
      
      const snapshot = await getDocs(staffQuery);
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Merge with predefined lists if database has data
      if (staffData.length > 0) {
        const dbSalePersons = staffData.filter(s => s.role === 'salePerson').map(s => s.name);
        const dbEyeTest = staffData.filter(s => s.role === 'eyeTest').map(s => s.name);
        const dbFitting = staffData.filter(s => s.role === 'fitting').map(s => s.name);

        setStaffList({
          salePersons: [...new Set([...salePersons, ...dbSalePersons])],
          eyeTestStaff: [...new Set([...eyeTestStaff, ...dbEyeTest])],
          fittingStaff: [...new Set([...fittingStaff, ...dbFitting])]
        });
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      // Use predefined lists as fallback
      setStaffList({
        salePersons: [
          'Ei Ei Naing',
          'Thiri Naing', 
          'Zu',
          'Khaing Moe Oo',
          'Hnin Nu Wai',
          'Nan Ngin',
          'Aye Nadi Htun'
        ],
        eyeTestStaff: [
          'Ko Kyaw Tint',
          'Yadnar',
          'Hnin Nu Wai'
        ],
        fittingStaff: [
          'Ko Chit Min Aung',
          'Ko Kyaw Tint'
        ]
      });
    }
  };

  // Handle adding item to VOC with animation
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
      id: item.id || '',
      name: item.name || item.code || 'Unknown Item',
      quantity: 1,
      price: price || 0,
      selectedPriceLabel: priceLabel || 'Default',
      category: item.category || '',
      store: item.store || store, // Keep the original item's store or fallback to current store
      isBifocal: isBifocalLens(item) || false,
      isSingleVision: isSingleVisionLens(item) || false,
      isSMS: isSMSLens(item) || false,
      isSMSBifocal: isSMSBifocalLens(item) || false,
      isYangonOrder: isYangonOrderLens(item) || false,
      yangonOrderName: item.yangonOrderName || '',
      itemDiscount: 0,
      discountPercentage: 0, // Initialize percentage discount
      hasError: false,
      isFOC: false,
      errorQuantity: 0,
      customTotal: null,
      errorSide: null,
      selectedSide: null, // Initialize selected side for bifocal flattop
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
        rightAddition: item.rightAddition || null,
        leftAddition: item.leftAddition || null,
        rightQty: null,
        leftQty: null,
      },
    };

    append(newItem);
    
    // Show success toast with animation
    toast.success(`✨ Added ${item.name || item.code} from ${item.store.toUpperCase()} store!`, {
      duration: 3000,
      icon: '🛒',
      style: {
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: 'white',
      },
    });
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

  // FIXED: Handle error quantity change with better validation
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
    
    // Auto-set error tracking if errors are present
    if (errorQuantity > 0 && !watchedErrorCategory) {
      setValue('errorCategory', 'unknown');
    }
  };

  // Handle error side selection for bifocal flattop lenses
  const handleErrorSideChange = (index: number, side: 'left' | 'right' | 'both' | null) => {
    const currentItem = selectedItems[index];
    
    update(index, {
      ...currentItem,
      errorSide: side
    });
  };

  // Handle selected side change for bifocal flattop lenses
  const handleSelectedSideChange = (index: number, side: 'left' | 'right' | 'both' | null) => {
    const currentItem = selectedItems[index];
    
    update(index, {
      ...currentItem,
      selectedSide: side
    });
  };

  // Handle lens details modal
  const openLensDetailsModal = (item: any, index?: number) => {
    setSelectedLensForDetails({ ...item, index });
    setLensDetailsForm({
      sph: item.details?.sph || item.sph || '',
      cyl: item.details?.cyl || item.cyl || '',
      axis: item.details?.axis || item.axis || '',
      addition: item.details?.addition || item.addition || '',
      rightEye: item.details?.Right || item.Right || '',
      leftEye: item.details?.Left || item.Left || '',
      rightAxis: item.details?.rightAxis || item.rightAxis || '',
      leftAxis: item.details?.leftAxis || item.leftAxis || '',
      rightCyl: item.details?.rightCyl || item.rightCyl || '',
      leftCyl: item.details?.leftCyl || item.leftCyl || '',
      rightAddition: item.details?.rightAddition || item.rightAddition || '',
      leftAddition: item.details?.leftAddition || item.leftAddition || '',
      color: item.details?.color || item.color || '',
      power: item.details?.power || item.power || '',
      yangonOrderName: item.details?.yangonOrderName || item.yangonOrderName || '',
      rightQty: item.details?.rightQty || '',
      leftQty: item.details?.leftQty || ''
    });
    setShowLensDetailsModal(true);
  };

  const closeLensDetailsModal = () => {
    setShowLensDetailsModal(false);
    setSelectedLensForDetails(null);
    setLensDetailsForm({
      sph: '', cyl: '', axis: '', addition: '', rightEye: '', leftEye: '',
      rightAxis: '', leftAxis: '', rightCyl: '', leftCyl: '', rightAddition: '',
      leftAddition: '', color: '', power: '', yangonOrderName: '', rightQty: '', leftQty: ''
    });
  };

  const saveLensDetails = () => {
    if (selectedLensForDetails) {
      if (typeof selectedLensForDetails.index !== 'undefined') {
        // Update existing item in VOC
        const currentItem = selectedItems[selectedLensForDetails.index];
        update(selectedLensForDetails.index, {
          ...currentItem,
          details: {
            ...currentItem.details,
            sph: lensDetailsForm.sph || null,
            cyl: lensDetailsForm.cyl || null,
            axis: lensDetailsForm.axis || null,
            addition: lensDetailsForm.addition || null,
            Right: lensDetailsForm.rightEye || null,
            Left: lensDetailsForm.leftEye || null,
            rightAxis: lensDetailsForm.rightAxis || null,
            leftAxis: lensDetailsForm.leftAxis || null,
            rightCyl: lensDetailsForm.rightCyl || null,
            leftCyl: lensDetailsForm.leftCyl || null,
            rightAddition: lensDetailsForm.rightAddition || null,
            leftAddition: lensDetailsForm.leftAddition || null,
            color: lensDetailsForm.color || null,
            power: lensDetailsForm.power || null,
            yangonOrderName: lensDetailsForm.yangonOrderName || null,
            rightQty: lensDetailsForm.rightQty ? parseFloat(lensDetailsForm.rightQty) : null,
            leftQty: lensDetailsForm.leftQty ? parseFloat(lensDetailsForm.leftQty) : null,
          }
        });
        toast.success(`✨ Updated lens details for ${currentItem.name}`);
      } else {
        // Add new item to VOC with custom details
        const newItem: FormVocItem = {
          type: 'Lens' as ItemType,
          id: selectedLensForDetails.id || '',
          name: selectedLensForDetails.name || selectedLensForDetails.code || 'Unknown Lens',
          quantity: 1,
          price: selectedLensForDetails.price || 0,
          selectedPriceLabel: 'Default',
          category: selectedLensForDetails.category || '',
          store: selectedLensForDetails.store || store,
          isBifocal: isBifocalLens(selectedLensForDetails) || false,
          isSingleVision: isSingleVisionLens(selectedLensForDetails) || false,
          isSMS: isSMSLens(selectedLensForDetails) || false,
          isSMSBifocal: isSMSBifocalLens(selectedLensForDetails) || false,
          isYangonOrder: isYangonOrderLens(selectedLensForDetails) || false,
          yangonOrderName: lensDetailsForm.yangonOrderName || selectedLensForDetails.yangonOrderName || '',
          itemDiscount: 0,
          discountPercentage: 0,
          hasError: false,
          isFOC: false,
          errorQuantity: 0,
          customTotal: null,
          errorSide: null,
          selectedSide: null,
          details: {
            sph: lensDetailsForm.sph || null,
            cyl: lensDetailsForm.cyl || null,
            axis: lensDetailsForm.axis || null,
            addition: lensDetailsForm.addition || null,
            Right: lensDetailsForm.rightEye || null,
            Left: lensDetailsForm.leftEye || null,
            rightAxis: lensDetailsForm.rightAxis || null,
            leftAxis: lensDetailsForm.leftAxis || null,
            rightCyl: lensDetailsForm.rightCyl || null,
            leftCyl: lensDetailsForm.leftCyl || null,
            rightAddition: lensDetailsForm.rightAddition || null,
            leftAddition: lensDetailsForm.leftAddition || null,
            color: lensDetailsForm.color || null,
            power: lensDetailsForm.power || null,
            yangonOrderName: lensDetailsForm.yangonOrderName || null,
            rightQty: lensDetailsForm.rightQty ? parseFloat(lensDetailsForm.rightQty) : null,
            leftQty: lensDetailsForm.leftQty ? parseFloat(lensDetailsForm.leftQty) : null,
          },
        };
        
        append(newItem);
        toast.success(`✨ Added ${selectedLensForDetails.name} with custom prescription details`);
      }
    }
    closeLensDetailsModal();
  };

  // Handle FOC toggle
  const handleFOCToggle = (index: number) => {
    const currentItem = selectedItems[index];
    
    update(index, {
      ...currentItem,
      isFOC: !currentItem.isFOC
    });
  };

  // Handle custom total change
  const handleCustomTotalChange = (index: number, customTotal: string) => {
    const currentItem = selectedItems[index];
    const numericTotal = customTotal === '' ? null : parseFloat(customTotal);
    
    update(index, {
      ...currentItem,
      customTotal: numericTotal
    });
  };

  // Handle percentage discount change
  const handlePercentageDiscountChange = (index: number, percentage: string) => {
    const currentItem = selectedItems[index];
    const numericPercentage = percentage === '' ? 0 : parseFloat(percentage);
    
    // Validate percentage (0-100)
    if (numericPercentage < 0 || numericPercentage > 100) {
      toast.error('Discount percentage must be between 0% and 100%');
      return;
    }

    // Calculate the discount amount based on percentage
    const soldQuantity = Math.max(0, currentItem.quantity - (currentItem.errorQuantity || 0));
    const baseAmount = currentItem.customTotal !== null ? currentItem.customTotal : (currentItem.price * soldQuantity);
    const discountAmount = (baseAmount * numericPercentage) / 100;

    update(index, {
      ...currentItem,
      discountPercentage: numericPercentage,
      itemDiscount: discountAmount
    });
  };

  // Handle individual item discount change
  const handleItemDiscountChange = (index: number, discount: string) => {
    const currentItem = selectedItems[index];
    const numericDiscount = discount === '' ? 0 : parseFloat(discount);

    // Calculate the corresponding percentage
    const soldQuantity = Math.max(0, currentItem.quantity - (currentItem.errorQuantity || 0));
    const baseAmount = currentItem.customTotal !== null ? currentItem.customTotal : (currentItem.price * soldQuantity);
    const discountPercentage = baseAmount > 0 ? (numericDiscount / baseAmount) * 100 : 0;

    update(index, {
      ...currentItem,
      itemDiscount: numericDiscount,
      discountPercentage: Math.min(100, Math.max(0, discountPercentage)) // Keep within 0-100%
    });
  };

  // Handle axis degree change for lens items
  const handleAxisDegreeChange = (index: number, axis: string) => {
    const currentItem = selectedItems[index];
    const numericAxis = axis === '' ? '' : axis;
    
    // Validate axis range (0-180 degrees)
    if (numericAxis !== '' && (parseFloat(numericAxis) < 0 || parseFloat(numericAxis) > 180)) {
      toast.error('Axis must be between 0 and 180 degrees');
      return;
    }

    update(index, {
      ...currentItem,
      details: {
        ...currentItem.details,
        axis: numericAxis
      }
    });
  };

  // Get lens categories based on lens type - made more inclusive
  const getLensCategories = (lensType: string): string[] => {
    switch (lensType) {
      case 'Single Vision':
        return LENS_CATEGORIES.singleVision;
      case 'Bifocal':
        return [...LENS_CATEGORIES.bifocal.fuse, ...LENS_CATEGORIES.bifocal.flattop];
      case 'Multifocal':
        return LENS_CATEGORIES.multifocal;
      default:
        return [];
    }
  };

  // Main submit function with enhanced animation and customer auto-save
  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      setIsCreatingVoc(true);
      
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

      // Validate error information if errors exist
      if (totalErrorQuantity > 0) {
        if (!data.errorCategory?.trim()) {
          toast.error('Error category is required when items have errors');
          return;
        }
      }

      // Validate accessories requirement - MUST have at least 3 accessory items
      const accessoryItems = data.items.filter((item: any) => item.type === 'Accessories');
      if (accessoryItems.length < 3) {
        console.warn('VOC creation failed: At least 3 accessories required');
        toast.error('VOC ဖြတ်ရန် Accessories အနည်းဆုံး ၃ခု မဖြစ်မနေ ရွေးချယ်ရမည်။');
        return;
      }

      // FIXED: Process items with correct error quantity pricing logic
      const processedItems = data.items.map((item: any) => {
        const errorQty = item.errorQuantity || 0;
        const soldQty = Math.max(0, item.quantity - errorQty); // Ensure non-negative sold quantity

        // Validate error quantity does not exceed total quantity
        if (errorQty > item.quantity) {
          const warnMessage = `Error quantity for item ${item.name} (${errorQty}) exceeds total quantity (${item.quantity})`;
          console.warn(warnMessage);
          toast.error(`Error quantity for item ${item.name} cannot exceed total quantity.`);
          throw new Error(warnMessage);
        }
        
        // FIXED: Only charge for sold quantities, not error quantities
        if (!item.isFOC && !item.customTotal) {
          // Calculate price only for sold quantity
          item.customTotal = soldQty * item.price;
          console.log(`Item ${item.name}: Only charging for ${soldQty} sold quantity (${errorQty} error qty excluded), Total: ${item.customTotal}`);
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

      // Create VOC data with error information - ensure no undefined values
      const cleanData = {
        ...data,
        // Ensure all required string fields are not undefined
        vocNumber: data.vocNumber || '',
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        customerType: data.customerType || 'Original',
        customerGender: data.customerGender || 'Male',
        customerAge: data.customerAge || 0,
        paymentType: data.paymentType || 'Full',
        paymentMethod: data.paymentMethod || 'Cash',
        totalAmount: data.totalAmount || 0,
        paidAmount: data.paidAmount || 0,
        balance: data.balance || 0,
        depositAmount: data.depositAmount || 0,
        yuanAmount: data.yuanAmount || 0,
        cashAmount: data.cashAmount || 0,
        kpayAmount: data.kpayAmount || 0,
        mmkAmount: data.mmkAmount || 0,
        discount: data.discount || 0,
        notes: data.notes || '',
        salePerson: data.salePerson || '',
        eyeTest: data.eyeTest || '',
        fitting: data.fitting || '',
        errorCategory: data.errorCategory || '',
        errorDescription: data.errorDescription || '',
        // Clean items array to remove undefined values
        items: data.items.map((item: any) => ({
          type: item.type || 'Lens',
          id: item.id || '',
          name: item.name || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          selectedPriceLabel: item.selectedPriceLabel || 'Default',
          category: item.category || '',
          store: item.store || store,
          isBifocal: item.isBifocal || false,
          isSingleVision: item.isSingleVision || false,
          isSMS: item.isSMS || false,
          isSMSBifocal: item.isSMSBifocal || false,
          isYangonOrder: item.isYangonOrder || false,
          yangonOrderName: item.yangonOrderName || '',
          itemDiscount: item.itemDiscount || 0,
          discountPercentage: item.discountPercentage || 0,
          hasError: item.hasError || false,
          isFOC: item.isFOC || false,
          errorQuantity: item.errorQuantity || 0,
          customTotal: item.customTotal ?? null,
          errorSide: item.errorSide || null,
          selectedSide: item.selectedSide || null,
          soldQuantity: item.soldQuantity || 0,
          details: item.details ? {
            sph: item.details.sph || null,
            cyl: item.details.cyl || null,
            axis: item.details.axis || null,
            addition: item.details.addition || null,
            color: item.details.color || null,
            power: item.details.power || null,
            yangonOrderName: item.details.yangonOrderName || null,
            Right: item.details.Right || null,
            Left: item.details.Left || null,
            rightAxis: item.details.rightAxis || null,
            leftAxis: item.details.leftAxis || null,
            rightCyl: item.details.rightCyl || null,
            leftCyl: item.details.leftCyl || null,
            rightAddition: item.details.rightAddition || null,
            leftAddition: item.details.leftAddition || null,
            rightQty: item.details.rightQty ?? null,
            leftQty: item.details.leftQty ?? null,
          } : null
        }))
      };

      const vocData = {
        ...cleanData,
        store,
        staffEmail: user?.email || '',
        createdAt: customTimestamp,
        vocDate: vocDate || format(new Date(), 'yyyy-MM-dd'),
        vocTime: vocTime || format(new Date(), 'HH:mm'),
        hasErrors: totalErrorQuantity > 0,
        totalErrorQuantity: totalErrorQuantity,
        errorInfo: totalErrorQuantity > 0 ? {
          category: cleanData.errorCategory || '',
          description: cleanData.errorDescription || '',
          totalQuantity: totalErrorQuantity
        } : null,
      };

      console.log('🚀 Creating VOC with data:', vocData);
      const vocRef = await addDoc(collection(db, 'vouchers'), vocData);
      console.log('✅ VOC created successfully with ID:', vocRef.id);

      // Update inventory
      console.log('🔄 Starting inventory updates...');
      const inventoryResult = await updateCompleteInventoryForVOC(data.items);
      
      if (inventoryResult.success) {
        console.log(`✅ Inventory updates completed (${inventoryResult.successCount}/${data.items.length})`);
        
        // Show success animation
        setShowSuccessAnimation(true);
        
        // ENHANCED: Auto-create/update customer record
        await createCustomerRecord(data);
        
        const errorInfo = totalErrorQuantity > 0 ? ` (${totalErrorQuantity} error items - ${getErrorCategoryDisplayName(data.errorCategory)})` : '';
        
        toast.success(`🎉 VOC created successfully for ${format(selectedDateTime, 'MMM dd, yyyy HH:mm')}
Staff: Sale Person: ${data.salePerson}, Eye Test: ${data.eyeTest}, Fitting: ${data.fitting}${errorInfo}
Inventory updated successfully!`, {
          duration: 6000,
          icon: '🎊',
          style: {
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
          },
        });
        
        // Hide success animation after 3 seconds
        setTimeout(() => {
          setShowSuccessAnimation(false);
        }, 3000);
        
      } else {
        console.warn(`⚠️ Some inventory updates failed (${inventoryResult.successCount}/${data.items.length}):`, inventoryResult.errors);
        toast.error(`VOC created but ${inventoryResult.errors.length} inventory updates failed`, {
          duration: 8000,
        });
      }
      
      console.log('🔄 Refreshing inventory data after VOC creation...');
      await fetchItems();
      console.log('✅ Inventory data refreshed');
      
      // Reset form with animation
      setTimeout(() => {
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
          errorCategory: '',
          errorDescription: '',
        });
        
        setVocDate(format(new Date(), 'yyyy-MM-dd'));
        setVocTime(format(new Date(), 'HH:mm'));
        setExistingCustomer(null);
        setSelectedLensCategory('');
        
        onSuccess();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error creating VOC:', error);
      toast.error(`Failed to create VOC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setIsCreatingVoc(false);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSphSearch('');
    setCylSearch('');
    setAxisSearch('');
    setAdditionSearch('');
    setYangonOrderNameSearch('');
    setRightEyeSearch('');
    setLeftEyeSearch('');
    setColorSearch('');
    setPowerSearch('');
    setRightAxisSearch('');
    setLeftAxisSearch('');
    setRightCylSearch('');
    setLeftCylSearch('');
    setRightAdditionSearch('');
    setLeftAdditionSearch('');
    setAvailabilityFilter('all');
    setSelectedItemType('Lens');
    setSelectedSubType('');
    setSelectedCategory('');
    setSelectedLensCategory('');
  };

  // Enhanced filter items function with better lens filtering
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    console.log(`🔍 Starting filter with ${filtered.length} items`);

    // Basic search
    if (searchTerm) {
      filtered = filtered.filter(item =>
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      console.log(`📝 After name/code search: ${filtered.length} items`);
    }

    // Enhanced prescription searches for lenses with partial matching
    if (selectedItemType === 'Lens') {
      if (sphSearch) {
        filtered = filtered.filter(item =>
          item.sph && item.sph.toString().toLowerCase().includes(sphSearch.toLowerCase())
        );
        console.log(`👁️ After SPH search: ${filtered.length} items`);
      }
      if (cylSearch) {
        filtered = filtered.filter(item =>
          item.cyl && item.cyl.toString().toLowerCase().includes(cylSearch.toLowerCase())
        );
        console.log(`🔍 After CYL search: ${filtered.length} items`);
      }
      if (axisSearch) {
        filtered = filtered.filter(item =>
          item.axis && item.axis.toString().toLowerCase().includes(axisSearch.toLowerCase())
        );
        console.log(`📐 After AXIS search: ${filtered.length} items`);
      }
      if (additionSearch) {
        filtered = filtered.filter(item =>
          item.addition && item.addition.toString().toLowerCase().includes(additionSearch.toLowerCase())
        );
        console.log(`➕ After ADDITION search: ${filtered.length} items`);
      }
      if (yangonOrderNameSearch) {
        filtered = filtered.filter(item =>
          item.yangonOrderName && item.yangonOrderName.toLowerCase().includes(yangonOrderNameSearch.toLowerCase())
        );
        console.log(`📦 After Yangon Order search: ${filtered.length} items`);
      }
      
      // Enhanced right/left eye search for bifocal lenses
      if (rightEyeSearch) {
        filtered = filtered.filter(item =>
          item.Right && item.Right.toString().toLowerCase().includes(rightEyeSearch.toLowerCase())
        );
        console.log(`👁️ After Right Eye search: ${filtered.length} items`);
      }
      
      if (leftEyeSearch) {
        filtered = filtered.filter(item =>
          item.Left && item.Left.toString().toLowerCase().includes(leftEyeSearch.toLowerCase())
        );
        console.log(`👁️ After Left Eye search: ${filtered.length} items`);
      }
      
      // Color search
      if (colorSearch) {
        filtered = filtered.filter(item =>
          item.color && item.color.toString().toLowerCase().includes(colorSearch.toLowerCase())
        );
        console.log(`🎨 After Color search: ${filtered.length} items`);
      }
      
      // Power search
      if (powerSearch) {
        filtered = filtered.filter(item =>
          item.power && item.power.toString().toLowerCase().includes(powerSearch.toLowerCase())
        );
        console.log(`⚡ After Power search: ${filtered.length} items`);
      }
      
      // Right/Left specific axis and cylinder search
      if (rightAxisSearch) {
        filtered = filtered.filter(item =>
          item.rightAxis && item.rightAxis.toString().toLowerCase().includes(rightAxisSearch.toLowerCase())
        );
        console.log(`👁️ After Right Axis search: ${filtered.length} items`);
      }
      
      if (leftAxisSearch) {
        filtered = filtered.filter(item =>
          item.leftAxis && item.leftAxis.toString().toLowerCase().includes(leftAxisSearch.toLowerCase())
        );
        console.log(`👁️ After Left Axis search: ${filtered.length} items`);
      }
      
      if (rightCylSearch) {
        filtered = filtered.filter(item =>
          item.rightCyl && item.rightCyl.toString().toLowerCase().includes(rightCylSearch.toLowerCase())
        );
        console.log(`👁️ After Right CYL search: ${filtered.length} items`);
      }
      
      if (leftCylSearch) {
        filtered = filtered.filter(item =>
          item.leftCyl && item.leftCyl.toString().toLowerCase().includes(leftCylSearch.toLowerCase())
        );
        console.log(`👁️ After Left CYL search: ${filtered.length} items`);
      }
      
      if (rightAdditionSearch) {
        filtered = filtered.filter(item =>
          item.rightAddition && item.rightAddition.toString().toLowerCase().includes(rightAdditionSearch.toLowerCase())
        );
        console.log(`👁️ After Right Addition search: ${filtered.length} items`);
      }
      
      if (leftAdditionSearch) {
        filtered = filtered.filter(item =>
          item.leftAddition && item.leftAddition.toString().toLowerCase().includes(leftAdditionSearch.toLowerCase())
        );
        console.log(`👁️ After Left Addition search: ${filtered.length} items`);
      }
    }

    // Enhanced type filtering with more inclusive logic for lenses
    if (selectedSubType) {
      filtered = filtered.filter(item => {
        if (selectedItemType === 'Lens') {
          // More inclusive lens type matching
          const itemType = item.type?.toLowerCase() || '';
          const selectedTypeLower = selectedSubType.toLowerCase();
          
          // Direct type match
          if (itemType === selectedTypeLower) return true;
          
          // Category-based matching for more inclusive filtering
          const itemCategory = item.category?.toLowerCase() || '';
          
          switch (selectedSubType) {
            case 'Single Vision':
              return itemType.includes('single') || 
                     itemType.includes('vision') ||
                     itemCategory.includes('bb') ||
                     itemCategory.includes('mc') ||
                     itemCategory.includes('cr') ||
                     itemCategory.includes('pg') ||
                     itemCategory.includes('anti') ||
                     itemCategory.includes('photo') ||
                     (!itemCategory.includes('fuse') && !itemCategory.includes('flattop') && !itemCategory.includes('bifocal'));
            
            case 'Bifocal':
              return itemType.includes('bifocal') ||
                     itemCategory.includes('fuse') ||
                     itemCategory.includes('flattop') ||
                     itemCategory.includes('bifocal');
            
            case 'Multifocal':
              return itemType.includes('multifocal') ||
                     itemType.includes('progressive') ||
                     itemCategory.includes('multifocal') ||
                     itemCategory.includes('progressive');
            
            case 'SMS':
              return itemType.includes('sms');
            
            case 'Yangon Order':
              return itemType.includes('yangon') || item.yangonOrderName;
            
            default:
              return itemType === selectedTypeLower;
          }
        } else if (selectedItemType === 'Frame') {
          // Enhanced frame category filtering
          if (!item.category) return false;
          
          const itemCategory = item.category.toLowerCase().trim();
          
          switch (selectedSubType) {
            case 'Eyeglasses':
              return itemCategory === 'eyeglasses' || 
                     itemCategory === 'eye glasses' || 
                     itemCategory.includes('eyeglass');
            case 'Sunglasses':
              return itemCategory === 'sunglasses' || 
                     itemCategory.includes('sunglass');
            case 'Promotion':
              return itemCategory === 'promotion' || 
                     itemCategory.includes('promotion');
            case 'Ready':
              return itemCategory === 'ready' && !itemCategory.includes('bb');
            case 'Ready BB':
              return itemCategory === 'ready bb' || 
                     itemCategory.includes('ready bb') ||
                     (itemCategory.includes('ready') && itemCategory.includes('bb'));
            default:
              return itemCategory === selectedSubType.toLowerCase();
          }
        } else if (selectedItemType === 'Contact Lens') {
          return item.category === selectedSubType;
        }
        return true;
      });
      console.log(`🏷️ After type filtering: ${filtered.length} items`);
    }

    // Lens category filtering - more inclusive
    if (selectedLensCategory && selectedItemType === 'Lens') {
      filtered = filtered.filter(item => {
        if (!item.category) return false;
        const itemCategory = item.category.toLowerCase();
        const selectedCategoryLower = selectedLensCategory.toLowerCase();
        
        // Partial match for more inclusive filtering
        return itemCategory.includes(selectedCategoryLower);
      });
      console.log(`📂 After lens category filtering: ${filtered.length} items`);
    }

    // Availability filter
    if (availabilityFilter !== 'all') {
      filtered = filtered.filter(item => {
        const availableQty = getAvailableQuantity(item.id);
        switch (availabilityFilter) {
          case 'available':
            return availableQty > 0;
          case 'low-stock':
            return availableQty > 0 && availableQty <= 5;
          case 'out-of-stock':
            return availableQty === 0;
          default:
            return true;
        }
      });
      console.log(`📊 After availability filtering: ${filtered.length} items`);
    }

    console.log(`✅ Final filtered items: ${filtered.length}`);
    return filtered;
  }, [items, searchTerm, sphSearch, cylSearch, axisSearch, additionSearch, yangonOrderNameSearch, selectedItemType, selectedSubType, selectedCategory, selectedLensCategory, availabilityFilter, selectedItems]);

  // Paginated items with better handling
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      {/* Welcome Animation Overlay */}
      {showWelcomeAnimation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-float"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-white/5 rounded-full animate-float-delayed"></div>
            <div className="absolute bottom-20 left-32 w-24 h-24 bg-white/10 rounded-full animate-float"></div>
            <div className="absolute bottom-32 right-10 w-12 h-12 bg-white/15 rounded-full animate-float-delayed"></div>
          </div>
          
          <div className="text-center relative z-10">
            <div className="w-32 h-32 mx-auto mb-8 relative">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
              <div className="absolute inset-4 bg-white/30 rounded-full animate-pulse"></div>
              <div className="absolute inset-8 bg-white rounded-full flex items-center justify-center shadow-2xl">
                <ShoppingCart className="h-12 w-12 text-blue-600 animate-bounce" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-bold text-white animate-fadeIn">
                {store.toLowerCase() === 'win' && 'Welcome to Win'}
                {store.toLowerCase() === 'pwint' && 'Welcome to Pwint'}
                {store.toLowerCase() === 'yangon' && 'Welcome to Yangon'}
                {!['win', 'pwint', 'yangon'].includes(store.toLowerCase()) && `Welcome to ${store.charAt(0).toUpperCase() + store.slice(1).toLowerCase()}`}
              </h1>
              <div className="flex items-center justify-center gap-3">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-xl text-blue-100 animate-slideInLeft">
                {store.toLowerCase() === 'win' && 'Please text animation loading...'}
                {store.toLowerCase() === 'pwint' && 'Welcome Pwint text animation loading...'}
                {store.toLowerCase() === 'yangon' && 'Please text animation loading...'}
                {!['win', 'pwint', 'yangon'].includes(store.toLowerCase()) && 'Loading VOC Form...'}
              </p>
              
              <div className="mt-8 animate-pulse">
                <div className="w-64 h-1 bg-white/30 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-white rounded-full animate-loading-bar"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl text-center animate-bounce">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-white animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">VOC Created Successfully!</h3>
            <p className="text-gray-600 dark:text-gray-400">Your Voice of Customer has been saved ✨</p>
          </div>
        </div>
      )}

      {/* Loading Animation Overlay */}
      {isCreatingVoc && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Creating VOC...</h3>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we process your order</p>
          </div>
        </div>
      )}

      <div 
        className={`max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 transition-all duration-700 ${
          formVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Modern Header with Animation */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 sm:p-8 rounded-3xl shadow-2xl transform transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                    <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 animate-fadeIn">
                      Create New VOC
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-base animate-slideInLeft">
                      Voice of Customer - Sales Order System ✨
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={refreshFormWithWelcome}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
                    title="Refresh Form"
                  >
                    <RefreshCw className="h-4 w-4 text-white" />
                    <span className="text-white text-sm">Refresh</span>
                  </button>
                  <div className="text-right">
                    <div className="text-blue-100 text-sm">Current Store</div>
                    <div className="text-xl sm:text-2xl font-bold text-white bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm animate-scaleIn">
                      {store.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* VOC Date and Time Selection */}
              <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 animate-fadeInUp">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">VOC Date & Time</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-1">
                      VOC Date
                    </label>
                    <input
                      type="date"
                      value={vocDate}
                      onChange={(e) => setVocDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/70 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-1">
                      VOC Time
                    </label>
                    <input
                      type="time"
                      value={vocTime}
                      onChange={(e) => setVocTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/70 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information Card with Auto-suggestions */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp transition-all duration-500 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer Information</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enter customer details - auto-saves to customer database ✨</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="VOC Number"
                {...register('vocNumber', { required: 'VOC number is required' })}
                error={errors.vocNumber?.message}
                placeholder="Enter VOC number"
              />
            
              <div className="relative">
                <Input
                  label="Customer Name"
                  {...register('customerName', { required: 'Customer name is required' })}
                  error={errors.customerName?.message}
                  placeholder="Enter customer name"
                  autoComplete="off"
                />
                
                {/* Customer Suggestions Dropdown */}
                {showCustomerSuggestions && customerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto animate-fadeIn">
                    {customerSuggestions.map((customer, index) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {customer.phone} • {customer.type} • Age {customer.age}
                            </div>
                          </div>
                          <Heart className="h-4 w-4 text-red-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            
              <Input
                label="Customer Phone"
                {...register('customerPhone')}
                placeholder="Enter phone number"
              />
            
              <Select
                label="Customer Type"
                {...register('customerType')}
                options={[
                  { value: 'Original', label: 'Original' },
                  { value: 'Membership', label: 'Membership' },
                ]}
              />
            
              <Select
                label="Customer Gender"
                {...register('customerGender')}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
              />
            
              <Input
                label="Customer Age"
                type="number"
                {...register('customerAge', { valueAsNumber: true })}
                placeholder="Enter age"
              />
            </div>

            {/* Existing Customer Indicator */}
            {existingCustomer && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✅ Existing customer loaded - details will be updated if changed
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Error Category Section - Only show when errors exist */}
          {totalErrorQuantity > 0 && (
            <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-3xl shadow-xl p-6 border-2 border-red-200 dark:border-red-700 animate-fadeInUp">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-800 dark:text-red-200">Error Information Required</h3>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {totalErrorQuantity} error items detected - categorization required
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    Error Category *
                  </label>
                  <Select
                    {...register('errorCategory', { 
                      required: totalErrorQuantity > 0 ? 'Error category is required when items have errors' : false
                    })}
                    options={[
                      { value: '', label: 'Select Error Category' },
                      { value: 'form_error', label: '📝 Form Error (50% discount)' },
                      { value: 'kkt', label: '🔧 KKT Error' },
                      { value: 'kcma', label: '⚙️ KCMA Error' },
                      { value: 'kmmt', label: '🛠️ KMMT Error' },
                      { value: 'eye_test', label: '👁️ Eye Test Error' },
                      { value: 'fitting', label: '🔧 Fitting Error' },
                      { value: 'factory', label: '🏭 Factory Error' },
                      { value: 'wrong_delivery', label: '📦 Wrong Delivery' },
                      { value: 'wrong_lens_production', label: '🔍 Wrong Lens Production' },
                      { value: 'unknown', label: '❓ Unknown Error' }
                    ]}
                    className={errors.errorCategory ? 'border-red-500' : ''}
                  />
                  {errors.errorCategory && (
                    <p className="text-red-500 text-xs mt-1">{errors.errorCategory.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    Error Description
                  </label>
                  <Input
                    {...register('errorDescription')}
                    placeholder="Optional: Describe the error details..."
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Error Category Info */}
              {watchedErrorCategory === 'form_error' && (
                <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Form Error: 50% discount will be automatically applied to error quantities
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FIXED: Modern Inventory Selection with Store-based Filtering */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp transition-all duration-500 hover:shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inventory Selection</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedItemType === 'Lens' 
                      ? 'Lenses from all stores available' 
                      : `${selectedItemType} from ${store.toUpperCase()} store only`
                    } ✨
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full animate-pulse">
                  {filteredItems.length} items
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refreshInventory}
                  className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Store Filter Information */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <MapPin className="h-4 w-4" />
                <span>
                  Store Filter: {selectedItemType === 'Lens' 
                    ? 'All stores (complete lens data)' 
                    : `${store.toUpperCase()} store only`
                  }
                </span>
                {filteredItems.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded-full text-xs">
                    {filteredItems.length} items loaded
                  </span>
                )}
              </div>
            </div>

            {/* Modern Item Type Selection */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Select Item Type</h3>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { type: 'Lens', icon: <Eye className="h-6 w-6" />, color: 'blue', label: 'Lenses', note: 'All Stores', gradient: 'from-blue-400 to-blue-600' },
                  { type: 'Frame', icon: <Glasses className="h-6 w-6" />, color: 'green', label: 'Frames', note: `${store.toUpperCase()} Only`, gradient: 'from-green-400 to-green-600' },
                  { type: 'Contact Lens', icon: <Contact className="h-6 w-6" />, color: 'purple', label: 'Contact Lenses', note: `${store.toUpperCase()} Only`, gradient: 'from-purple-400 to-purple-600' },
                  { type: 'Accessories', icon: <Package className="h-6 w-6" />, color: 'orange', label: 'Accessories', note: `${store.toUpperCase()} Only`, gradient: 'from-orange-400 to-orange-600' }
                ].map(({ type, icon, color, label, note, gradient }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedItemType(type as ItemType);
                      setSelectedSubType('');
                      setSelectedCategory('');
                      setSelectedLensCategory('');
                    }}
                    className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                      selectedItemType === type
                        ? `border-${color}-500 bg-gradient-to-br ${gradient} text-white shadow-lg shadow-${color}-500/25`
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${selectedItemType === type ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-600'}`}>
                        {React.cloneElement(icon, { 
                          className: `h-6 w-6 transition-all duration-300 ${selectedItemType === type ? 'text-white' : 'text-gray-600 dark:text-gray-300'}` 
                        })}
                      </div>
                      <span className={`text-sm font-medium transition-all duration-300 ${selectedItemType === type ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {label}
                      </span>
                      <span className={`text-xs transition-all duration-300 ${selectedItemType === type ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                        {note}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Category Filters for Lenses */}
            {selectedItemType === 'Lens' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 animate-fadeInUp">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Lens Types & Categories</h3>
                </div>
                
                {/* Lens Types */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Lens Types</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { value: '', label: 'All Types', icon: '🔍', color: 'bg-gray-100 hover:bg-gray-200' },
                      { value: 'Single Vision', label: 'Single Vision', icon: '👁️', color: 'bg-blue-100 hover:bg-blue-200' },
                      { value: 'Bifocal', label: 'Bifocal', icon: '👓', color: 'bg-green-100 hover:bg-green-200' },
                      { value: 'Multifocal', label: 'Multifocal', icon: '🔬', color: 'bg-purple-100 hover:bg-purple-200' },
                      { value: 'SMS', label: 'SMS', icon: '📱', color: 'bg-orange-100 hover:bg-orange-200' },
                      { value: 'Yangon Order', label: 'Yangon Order', icon: '📦', color: 'bg-yellow-100 hover:bg-yellow-200' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setSelectedSubType(type.value);
                          setSelectedLensCategory(''); // Reset lens category when type changes
                        }}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium transform hover:scale-105 ${
                          selectedSubType === type.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md transform scale-105'
                            : `border-gray-200 ${type.color} text-gray-700 hover:shadow-sm`
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg">{type.icon}</span>
                          <span className="text-xs">{type.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lens Categories based on selected type */}
                {(selectedSubType === 'Single Vision' || selectedSubType === 'Bifocal' || selectedSubType === 'Multifocal') && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      {selectedSubType} Categories
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLensCategory('')}
                        className={`p-2 rounded-lg border transition-all duration-200 text-xs font-medium ${
                          selectedLensCategory === ''
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All Categories
                      </button>
                      {getLensCategories(selectedSubType).map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedLensCategory(category)}
                          className={`p-2 rounded-lg border transition-all duration-200 text-xs font-medium text-left ${
                            selectedLensCategory === category
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Lens Prescription Search for Yangon Orders */}
            {selectedItemType === 'Lens' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-700 animate-fadeInUp">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Lens Prescription Search</h3>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">👁️ Right & Left Eye Support</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLensPrescriptionSearch(!showLensPrescriptionSearch)}
                    className="flex items-center gap-2 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                  >
                    <Search className="h-4 w-4" />
                    {showLensPrescriptionSearch ? 'Hide' : 'Show'} Prescription Search
                    {showLensPrescriptionSearch ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                {showLensPrescriptionSearch && (
                  <div className="space-y-4 animate-fadeInUp">
                    {/* Main Prescription Search */}
                    <div>
                      <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Main Prescription Values
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">SPH (Sphere)</label>
                          <Input
                            value={sphSearch}
                            onChange={(e) => setSphSearch(e.target.value)}
                            placeholder="+1.25, -2.50"
                            className="text-sm h-8 bg-white border-yellow-200 focus:border-yellow-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">CYL (Cylinder)</label>
                          <Input
                            value={cylSearch}
                            onChange={(e) => setCylSearch(e.target.value)}
                            placeholder="-0.75, +1.00"
                            className="text-sm h-8 bg-white border-yellow-200 focus:border-yellow-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">AXIS (0-180°)</label>
                          <Input
                            value={axisSearch}
                            onChange={(e) => setAxisSearch(e.target.value)}
                            placeholder="90, 180"
                            className="text-sm h-8 bg-white border-yellow-200 focus:border-yellow-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">ADD (Addition)</label>
                          <Input
                            value={additionSearch}
                            onChange={(e) => setAdditionSearch(e.target.value)}
                            placeholder="+1.50, +2.00"
                            className="text-sm h-8 bg-white border-yellow-200 focus:border-yellow-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">👁️ Right Eye</label>
                          <Input
                            value={rightEyeSearch}
                            onChange={(e) => setRightEyeSearch(e.target.value)}
                            placeholder="Right eye value"
                            className="text-sm h-8 bg-blue-50 border-blue-200 focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">👁️ Left Eye</label>
                          <Input
                            value={leftEyeSearch}
                            onChange={(e) => setLeftEyeSearch(e.target.value)}
                            placeholder="Left eye value"
                            className="text-sm h-8 bg-green-50 border-green-200 focus:border-green-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Yangon Order Search */}
                    <div>
                      <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Yangon Order Search
                        {isYangonStore && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Current Store</span>}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">📦 Yangon Order Name</label>
                          <Input
                            value={yangonOrderNameSearch}
                            onChange={(e) => setYangonOrderNameSearch(e.target.value)}
                            placeholder="Search by Yangon order name"
                            className="text-sm h-8 bg-orange-50 border-orange-200 focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">🎨 Color</label>
                          <Input
                            value={colorSearch}
                            onChange={(e) => setColorSearch(e.target.value)}
                            placeholder="Clear, Brown, Gray"
                            className="text-sm h-8 bg-purple-50 border-purple-200 focus:border-purple-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-yellow-600 mb-1">⚡ Power</label>
                          <Input
                            value={powerSearch}
                            onChange={(e) => setPowerSearch(e.target.value)}
                            placeholder="Power value"
                            className="text-sm h-8 bg-indigo-50 border-indigo-200 focus:border-indigo-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Advanced Bifocal Search */}
                    <div>
                      <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                        <Glasses className="h-4 w-4" />
                        Advanced Bifocal Search (Right/Left Specific)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-blue-600 mb-1">👁️ Right Axis</label>
                          <Input
                            value={rightAxisSearch}
                            onChange={(e) => setRightAxisSearch(e.target.value)}
                            placeholder="Right axis"
                            className="text-sm h-8 bg-blue-50 border-blue-200 focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-green-600 mb-1">👁️ Left Axis</label>
                          <Input
                            value={leftAxisSearch}
                            onChange={(e) => setLeftAxisSearch(e.target.value)}
                            placeholder="Left axis"
                            className="text-sm h-8 bg-green-50 border-green-200 focus:border-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600 mb-1">👁️ Right CYL</label>
                          <Input
                            value={rightCylSearch}
                            onChange={(e) => setRightCylSearch(e.target.value)}
                            placeholder="Right cylinder"
                            className="text-sm h-8 bg-blue-50 border-blue-200 focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-green-600 mb-1">👁️ Left CYL</label>
                          <Input
                            value={leftCylSearch}
                            onChange={(e) => setLeftCylSearch(e.target.value)}
                            placeholder="Left cylinder"
                            className="text-sm h-8 bg-green-50 border-green-200 focus:border-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600 mb-1">👁️ Right ADD</label>
                          <Input
                            value={rightAdditionSearch}
                            onChange={(e) => setRightAdditionSearch(e.target.value)}
                            placeholder="+1.50, +2.00"
                            className="text-sm h-8 bg-blue-50 border-blue-200 focus:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-green-600 mb-1">👁️ Left ADD</label>
                          <Input
                            value={leftAdditionSearch}
                            onChange={(e) => setLeftAdditionSearch(e.target.value)}
                            placeholder="+1.50, +2.00"
                            className="text-sm h-8 bg-green-50 border-green-200 focus:border-green-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Search Status and Clear */}
                    {(sphSearch || cylSearch || axisSearch || additionSearch || yangonOrderNameSearch || rightEyeSearch || leftEyeSearch || colorSearch || powerSearch || rightAxisSearch || leftAxisSearch || rightCylSearch || leftCylSearch || rightAdditionSearch || leftAdditionSearch) && (
                      <div className="flex items-center justify-between p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                          <CheckCircle className="h-4 w-4" />
                          <span>Active prescription filters: {[sphSearch, cylSearch, axisSearch, additionSearch, yangonOrderNameSearch, rightEyeSearch, leftEyeSearch, colorSearch, powerSearch, rightAxisSearch, leftAxisSearch, rightCylSearch, leftCylSearch, rightAdditionSearch, leftAdditionSearch].filter(Boolean).length}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSphSearch('');
                            setCylSearch('');
                            setAxisSearch('');
                            setAdditionSearch('');
                            setYangonOrderNameSearch('');
                            setRightEyeSearch('');
                            setLeftEyeSearch('');
                            setColorSearch('');
                            setPowerSearch('');
                            setRightAxisSearch('');
                            setLeftAxisSearch('');
                            setRightCylSearch('');
                            setLeftCylSearch('');
                          }}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                          Clear Prescription Search
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Category Filters for Frames */}
            {selectedItemType === 'Frame' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-700 animate-fadeInUp">
                <div className="flex items-center gap-2 mb-4">
                  <Glasses className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Frame Categories</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { value: '', label: 'All Categories', icon: '🔍', color: 'bg-gray-100 hover:bg-gray-200' },
                    { value: 'Eyeglasses', label: 'Eyeglasses', icon: '👓', color: 'bg-blue-100 hover:bg-blue-200' },
                    { value: 'Sunglasses', label: 'Sunglasses', icon: '🕶️', color: 'bg-yellow-100 hover:bg-yellow-200' },
                    { value: 'Promotion', label: 'Promotion', icon: '🎉', color: 'bg-purple-100 hover:bg-purple-200' },
                    { value: 'Ready', label: 'Ready', icon: '✅', color: 'bg-emerald-100 hover:bg-emerald-200' },
                    { value: 'Ready BB', label: 'Ready BB', icon: '🔵', color: 'bg-indigo-100 hover:bg-indigo-200' }
                  ].map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setSelectedSubType(category.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium transform hover:scale-105 ${
                        selectedSubType === category.value
                          ? 'border-green-500 bg-green-50 text-green-700 shadow-md transform scale-105'
                          : `border-gray-200 ${category.color} text-gray-700 hover:shadow-sm`
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{category.icon}</span>
                        <span className="text-xs">{category.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Category Filters for Contact Lenses */}
            {selectedItemType === 'Contact Lens' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-700 animate-fadeInUp">
                <div className="flex items-center gap-2 mb-4">
                  <Contact className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">Contact Lens Categories</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { value: '', label: 'All Categories', icon: '🔍', color: 'bg-gray-100 hover:bg-gray-200' },
                    { value: 'မျက်ကပ်အကြည်', label: 'မျက်ကပ်အကြည်', icon: '👁️', color: 'bg-blue-100 hover:bg-blue-200' },
                    { value: 'Pretty and Shinning', label: 'Pretty & Shinning', icon: '✨', color: 'bg-pink-100 hover:bg-pink-200' },
                    { value: 'F.l', label: 'F.l', icon: '🔍', color: 'bg-green-100 hover:bg-green-200' },
                    { value: 'Big Eye Black', label: 'Big Eye Black', icon: '⚫', color: 'bg-gray-100 hover:bg-gray-200' },
                    { value: 'Ms plane', label: 'MS မျက်ကပ်အကြည်', icon: '📐', color: 'bg-purple-100 hover:bg-purple-200' },
                    { value: 'Ms ပါဝါ color', label: 'MS ပါဝါ Color', icon: '🎨', color: 'bg-orange-100 hover:bg-orange-200' },
                    { value: 'Original', label: 'Original', icon: '🔸', color: 'bg-indigo-100 hover:bg-indigo-200' },
                    { value: 'Premium', label: 'Premium', icon: '💎', color: 'bg-yellow-100 hover:bg-yellow-200' }
                  ].map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setSelectedSubType(category.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium transform hover:scale-105 ${
                        selectedSubType === category.value
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md transform scale-105'
                          : `border-gray-200 ${category.color} text-gray-700 hover:shadow-sm`
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{category.icon}</span>
                        <span className="text-xs text-center">{category.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 animate-fadeInUp">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Input
                    label="Search Name/Code"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or code"
                  />

                  {selectedItemType === 'Lens' && (
                    <>
                      <Input
                        label="SPH"
                        value={sphSearch}
                        onChange={(e) => setSphSearch(e.target.value)}
                        placeholder="Search by SPH"
                      />
                      <Input
                        label="CYL"
                        value={cylSearch}
                        onChange={(e) => setCylSearch(e.target.value)}
                        placeholder="Search by CYL"
                      />
                      <Input
                        label="AXIS"
                        value={axisSearch}
                        onChange={(e) => setAxisSearch(e.target.value)}
                        placeholder="Search by AXIS"
                      />
                      <Input
                        label="ADDITION"
                        value={additionSearch}
                        onChange={(e) => setAdditionSearch(e.target.value)}
                        placeholder="Search by ADDITION"
                      />
                    </>
                  )}

                  <Select
                    label="Availability"
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Items' },
                      { value: 'available', label: 'Available (>0)' },
                      { value: 'low-stock', label: 'Low Stock (≤5)' },
                      { value: 'out-of-stock', label: 'Out of Stock (0)' },
                    ]}
                  />
                </div>

                {(searchTerm || sphSearch || cylSearch || axisSearch || additionSearch || availabilityFilter !== 'all' || selectedLensCategory) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-all duration-300 hover:scale-105"
                  >
                    <X className="h-4 w-4" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}

            {/* Items Grid */}
            {inventoryLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-blue-300 border-t-transparent opacity-20"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {paginatedItems.map((item, index) => {
                    const availableQty = getAvailableQuantity(item.id);
                    const isOutOfStock = availableQty === 0;
                    const isLowStock = availableQty > 0 && availableQty <= 5;

                    return (
                      <div
                        key={item.id}
                        className={`group relative bg-white dark:bg-gray-800 p-4 border-2 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fadeInUp ${
                          isOutOfStock
                            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                            : isLowStock
                            ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-blue-300'
                        }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {/* Item Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2">
                              {item.name || item.code || 'Unknown Item'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1 mb-2">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                                {getItemTypeIcon(selectedItemType)} {item.type || selectedItemType}
                              </span>
                              {item.category && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                                  {getCategoryDisplayName(item.category, selectedItemType)}
                                </span>
                              )}
                              {item.brand && (
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                                  {item.brand}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Stock Status */}
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-300 ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse'
                                : isLowStock
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {availableQty} left
                            </span>
                            {item.originalQty && item.originalQty !== availableQty && (
                              <span className="text-xs text-gray-500">
                                (Orig: {item.originalQty})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ENHANCED: Bifocal Lens Details with SPH and Addition */}
                        {selectedItemType === 'Lens' && isBifocalLens(item) && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg mb-3 animate-fadeIn">
                            <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-1">
                              <Glasses className="h-3 w-3" />
                              Bifocal Lens Details
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-purple-600 dark:text-purple-400">
                              {item.sph && <div><span className="font-medium">SPH:</span> {item.sph}</div>}
                              {item.addition && <div><span className="font-medium">ADD:</span> {item.addition}</div>}
                              {item.cyl && <div><span className="font-medium">CYL:</span> {item.cyl}</div>}
                              {item.axis && <div><span className="font-medium">AXIS:</span> {item.axis}</div>}
                              
                              {/* Enhanced Right/Left display for bifocal flattop */}
                              {isBifocalFlattopLens(item) && (
                                <>
                                  {item.Right && <div><span className="font-medium">👁️ Right:</span> {item.Right}</div>}
                                  {item.Left && <div><span className="font-medium">👁️ Left:</span> {item.Left}</div>}
                                  {item.rightAxis && <div><span className="font-medium">R-Axis:</span> {item.rightAxis}</div>}
                                  {item.leftAxis && <div><span className="font-medium">L-Axis:</span> {item.leftAxis}</div>}
                                  {item.rightCyl && <div><span className="font-medium">R-Cyl:</span> {item.rightCyl}</div>}
                                  {item.leftCyl && <div><span className="font-medium">L-Cyl:</span> {item.leftCyl}</div>}
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Standard Lens Prescription Details */}
                        {selectedItemType === 'Lens' && !isBifocalLens(item) && (item.sph || item.cyl || item.axis || item.addition) && (
                          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg mb-3 animate-fadeIn">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Prescription</div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-400">
                              {item.sph && <div><span className="font-medium">SPH:</span> {item.sph}</div>}
                              {item.cyl && <div><span className="font-medium">CYL:</span> {item.cyl}</div>}
                              {item.axis && <div><span className="font-medium">AXIS:</span> {item.axis}</div>}
                              {item.addition && <div><span className="font-medium">ADD:</span> {item.addition}</div>}
                              {item.yangonOrderName && <div><span className="font-medium">Yangon:</span> {item.yangonOrderName}</div>}
                            </div>
                          </div>
                        )}

                        {/* Frame Details */}
                        {selectedItemType === 'Frame' && (item.brand || item.model || item.size || item.color) && (
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg mb-3 animate-fadeIn">
                            <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Frame Details</div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-green-600 dark:text-green-400">
                              {item.brand && <div><span className="font-medium">Brand:</span> {item.brand}</div>}
                              {item.model && <div><span className="font-medium">Model:</span> {item.model}</div>}
                              {item.size && <div><span className="font-medium">Size:</span> {item.size}</div>}
                              {item.color && <div><span className="font-medium">Color:</span> {item.color}</div>}
                            </div>
                          </div>
                        )}

                        {/* Contact Lens Details */}
                        {selectedItemType === 'Contact Lens' && (item.power || item.diameter || item.baseCurve) && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg mb-3 animate-fadeIn">
                            <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Contact Lens Details</div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-purple-600 dark:text-purple-400">
                              {item.power && <div><span className="font-medium">Power:</span> {item.power}</div>}
                              {item.diameter && <div><span className="font-medium">Diameter:</span> {item.diameter}</div>}
                              {item.baseCurve && <div><span className="font-medium">Base Curve:</span> {item.baseCurve}</div>}
                            </div>
                          </div>
                        )}

                        {/* Additional Item Information */}
                        {(item.description || item.notes) && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-3 animate-fadeIn">
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Additional Info</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              {item.description && <div>{item.description}</div>}
                              {item.notes && <div className="italic">{item.notes}</div>}
                            </div>
                          </div>
                        )}

                        {/* Price and Store Info */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.price || 0)}
                          </div>
                          {item.store && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              item.store === 'win' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              item.store === 'pwint' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              item.store === 'yangon' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {item.store.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Item Code/ID for debugging */}
                        {item.code && item.code !== item.name && (
                          <div className="text-xs text-gray-500 mb-2">
                            Code: {item.code}
                          </div>
                        )}

                        {/* Enhanced Add Button for Lens Items */}
                        {selectedItemType === 'Lens' ? (
                          <div className="grid grid-cols-1 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className={`w-full transition-all duration-300 transform ${
                                isOutOfStock 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                              }`}
                              disabled={isOutOfStock}
                              onClick={(e) => handleAddItem(e, item)}
                            >
                              {isOutOfStock ? (
                                <div className="flex items-center justify-center">
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Out of Stock
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Quick Add
                                </div>
                              )}
                            </Button>
                            
                            {!isOutOfStock && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full border-purple-300 text-purple-600 hover:bg-purple-50 transition-all duration-300 transform hover:scale-105"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openLensDetailsModal(item);
                                }}
                              >
                                <div className="flex items-center justify-center">
                                  <Stethoscope className="h-4 w-4 mr-2" />
                                  👁️ Custom Details
                                </div>
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className={`w-full transition-all duration-300 transform ${
                              isOutOfStock 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                            }`}
                            disabled={isOutOfStock}
                            onClick={(e) => handleAddItem(e, item)}
                          >
                            {isOutOfStock ? (
                              <div className="flex items-center justify-center">
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Out of Stock
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <Plus className="h-4 w-4 mr-2" />
                                Add to VOC
                              </div>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Debug Information */}
                {filteredItems.length === 0 && !inventoryLoading && (
                  <div className="text-center py-8">
                    <div className="text-gray-500 dark:text-gray-400 mb-4">
                      No items found for the current filters
                    </div>
                    <div className="text-sm text-gray-400 dark:text-gray-500">
                      <p>Selected Type: {selectedItemType}</p>
                      <p>Selected Sub-type: {selectedSubType || 'None'}</p>
                      <p>Search Term: {searchTerm || 'None'}</p>
                      <p>Store Filter: {selectedItemType === 'Lens' ? 'All Stores' : store.toUpperCase()}</p>
                      <p>Total Items in Database: {items.length}</p>
                      {selectedItemType === 'Lens' && (
                        <p>All Lens Items Cached: {allLensItems.length}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSubType('');
                        setSearchTerm('');
                        setSphSearch('');
                        setCylSearch('');
                        setAxisSearch('');
                        setAdditionSearch('');
                        setAvailabilityFilter('all');
                      }}
                      className="mt-4"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}

                {/* Enhanced Pagination with better info */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                      {selectedItemType === 'Lens' && (
                        <span className="ml-2 text-blue-600">
                          (Full lens data loaded: {allLensItems.length} total)
                        </span>
                      )}
                      {selectedItemType !== 'Lens' && (
                        <span className="ml-2 text-purple-600">
                          ({store.toUpperCase()} store only)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="transition-all duration-300 hover:scale-105"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-600 dark:text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="transition-all duration-300 hover:scale-105"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ENHANCED: Selected Items with Better Bifocal Display */}
          {selectedItems.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp transition-all duration-500 hover:shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Selected Items</h3>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{selectedItems.length} items added to VOC ✨</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {totalErrorQuantity > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-full animate-pulse">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        {totalErrorQuantity} errors
                      </span>
                    </div>
                  )}
                  {(() => {
                    const accessoryCount = selectedItems.filter(item => item.type === 'Accessories').length;
                    return (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        accessoryCount >= 3 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : accessoryCount === 0
                          ? 'bg-red-100 dark:bg-red-900/30 animate-pulse'
                          : 'bg-orange-100 dark:bg-orange-900/30 animate-pulse'
                      }`}>
                        <Package className={`h-4 w-4 ${
                          accessoryCount >= 3 
                            ? 'text-green-600 dark:text-green-400' 
                            : accessoryCount === 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          accessoryCount >= 3 
                            ? 'text-green-700 dark:text-green-300' 
                            : accessoryCount === 0
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-orange-700 dark:text-orange-300'
                        }`}>
                          Accessories: {accessoryCount}/3 {accessoryCount >= 3 ? '✅' : '❌'}
                        </span>
                        {accessoryCount < 3 && (
                          <span className={`text-xs ${
                            accessoryCount === 0 
                              ? 'text-red-600 dark:text-red-400 font-semibold' 
                              : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            {accessoryCount === 0 ? '(Required!)' : `(need ${3 - accessoryCount} more)`}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Subtotal (Sold Only)</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(subtotal)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {selectedItems.map((item, index) => (
                  <div 
                    key={index} 
                    className="group bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200 animate-fadeInUp"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {item.name}
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            item.store === 'win' ? 'bg-blue-100 text-blue-800' :
                            item.store === 'pwint' ? 'bg-green-100 text-green-800' :
                            item.store === 'yangon' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.store?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs">
                            {getCategoryDisplayName(item.category, item.type)}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">•</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(item.price)}
                          </span>
                          {item.isBifocal && (
                            <>
                              <span className="text-gray-600 dark:text-gray-400">•</span>
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full text-xs">
                                👓 Bifocal {isBifocalFlattopLens(item) ? 'Flattop' : 'Fuse'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* ENHANCED: Lens Details Display in Selected Items - For All Lens Types */}
                        {item.type === 'Lens' && item.details && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg animate-fadeIn">
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
                              <Glasses className="h-3 w-3" />
                              {item.isBifocal ? 'Bifocal' : 'Single Vision'} Lens Prescription Details
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-blue-600 dark:text-blue-400">
                              {item.details.sph && (
                                <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                                  <span className="font-medium">SPH:</span> {item.details.sph}
                                </div>
                              )}
                              {item.details.cyl && (
                                <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                                  <span className="font-medium">CYL:</span> {item.details.cyl}
                                </div>
                              )}
                              {item.details.axis && (
                                <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                                  <span className="font-medium">AXIS:</span> {item.details.axis}°
                                </div>
                              )}
                              {item.details.addition && (
                                <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                                  <span className="font-medium">Addition:</span> {item.details.addition}
                                </div>
                              )}
                              
                              {/* Enhanced Right/Left display for bifocal flattop */}
                              {isBifocalFlattopLens(item) && (
                                <>
                                  {item.details.Right && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200">
                                      <span className="font-medium">👁️ Right:</span> {item.details.Right}
                                    </div>
                                  )}
                                  {item.details.Left && (
                                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200">
                                      <span className="font-medium">👁️ Left:</span> {item.details.Left}
                                    </div>
                                  )}
                                  {item.details.rightAxis && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200">
                                      <span className="font-medium">R-Axis:</span> {item.details.rightAxis}
                                    </div>
                                  )}
                                  {item.details.leftAxis && (
                                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200">
                                      <span className="font-medium">L-Axis:</span> {item.details.leftAxis}
                                    </div>
                                  )}
                                  {item.details.rightCyl && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200">
                                      <span className="font-medium">R-Cyl:</span> {item.details.rightCyl}
                                    </div>
                                  )}
                                  {item.details.leftCyl && (
                                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200">
                                      <span className="font-medium">L-Cyl:</span> {item.details.leftCyl}
                                    </div>
                                  )}
                                  {item.details.rightAddition && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200">
                                      <span className="font-medium">R-Add:</span> {item.details.rightAddition}
                                    </div>
                                  )}
                                  {item.details.leftAddition && (
                                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200">
                                      <span className="font-medium">L-Add:</span> {item.details.leftAddition}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        {/* Edit Lens Details Button (for lens items only) */}
                        {item.type === 'Lens' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openLensDetailsModal(item, index)}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-purple-600 hover:text-purple-700 hover:bg-purple-50 transform hover:scale-105"
                            title="Edit lens prescription details"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Remove Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 transform hover:scale-105"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Enhanced Controls Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
                      {/* Quantity */}
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(index, Math.max(0, item.quantity - 1))}
                          className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                          className="w-16 text-center text-sm h-8"
                          min="0"
                          step="0.5"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Error Quantity */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Error:</label>
                        <Input
                          type="number"
                          value={item.errorQuantity || 0}
                          onChange={(e) => handleErrorQuantityChange(index, parseFloat(e.target.value) || 0)}
                          className="w-full text-center text-sm h-8"
                          min="0"
                          max={item.quantity}
                          step="0.5"
                        />
                      </div>

                      {/* Axis Degree Input for Lens items */}
                      {item.type === 'Lens' && (
                        <div className="flex flex-col">
                          <label className="text-xs text-blue-600 dark:text-blue-400 mb-1 font-medium">Axis °:</label>
                          <Input
                            type="number"
                            value={item.details?.axis || ''}
                            onChange={(e) => handleAxisDegreeChange(index, e.target.value)}
                            placeholder="0-180"
                            className="w-full text-center text-sm h-8 bg-blue-50 border-blue-200"
                            min="0"
                            max="180"
                            step="1"
                          />
                        </div>
                      )}

                      {/* ENHANCED: Bifocal Flattop Side Selection */}
                      {item.isBifocal && isBifocalFlattopLens(item) && (
                        <div className="flex flex-col">
                          <label className="text-xs text-purple-600 dark:text-purple-400 mb-1 font-medium">👁️ Side:</label>
                          <Select
                            value={item.selectedSide || ''}
                            onChange={(e) => handleSelectedSideChange(index, e.target.value as 'left' | 'right' | 'both' | null)}
                            options={[
                              { value: '', label: 'Select Side' },
                              { value: 'left', label: '👁️ Left' },
                              { value: 'right', label: '👁️ Right' },
                              { value: 'both', label: '👀 Both' }
                            ]}
                            className="text-sm h-8 bg-purple-50 border-purple-200"
                          />
                        </div>
                      )}

                      {/* ENHANCED: Error Side Selection for Bifocal Flattop */}
                      {item.isBifocal && isBifocalFlattopLens(item) && item.errorQuantity > 0 && (
                        <div className="flex flex-col">
                          <label className="text-xs text-red-600 dark:text-red-400 mb-1 font-medium">🚨 Error Side:</label>
                          <Select
                            value={item.errorSide || ''}
                            onChange={(e) => handleErrorSideChange(index, e.target.value as 'left' | 'right' | 'both' | null)}
                            options={[
                              { value: '', label: 'Select Side' },
                              { value: 'left', label: '👁️ Left Error' },
                              { value: 'right', label: '👁️ Right Error' },
                              { value: 'both', label: '👀 Both Sides' }
                            ]}
                            className="text-sm h-8 bg-red-50 border-red-200"
                          />
                        </div>
                      )}

                      {/* FOC Toggle */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">FOC:</label>
                        <label className="flex items-center justify-center h-8">
                          <input
                            type="checkbox"
                            checked={item.isFOC}
                            onChange={() => handleFOCToggle(index)}
                            className="rounded transition-all duration-200 transform hover:scale-110"
                          />
                        </label>
                      </div>

                      {/* Custom Total */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Custom:</label>
                        <Input
                          type="number"
                          value={item.customTotal || ''}
                          onChange={(e) => handleCustomTotalChange(index, e.target.value)}
                          placeholder={formatCurrency((item.quantity - (item.errorQuantity || 0)) * item.price)}
                          className="w-full text-center text-sm h-8"
                          min="0"
                        />
                      </div>

                      {/* Percentage Discount */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1" title="Enter percentage discount (e.g., 5 for 5%)">
                          <Percent className="h-3 w-3" />
                          %:
                        </label>
                        <Input
                          type="number"
                          value={item.discountPercentage || ''}
                          onChange={(e) => handlePercentageDiscountChange(index, e.target.value)}
                          placeholder="5"
                          className="w-full text-center text-sm h-8"
                          min="0"
                          max="100"
                          step="0.1"
                          title="Enter percentage discount (0-100%)"
                        />
                        {item.discountPercentage > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1 text-center font-medium">
                            = {formatCurrency(item.itemDiscount)}
                          </div>
                        )}
                        {/* Quick Percentage Buttons */}
                        <div className="flex gap-1 mt-1">
                          {[5, 10, 15, 20].map(percent => (
                            <button
                              key={percent}
                              type="button"
                              onClick={() => handlePercentageDiscountChange(index, percent.toString())}
                              className="text-xs px-1 py-0.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 rounded transition-colors"
                              title={`Apply ${percent}% discount`}
                            >
                              {percent}%
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handlePercentageDiscountChange(index, '0')}
                            className="text-xs px-1 py-0.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded transition-colors"
                            title="Clear discount"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* OR Separator */}
                      <div className="flex items-center justify-center">
                        <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                          OR
                        </div>
                      </div>

                      {/* Fixed Amount Discount */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Discount:</label>
                        <Input
                          type="number"
                          value={item.itemDiscount || ''}
                          onChange={(e) => handleItemDiscountChange(index, e.target.value)}
                          placeholder="0"
                          className="w-full text-center text-sm h-8"
                          min="0"
                        />
                        {item.itemDiscount > 0 && item.discountPercentage > 0 && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 text-center">
                            = {item.discountPercentage.toFixed(1)}%
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <div className="flex flex-col">
                        <label className="text-xs text-transparent mb-1">Remove:</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700 h-8 transition-all duration-200 hover:scale-105"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Bifocal Flattop Selected Side Display */}
                    {item.isBifocal && isBifocalFlattopLens(item) && item.selectedSide && (
                      <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg animate-fadeIn">
                        <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                          <Glasses className="h-4 w-4" />
                          <span className="font-medium">
                            Bifocal Flattop: {item.selectedSide === 'both' ? 'Both Eyes' : `${item.selectedSide} Eye`} Selected
                            {item.selectedSide === 'left' && ' 👁️ Left Side'}
                            {item.selectedSide === 'right' && ' 👁️ Right Side'}
                            {item.selectedSide === 'both' && ' 👀 Both Sides'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error Side Display for Bifocal Flattop */}
                    {item.isBifocal && isBifocalFlattopLens(item) && item.errorQuantity > 0 && item.errorSide && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg animate-fadeIn">
                        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">
                            Bifocal Error: {item.errorSide === 'both' ? 'Both Eyes' : `${item.errorSide} Eye`} Error - 
                            {item.errorSide === 'left' && ' 👁️ Left Side Issue'}
                            {item.errorSide === 'right' && ' 👁️ Right Side Issue'}
                            {item.errorSide === 'both' && ' 👀 Both Sides Issue'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* FIXED: Summary showing sold quantities only */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Sold Amount:</span>
                    <div className="font-medium text-lg text-green-600">{formatCurrency(subtotal)}</div>
                    <div className="text-xs text-gray-500">Error quantities excluded ✅</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Item Discounts:</span>
                    <div className="font-medium text-lg text-red-600">-{formatCurrency(totalItemDiscounts)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Error Qty:</span>
                    <div className="font-medium text-lg text-orange-600">{totalErrorQuantity}</div>
                    <div className="text-xs text-orange-500">Not charged to customer</div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Has Errors:</span>
                    <div className={`font-medium text-lg ${hasErrors ? 'text-red-600' : 'text-green-600'}`}>
                      {hasErrors ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
                
                {/* Error Category Display */}
                {hasErrors && watchedErrorCategory && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                        Error Category: {getErrorCategoryDisplayName(watchedErrorCategory)}
                      </span>
                    </div>
                    {watch('errorDescription') && (
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        Description: {watch('errorDescription')}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      💡 Note: Only sold quantities are charged to customer. Error quantities are tracked but not included in payment.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modern Payment Information */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp transition-all duration-500 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Payment Information</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure payment details - based on sold quantities only</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select
                label="Payment Type"
                {...register('paymentType')}
                options={[
                  { value: 'Full', label: 'Full Payment' },
                  { value: 'Deposit', label: 'Deposit' },
                ]}
              />
              
              <Select
                label="Payment Method"
                {...register('paymentMethod')}
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'KPay', label: 'KPay' },
                  { value: 'Yuan', label: 'Yuan' },
                  { value: 'Cash+KPay', label: 'Cash + KPay' },
                  { value: 'Cash+Yuan', label: 'Cash + Yuan' },
                  { value: 'Yuan+KPay', label: 'Yuan + KPay' },
                ]}
              />

              <Input
                label="Overall Discount"
                type="number"
                {...register('discount', { valueAsNumber: true })}
                placeholder="0"
                min="0"
              />

              {/* Payment Method Specific Fields */}
              {(paymentMethod === 'Cash+KPay' || paymentMethod === 'Cash+Yuan') && (
                <Input
                  label="Cash Amount"
                  type="number"
                  {...register('cashAmount', { valueAsNumber: true })}
                  placeholder="0"
                  min="0"
                />
              )}

              {(paymentMethod === 'Cash+KPay' || paymentMethod === 'Yuan+KPay') && (
                <Input
                  label="KPay Amount"
                  type="number"
                  {...register('kpayAmount', { valueAsNumber: true })}
                  placeholder="0"
                  min="0"
                />
              )}

              {(paymentMethod === 'Yuan' || paymentMethod === 'Cash+Yuan' || paymentMethod === 'Yuan+KPay') && (
                <Input
                  label="Yuan Amount"
                  type="number"
                  {...register('yuanAmount', { valueAsNumber: true })}
                  placeholder="0"
                  min="0"
                />
              )}

              {paymentMethod === 'Yuan' && (
                <Input
                  label="Additional MMK"
                  type="number"
                  {...register('mmkAmount', { valueAsNumber: true })}
                  placeholder="0"
                  min="0"
                />
              )}

              {paymentType === 'Deposit' && (
                <Input
                  label="Deposit Amount"
                  type="number"
                  {...register('depositAmount', { valueAsNumber: true })}
                  placeholder="0"
                  min="0"
                />
              )}

              <Input
                label="Total Amount"
                type="number"
                {...register('totalAmount', { valueAsNumber: true })}
                readOnly
                className="bg-gray-50 dark:bg-gray-700"
              />

              <Input
                label="Paid Amount"
                type="number"
                {...register('paidAmount', { valueAsNumber: true })}
                readOnly
                className="bg-gray-50 dark:bg-gray-700"
              />

              <Input
                label="Balance"
                type="number"
                {...register('balance', { valueAsNumber: true })}
                readOnly
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Staff Information - Required Fields */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl shadow-xl p-6 border border-blue-200 dark:border-blue-700 animate-fadeInUp transition-all duration-500 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200">Staff Information</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">All fields are required</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Sale Person *
                </label>
                <Select
                  {...register('salePerson', { 
                    required: 'Sale person is required'
                  })}
                  options={[
                    { value: '', label: 'Select Sale Person' },
                    ...staffList.salePersons.map(name => ({ 
                      value: name, 
                      label: name 
                    }))
                  ]}
                  className={errors.salePerson ? 'border-red-500' : ''}
                />
                {errors.salePerson && (
                  <p className="text-red-500 text-xs mt-1">{errors.salePerson.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Eye Test Staff *
                </label>
                <Select
                  {...register('eyeTest', { 
                    required: 'Eye test staff is required'
                  })}
                  options={[
                    { value: '', label: 'Select Eye Test Staff' },
                    ...staffList.eyeTestStaff.map(name => ({ 
                      value: name, 
                      label: name 
                    }))
                  ]}
                  className={errors.eyeTest ? 'border-red-500' : ''}
                />
                {errors.eyeTest && (
                  <p className="text-red-500 text-xs mt-1">{errors.eyeTest.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Fitting Staff *
                </label>
                <Select
                  {...register('fitting', { 
                    required: 'Fitting staff is required'
                  })}
                  options={[
                    { value: '', label: 'Select Fitting Staff' },
                    ...staffList.fittingStaff.map(name => ({ 
                      value: name, 
                      label: name 
                    }))
                  ]}
                  className={errors.fitting ? 'border-red-500' : ''}
                />
                {errors.fitting && (
                  <p className="text-red-500 text-xs mt-1">{errors.fitting.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp transition-all duration-500 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Additional Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Optional information</p>
              </div>
            </div>
            
            <Input
              label="Notes"
              {...register('notes')}
              placeholder="Any special instructions, customer preferences, or additional information..."
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-3xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 animate-fadeInUp transition-all duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                Ready to create VOC? Customer will be auto-saved to database! ✨
              </div>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset({
                      vocNumber:  '',
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
                      items: [],
                      errorCategory: '',
                      errorDescription: '',
                    });
                    clearAllFilters();
                    setVocDate(format(new Date(), 'yyyy-MM-dd'));
                    setVocTime(format(new Date(), 'HH:mm'));
                    setExistingCustomer(null);
                    setSelectedLensCategory('');
                  }}
                  className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Form
                </Button>
                
                <Button
                  type="submit"
                  className={`min-w-[140px] shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-white ${
                    selectedItems.filter(item => item.type === 'Accessories').length < 3
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700'
                  }`}
                  disabled={loading || selectedItems.filter(item => item.type === 'Accessories').length < 3}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Creating...
                    </div>
                  ) : selectedItems.filter(item => item.type === 'Accessories').length < 3 ? (
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Need {3 - selectedItems.filter(item => item.type === 'Accessories').length} More ACC
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create VOC
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Enhanced Lens Details Modal */}
      {showLensDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    👁️ Lens Prescription Details
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedLensForDetails?.name} - Right & Left Eye Specifications
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeLensDetailsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Main Prescription Section */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-700">
                <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Main Prescription Values
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      SPH (Sphere)
                    </label>
                    <Input
                      type="text"
                      value={lensDetailsForm.sph}
                      onChange={(e) => setLensDetailsForm({...lensDetailsForm, sph: e.target.value})}
                      placeholder="+1.25, -2.50, etc."
                      className="bg-white border-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      CYL (Cylinder)
                    </label>
                    <Input
                      type="text"
                      value={lensDetailsForm.cyl}
                      onChange={(e) => setLensDetailsForm({...lensDetailsForm, cyl: e.target.value})}
                      placeholder="-0.75, +1.00, etc."
                      className="bg-white border-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      AXIS (0-180°)
                    </label>
                    <Input
                      type="number"
                      value={lensDetailsForm.axis}
                      onChange={(e) => setLensDetailsForm({...lensDetailsForm, axis: e.target.value})}
                      placeholder="90, 180, etc."
                      min="0"
                      max="180"
                      className="bg-white border-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      ADD (Addition)
                    </label>
                    <Input
                      type="text"
                      value={lensDetailsForm.addition}
                      onChange={(e) => setLensDetailsForm({...lensDetailsForm, addition: e.target.value})}
                      placeholder="+1.50, +2.00, etc."
                      className="bg-white border-blue-200 focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Right & Left Eye Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-2xl border border-green-200 dark:border-green-700">
                <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
                  <Glasses className="h-5 w-5" />
                  Right & Left Eye Specifications
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Right Eye */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                    <h5 className="text-md font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                      👁️ Right Eye
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                          Right Eye Value
                        </label>
                        <Input
                          type="text"
                          value={lensDetailsForm.rightEye}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, rightEye: e.target.value})}
                          placeholder="Right eye prescription"
                          className="bg-white border-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                          Right Axis
                        </label>
                        <Input
                          type="text"
                          value={lensDetailsForm.rightAxis}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, rightAxis: e.target.value})}
                          placeholder="Right axis value"
                          className="bg-white border-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                          Right CYL
                        </label>
                        <Input
                          type="text"
                          value={lensDetailsForm.rightCyl}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, rightCyl: e.target.value})}
                          placeholder="Right cylinder"
                          className="bg-white border-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                          Right Addition
                        </label>
                        <Input
                          type="text"
                          value={lensDetailsForm.rightAddition}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, rightAddition: e.target.value})}
                          placeholder="+1.50, +2.00, etc."
                          className="bg-white border-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                          Right Quantity
                        </label>
                        <Input
                          type="number"
                          value={lensDetailsForm.rightQty}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, rightQty: e.target.value})}
                          placeholder="0.5, 1, 2, etc."
                          step="0.5"
                          min="0"
                          className="bg-white border-blue-200 focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Left Eye */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-700">
                    <h5 className="text-md font-medium text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                      👁️ Left Eye
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                          Left Eye Value
                        </label>
                        <Input
                          type="text"
                          value={lensDetailsForm.leftEye}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, leftEye: e.target.value})}
                          placeholder="Left eye prescription"
                          className="bg-white border-green-200 focus:border-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                          Left Axis
                        </label>
                        <Input
                          type="text"
                          value={lensDetailsForm.leftAxis}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, leftAxis: e.target.value})}
                          placeholder="Left axis value"
                          className="bg-white border-green-200 focus:border-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                          Left CYL
                        </label>
                        <Input
                          type="text"
                          value={lensDetailsForm.leftCyl}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, leftCyl: e.target.value})}
                          placeholder="Left cylinder"
                          className="bg-white border-green-200 focus:border-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                          Left Addition
                        </label>
                        <Input
                          type="text"
                          value={lensDetailsForm.leftAddition}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, leftAddition: e.target.value})}
                          placeholder="+1.50, +2.00, etc."
                          className="bg-white border-green-200 focus:border-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                          Left Quantity
                        </label>
                        <Input
                          type="number"
                          value={lensDetailsForm.leftQty}
                          onChange={(e) => setLensDetailsForm({...lensDetailsForm, leftQty: e.target.value})}
                          placeholder="0.5, 1, 2, etc."
                          step="0.5"
                          min="0"
                          className="bg-white border-green-200 focus:border-green-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details Section */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-700">
                <h4 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Additional Lens Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                      🎨 Color
                    </label>
                    <Input
                      type="text"
                      value={lensDetailsForm.color}
                      onChange={(e) => setLensDetailsForm({...lensDetailsForm, color: e.target.value})}
                      placeholder="Clear, Brown, Gray, etc."
                      className="bg-white border-purple-200 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                      ⚡ Power
                    </label>
                    <Input
                      type="text"
                      value={lensDetailsForm.power}
                      onChange={(e) => setLensDetailsForm({...lensDetailsForm, power: e.target.value})}
                      placeholder="Power specification"
                      className="bg-white border-purple-200 focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                      📦 Yangon Order Name
                    </label>
                    <Input
                      type="text"
                      value={lensDetailsForm.yangonOrderName}
                      onChange={(e) => setLensDetailsForm({...lensDetailsForm, yangonOrderName: e.target.value})}
                      placeholder="Yangon order reference"
                      className="bg-white border-purple-200 focus:border-purple-400"
                    />
                    {isYangonStore && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Current store is Yangon - this field will be automatically prioritized
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-3xl">
              <Button
                type="button"
                variant="outline"
                onClick={closeLensDetailsModal}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveLensDetails}
                className="px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Lens Details
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes slideInLeft {
          from { 
            opacity: 0; 
            transform: translateX(-30px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }

        @keyframes scaleIn {
          from { 
            opacity: 0; 
            transform: scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: scale(1); 
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.4s ease-out;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes loading-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite 1.5s;
        }

        .animate-loading-bar {
          animation: loading-bar 3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default VocForm;