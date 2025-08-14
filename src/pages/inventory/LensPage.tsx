import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart, Search, X, Filter, ChevronDown, ChevronUp, Stethoscope, MapPin, AlertTriangle, Zap, AreaChart, TrendingDown, RefreshCcw, FileSpreadsheet, Package } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy, onSnapshot, increment, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import LensForm, { LensFormData } from '../../components/lens/LensForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import SellBifocalDialog from '../../components/dialogs/SellbifocalDialog';
import EnhancedLensDetailView from '../../components/lens/EnhanedLensDetailView';
import BulkUpdateButton from '../../components/lens/BulkUpdateButton';
import { runTransaction } from 'firebase/firestore';
import { StockItem } from '../../lib/InventoryUtlis';
import toast from 'react-hot-toast';
import { formatCurrency, LensType, BifocalType, SMSBifocalType, deductErrorQuantityFromMatchingLens,  } from '../../lib/utils';

const LensPage: React.FC = () => {
  const [lenses, setLenses] = useState<LensFormData[]>([]);
  const [filteredLenses, setFilteredLenses] = useState<LensFormData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedType, setSelectedType] = useState<LensType | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<'Fuse' | 'Flattop' | 'Multifocal' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedErrorReason, setSelectedErrorReason] = useState<string | null>(null);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLens, setEditingLens] = useState<LensFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lensToDelete, setLensToDelete] = useState<LensFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellBifocalDialogOpen, setSellBifocalDialogOpen] = useState(false);
  const [lensToSell, setLensToSell] = useState<LensFormData | null>(null);
  
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedLens, setSelectedLens] = useState<LensFormData | null>(null);

  // Restock dialog states
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [lensToRestock, setLensToRestock] = useState<LensFormData | null>(null);
  const [restockData, setRestockData] = useState({
    rightQty: 0,
    leftQty: 0,
    totalQty: 0,
    reason: '',
    supplier: ''
  });

  // ADDED: Selling state to prevent concurrent operations and show loading states
  const [isSelling, setIsSelling] = useState(false);

  // RESTOCK WARNING STATE - အသိပေးချက်များအတွက်
  const [restockWarning, setRestockWarning] = useState<string | null>(null);

  // Enhanced search states
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    code: '',
    sph: '',
    cyl: '',
    axis: '',
    addition: '',
    priceMin: '',
    priceMax: '',
    qtyMin: '',
    qtyMax: '',
    stockStatus: '',
    yangonOrderName: '',
    errorReason: ''
  });

  // Mock permissions for demo
  const canManageLenses = true;
  const canEditLenses = true;
  const canDeleteLenses = true;
  const canAddLenses = true;
  const canViewLenses = true;
  const isOwner = true;
  const isAdminUser = true;

  // UPDATED CATEGORY LISTS - Removed specific items as requested
  const singleVisionCategories = [
  'bb 1.56' ,'bb 1.61', 'bb 1.67', // Removed 'bb 1.56'
    'bbpg 1.56', 'bbpg 1.61', 'pg',
    'anti flash', 'anti glare',
    'photo pink', 'photo blue', 'photo purple', 'photo brown',
    'cr', 'mc'
  ];

  const fuseCategories = [
    'bbpgfuse', 'crfuse', 'mcfuse', 'pgfuse','bbfuse' // Removed 'bbfuse'
  ];

  const flattopCategories = [
    'bbflattop', 'crflattop', 'bbpgflattop', // Removed 'bbflattop'
  ];

  const multifocalCategories = [
    'BB', 'MC', 'CR', 'BBPG', 'PG'
  ];

  const errorReasons = [
    'Auto စက် Error', 'KKT', 'KCMA', 'KMMT', 'မှန်မှားထုတ်'
  ];

  const stockStatuses = [
    { value: '', label: 'All Stock' },
    { value: 'in-stock', label: 'In Stock (>0)' },
    { value: 'low-stock', label: 'Low Stock (≤2)' },
    { value: 'out-of-stock', label: 'Out of Stock (0)' },
    { value: 'high-stock', label: 'High Stock (>10)' }
  ];

  // Enhanced filter function
  const applyFilters = (lensesList: LensFormData[]) => {
    let filtered = [...lensesList];

    // Type filter
    if (selectedType) {
      filtered = filtered.filter(lens => lens.type === selectedType);
    }

    // Subtype filter for Bifocal and SMS
    if ((selectedType === 'Bifocal' || selectedType === 'SMS') && selectedSubType) {
      filtered = filtered.filter(lens => 
        (lens.type === 'Bifocal' && lens.bifocalType === selectedSubType) ||
        (lens.type === 'SMS' && lens.smsBifocalType === selectedSubType)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(lens => lens.category === selectedCategory);
    }

    // Error reason filter
    if (selectedType === 'Error' && selectedErrorReason) {
      filtered = filtered.filter(lens => lens.errorReason === selectedErrorReason);
    }

    // Search filters
    if (searchFilters.code) {
      filtered = filtered.filter(lens => 
        lens.code.toLowerCase().includes(searchFilters.code.toLowerCase())
      );
    }

    if (searchFilters.sph) {
      filtered = filtered.filter(lens => 
        lens.sph && lens.sph.toLowerCase().includes(searchFilters.sph.toLowerCase())
      );
    }

    if (searchFilters.cyl) {
      filtered = filtered.filter(lens => 
        lens.cyl && lens.cyl.toLowerCase().includes(searchFilters.cyl.toLowerCase())
      );
    }

    if (searchFilters.axis) {
      filtered = filtered.filter(lens => 
        lens.axis && lens.axis.toLowerCase().includes(searchFilters.axis.toLowerCase())
      );
    }

    if (searchFilters.addition) {
      filtered = filtered.filter(lens => 
        lens.addition && lens.addition.toLowerCase().includes(searchFilters.addition.toLowerCase())
      );
    }

    if (searchFilters.yangonOrderName) {
      filtered = filtered.filter(lens => 
        lens.yangonOrderName && lens.yangonOrderName.toLowerCase().includes(searchFilters.yangonOrderName.toLowerCase())
      );
    }

    if (searchFilters.errorReason) {
      filtered = filtered.filter(lens => 
        lens.errorReason && lens.errorReason.toLowerCase().includes(searchFilters.errorReason.toLowerCase())
      );
    }

    if (searchFilters.priceMin) {
      filtered = filtered.filter(lens => lens.price >= parseFloat(searchFilters.priceMin));
    }

    if (searchFilters.priceMax) {
      filtered = filtered.filter(lens => lens.price <= parseFloat(searchFilters.priceMax));
    }

    if (searchFilters.qtyMin) {
      filtered = filtered.filter(lens => lens.qty >= parseFloat(searchFilters.qtyMin));
    }

    if (searchFilters.qtyMax) {
      filtered = filtered.filter(lens => lens.qty <= parseFloat(searchFilters.qtyMax));
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
      sph: '',
      cyl: '',
      axis: '',
      addition: '',
      priceMin: '',
      priceMax: '',
      qtyMin: '',
      qtyMax: '',
      stockStatus: '',
      yangonOrderName: '',
      errorReason: ''
    });
    setSelectedType(null);
    setSelectedSubType(null);
    setSelectedCategory(null);
    setSelectedErrorReason(null);
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return Object.values(searchFilters).some(value => value !== '') ||
           selectedType !== null ||
           selectedCategory !== null ||
           selectedErrorReason !== null;
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedType) count++;
    if (selectedSubType) count++;
    if (selectedCategory) count++;
    if (selectedErrorReason) count++;
    count += Object.values(searchFilters).filter(value => value !== '').length;
    return count;
  };

  // FIXED: Calculate error statistics properly - exclude Error type lenses from error count
  const calculateErrorStatistics = () => {
    // Only count error quantities from regular lenses (not Error type lenses)
    const regularLenses = lenses.filter(lens => lens.type !== 'Error');
    const totalErrorQty = regularLenses.reduce((sum, lens) => sum + (lens.errorQty || 0), 0);
    const totalOriginalQty = regularLenses.reduce((sum, lens) => sum + (lens.originalQty || lens.qty), 0);
    const errorRate = totalOriginalQty > 0 ? (totalErrorQty / totalOriginalQty) * 100 : 0;
    
    return {
      totalErrorQty,
      errorRate,
      lensesWithErrors: regularLenses.filter(lens => (lens.errorQty || 0) > 0).length
    };
  };

  const lensCategories = {
    singleVision: [
      'bb 1.56', 'bb 1.61', 'bb 1.67',
      'bbpg 1.56', 'bbpg 1.61', 'pg',
      'anti flash', 'anti glare',
      'photo pink', 'photo blue', 'photo purple', 'photo brown',
      'cr', 'mc',
      
    ],
    
    bifocal: {
      fuse: [
        'bbpgfuse', 'crfuse', 'mcfuse', 'pgfuse',
        'bbfuse', 'polarized fuse', 'transition fuse'
      ],
      flattop: [
        'bbpgflattop', 'crflattop', 
        'bbflattop', 
      ]
    },
    
    multifocal: [
      'BB', 'MC', 'CR', 'BBPG', 'PG',
    
    ],

  };

  // You can also create a flat list of all categories if needed
  const allCategories = [
    ...lensCategories.singleVision,
    ...lensCategories.bifocal.fuse,
    ...lensCategories.bifocal.flattop,
    ...lensCategories.multifocal,

  ];

  // ENHANCED: Fetch lenses with real-time updates and immediate UI responsiveness
  useEffect(() => {
    console.log('🔄 Setting up real-time lens data listener');
    
    const lensQuery = query(
      collection(db, 'lenses'),
      orderBy('code')
    );

    const unsubscribe = onSnapshot(
      lensQuery,
      (snapshot) => {
        console.log('📡 Received lens data update from Firestore:', snapshot.docs.length, 'documents');
        console.log('📊 Snapshot metadata:', {
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
          isEqual: snapshot.metadata.isEqual
        });
        
        const lensesData = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // CRITICAL: Use the qty field directly as it represents current remaining quantity
          // The qty field is automatically updated by the inventory system when VOCs are created
          const remainingQty = Number(data.qty) || 0;
          const soldQty = Number(data.soldQty) || 0;
          const errorQty = Number(data.errorQty) || 0;
          const originalQty = Number(data.originalQty) || remainingQty + soldQty + errorQty;

          return {
            id: doc.id,
            ...data,
            // CRITICAL: qty field represents current remaining quantity
            qty: remainingQty,
            rightQty: Number(data.rightQty) || 0,
            leftQty: Number(data.leftQty) || 0,
            rightSoldQty: Number(data.rightSoldQty) || 0,
            leftSoldQty: Number(data.leftSoldQty) || 0,
            soldQty: soldQty,
            errorQty: errorQty,
            rightErrorQty: Number(data.rightErrorQty) || 0,
            leftErrorQty: Number(data.leftErrorQty) || 0,
            originalRightQty: Number(data.originalRightQty) || Number(data.rightQty) || 0,
            originalLeftQty: Number(data.originalLeftQty) || Number(data.leftQty) || 0,
            originalQty: originalQty,
            // RESTOCK TRACKING FIELDS
            restockQty: Number(data.restockQty) || 0,
            restockRightQty: Number(data.restockRightQty) || 0,
            restockLeftQty: Number(data.restockLeftQty) || 0,
            price: Number(data.price) || 0,
            lastUpdated: data.lastUpdated || data.updatedAt || null,
          } as LensFormData;
        });

        console.log('📊 Processed lens data:', lensesData.length, 'lenses');
        
        // SEARCH FOR MCFUSE LENSES: Filter and log mcfuse lenses with total qty 3 and remaining qty 3
        const mcfuseLenses = lensesData.filter(lens => {
          const isMatchingCategory = lens.category === 'mcfuse';
          const remainingQty = lens.qty;
          const totalQty = lens.originalQty + (lens.restockQty || 0);
          const matchesCriteria = remainingQty === 3 && totalQty === 3;
          
          return isMatchingCategory && matchesCriteria;
        });
        
        if (mcfuseLenses.length > 0) {
          console.log(`🎯 Found ${mcfuseLenses.length} mcfuse lenses with total qty 3 and remaining qty 3:`);
          mcfuseLenses.slice(0, 3).forEach((lens, index) => {
            console.log(`\n📦 MCFUSE Lens ${index + 1}:`);
            console.log(`   Code: ${lens.code}`);
            console.log(`   Category: ${lens.category}`);
            console.log(`   Type: ${lens.type}`);
            console.log(`   SPH: ${lens.sph}, CYL: ${lens.cyl}, AXIS: ${lens.axis}`);
            if (lens.addition) console.log(`   Addition: ${lens.addition}`);
            console.log(`   Price: ${lens.price}`);
            console.log(`   Total Qty: ${lens.originalQty + (lens.restockQty || 0)}`);
            console.log(`   Remaining Qty: ${lens.qty}`);
            console.log(`   Right Qty: ${lens.rightQty}, Left Qty: ${lens.leftQty}`);
            console.log(`   Sold Qty: ${lens.soldQty}`);
            console.log(`   Error Qty: ${lens.errorQty}`);
          });
        } else {
          // Show all mcfuse lenses for reference
          const allMcfuse = lensesData.filter(lens => lens.category === 'mcfuse');
          console.log(`\n📋 All mcfuse lenses in database (${allMcfuse.length} total):`);
          allMcfuse.forEach(lens => {
            const totalQty = lens.originalQty + (lens.restockQty || 0);
            console.log(`   📍 ${lens.code}: Total=${totalQty}, Remaining=${lens.qty}, Category=${lens.category}`);
          });
        }
        console.log('📋 Sample lens quantities:', lensesData.slice(0, 3).map(lens => ({
          code: lens.code,
          remaining: lens.qty,
          sold: lens.soldQty,
          original: lens.originalQty,
          lastUpdated: lens.lastUpdated
        })));
        
        setLenses(lensesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching lenses:', error);
        toast.error('Failed to fetch lenses');
        setLoading(false);
      }
    );

    const processSale = async (lensId, quantity) => {
      try {
        await runTransaction(db, async (transaction) => {
          const lensRef = doc(db, 'lenses', lensId);
          const lensDoc = await transaction.get(lensRef);
          if (!lensDoc.exists()) throw "Document does not exist!";
          
          const currentQty = lensDoc.data().qty;
          if (currentQty < quantity) {
            throw "Not enough quantity available";
          }
          
          transaction.update(lensRef, {
            qty: increment(-quantity),
            soldQty: increment(quantity)
          });
        });
      } catch (e) {
        console.error("Transaction failed: ", e);
      }
    };

    console.log('✅ Real-time lens listener established');
    return () => unsubscribe();
  }, ); // Re-run when inventory context updates

  // Add a manual refresh function for debugging
  const forceRefreshLenses = async () => {
    console.log('🔄 Force refreshing lens data...');
    setLoading(true);
    
    try {
      const lensQuery = query(
        collection(db, 'lenses'),
        orderBy('code')
      );
      
      const snapshot = await getDocs(lensQuery);
      console.log('📡 Force refresh - fetched', snapshot.docs.length, 'documents');
      
      const lensesData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        const remainingQty = Number(data.qty) || 0;
        const soldQty = Number(data.soldQty) || 0;
        const errorQty = Number(data.errorQty) || 0;
        const originalQty = Number(data.originalQty) || remainingQty + soldQty + errorQty;

        return {
          id: doc.id,
          ...data,
          qty: remainingQty,
          rightQty: Number(data.rightQty) || 0,
          leftQty: Number(data.leftQty) || 0,
          rightSoldQty: Number(data.rightSoldQty) || 0,
          leftSoldQty: Number(data.leftSoldQty) || 0,
          soldQty: soldQty,
          errorQty: errorQty,
          rightErrorQty: Number(data.rightErrorQty) || 0,
          leftErrorQty: Number(data.leftErrorQty) || 0,
          originalRightQty: Number(data.originalRightQty) || Number(data.rightQty) || 0,
          originalLeftQty: Number(data.originalLeftQty) || Number(data.leftQty) || 0,
          originalQty: originalQty,
          price: Number(data.price) || 0,
        } as LensFormData;
      });
      
      console.log('📊 Force refresh - processed lens data:', lensesData.length, 'lenses');
      setLenses(lensesData);
      toast.success('Lens data refreshed successfully');
    } catch (error) {
      console.error('Error force refreshing lenses:', error);
      toast.error('Failed to refresh lens data');
    } finally {
      setLoading(false);
    }
  };
  // Calculate error statistics
  const errorStats = useMemo(() => calculateErrorStatistics(), [lenses]);

  // Apply filters when data or filters change
  useEffect(() => {
    const filtered = applyFilters(lenses);
    setFilteredLenses(filtered);
  }, [lenses, selectedType, selectedSubType, selectedCategory, selectedErrorReason, searchFilters]);

  const handleAddLens = () => {
    if (!canAddLenses) {
      toast.error('You do not have permission to add lenses');
      return;
    }
    setEditingLens(null);
    setIsFormModalOpen(true);
  };

  const handleEditLens = (lens: LensFormData) => {
    if (!canEditLenses) {
      toast.error('You do not have permission to edit lenses');
      return;
    }
    setEditingLens(lens);
    setIsFormModalOpen(true);
  };

  const handleDeleteLens = (lens: LensFormData) => {
    if (!canDeleteLenses) {
      toast.error('You do not have permission to delete lenses');
      return;
    }
    setLensToDelete(lens);
    setDeleteDialogOpen(true);
  };

  // FIXED: Enhanced handleSellLens with better modal handling and scroll management
  const handleSellLens = (lens: LensFormData, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!canManageLenses) {
      toast.error('You do not have permission to sell lenses');
      return;
    }
    
    console.log('🛒 Handling sell for lens:', {
      code: lens.code,
      type: lens.type,
      bifocalType: lens.bifocalType,
      smsBifocalType: lens.smsBifocalType,
      isFlattop: (lens.type === 'Bifocal' && lens.bifocalType === 'Flattop') || 
                 (lens.type === 'SMS' && lens.smsBifocalType === 'Flattop')
    });
    
    // Scroll to top when opening modal
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setLensToSell(lens);
    
    // Use specialized bifocal dialog only for Flattop bifocal lenses
    if ((lens.type === 'Bifocal' && lens.bifocalType === 'Flattop') || 
        (lens.type === 'SMS' && lens.smsBifocalType === 'Flattop')) {
      console.log('🔄 Opening Bifocal Sell Dialog for Flattop lens');
      setSellBifocalDialogOpen(true);
    } else {
      console.log('🔄 Opening Regular Sell Dialog');
      setSellDialogOpen(true);
    }
  };

  // Quick sell function for preset quantities
  const handleQuickSell = async (lens: LensFormData, quantity: number, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!canManageLenses) {
      toast.error('You do not have permission to sell lenses');
      return;
    }
    
    if (lens.qty < quantity) {
      toast.error(`Not enough quantity available. Current stock: ${lens.qty}`);
      return;
    }

    try {
      const lensRef = doc(db, 'lenses', lens.id!);
      
      // CRITICAL: Use increment() for atomic updates to prevent race conditions
      await updateDoc(lensRef, {
        qty: increment(-quantity),
        soldQty: increment(quantity),
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Add sale record for tracking
      await addDoc(collection(db, 'sales'), {
        itemId: lens.id,
        itemType: 'Lens',
        category: lens.category,
        quantity: quantity,
        unitPrice: lens.price,
        totalPrice: lens.price * quantity,
        date: serverTimestamp(),
        measurements: `${lens.sph || '-'} / ${lens.cyl || '-'} / ${lens.axis || '-'}`,
        lensType: lens.type,
        store: lens.store,
        staffEmail: 'demo@example.com',
        saleType: 'quick-sell'
      });
      
      toast.success(`✅ Quick sold ${quantity} pieces successfully!`);
      
      // FIXED: Immediate optimistic UI update for quick sell
      setLenses(prevLenses => 
        prevLenses.map(lensPrev => 
          lensPrev.id === lens.id 
            ? { 
                ...lensPrev, 
                qty: Math.max(0, lensPrev.qty - quantity),
                soldQty: (lensPrev.soldQty || 0) + quantity
              }
            : lensPrev
        )
      );
      
      // FIXED: Force refresh with reduced delay and ensure it completes
      setTimeout(async () => {
        try {
          await forceRefreshLenses();
          console.log('🔄 Post-quick-sale refresh completed successfully');
        } catch (refreshError) {
          console.error('❌ Post-quick-sale refresh failed:', refreshError);
        }
      }, 100); // Reduced from 500ms to 100ms for faster UI updates
      
    } catch (error) {
      console.error('❌ Error in quick sell:', error);
      toast.error('Failed to process quick sale. Please try again.');
    }
  };

  const handleViewDetail = (lens: LensFormData) => {
    setSelectedLens(lens);
    setDetailViewOpen(true);
  };

  // Restock function for Flattop bifocal lenses
  const handleRestockLens = (lens: LensFormData) => {
    if (!canManageLenses) {
      toast.error('You do not have permission to restock lenses');
      return;
    }
    setLensToRestock(lens);
    setRestockData({
      rightQty: 0,
      leftQty: 0,
      totalQty: 0,
      reason: '',
      supplier: ''
    });
    setRestockDialogOpen(true);
  };

  // Process restock for ALL lens types
  const processRestock = async () => {
    if (!lensToRestock) return;

    // Check if this is a Flattop lens (has separate right/left tracking)
    const isFlattopLens = (lensToRestock.type === 'Bifocal' && lensToRestock.bifocalType === 'Flattop') || 
                         (lensToRestock.type === 'SMS' && lensToRestock.smsBifocalType === 'Flattop');
    
    let totalRestockQty = 0;
    let restockMessage = '';
    
    if (isFlattopLens) {
      // Flattop lenses: use right + left quantities
      totalRestockQty = restockData.rightQty + restockData.leftQty;
      restockMessage = `${restockData.rightQty} right + ${restockData.leftQty} left lenses`;
    } else {
      // All other lens types: use total quantity
      totalRestockQty = restockData.totalQty;
      restockMessage = `${restockData.totalQty} lenses`;
    }

    if (totalRestockQty <= 0) {
      toast.error('Please enter valid restock quantities');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const lensRef = doc(db, 'lenses', lensToRestock.id!);
      
      // CORRECT INVENTORY LOGIC:
      // Original Qty = Initial Stock (Never Changes)
      // Restock Qty = Total Restocked Amount
      // Sold Qty = Total Sold Amount  
      // Remaining = Original + Restock - Sold
      
      const updateData: any = {
        restockQty: increment(totalRestockQty),
        qty: increment(totalRestockQty),
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (isFlattopLens) {
        // Update individual restock quantities for Flattop
        updateData.restockRightQty = increment(restockData.rightQty);
        updateData.restockLeftQty = increment(restockData.leftQty);
        updateData.rightQty = increment(restockData.rightQty);
        updateData.leftQty = increment(restockData.leftQty);
      }
      
      await updateDoc(lensRef, updateData);

      // Add restock record for tracking
      const restockHistoryData: any = {
        itemId: lensToRestock.id,
        itemType: 'Lens',
        category: lensToRestock.category,
        lensType: lensToRestock.type,
        bifocalType: lensToRestock.bifocalType || null,
        smsBifocalType: lensToRestock.smsBifocalType || null,
        totalRestockQty: totalRestockQty,
        reason: restockData.reason,
        supplier: restockData.supplier,
        store: lensToRestock.store,
        staffEmail: 'demo@example.com',
        date: serverTimestamp(),
        measurements: `${lensToRestock.sph || '-'} / ${lensToRestock.cyl || '-'} / ${lensToRestock.axis || '-'}`,
      };

      if (isFlattopLens) {
        restockHistoryData.rightRestockQty = restockData.rightQty;
        restockHistoryData.leftRestockQty = restockData.leftQty;
      }

      await addDoc(collection(db, 'restockHistory'), restockHistoryData);

      toast.success(`✅ Successfully restocked ${restockMessage}!`);
      setRestockDialogOpen(false);
      setLensToRestock(null);
      
      // Force refresh after restock
      setTimeout(() => {
        forceRefreshLenses();
      }, 500);
      
    } catch (error) {
      console.error('❌ Error restocking lens:', error);
      toast.error('Failed to restock lens. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the handleFormSubmit function to properly handle bifocal pairs
  const handleFormSubmit = async (data: LensFormData) => {
    try {
      setIsSubmitting(true);
      
      if (editingLens?.id) {
        // Calculate total quantity for Flattop bifocal lenses only
        if ((data.type === 'Bifocal' && data.bifocalType === 'Flattop') || 
            (data.type === 'SMS' && data.smsBifocalType === 'Flattop')) {
          data.qty = (data.leftQty || 0) + (data.rightQty || 0);
          
          // Preserve sold quantities when editing
          if (editingLens.rightSoldQty !== undefined) {
            data.rightSoldQty = editingLens.rightSoldQty;
          }
          if (editingLens.leftSoldQty !== undefined) {
            data.leftSoldQty = editingLens.leftSoldQty;
          }
          if (editingLens.soldQty !== undefined) {
            data.soldQty = editingLens.soldQty;
          }
          // Preserve error quantities when editing
          if (editingLens.rightErrorQty !== undefined) {
            data.rightErrorQty = editingLens.rightErrorQty;
          }
          if (editingLens.leftErrorQty !== undefined) {
            data.leftErrorQty = editingLens.leftErrorQty;
          }
          if (editingLens.errorQty !== undefined) {
            data.errorQty = editingLens.errorQty;
          }
        }

        // Track changes for history

        // Remove undefined fields from data to avoid Firestore errors
        const cleanedData = Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== undefined)
        );

        // Update the lens directly
        await updateDoc(doc(db, 'lenses', editingLens.id), {
          ...cleanedData,
          updatedAt: serverTimestamp()
        });

        toast.success('Lens updated successfully');
      } else {
        // For new items, set both quantities equal for Flattop only
        if ((data.type === 'Bifocal' && data.bifocalType === 'Flattop') || 
            (data.type === 'SMS' && data.smsBifocalType === 'Flattop')) {
          data.qty = (data.leftQty || 0) + (data.rightQty || 0);
        }
        
        // For Error lenses, automatically set category to "factory error"
        if (data.type === 'Error') {
          data.category = 'factory error';
        }
        
        // Remove undefined fields from data before adding to Firestore
        const cleanedNewLens = Object.fromEntries(
          Object.entries({
            ...data,
            originalQty: data.qty,
            soldQty: 0,
            errorQty: 0, // Initialize error quantity tracking
            rightErrorQty: 0,
            leftErrorQty: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).filter(([_, v]) => v !== undefined)
        );
        
        await addDoc(collection(db, 'lenses'), cleanedNewLens);
        
        // For Error lenses, automatically deduct error quantities from matching lenses
        if (data.type === 'Error') {
          console.log('🔍 Processing automatic error deduction for error lens:', data.code);
          
          try {
            const deductionResult = await deductErrorQuantityFromMatchingLens(data);
            
            if (deductionResult.success) {
              console.log('✅ Automatic error quantity increment successful:', deductionResult.message);
              toast.success(`Error lens created successfully! ${deductionResult.message}`);
            } else {
              console.log('⚠️ Automatic error quantity increment failed:', deductionResult.message);
              toast.success('Error lens created successfully');
              toast.warning(`Note: ${deductionResult.message}`);
            }
          } catch (deductionError) {
            console.error('❌ Error during automatic error quantity increment:', deductionError);
            toast.success('Error lens created successfully');
            toast.warning('Note: Could not automatically increment error quantity in matching lenses');
          }
        } else if (data.type === 'SMS') {
          toast.success('SMS lens created successfully - Inventory automatically deducted');
        } else {
          toast.success('New lens added successfully');
        }
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving lens:', error);
      toast.error('Failed to save lens');
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIXED: Enhanced bifocal lens selling with proper soldQty tracking and immediate UI update
  const confirmBifocalSell = async (rightQty: number, leftQty: number) => {
    if (!lensToSell?.id || isSelling) return;
    
    setIsSelling(true);
    try {
      console.log('🚀 Starting bifocal lens sale:', {
        lensId: lensToSell.id,
        lensCode: lensToSell.code,
        currentRightQty: lensToSell.rightQty,
        currentLeftQty: lensToSell.leftQty,
        sellRightQty: rightQty,
        sellLeftQty: leftQty
      });

      const lensRef = doc(db, 'lenses', lensToSell.id);
      
      // Calculate new quantities
      const newRightQty = Math.max(0, (lensToSell.rightQty || 0) - rightQty);
      const newLeftQty = Math.max(0, (lensToSell.leftQty || 0) - leftQty);
      const newTotalQty = newRightQty + newLeftQty;
      
      // Calculate new sold quantities properly
      const newRightSoldQty = (lensToSell.rightSoldQty || 0) + rightQty;
      const newLeftSoldQty = (lensToSell.leftSoldQty || 0) + leftQty;
      const newTotalSoldQty = (lensToSell.soldQty || 0) + rightQty + leftQty;
      
      // Validation
      if (newRightQty < 0 || newLeftQty < 0) {
        toast.error('Not enough quantity available');
        return;
      }

      console.log('📊 Calculated new quantities:', {
        newRightQty,
        newLeftQty,
        newTotalQty,
        newRightSoldQty,
        newLeftSoldQty,
        newTotalSoldQty
      });
      
      // CRITICAL: Use increment() for atomic updates to prevent race conditions
      await updateDoc(lensRef, {
        rightQty: increment(-rightQty),
        leftQty: increment(-leftQty),
        qty: increment(-(rightQty + leftQty)),
        rightSoldQty: increment(rightQty),
        leftSoldQty: increment(leftQty),
        soldQty: increment(rightQty + leftQty)
      });
      
      console.log('✅ Database updated successfully');
      
      // Add sale record for tracking
      await addDoc(collection(db, 'sales'), {
        itemId: lensToSell.id,
        itemType: 'Lens',
        category: lensToSell.category,
        rightQuantity: rightQty,
        leftQuantity: leftQty,
        totalQuantity: rightQty + leftQty,
        unitPrice: lensToSell.price,
        totalPrice: lensToSell.price * (rightQty + leftQty),
        date: serverTimestamp(),
        measurements: `R:${lensToSell.Right || ''}/L:${lensToSell.Left || ''}`,
        bifocalType: lensToSell.bifocalType || lensToSell.smsBifocalType,
        lensType: lensToSell.type,
        store: lensToSell.store,
        staffEmail: 'demo@example.com',
      });
      
      console.log('📝 Sale record created');
      
      toast.success(`✅ Sold ${rightQty + leftQty} pieces successfully (R:${rightQty}, L:${leftQty}). Total sold: ${newTotalSoldQty}`);
      
      // FIXED: Close dialog and clear state immediately
      setSellBifocalDialogOpen(false);
      setLensToSell(null);
      
      // FIXED: Immediate optimistic UI update for bifocal lenses
      setLenses(prevLenses => 
        prevLenses.map(lens => 
          lens.id === lensToSell.id 
            ? { 
                ...lens, 
                rightQty: Math.max(0, lens.rightQty - rightQty),
                leftQty: Math.max(0, lens.leftQty - leftQty),
                qty: Math.max(0, lens.qty - (rightQty + leftQty)),
                rightSoldQty: (lens.rightSoldQty || 0) + rightQty,
                leftSoldQty: (lens.leftSoldQty || 0) + leftQty,
                soldQty: (lens.soldQty || 0) + (rightQty + leftQty)
              }
            : lens
        )
      );
      
      // FIXED: Force refresh with reduced delay and ensure it completes
      setTimeout(async () => {
        try {
          await forceRefreshLenses();
          console.log('🔄 Post-bifocal-sale refresh completed successfully');
        } catch (refreshError) {
          console.error('❌ Post-bifocal-sale refresh failed:', refreshError);
        }
      }, 100); // Reduced from 500ms to 100ms for faster UI updates
      
    } catch (error) {
      console.error('❌ Error selling bifocal lens:', error);
      toast.error('Failed to process sale. Please try again.');
    }
  };

  // FIXED: Enhanced regular lens selling with proper soldQty tracking and immediate UI update
  const confirmSell = async (quantity: number) => {
    if (!lensToSell?.id) return;
    
    try {
      console.log('🚀 Starting regular lens sale:', {
        lensId: lensToSell.id,
        lensCode: lensToSell.code,
        currentQty: lensToSell.qty,
        sellQty: quantity
      });

      const lensRef = doc(db, 'lenses', lensToSell.id);
      
      const quantityToDeduct = parseFloat(quantity.toFixed(1));
      const newQty = Math.max(0, lensToSell.qty - quantityToDeduct);
      const newSoldQty = (lensToSell.soldQty || 0) + quantityToDeduct;
      
      // Validation
      if (newQty < 0) {
        toast.error('Not enough quantity available');
        return;
      }
      
      console.log('📊 Calculated new quantities:', {
        newQty,
        newSoldQty,
        quantityToDeduct
      });
      
      // CRITICAL: Use increment() for atomic updates to prevent race conditions
      await updateDoc(lensRef, {
        qty: increment(-quantityToDeduct),
        soldQty: increment(quantityToDeduct),
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Database updated successfully');
      
      // Add sale record with the correct quantity
      await addDoc(collection(db, 'sales'), {
        itemId: lensToSell.id,
        itemType: 'Lens',
        category: lensToSell.category,
        quantity: quantityToDeduct,
        unitPrice: lensToSell.price,
        totalPrice: lensToSell.price * quantityToDeduct,
        date: serverTimestamp(),
        measurements: lensToSell.type === 'Single Vision' 
          ? `${lensToSell.sph || ''}/${lensToSell.cyl || ''}/${lensToSell.axis || ''}`
          : `R:${lensToSell.Right || ''}/L:${lensToSell.Left || ''}`,
        lensType: lensToSell.type,
        store: lensToSell.store,
        staffEmail: 'demo@example.com',
      });
      
      console.log('📝 Sale record created');
      
      toast.success(`✅ Sold ${quantityToDeduct} units successfully. Total sold: ${newSoldQty}`);
      
      // FIXED: Close dialog and clear state immediately
      setSellDialogOpen(false);
      setLensToSell(null);
      
      // FIXED: Immediate optimistic UI update before waiting for Firestore
      setLenses(prevLenses => 
        prevLenses.map(lens => 
          lens.id === lensToSell.id 
            ? { 
                ...lens, 
                qty: Math.max(0, lens.qty - quantityToDeduct),
                soldQty: (lens.soldQty || 0) + quantityToDeduct
              }
            : lens
        )
      );
      
      // FIXED: Force refresh with reduced delay and ensure it completes
      setTimeout(async () => {
        try {
          await forceRefreshLenses();
          console.log('🔄 Post-sale refresh completed successfully');
        } catch (refreshError) {
          console.error('❌ Post-sale refresh failed:', refreshError);
        }
      }, 100); // Reduced from 500ms to 100ms for faster UI updates
      
    } catch (error) {
      console.error('❌ Error selling lens:', error);
      toast.error('Failed to process sale. Please try again.');
    }
  };

  // Helper function to get collection name based on item type
  function getCollectionName(type: string): string {
    switch (type) {
      case 'Lens':
        return 'lenses';
      // Add more cases as needed for other inventory types
      default:
        return 'lenses';
    }
  }

  // Type for VOC data (adjust as needed for your app)
  type VocData = {
    items: Array<{
      id: string;
      type: string;
      name: string;
      quantity: number;
      isBifocal?: boolean;
      details?: {
        rightQty?: number;
        leftQty?: number;
      };
    }>;
    // ...other fields for the voucher
  };

  // If you want to keep this function for future use, suppress unused warning with underscore
  const createVOCWithInventoryCheck = async (_vocData: VocData) => {
    const batch = writeBatch(db);
    
    // 1. First validate all items
    for (const item of _vocData.items) {
      const itemRef = doc(db, getCollectionName(item.type), item.id);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error(`${item.name} no longer exists in inventory`);
      }
      
      const availableQty = itemDoc.data().qty;
      if (availableQty < item.quantity) {
        throw new Error(`Not enough ${item.name} available (Requested: ${item.quantity}, Available: ${availableQty})`);
      }
    }
    
    // 2. Add VOC document
    const vocRef = doc(collection(db, 'vouchers'));
    batch.set(vocRef, _vocData);
    
    // 3. Update all inventory items
    for (const item of _vocData.items) {
      const itemRef = doc(db, getCollectionName(item.type), item.id);
      batch.update(itemRef, {
        qty: increment(-item.quantity),
        soldQty: increment(item.quantity),
        lastUpdated: serverTimestamp()
      });
      
      // For bifocal items
      if (item.isBifocal) {
        batch.update(itemRef, {
          rightQty: increment(-(item.details?.rightQty || 0)),
          leftQty: increment(-(item.details?.leftQty || 0)),
          rightSoldQty: increment(item.details?.rightQty || 0),
          leftSoldQty: increment(item.details?.leftQty || 0)
        });
      }
    }
    
    // 4. Commit the batch
    await batch.commit();
  };

  const confirmDelete = async () => {
    if (!lensToDelete?.id || !canDeleteLenses) return;
    
    try {
      await deleteDoc(doc(db, 'lenses', lensToDelete.id));
      
      toast.success('Lens deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting lens:', error);
      toast.error('Failed to delete lens');
    }
  };

  // RESTOCK FUNCTIONS - ပြန်ဖြည့်တင်းရန်အတွက် functions များ
  
  // Handle restock lens button click - ပြန်ဖြည့်တင်းခလုတ်နှိပ်သည့်အခါ
  const handleRestockLens = (lens: LensFormData) => {
    setLensToRestock(lens);
    setRestockData({
      rightQty: 0.5, // စတင်တန်ဖိုး 0.5 ကနေ
      leftQty: 0.5,  // စတင်တန်ဖိုး 0.5 ကနေ
      totalQty: 0.5, // စတင်တန်ဖိုး 0.5 ကနေ
      reason: '',
      supplier: ''
    });
    setRestockWarning(null); // Warning ကို ရှင်းလင်းပါ
    setRestockDialogOpen(true);
  };

  // Validate restock quantities - မှန်ကန်သော ပမာဏ စစ်ဆေးခြင်း
  const validateRestockQuantities = (lens: LensFormData, rightQty: number, leftQty: number, totalQty: number): string | null => {
    const isFlattopLens = (lens.type === 'Bifocal' && lens.bifocalType === 'Flattop') || 
                          (lens.type === 'SMS' && lens.smsBifocalType === 'Flattop');

    if (isFlattopLens) {
      // Flattop lens များအတွက် Right/Left စစ်ဆေးခြင်း
      if (rightQty > 0 && rightQty < 0.5) {
        return "⚠️ မှတ်ချက်: Right eye ပမာဏသည် အနည်းဆုံး 0.5 ဖြစ်ရမည် (စတင်တန်ဖိုး: 0.5, 1, 1.5, 2, 2.5...)";
      }
      if (leftQty > 0 && leftQty < 0.5) {
        return "⚠️ မှတ်ချက်: Left eye ပမာဏသည် အနည်းဆုံး 0.5 ဖြစ်ရမည် (စတင်တန်ဖိုး: 0.5, 1, 1.5, 2, 2.5...)";
      }
      
      // Remaining quantity ကို စစ်ဆေးခြင်း - negative မဖြစ်အောင်
      const currentRightQty = lens.rightQty || 0;
      const currentLeftQty = lens.leftQty || 0;
      const newRightQty = currentRightQty + rightQty;
      const newLeftQty = currentLeftQty + leftQty;
      
      if (currentRightQty > 0 && newRightQty < 0) {
        return "🚨 သတိပေးချက်: Right eye ကျန်ရှိသော ပမာဏ မည်းနေမည် (လက်ရှိ: " + currentRightQty + " + " + rightQty + " = " + newRightQty + ")";
      }
      if (currentLeftQty > 0 && newLeftQty < 0) {
        return "🚨 သတိပေးချက်: Left eye ကျန်ရှိသော ပမာဏ မည်းနေမည် (လက်ရှိ: " + currentLeftQty + " + " + leftQty + " = " + newLeftQty + ")";
      }
    } else {
      // အခြား lens များအတွက်
      if (totalQty > 0 && totalQty < 0.5) {
        return "⚠️ မှတ်ချက်: ပမာဏသည် အနည်းဆုံး 0.5 ဖြစ်ရမည် (စတင်တန်ဖိုး: 0.5, 1, 1.5, 2, 2.5...)";
      }
      
      // Remaining quantity ကို စစ်ဆေးခြင်း - negative မဖြစ်အောင်
      const currentTotalQty = lens.qty || 0;
      const newTotalQty = currentTotalQty + totalQty;
      if (currentTotalQty > 0 && newTotalQty < 0) {
        return "🚨 သတိပေးချက်: စုစုပေါင်း ကျန်ရှိသော ပမာဏ မည်းနေမည် (လက်ရှိ: " + currentTotalQty + " + " + totalQty + " = " + newTotalQty + ")";
      }
    }

    return null; // အားလုံး မှန်ကန်သည်
  };

  // Process restock - ပြန်ဖြည့်တင်းခြင်းကို လုပ်ဆောင်ခြင်း
  const processRestock = async () => {
    if (!lensToRestock?.id || isSubmitting) return;

    // အခြေခံ validation
    if (!restockData.reason) {
      toast.error('ကြေးပုံ: ပြန်ဖြည့်တင်းရသော အကြောင်းရင်းကို ရွေးချယ်ပါ');
      return;
    }

    const isFlattopLens = (lensToRestock.type === 'Bifocal' && lensToRestock.bifocalType === 'Flattop') || 
                          (lensToRestock.type === 'SMS' && lensToRestock.smsBifocalType === 'Flattop');

    let rightQty = 0;
    let leftQty = 0; 
    let totalQty = 0;

    if (isFlattopLens) {
      rightQty = restockData.rightQty || 0;
      leftQty = restockData.leftQty || 0;
      totalQty = rightQty + leftQty;

      if (totalQty === 0) {
        toast.error('ကြေးပုံ: Right eye သို့မဟုတ် Left eye ပမာဏကို ထည့်သွင်းပါ');
        return;
      }
    } else {
      totalQty = restockData.totalQty || 0;
      if (totalQty === 0) {
        toast.error('ကြေးပုံ: ပြန်ဖြည့်တင်းမည့် ပမာဏကို ထည့်သွင်းပါ');
        return;
      }
    }

    // Validation စစ်ဆေးခြင်း
    const validationError = validateRestockQuantities(lensToRestock, rightQty, leftQty, totalQty);
    if (validationError) {
      // ဤနေရာတွင် Error မဟုတ်ပဲ Warning ပြသမည်
      const isNegativeWarning = validationError.includes('မည်းနေမည်');
      
      if (isNegativeWarning) {
        // Negative quantity အတွက် ပြင်းထန်သော warning
        toast.error(validationError);
        setRestockWarning(validationError);
        return; // ရပ်တန့်ပါ
      } else {
        // အနည်းဆုံး အတွက် သာမန် warning
        toast.warning(validationError);
        setRestockWarning(validationError);
      }
    }

    setIsSubmitting(true);

    try {
      console.log('🚀 စတင်နေသည် restock operation:', {
        lensId: lensToRestock.id,
        lensCode: lensToRestock.code,
        rightQty,
        leftQty,
        totalQty,
        reason: restockData.reason
      });

      const lensRef = doc(db, 'lenses', lensToRestock.id);

      if (isFlattopLens) {
        // Flattop lens များအတွက် - Right/Left ခွဲထုတ်ခြင်း
        const updateData: any = {
          rightQty: increment(rightQty),
          leftQty: increment(leftQty), 
          qty: increment(totalQty),
          restockRightQty: increment(rightQty),
          restockLeftQty: increment(leftQty),
          restockQty: increment(totalQty),
          updatedAt: serverTimestamp()
        };

        await updateDoc(lensRef, updateData);

        toast.success(`✅ အောင်မြင်စွာ ပြန်ဖြည့်တင်းပြီးပါပြီ! Right: +${rightQty}, Left: +${leftQty} (စုစုပေါင်း: +${totalQty})`);
      } else {
        // အခြား lens များအတွက် - တစ်ခုတည်း ပမာဏ
        const updateData: any = {
          qty: increment(totalQty),
          restockQty: increment(totalQty),
          updatedAt: serverTimestamp()
        };

        await updateDoc(lensRef, updateData);

        toast.success(`✅ အောင်မြင်စွာ ပြန်ဖြည့်တင်းပြီးပါပြီ! စုစုပေါင်း: +${totalQty} လုံး`);
      }

      // Dialog ကို ပိတ်ခြင်း
      setRestockDialogOpen(false);
      setLensToRestock(null);
      setRestockWarning(null);

    } catch (error) {
      console.error('❌ Restock လုပ်ဆောင်နေစဉ် ကြေးပုံ:', error);
      toast.error('ပြန်ဖြည့်တင်းခြင်း မအောင်မြင်ပါ။ ကျေးဇူးပြုပြီး ထပ်မံကြိုးစားကြည့်ပါ။');
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIXED: Calculate error statistics properly
  // const errorStats = calculateErrorStatistics();

  const lensColumns = [
    { key: 'code', header: 'Code', sortable: true },
    { 
      key: 'type', 
      header: 'Type', 
      sortable: true,
      render: (row: LensFormData) => (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${
            row.type === 'Error' ? 'text-red-600 dark:text-red-400' :
            row.type === 'SMS' ? 'text-blue-600 dark:text-blue-400' :
            row.type === 'Yangon Order' ? 'text-orange-600 dark:text-orange-400' :
            'text-gray-900 dark:text-gray-100'
          }`}>
            {row.type}
          </span>
          {row.type === 'Error' && (
            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              Error
            </span>
          )}
          {row.type === 'SMS' && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full flex items-center gap-1">
              <Stethoscope size={10} />
              SMS
            </span>
          )}
          {row.type === 'Yangon Order' && (
            <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full flex items-center gap-1">
              <MapPin size={10} />
              Yangon
            </span>
          )}
        </div>
      ),
    },
    { 
      key: 'bifocalType', 
      header: 'Bifocal Type', 
      sortable: true,
      render: (row: LensFormData) => {
        if (row.type === 'Bifocal') return row.bifocalType || '-';
        if (row.type === 'SMS' && row.smsBifocalType) return `SMS ${row.smsBifocalType}`;
        return '-';
      },
    },
    { 
      key: 'category', 
      header: 'Category', 
      sortable: true,
      render: (row: LensFormData) => (
        <div className="flex items-center gap-1">
          <span className={`font-medium ${
            row.category === 'factory error' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {row.category}
          </span>
        </div>
      ),
    },
    {
      key: 'errorReason',
      header: 'Error Reason',
      sortable: true,
      render: (row: LensFormData) => {
        if (row.type === 'Error' && row.errorReason) {
          return (
            <div className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-red-500" />
              <span className="text-red-600 dark:text-red-400 font-medium text-sm">
                {row.errorReason}
              </span>
            </div>
          );
        }
        return '-';
      },
    },
    {
      key: 'yangonOrderName',
      header: 'Yangon Order Name',
      sortable: true,
      render: (row: LensFormData) => {
        if ((row.category === 'yangon order' || row.type === 'Yangon Order') && row.yangonOrderName) {
          return (
            <div className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded border border-orange-200 dark:border-orange-700">
              <span className="text-orange-800 dark:text-orange-200 font-medium text-sm">
                {row.yangonOrderName}
              </span>
            </div>
          );
        }
        return '-';
      },
        },
        {
      key: 'measurements',
      header: 'Measurements',
      render: (row: LensFormData) => {
        // Yangon Order: show right/left sph/cyl/axis/addition in detail
        if (row.type === 'Yangon Order') {
          return (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-orange-700 dark:text-orange-300">Yangon Order</div>
          <div className="text-xs">
            <span className="font-medium">Right:</span> {row.rightSph || '-'} / {row.rightCyl || '-'} / {row.rightAxis || '-'} / {row.rightAddition || '-'}
          </div>
          <div className="text-xs">
            <span className="font-medium">Left:</span> {row.leftSph || '-'} / {row.leftCyl || '-'} / {row.leftAxis || '-'} / {row.leftAddition || '-'}
          </div>
        </div>
          );
        }
        if (row.type === 'Single Vision' || (row.type === 'SMS' && !row.smsBifocalType)) {
          return `${row.sph || '-'} / ${row.cyl || '-'} / ${row.axis || '-'}`;
        } else if ((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
           (row.type === 'SMS' && row.smsBifocalType === 'Flattop')) {
          return (
        <div className="space-y-1">
          <div className="text-xs">SPH: {row.sph || '-'} / ADD: {row.addition || '-'}</div>
          {row.samePowerBothEyes ? (
            <div className="text-xs text-blue-600 dark:text-blue-400">
          Both Eyes: {row.Left || '-'} / {row.leftCyl || '-'} / {row.leftAxis || '-'}
            </div>
          ) : (
            <div className="text-xs space-y-0.5">
          <div>R: {row.Right || '-'} / {row.rightCyl || '-'} / {row.rightAxis || '-'}</div>
          <div>L: {row.Left || '-'} / {row.leftCyl || '-'} / {row.leftAxis || '-'}</div>
            </div>
          )}
        </div>
          );
        } else if (row.type === 'Bifocal' || (row.type === 'SMS' && row.smsBifocalType)) {
          return (
        <div className="space-y-1">
          <div className="text-xs">SPH: {row.sph || '-'} / ADD: {row.addition || '-'}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Fuse/Multifocal - No L/R breakdown
          </div>
        </div>
          );
        } else {
          return `${row.sph || '-'} / ${row.cyl || '-'} / ${row.axis || '-'}`;
        }
      }
        },
        {
      key: 'rightQty',
      header: 'Right Remaining',
      sortable: true,
      render: (row: LensFormData) => {
        // Only show for Flattop bifocal types
        if ((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
            (row.type === 'SMS' && row.smsBifocalType === 'Flattop')) {
          const remaining = row.rightQty || 0;
          const isLow = remaining <= 1 && remaining > 0;
          const isEmpty = remaining === 0;
          
          return (
            <div className="text-center">
              <div className={`font-medium ${
                isEmpty ? 'text-red-600 dark:text-red-400' :
                isLow ? 'text-yellow-600 dark:text-yellow-400' :
                'text-blue-600 dark:text-blue-400'
              }`}>
                {remaining} pcs
              </div>
              {isEmpty && (
                <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1 py-0.5 rounded">
                  Out
                </span>
              )}
              {isLow && !isEmpty && (
                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1 py-0.5 rounded">
                  Low
                </span>
              )}
            </div>
          );
        }
        return '-';
      },
    },
    {
      key: 'leftQty',
      header: 'Left Remaining',
      sortable: true,
      render: (row: LensFormData) => {
        // Only show for Flattop bifocal types
        if ((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
            (row.type === 'SMS' && row.smsBifocalType === 'Flattop')) {
          const remaining = row.leftQty || 0;
          const isLow = remaining <= 1 && remaining > 0;
          const isEmpty = remaining === 0;
          
          return (
            <div className="text-center">
              <div className={`font-medium ${
                isEmpty ? 'text-red-600 dark:text-red-400' :
                isLow ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {remaining} pcs
              </div>
              {isEmpty && (
                <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1 py-0.5 rounded">
                  Out
                </span>
              )}
              {isLow && !isEmpty && (
                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1 py-0.5 rounded">
                  Low
                </span>
              )}
            </div>
          );
        }
        return '-';
      },
    },
    {
      key: 'originalQty',
      header: 'Total Original',
      sortable: true,
      sortType: 'number',
      getValue: (row: LensFormData) => row.originalQty || 0,
      render: (row: LensFormData) => {
        const originalQty = row.originalQty || 0;
        return (
          <div className="text-center">
            <div className={`font-medium ${
              row.type === 'Error' ? 'text-red-600 dark:text-red-400' :
              row.type === 'SMS' ? 'text-blue-600 dark:text-blue-400' :
              'text-purple-600 dark:text-purple-400'
            }`}>
              {originalQty} pcs
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Original
            </span>
          </div>
        );
      }
    },
    {
      key: 'soldQty',
      header: 'Total Sold',
      sortable: true,
      sortType: 'number',
      getValue: (row: LensFormData) => {
        return row.soldQty || 0;
      },
      render: (row: LensFormData) => {
        const soldQty = row.soldQty || 0;
        return (
          <div className="text-center">
            <div className={`font-medium ${soldQty > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}>
              {soldQty} pcs
            </div>
            {row.type === 'Error' && soldQty > 0 && (
              <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-1 py-0.5 rounded">
                Deducted
              </span>
            )}
            {row.type === 'SMS' && soldQty > 0 && (
              <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-1 py-0.5 rounded">
                SMS Sold
              </span>
            )}
            {row.type !== 'Error' && row.type !== 'SMS' && soldQty > 0 && (
              <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-1 py-0.5 rounded">
                Sold
              </span>
            )}
          </div>
        );
      }
    },
    // FIXED: Error Quantity Column - Only show for regular lenses, not Error type lenses
    {
      key: 'errorQty',
      header: 'Error Qty',
      sortable: true,
      sortType: 'number',
      getValue: (row: LensFormData) => row.type === 'Error' ? 0 : (row.errorQty || 0),
      render: (row: LensFormData) => {
        // Don't show error quantities for Error type lenses themselves
        if (row.type === 'Error') {
          return (
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 font-medium">
                N/A
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Error Lens
              </span>
            </div>
          );
        }

        const errorQty = row.errorQty || 0;
        const hasErrors = errorQty > 0;
        
        return (
          <div className="text-center">
            <div className={`font-medium ${
              hasErrors ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {errorQty} pcs
            </div>
            {hasErrors && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingDown size={10} className="text-red-500" />
                <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1 py-0.5 rounded">
                  Errors
                </span>
              </div>
            )}
            {!hasErrors && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                No Errors
              </span>
            )}
          </div>
        );
      }
    },
    // Add Restock Quantity Column for Flattop lenses
    {
      key: 'restockQty',
      header: 'Restock Qty',
      sortable: true,
      sortType: 'number',
      getValue: (row: LensFormData) => row.restockQty || 0,
      render: (row: LensFormData) => {
        const restockQty = row.restockQty || 0;
        const isFlattopLens = (row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
                             (row.type === 'SMS' && row.smsBifocalType === 'Flattop');
        
        return (
          <div className="text-center">
            <div className={`font-medium ${
              restockQty > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {restockQty} pcs
            </div>
            {restockQty > 0 && isFlattopLens && (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <div className="flex justify-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">R: {row.restockRightQty || 0}</span>
                  <span className="text-green-600 dark:text-green-400">L: {row.restockLeftQty || 0}</span>
                </div>
                <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1 py-0.5 rounded text-xs">
                  Restocked
                </span>
              </div>
            )}
            {restockQty > 0 && !isFlattopLens && (
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
      header: 'Total Remaining',
      sortable: true,
      sortType: 'number',
      getValue: (row: LensFormData) => row.qty,
      render: (row: LensFormData) => {
        const isLowStock = row.qty <= 2;
        const isOutOfStock = row.qty === 0;
        return (
          <div className="text-center">
            <div className={`font-medium ${
              isOutOfStock 
                ? 'text-red-600 dark:text-red-400' 
                : isLowStock 
                ? 'text-yellow-600 dark:text-yellow-400' 
                : row.type === 'Error'
                ? 'text-red-600 dark:text-red-400'
                : row.type === 'SMS'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {row.qty} pcs
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
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Available
            </span>
          </div>
        );
      }
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      sortType: 'number',
      render: (row: LensFormData) => formatCurrency(row.price)
    },

    // Actions column: Only show for owner and admin
    (isOwner || isAdminUser) && {
      key: 'actions',
      header: 'Actions',
      render: (row: LensFormData) => (
        <div className="flex space-x-1">
          {/* View Details - Available to all users */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetail(row)}
            className="p-1.5"
            title="View Details"
          >
            {row.type === 'SMS' ? <Stethoscope size={14} /> : 
             row.type === 'Yangon Order' ? <MapPin size={14} /> : 
             row.type === 'Error' ? <AlertTriangle size={14} /> : <Eye size={14} />}
          </Button>
          
          {/* Edit - Only for owners and admins */}
          {canEditLenses && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditLens(row)}
              className="p-1.5"
              title="Edit Lens"
            >
              <Edit size={14} />
            </Button>
            )}

            {/* FIXED: Enhanced Sell Button with Better Event Handling */}
            {row.type !== 'Error' && row.type !== 'SMS' && row.type !== 'Yangon Order' && canManageLenses && (
            <div className="relative group">
              {/* Main Sell Button - Enhanced for Flattop lenses */}
              <Button
                variant="success"
                size="sm"
                onClick={(e) => handleSellLens(row, e)}
                disabled={row.qty <= 0}
                className={`p-1.5 transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${
                  ((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
                   (row.type === 'SMS' && row.smsBifocalType === 'Flattop'))
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 border-2 border-blue-300 shadow-lg ring-2 ring-blue-200'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                title={
                  ((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
                   (row.type === 'SMS' && row.smsBifocalType === 'Flattop'))
                    ? "Sell Flattop Lens (Right/Left Selection)"
                    : "Sell Lens (Custom Amount)"
                }
              >
                <div className="relative flex items-center justify-center">
                  <ShoppingCart size={14} className="text-white" />
                  {/* Special indicator for Flattop lenses */}
                  {((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
                    (row.type === 'SMS' && row.smsBifocalType === 'Flattop')) && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full border border-white animate-pulse"></div>
                  )}
                </div>
              </Button>
              
              {/* Enhanced Quick Sell Buttons for Flattop - Show Left/Right options */}
              {((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
                (row.type === 'SMS' && row.smsBifocalType === 'Flattop')) && 
                (row.rightQty > 0 || row.leftQty > 0) && (
                <div className="hidden group-hover:flex absolute top-0 left-full ml-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-3 gap-2 flex-col min-w-[180px]">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center border-b pb-2">
                    🔍 Flattop Quick Sell
                  </div>
                  
                  {/* Right Eye Quick Sell */}
                  {row.rightQty > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold w-8 text-right">R:</span>
                      <div className="flex gap-1">
                        {[0.5, 1,1.5,1.5,2].filter(qty => row.rightQty >= qty).map((qty) => (
                          <Button
                            key={`right-${qty}`}
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickSell(row, qty, e);
                            }}
                            className="px-2 py-1 text-xs min-w-0 h-7 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-900 dark:hover:text-blue-300 border-blue-200 transition-all duration-200 hover:scale-105"
                            title={`Quick sell ${qty} right lens(es)`}
                          >
                            {qty}
                          </Button>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">({row.rightQty} avail)</span>
                    </div>
                  )}
                  
                  {/* Left Eye Quick Sell */}
                  {row.leftQty > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600 dark:text-green-400 font-bold w-8 text-right">L:</span>
                      <div className="flex gap-1">
                        {[0.5, 1,1.5,1.5,2].filter(qty => row.leftQty >= qty).map((qty) => (
                          <Button
                            key={`left-${qty}`}
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickSell(row, qty, e);
                            }}
                            className="px-2 py-1 text-xs min-w-0 h-7 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900 dark:hover:text-green-300 border-green-200 transition-all duration-200 hover:scale-105"
                            title={`Quick sell ${qty} left lens(es)`}
                          >
                            {qty}
                          </Button>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">({row.leftQty} avail)</span>
                    </div>
                  )}
                  
                  {/* Full Set Quick Sell */}
                  {row.rightQty > 0 && row.leftQty > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-bold w-8 text-right">Set:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleQuickSell(row, 2, e);
                        }}
                        className="px-2 py-1 text-xs min-w-0 h-7 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 dark:hover:bg-purple-900 dark:hover:text-purple-300 border-purple-200 transition-all duration-200 hover:scale-105"
                        title="Quick sell full set (R+L)"
                      >
                        🔗 Pair
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Regular Quick Sell Buttons for non-Flattop lenses */}
              {!((row.type === 'Bifocal' && row.bifocalType === 'Flattop') || 
                (row.type === 'SMS' && row.smsBifocalType === 'Flattop')) && 
                row.qty > 0 && (
                <div className="hidden group-hover:flex absolute top-0 left-full ml-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-2 gap-1">
                  {/* Quick sell buttons for 0.5, 1, 1.5, 2, 2.5 */}
                  {[0.5, 1, 1.5, 2, 2.5].filter(qty => row.qty >= qty).map((qty) => (
                    <Button
                      key={qty}
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickSell(row, qty, e);
                      }}
                      className="px-2 py-1 text-xs min-w-0 h-7 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900 dark:hover:text-green-300 transition-all duration-200 hover:scale-105"
                      title={`Quick sell ${qty} pcs`}
                    >
                      {qty}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Restock - Available for ALL lens types, for owners/admins */}
            {canManageLenses && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestockLens(row)}
                className="p-1.5 hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900 dark:hover:text-green-300 transition-all duration-200 hover:scale-105"
                title={`Restock ${row.type} Lens (Add Inventory)`}
              >
                <Package size={14} />
              </Button>
            )}
            
            {/* Delete - Only for owners and admins */}
          {canDeleteLenses && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteLens(row)}
              className="p-1.5 transition-all duration-200 hover:scale-105"
              title="Delete Lens"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    }
  ].filter(Boolean);


  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  // const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Real-time listener for stock updates
    const q = query(collection(db, 'lensStock'), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const items: StockItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as StockItem);
        });
        setStockItems(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching stock items:', error);
        setError('Failed to load stock items');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Enhanced Error Tracking & Automatic Inventory Deduction System
        </h1>

        {/* Permission Notice for Staff */}
        {!isOwner && !isAdminUser && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Staff Access:</strong> You can view lens data and add new lenses. 
                Contact an administrator for editing, selling, or deleting permissions.
              </p>
            </div>
          </div>
        )}

        {/* FIXED: Enhanced Summary Cards with Corrected Error Tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Lenses</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {lenses.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Error Lenses</p>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {lenses.filter(lens => lens.type === 'Error').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">SMS Lenses</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {lenses.filter(lens => lens.type === 'SMS').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Yangon Orders</p>
                <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                  {lenses.filter(lens => lens.type === 'Yangon Order').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Errors</p>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {errorStats.totalErrorQty}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {errorStats.lensesWithErrors} lenses affected
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <AreaChart className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Error Rate</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {errorStats.errorRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Regular lenses only
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-all duration-200">
          {/* Filter Section */}
          <div className="space-y-6">
            {/* Type Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Filter size={20} />
                Lens Type
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <Button
                  variant={selectedType === null ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedType(null);
                    setSelectedSubType(null);
                    setSelectedCategory(null);
                    setSelectedErrorReason(null);
                  }}
                  className="w-full transition-all duration-200 hover:scale-[0.98]"
                >
                  All Types
                </Button>
                <Button
                  variant={selectedType === 'Single Vision' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedType('Single Vision');
                    setSelectedSubType(null);
                    setSelectedCategory(null);
                    setSelectedErrorReason(null);
                  }}
                  className="w-full transition-all duration-200 hover:scale-[0.98]"
                >
                  Single Vision
                </Button>
                <Button
                  variant={selectedType === 'Bifocal' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedType('Bifocal');
                    setSelectedSubType(null);
                    setSelectedCategory(null);
                    setSelectedErrorReason(null);
                  }}
                  className="w-full transition-all duration-200 hover:scale-[0.98]"
                >
                  Bifocal
                </Button>
                <Button
                  variant={selectedType === 'SMS' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedType('SMS');
                    setSelectedSubType(null);
                    setSelectedCategory(null);
                    setSelectedErrorReason(null);
                  }}
                  className="w-full transition-all duration-200 hover:scale-[0.98] bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200"
                >
                  <div className="flex items-center gap-1">
                    <Stethoscope size={14} />
                    SMS
                  </div>
                </Button>
                <Button
                  variant={selectedType === 'Error' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedType('Error');
                    setSelectedSubType(null);
                    setSelectedCategory(null);
                    setSelectedErrorReason(null);
                  }}
                  className="w-full transition-all duration-200 hover:scale-[0.98] bg-red-100 border-red-300 text-red-800 hover:bg-red-200"
                >
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={14} />
                    Error
                  </div>
                </Button>
                <Button
                  variant={selectedType === 'Yangon Order' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedType('Yangon Order');
                    setSelectedSubType(null);
                    setSelectedCategory(null);
                    setSelectedErrorReason(null);
                  }}
                  className="w-full transition-all duration-200 hover:scale-[0.98] bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200"
                >
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    Yangon Order
                  </div>
                </Button>
              </div>
            </div>

            {/* Subtype Selection for Bifocal and SMS */}
            {(selectedType === 'Bifocal' || selectedType === 'SMS') && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
                  {selectedType === 'SMS' ? 'SMS Type' : 'Bifocal Type'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Button
                    variant={selectedSubType === null ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedSubType(null);
                      setSelectedCategory(null);
                    }}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    All Types
                  </Button>
                  <Button
                    variant={selectedSubType === 'Fuse' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedSubType('Fuse');
                      setSelectedCategory(null);
                    }}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    Fuse
                  </Button>
                  <Button
                    variant={selectedSubType === 'Flattop' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedSubType('Flattop');
                      setSelectedCategory(null);
                    }}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    Flattop
                  </Button>
                  <Button
                    variant={selectedSubType === 'Multifocal' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedSubType('Multifocal');
                      setSelectedCategory(null);
                    }}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    Multifocal
                  </Button>
                </div>
              </div>
            )}

            {/* Error Reason Selection */}
            {selectedType === 'Error' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Error Reason</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <Button
                    variant={selectedErrorReason === null ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedErrorReason(null)}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    All Reasons
                  </Button>
                  {errorReasons.map(reason => (
                    <Button
                      key={reason}
                      variant={selectedErrorReason === reason ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedErrorReason(reason)}
                      className="w-full transition-all duration-200 hover:scale-[0.98]"
                    >
                      {reason}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Selection */}
            {selectedType === 'Single Vision' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Category</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                  <Button
                    variant={selectedCategory === null ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    All Categories
                  </Button>
                  {singleVisionCategories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="w-full transition-all duration-200 hover:scale-[0.98]"
                    >
                      {category.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedSubType === 'Fuse' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Fuse Category</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <Button
                    variant={selectedCategory === null ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    All Categories
                  </Button>
                  {fuseCategories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="w-full transition-all duration-200 hover:scale-[0.98]"
                    >
                      {category.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedSubType === 'Flattop' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Flattop Category</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  <Button
                    variant={selectedCategory === null ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    All Categories
                  </Button>
                  {flattopCategories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="w-full transition-all duration-200 hover:scale-[0.98]"
                    >
                      {category.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedSubType === 'Multifocal' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Multifocal Category</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  <Button
                    variant={selectedCategory === null ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="w-full transition-all duration-200 hover:scale-[0.98]"
                  >
                    All Categories
                  </Button>
                  {multifocalCategories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="w-full transition-all duration-200 hover:scale-[0.98]"
                    >
                      {category.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

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
                  label="Search SPH"
                  value={searchFilters.sph}
                  onChange={(e) => updateSearchFilter('sph', e.target.value)}
                  placeholder="Enter SPH value..."
                  className="transition-all duration-200 focus:scale-[1.02]"
                />
                <Input
                  label="Search CYL"
                  value={searchFilters.cyl}
                  onChange={(e) => updateSearchFilter('cyl', e.target.value)}
                  placeholder="Enter CYL value..."
                  className="transition-all duration-200 focus:scale-[1.02]"
                />
                <Input
                  label="Search Error Reason"
                  value={searchFilters.errorReason}
                  onChange={(e) => updateSearchFilter('errorReason', e.target.value)}
                  placeholder="Enter error reason..."
                  className="transition-all duration-200 focus:scale-[1.02]"
                />
              </div>

              {/* Expanded Search Options */}
              {searchExpanded && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <Input
                      label="Search AXIS"
                      value={searchFilters.axis}
                      onChange={(e) => updateSearchFilter('axis', e.target.value)}
                      placeholder="Enter AXIS value..."
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                    <Input
                      label="Search Addition"
                      value={searchFilters.addition}
                      onChange={(e) => updateSearchFilter('addition', e.target.value)}
                      placeholder="Enter addition value..."
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                    <Select
                      label="Stock Status"
                      value={searchFilters.stockStatus}
                      onChange={(e) => updateSearchFilter('stockStatus', e.target.value)}
                      options={stockStatuses}
                    />
                  </div>

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
                Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredLenses.length}</span> of{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{lenses.length}</span> lenses
                {hasActiveFilters() && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">(filtered)</span>
                )}
                {/* FIXED: Error Summary - Only count regular lenses */}
                <span className="ml-4 text-red-600 dark:text-red-400">
                  • Total Errors: <span className="font-semibold">{errorStats.totalErrorQty}</span>
                  <span className="text-xs ml-1">({errorStats.lensesWithErrors} lenses affected)</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Debug: Force Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceRefreshLenses}
                  className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                  title="Force refresh lens data"
                  disabled={loading}
                >
                 <RefreshCcw  size={16} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Button>

                {/* NEW: Bulk Update Button - Only for admins */}
                {(isOwner || isAdminUser) && (
                  <BulkUpdateButton
                    onUpdateComplete={forceRefreshLenses}
                    userRole={isOwner ? 'owner' : 'admin'}
                    isAdmin={isAdminUser}
                  />
                )}
                
                {/* Export Excel Button */}
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                  title="Export to Excel"
                >
                  <FileSpreadsheet size={16} />
                  Export Excel
                </Button> */}
                
                {/* Add Lens Button - Available to staff and above */}
                {canAddLenses && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleAddLens}
                    className="flex items-center gap-2 transition-all duration-200 hover:scale-[0.98]"
                  >
                    <PlusCircle size={16} />
                    Add Lens
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
                data={filteredLenses}
                columns={lensColumns}
                filterKey="code"
                itemsPerPage={25}
                searchable={false}
                additionalFilters={[]}
              />
            </div>
          )}
        </div>

        {/* Modals and Dialogs */}
        {/* Form Modal - Available to staff and above */}
        {canAddLenses && (
          <FormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setEditingLens(null);
            }}
            title={editingLens ? 'Edit Lens' : 'Add Lens'}
          >
            <LensForm
              onSubmit={handleFormSubmit}
              initialData={editingLens || undefined}
              isSubmitting={isSubmitting}
            />
          </FormModal>
        )}

        {/* Delete Dialog - Only for owners and admins */}
        {canDeleteLenses && (
          <DeleteConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            itemName={lensToDelete?.code || ''}
            onDelete={confirmDelete}
          />
        )}

        {/* FIXED: Sell Dialogs with Better Z-Index and Scrolling */}
        {canManageLenses && (
          <>
            <SellItemDialog
              isOpen={sellDialogOpen}
              onClose={() => {
                setSellDialogOpen(false);
                setLensToSell(null);
              }}
              itemName={lensToSell?.code || ''}
              maxQuantity={lensToSell?.qty || 0}
              itemType={lensToSell?.type}
              leftQty={lensToSell?.leftQty || 0}
              rightQty={lensToSell?.rightQty || 0}
              onSell={confirmSell}
            />

            <SellBifocalDialog
              isOpen={sellBifocalDialogOpen}
              onClose={() => {
                setSellBifocalDialogOpen(false);
                setLensToSell(null);
              }}
              itemName={lensToSell?.code || ''}
              rightQty={lensToSell?.rightQty || 0}
              leftQty={lensToSell?.leftQty || 0}
              onSell={confirmBifocalSell}
            />
          </>
        )}

        {/* ENHANCED: Detail View Modal with Complete Measurements Display */}
        <FormModal
          isOpen={detailViewOpen}
          onClose={() => setDetailViewOpen(false)}
          title={selectedLens?.type === 'Yangon Order' 
            ? `Yangon Order Complete Measurements - ${selectedLens?.code}` 
            : `Enhanced Lens Details - ${selectedLens?.code || 'Unknown'}`
          }
          size="lg"
        >
          {selectedLens && (
            <EnhancedLensDetailView
              lens={selectedLens}
              onEdit={canEditLenses ? () => {
                setDetailViewOpen(false);
                handleEditLens(selectedLens);
              } : undefined}
              onSell={canManageLenses && selectedLens.type !== 'Error' && selectedLens.type !== 'SMS' && selectedLens.type !== 'Yangon Order' ? () => {
                setDetailViewOpen(false);
                handleSellLens(selectedLens);
              } : undefined}
              canEdit={canEditLenses}
              canSell={canManageLenses && selectedLens.type !== 'Error' && selectedLens.type !== 'SMS' && selectedLens.type !== 'Yangon Order'}
            />
          )}
        </FormModal>

        {/* Restock Dialog - For ALL lens types */}
        {canManageLenses && (
          <FormModal
            isOpen={restockDialogOpen}
            onClose={() => {
              setRestockDialogOpen(false);
              setLensToRestock(null);
            }}
            title={`Restock ${lensToRestock?.type || ''} Lens - ${lensToRestock?.code || ''}`}
          >
            <div className="space-y-4">
              {lensToRestock && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p><strong>Current Stock:</strong></p>
                    {/* Show different displays based on lens type */}
                    {((lensToRestock.type === 'Bifocal' && lensToRestock.bifocalType === 'Flattop') || 
                      (lensToRestock.type === 'SMS' && lensToRestock.smsBifocalType === 'Flattop')) ? (
                      <>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">Right Eye: {lensToRestock.rightQty || 0} pcs</span>
                          </div>
                          <div>
                            <span className="text-green-600 dark:text-green-400 font-medium">Left Eye: {lensToRestock.leftQty || 0} pcs</span>
                          </div>
                        </div>
                        <p className="mt-2"><strong>Total Remaining:</strong> {lensToRestock.qty || 0} pcs</p>
                      </>
                    ) : (
                      <p className="mt-2"><strong>Total Remaining:</strong> {lensToRestock.qty || 0} pcs</p>
                    )}
                  </div>
                </div>
              )}

              {/* Conditional input fields based on lens type */}
              {lensToRestock && ((lensToRestock.type === 'Bifocal' && lensToRestock.bifocalType === 'Flattop') || 
                               (lensToRestock.type === 'SMS' && lensToRestock.smsBifocalType === 'Flattop')) ? (
                // Flattop lenses: Show right/left inputs
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Right Eye Restock Quantity (ညာမျက်လုံး ပြန်ဖြည့်တင်း ပမာဏ)
                    </label>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={restockData.rightQty}
                      onChange={(e) => setRestockData({...restockData, rightQty: parseFloat(e.target.value) || 0})}
                      placeholder="စတင်တန်ဖိုး: 0.5, 1, 1.5, 2, 2.5..."
                      className="w-full"
                    />
                    {/* Quick selection buttons for Right eye */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">မြန်ရွေး:</span>
                      {[0.5, 1, 1.5, 2, 2.5].map((qty) => (
                        <button
                          key={`right-${qty}`}
                          type="button"
                          onClick={() => setRestockData({...restockData, rightQty: qty})}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            restockData.rightQty === qty 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-100 hover:border-blue-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Left Eye Restock Quantity (ဘယ်မျက်လုံး ပြန်ဖြည့်တင်း ပမာဏ)
                    </label>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={restockData.leftQty}
                      onChange={(e) => setRestockData({...restockData, leftQty: parseFloat(e.target.value) || 0})}
                      placeholder="စတင်တန်ဖိုး: 0.5, 1, 1.5, 2, 2.5..."
                      className="w-full"
                    />
                    {/* Quick selection buttons for Left eye */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">မြန်ရွေး:</span>
                      {[0.5, 1, 1.5, 2, 2.5].map((qty) => (
                        <button
                          key={`left-${qty}`}
                          type="button"
                          onClick={() => setRestockData({...restockData, leftQty: qty})}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            restockData.leftQty === qty 
                              ? 'bg-green-500 text-white border-green-500' 
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-green-100 hover:border-green-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // All other lens types: Show total quantity input
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Restock Quantity (စုစုပေါင်း ပြန်ဖြည့်တင်း ပမာဏ)
                  </label>
                  <Input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={restockData.totalQty}
                    onChange={(e) => setRestockData({...restockData, totalQty: parseFloat(e.target.value) || 0})}
                    placeholder="စတင်တန်ဖိုး: 0.5, 1, 1.5, 2, 2.5..."
                    className="w-full"
                  />
                  {/* Quick selection buttons for Total quantity */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">မြန်ရွေး:</span>
                    {[0.5, 1, 1.5, 2, 2.5].map((qty) => (
                      <button
                        key={`total-${qty}`}
                        type="button"
                        onClick={() => setRestockData({...restockData, totalQty: qty})}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          restockData.totalQty === qty 
                            ? 'bg-purple-500 text-white border-purple-500' 
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-purple-100 hover:border-purple-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Display - သတိပေးချက်များ ပြသခြင်း */}
              {restockWarning && (
                <div className={`p-4 rounded-lg border ${
                  restockWarning.includes('မည်းနေမည်') 
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
                    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {restockWarning.includes('မည်းনেমเม') ? '🚨' : '⚠️'}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        restockWarning.includes('မည်းနေမည်') 
                          ? 'text-red-800 dark:text-red-200' 
                          : 'text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {restockWarning}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRestockWarning(null)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Restock Reason (ပြန်ဖြည့်တင်း အကြောင်းရင်း)
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

              {/* Summary - Show different summaries based on lens type */}
              {lensToRestock && (
                ((lensToRestock.type === 'Bifocal' && lensToRestock.bifocalType === 'Flattop') || 
                 (lensToRestock.type === 'SMS' && lensToRestock.smsBifocalType === 'Flattop')) ? (
                  // Flattop lens summary
                  (restockData.rightQty > 0 || restockData.leftQty > 0) && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        Flattop Restock Summary:
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                        <div className="text-blue-700 dark:text-blue-300">
                          Right: +{restockData.rightQty} → {(lensToRestock?.rightQty || 0) + restockData.rightQty} pcs
                        </div>
                        <div className="text-green-700 dark:text-green-300">
                          Left: +{restockData.leftQty} → {(lensToRestock?.leftQty || 0) + restockData.leftQty} pcs
                        </div>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-2 font-medium">
                        Total: +{restockData.rightQty + restockData.leftQty} → {(lensToRestock?.qty || 0) + restockData.rightQty + restockData.leftQty} pcs
                      </p>
                    </div>
                  )
                ) : (
                  // Regular lens summary
                  restockData.totalQty > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        Restock Summary:
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-2 font-medium">
                        Total: +{restockData.totalQty} → {(lensToRestock?.qty || 0) + restockData.totalQty} pcs
                      </p>
                    </div>
                  )
                )
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRestockDialogOpen(false);
                    setLensToRestock(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={processRestock}
                  disabled={
                    isSubmitting || 
                    !restockData.reason ||
                    (lensToRestock && (
                      ((lensToRestock.type === 'Bifocal' && lensToRestock.bifocalType === 'Flattop') || 
                       (lensToRestock.type === 'SMS' && lensToRestock.smsBifocalType === 'Flattop')) 
                        ? (restockData.rightQty + restockData.leftQty) === 0
                        : restockData.totalQty === 0
                    ))
                  }
                  className="flex-1"
                >
                  {isSubmitting ? 'Processing...' : 
                    lensToRestock && (
                      ((lensToRestock.type === 'Bifocal' && lensToRestock.bifocalType === 'Flattop') || 
                       (lensToRestock.type === 'SMS' && lensToRestock.smsBifocalType === 'Flattop'))
                        ? `Restock +${restockData.rightQty + restockData.leftQty} pcs`
                        : `Restock +${restockData.totalQty} pcs`
                    )
                  }
                </Button>
              </div>
            </div>
          </FormModal>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sold Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.totalQty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.soldQty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.remainingQty <= 5 
                        ? 'bg-red-100 text-red-800' 
                        : item.remainingQty <= 10 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.remainingQty}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${item.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.remainingQty === 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.remainingQty === 0 ? 'Out of Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {stockItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No stock items found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LensPage;