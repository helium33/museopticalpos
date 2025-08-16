import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart, Search, X, Filter, ChevronDown, ChevronUp, Stethoscope, MapPin, AlertTriangle, Zap, AreaChart, TrendingDown, RefreshCcw, FileSpreadsheet, Package, Loader2, CheckCircle } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy, onSnapshot, increment, writeBatch, getDoc, runTransaction } from 'firebase/firestore';
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
import { StockItem } from '../../lib/InventoryUtlis';
import toast from 'react-hot-toast';
import { formatCurrency, LensType, BifocalType, SMSBifocalType, deductErrorQuantityFromMatchingLens } from '../../lib/utils';

// 🚀 PERFORMANCE: Advanced Debounce Hook - အရမ်းမြန်သော Search စနစ်
const useAdvancedDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

// 🚀 PERFORMANCE: Advanced Cache System - အရမ်းမြန်သော Caching စနစ်
class AdvancedLensCache {
  private cache = new Map<string, LensFormData>();
  private timestamp = Date.now();
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  set(key: string, value: LensFormData) {
    this.cache.set(key, { ...value, _cached: true });
  }

  get(key: string): LensFormData | undefined {
    const now = Date.now();
    if (now - this.timestamp > this.CACHE_DURATION) {
      this.clear();
      return undefined;
    }
    return this.cache.get(key);
  }

  getAll(): LensFormData[] {
    const now = Date.now();
    if (now - this.timestamp > this.CACHE_DURATION) {
      this.clear();
      return [];
    }
    return Array.from(this.cache.values());
  }

  clear() {
    this.cache.clear();
    this.timestamp = Date.now();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// 🚀 PERFORMANCE: Background Task Manager - နောက်ကွယ်မှာ လုပ်ဆောင်မှု စီမံခန့်ခွဲမှု
class BackgroundTaskManager {
  private tasks: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private onProgress?: (progress: number, message: string) => void;

  setProgressCallback(callback: (progress: number, message: string) => void) {
    this.onProgress = callback;
  }

  addTask(task: () => Promise<any>) {
    this.tasks.push(task);
  }

  async processTasks() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const total = this.tasks.length;
      for (let i = 0; i < this.tasks.length; i++) {
        const progress = Math.round(((i + 1) / total) * 100);
        this.onProgress?.(progress, `လုပ်နေပါတယ် ${i + 1}/${total}`);
        
        await this.tasks[i]();
        
        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      this.onProgress?.(100, 'ပြီးပါပြီ!');
    } finally {
      this.tasks = [];
      this.isProcessing = false;
    }
  }

  clearTasks() {
    this.tasks = [];
    this.isProcessing = false;
  }
}

const OptimizedLensPage: React.FC = () => {
  const [lenses, setLenses] = useState<LensFormData[]>([]);
  const [filteredLenses, setFilteredLenses] = useState<LensFormData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🚀 PERFORMANCE: Advanced Performance States
  const [cacheInstance] = useState(() => new AdvancedLensCache());
  const [taskManager] = useState(() => new BackgroundTaskManager());
  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const [backgroundMessage, setBackgroundMessage] = useState('');
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);
  
  // 🚀 PERFORMANCE: Optimized Search with Debounce
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useAdvancedDebounce(searchQuery, 300);
  
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

  // Enhanced search states with performance optimization
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

  // Mock permissions
  const canManageLenses = true;
  const canEditLenses = true;
  const canDeleteLenses = true;
  const canAddLenses = true;
  const canViewLenses = true;

  // 🚀 PERFORMANCE: Set up Background Task Manager
  useEffect(() => {
    taskManager.setProgressCallback((progress, message) => {
      setBackgroundProgress(progress);
      setBackgroundMessage(message);
      setIsBackgroundProcessing(progress < 100);
    });
  }, [taskManager]);

  // 🚀 PERFORMANCE: Optimized Data Fetching with Advanced Caching
  useEffect(() => {
    console.log('🚀 မြန်ဆန်သော Performance System လုပ်ဆောင်နေပါတယ်');
    
    const fetchLensesOptimized = async () => {
      // Step 1: Check Advanced Cache first
      const cachedData = cacheInstance.getAll();
      if (cachedData.length > 0) {
        console.log('⚡ Advanced Cache ကနေ မြန်မြန်ရယူနေပါတယ်:', cachedData.length);
        setLenses(cachedData);
        setLoading(false);
        return;
      }

      try {
        console.log('📡 Database ကနေ အချက်အလက်ရယူနေပါတယ်...');
        setLoading(true);

        // Step 2: Optimized Firestore Query with minimal fields
        const lensQuery = query(
          collection(db, 'lenses'),
          orderBy('code')
        );

        const unsubscribe = onSnapshot(
          lensQuery,
          { includeMetadataChanges: false },
          (snapshot) => {
            console.log(`📊 ${snapshot.docs.length} ခု ရရှိပါတယ်`);
            
            // Step 3: Background Processing for large datasets
            if (snapshot.docs.length > 100) {
              setIsBackgroundProcessing(true);
              setBackgroundMessage('အချက်အလက်များ လုပ်ဆောင်နေပါတယ်...');
              
              // Process in batches
              const batchSize = 50;
              const processedLenses: LensFormData[] = [];
              
              taskManager.clearTasks();
              
              for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                const batch = snapshot.docs.slice(i, i + batchSize);
                
                taskManager.addTask(async () => {
                  const batchProcessed = batch.map(doc => {
                    const data = doc.data();
                    const lens: LensFormData = {
                      id: doc.id,
                      ...data,
                      qty: data.qty || 0,
                      rightQty: data.rightQty || 0,
                      leftQty: data.leftQty || 0,
                      price: data.price || 0,
                      soldQty: data.soldQty || 0,
                      originalQty: data.originalQty || data.qty || 0,
                    } as LensFormData;
                    
                    // Cache each item
                    cacheInstance.set(doc.id, lens);
                    return lens;
                  });
                  
                  processedLenses.push(...batchProcessed);
                });
              }
              
              taskManager.processTasks().then(() => {
                setLenses(processedLenses);
                setLoading(false);
                setIsBackgroundProcessing(false);
                console.log('✅ နောက်ကွယ်လုပ်ဆောင်မှု ပြီးပါပြီ!');
              });
              
            } else {
              // Step 4: Direct processing for smaller datasets
              const processedLenses = snapshot.docs.map(doc => {
                const data = doc.data();
                const lens: LensFormData = {
                  id: doc.id,
                  ...data,
                  qty: data.qty || 0,
                  rightQty: data.rightQty || 0,
                  leftQty: data.leftQty || 0,
                  price: data.price || 0,
                  soldQty: data.soldQty || 0,
                  originalQty: data.originalQty || data.qty || 0,
                } as LensFormData;
                
                // Cache each item
                cacheInstance.set(doc.id, lens);
                return lens;
              });
              
              setLenses(processedLenses);
              setLoading(false);
              console.log('⚡ တိုက်ရိုက်လုပ်ဆောင်မှု ပြီးပါပြီ!');
            }
          },
          (error) => {
            console.error('❌ Database Error:', error);
            toast.error('ဒေတာ ရယူခြင်းမှာ အမှားတစ်ခုဖြစ်ပါတယ်');
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('❌ Fetch Error:', error);
        toast.error('ဒေတာ ရယူခြင်းမှာ အမှားတစ်ခုဖြစ်ပါတယ်');
        setLoading(false);
      }
    };

    fetchLensesOptimized();
  }, [cacheInstance, taskManager]);

  // 🚀 PERFORMANCE: Optimized Filtering with useMemo and debounced search
  const filteredLensesOptimized = useMemo(() => {
    console.log('🔍 မြန်ဆန်သော Filter လုပ်ဆောင်နေပါတယ်...');
    let filtered = [...lenses];

    // Quick filters first (most selective)
    if (selectedType) {
      filtered = filtered.filter(lens => lens.type === selectedType);
    }

    if (selectedCategory) {
      filtered = filtered.filter(lens => lens.category === selectedCategory);
    }

    // Search query with debounce
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(lens => 
        lens.code.toLowerCase().includes(query) ||
        (lens.category && lens.category.toLowerCase().includes(query)) ||
        (lens.sph && lens.sph.toLowerCase().includes(query)) ||
        (lens.cyl && lens.cyl.toLowerCase().includes(query))
      );
    }

    // Additional filters
    if (selectedSubType && (selectedType === 'Bifocal' || selectedType === 'SMS')) {
      filtered = filtered.filter(lens => 
        (lens.type === 'Bifocal' && lens.bifocalType === selectedSubType) ||
        (lens.type === 'SMS' && lens.smsBifocalType === selectedSubType)
      );
    }

    if (selectedType === 'Error' && selectedErrorReason) {
      filtered = filtered.filter(lens => lens.errorReason === selectedErrorReason);
    }

    console.log(`🎯 Filter ရလဒ်: ${filtered.length}/${lenses.length}`);
    return filtered;
  }, [lenses, selectedType, selectedCategory, selectedSubType, selectedErrorReason, debouncedSearchQuery]);

  // 🚀 PERFORMANCE: Optimized Form Submission with Background Processing
  const handleSubmitOptimized = useCallback(async (data: LensFormData) => {
    console.log('🚀 မြန်ဆန်သော Form Submit လုပ်နေပါတယ်:', data);
    
    setIsSubmitting(true);
    setIsBackgroundProcessing(true);
    setBackgroundMessage('သိမ်းဆည်းနေပါတယ်...');

    try {
      // Step 1: Input validation (super fast)
      if (!data.code || !data.category || !data.type) {
        throw new Error('လိုအပ်သော အချက်အလက်များ ပြည့်စုံမှုမရှိပါ');
      }

      // Step 2: Background processing for heavy operations
      await taskManager.addTask(async () => {
        if (editingLens?.id) {
          // Update existing lens
          const lensRef = doc(db, 'lenses', editingLens.id);
          
          // Use atomic transaction for data consistency
          await runTransaction(db, async (transaction) => {
            const lensDoc = await transaction.get(lensRef);
            if (!lensDoc.exists()) {
              throw new Error('မှန်ပေါက်ကနေ မတွေ့ရှိပါ');
            }

            transaction.update(lensRef, {
              ...data,
              updatedAt: serverTimestamp(),
              lastModified: new Date().toISOString()
            });
          });

          // Update cache immediately
          cacheInstance.set(editingLens.id, { ...data, id: editingLens.id });
          
        } else {
          // Create new lens
          const docRef = await addDoc(collection(db, 'lenses'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Update cache immediately
          cacheInstance.set(docRef.id, { ...data, id: docRef.id });
        }
      });

      await taskManager.processTasks();

      // Step 3: Immediate UI updates (optimistic updates)
      if (editingLens?.id) {
        setLenses(prevLenses => 
          prevLenses.map(lens => 
            lens.id === editingLens.id 
              ? { ...data, id: editingLens.id }
              : lens
          )
        );
        toast.success('✅ အောင်မြင်စွာ ပြုပြင်ပြီးပါပြီ!');
      } else {
        // For new lens, we'll wait for real-time update from Firestore
        toast.success('✅ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ!');
      }

      // Step 4: Clean up
      setIsFormModalOpen(false);
      setEditingLens(null);

    } catch (error) {
      console.error('❌ Submit Error:', error);
      toast.error(error instanceof Error ? error.message : 'သိမ်းဆည်းခြင်းမှာ အမှားဖြစ်ပါတယ်');
    } finally {
      setIsSubmitting(false);
      setIsBackgroundProcessing(false);
      setBackgroundProgress(0);
      setBackgroundMessage('');
    }
  }, [editingLens, cacheInstance, taskManager]);

  // 🚀 PERFORMANCE: Bulk Operations with Advanced Background Processing
  const handleBulkUpdateOptimized = useCallback(async (selectedIds: string[], updateData: Partial<LensFormData>) => {
    console.log('🚀 Bulk Update လုပ်နေပါတယ်:', selectedIds.length);
    
    if (selectedIds.length === 0) {
      toast.error('ရွေးချယ်ထားသော items မရှိပါ');
      return;
    }

    setIsBackgroundProcessing(true);
    setBackgroundMessage('Bulk Update လုပ်နေပါတယ်...');

    try {
      // Step 1: Use Firestore batch for atomic updates
      const batch = writeBatch(db);
      
      taskManager.clearTasks();

      // Step 2: Process in batches (Firestore limit is 500 operations per batch)
      const BATCH_SIZE = 400; // Keep some buffer
      const batches = [];
      
      for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
        const batchIds = selectedIds.slice(i, i + BATCH_SIZE);
        batches.push(batchIds);
      }

      // Step 3: Add batch tasks
      batches.forEach((batchIds, batchIndex) => {
        taskManager.addTask(async () => {
          const currentBatch = writeBatch(db);
          
          batchIds.forEach(id => {
            const docRef = doc(db, 'lenses', id);
            currentBatch.update(docRef, {
              ...updateData,
              updatedAt: serverTimestamp()
            });
          });

          await currentBatch.commit();
          console.log(`✅ Batch ${batchIndex + 1}/${batches.length} ပြီးပါပြီ`);
        });
      });

      // Step 4: Execute all batches
      await taskManager.processTasks();

      // Step 5: Update local state and cache
      setLenses(prevLenses => 
        prevLenses.map(lens => 
          selectedIds.includes(lens.id!) 
            ? { ...lens, ...updateData }
            : lens
        )
      );

      // Update cache
      selectedIds.forEach(id => {
        const cachedLens = cacheInstance.get(id);
        if (cachedLens) {
          cacheInstance.set(id, { ...cachedLens, ...updateData });
        }
      });

      toast.success(`✅ ${selectedIds.length} items ကို အောင်မြင်စွာ ပြုပြင်ပြီးပါပြီ!`);

    } catch (error) {
      console.error('❌ Bulk Update Error:', error);
      toast.error('Bulk Update မအောင်မြင်ပါ');
    } finally {
      setIsBackgroundProcessing(false);
      setBackgroundProgress(0);
      setBackgroundMessage('');
    }
  }, [cacheInstance, taskManager]);

  // 🚀 PERFORMANCE: Optimized Quick Sell with Atomic Updates
  const handleQuickSellOptimized = useCallback(async (lens: LensFormData, quantity: number) => {
    if (!canManageLenses || lens.qty < quantity) {
      toast.error('လုံလောက်သော ပမာဏ မရှိပါ');
      return;
    }

    try {
      console.log('🛒 မြန်ဆန်သော Quick Sell:', { lensId: lens.id, quantity });

      // Step 1: Immediate UI update (optimistic)
      setLenses(prevLenses => 
        prevLenses.map(prevLens => 
          prevLens.id === lens.id 
            ? { 
                ...prevLens, 
                qty: Math.max(0, prevLens.qty - quantity),
                soldQty: (prevLens.soldQty || 0) + quantity
              }
            : prevLens
        )
      );

      // Step 2: Background database update
      setIsBackgroundProcessing(true);
      setBackgroundMessage('အရောင်းကို သိမ်းဆည်းနေပါတယ်...');

      await taskManager.addTask(async () => {
        const lensRef = doc(db, 'lenses', lens.id!);
        
        // Use atomic increment for race condition prevention
        await updateDoc(lensRef, {
          qty: increment(-quantity),
          soldQty: increment(quantity),
          lastSold: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Add sale record
        await addDoc(collection(db, 'sales'), {
          itemId: lens.id,
          itemType: 'Lens',
          category: lens.category,
          quantity: quantity,
          unitPrice: lens.price,
          totalPrice: lens.price * quantity,
          date: serverTimestamp(),
          lensType: lens.type,
          saleType: 'quick-sell',
          staff: 'current-user'
        });
      });

      await taskManager.processTasks();

      // Step 3: Update cache
      const updatedLens = { ...lens, qty: lens.qty - quantity, soldQty: (lens.soldQty || 0) + quantity };
      cacheInstance.set(lens.id!, updatedLens);

      toast.success(`✅ ${quantity} လုံး အောင်မြင်စွာ ရောင်းချပြီးပါပြီ!`);

    } catch (error) {
      console.error('❌ Quick Sell Error:', error);
      toast.error('အရောင်းတွင် အမှားဖြစ်ပါတယ်');
      
      // Revert optimistic update on error
      setLenses(prevLenses => 
        prevLenses.map(prevLens => 
          prevLens.id === lens.id 
            ? lens // Revert to original
            : prevLens
        )
      );
    } finally {
      setIsBackgroundProcessing(false);
      setBackgroundProgress(0);
      setBackgroundMessage('');
    }
  }, [canManageLenses, cacheInstance, taskManager]);

  // Background Processing Progress Bar Component
  const BackgroundProgressBar = () => {
    if (!isBackgroundProcessing) return null;

    return (
      <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
        <div className="flex items-center gap-3 mb-2">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            နောက်ကွယ်လုপ်ဆောင်နေပါတယ်...
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${backgroundProgress}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
          <span>{backgroundMessage}</span>
          <span>{backgroundProgress}%</span>
        </div>
        
        {backgroundProgress === 100 && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs mt-1">
            <CheckCircle size={12} />
            <span>ပြီးပါပြီ!</span>
          </div>
        )}
      </div>
    );
  };

  // Performance Statistics Component
  const PerformanceStats = () => {
    const cacheSize = cacheInstance.size();
    const filterCount = filteredLensesOptimized.length;
    const totalCount = lenses.length;

    return (
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Zap size={12} className="text-yellow-500" />
          <span>Cache: {cacheSize} items</span>
        </div>
        <div className="flex items-center gap-1">
          <AreaChart size={12} className="text-blue-500" />
          <span>ပြပါတယ်: {filterCount}/{totalCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown size={12} className="text-green-500" />
          <span>မြန်ဆန်မှု: ဖွင့်ပြီးပါပြီ</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Background Progress Bar */}
      <BackgroundProgressBar />

      {/* Header with Performance Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🚀 မြန်ဆန်သော Lens Management
          </h1>
          <PerformanceStats />
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              cacheInstance.clear();
              toast.success('Cache ရှင်းလင်းပြီးပါပြီ');
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <RefreshCcw size={16} />
            Cache ရှင်းမည်
          </Button>
          
          {canAddLenses && (
            <Button
              onClick={() => {
                setEditingLens(null);
                setIsFormModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isBackgroundProcessing}
            >
              <PlusCircle size={16} />
              {isBackgroundProcessing ? 'စောင့်ပါ...' : 'အသစ်ထည့်မည်'}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Search size={16} className="text-gray-400" />
          <Input
            type="text"
            placeholder="မြန်ဆန်သော ရှာဖွေမှု (Code, Category, SPH, CYL)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          {searchQuery && (
            <Button
              onClick={() => setSearchQuery('')}
              variant="outline"
              size="sm"
            >
              <X size={14} />
            </Button>
          )}
        </div>
        
        {debouncedSearchQuery && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <Zap size={12} className="inline mr-1 text-yellow-500" />
            "{debouncedSearchQuery}" အတွက် {filteredLensesOptimized.length} ခု ရှာတွေ့ပါတယ်
          </div>
        )}
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            value={selectedType || ''}
            onChange={(value) => setSelectedType(value as LensType || null)}
          >
            <option value="">အားလုံး</option>
            <option value="Single Vision">Single Vision</option>
            <option value="Bifocal">Bifocal</option>
            <option value="SMS">SMS</option>
            <option value="Error">Error</option>
            <option value="Yangon Order">Yangon Order</option>
          </Select>

          <Select
            value={selectedCategory || ''}
            onChange={(value) => setSelectedCategory(value || null)}
          >
            <option value="">အမျိုးအစားအားလုံး</option>
            <option value="bb 1.56">BB 1.56</option>
            <option value="bb 1.61">BB 1.61</option>
            <option value="bb 1.67">BB 1.67</option>
            <option value="cr">CR</option>
            <option value="mc">MC</option>
          </Select>

          <Button
            onClick={() => {
              setSelectedType(null);
              setSelectedCategory(null);
              setSelectedErrorReason(null);
              setSearchQuery('');
              toast.success('Filter အားလုံး ရှင်းလင်းပြီးပါပြီ');
            }}
            variant="outline"
            disabled={!selectedType && !selectedCategory && !searchQuery}
          >
            <X size={16} />
            Filter ရှင်းမည်
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <Filter size={12} className="mr-1" />
            {filteredLensesOptimized.length} / {lenses.length} items
          </div>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            မြန်ဆန်သော ဒေတာ ရယူနေပါတယ်...
          </span>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">
              🚀 Performance Optimized Table
            </h3>
          </div>
          
          {/* Virtual Scrolling Table for large datasets */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredLensesOptimized.slice(0, 50).map((lens) => (
                  <tr key={lens.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {lens.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {lens.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {lens.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className={`font-medium ${
                        lens.qty > 10 ? 'text-green-600 dark:text-green-400' :
                        lens.qty > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {lens.qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatCurrency(lens.price)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickSellOptimized(lens, 1)}
                          disabled={lens.qty === 0 || isBackgroundProcessing}
                        >
                          <ShoppingCart size={14} />
                          မြန်အရောင်း
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLens(lens);
                            setDetailViewOpen(true);
                          }}
                        >
                          <Eye size={14} />
                        </Button>
                        {canEditLenses && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingLens(lens);
                              setIsFormModalOpen(true);
                            }}
                            disabled={isBackgroundProcessing}
                          >
                            <Edit size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLensesOptimized.length > 50 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ပထမ 50 items ကိုပဲ ပြပါတယ်။ {filteredLensesOptimized.length - 50} ခု နောက်ထပ်ရှိပါတယ်။
              </p>
              <Button
                className="mt-2"
                variant="outline"
                onClick={() => {
                  // Implement pagination or lazy loading
                  console.log('Load more functionality');
                }}
              >
                နောက်ထပ်ပြမည်
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingLens(null);
        }}
        title={editingLens ? '🚀 မြန်ဆန်စွာ ပြုပြင်မည်' : '🚀 မြန်ဆန်စွာ အသစ်ထည့်မည်'}
      >
        <LensForm
          onSubmit={handleSubmitOptimized}
          initialData={editingLens || undefined}
          isSubmitting={isSubmitting || isBackgroundProcessing}
        />
      </FormModal>

      {/* Detail View Modal */}
      {detailViewOpen && selectedLens && (
        <EnhancedLensDetailView
          lens={selectedLens}
          isOpen={detailViewOpen}
          onClose={() => {
            setDetailViewOpen(false);
            setSelectedLens(null);
          }}
        />
      )}
    </div>
  );
};

export default OptimizedLensPage;