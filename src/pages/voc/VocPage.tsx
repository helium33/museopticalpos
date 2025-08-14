import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import VocForm from '../../components/voc/VocForm';
import VocEditForm from '../../components/voc/VocEditForm';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/ui/Button';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import FormModal from '../../components/modals/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import VocDetailModal from '../..//components/ui/VocDetailView';
import { FileDown, Trash2, Edit, RefreshCw, FileSpreadsheet, Circle, ChevronDown, ChevronUp, DollarSign, Calendar, TrendingUp, FileText, Eye, AlertTriangle, RotateCcw } from 'lucide-react';
import { 
  formatCurrency, 
  exportToExcel, 
  exportToGoogleSheets,
  PaymentMethod, 
  VocItem, 
  ItemType,
  formatYuan,
  trackItemHistory,
} from '../../lib/utils';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isValid, subDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import ExportModal from '../../components/ui/ExportModal';
import DataDisplay from '../../components//tables/DataDisplay';
import { useAuth } from '../../context/AuthContext';
import { updateCompleteInventoryForVOC, returnLensInventoryForVOC } from '../../lib/InventoryUtlis';
import { VocData } from '../../type/Vocerror';
import { returnInventoryForVoc } from '../../lib/InventoryCalculation';

interface RefundData {
  amount: number;
  reason: string;
  date: Date;
}
interface VocPageProps {
  vocs: VocData[];
  onCreateVoc: (vocData: VocData) => void;
  onUpdateVoc: (vocData: VocData) => void;
  onDeleteVoc: (vocNumber: string) => void;
}

interface ReturnToInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (returnToInventory: boolean) => void;
  vocItems: VocItem[];
}

interface MonthlyTotals {
  cash: number;
  kpay: number;
  yuanActual: number;
  deposit: number;
  remainingBalance: number;
  total: number;
}

interface PeriodTotals {
  cash: number;
  kpay: number;
  yuanActual: number;
  deposit: number;
  remainingBalance: number;
  total: number;
}

interface YuanTotals {
  actualYuan: number;
}

// Replace the ReturnToInventoryModal component with this enhanced version
interface ReturnToInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (returnToInventory: boolean, quantities?: Record<string, number>) => void;
  vocItems: VocItem[];
}

const ERROR_CATEGORIES = [
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
];

const ReturnToInventoryModal: React.FC<ReturnToInventoryModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  vocItems 
}) => {
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  
  useEffect(() => {
    // Initialize return quantities with full quantities
    const initialQuantities = vocItems.reduce((acc, item) => {
      acc[item.id || `temp-${Math.random().toString(36).substring(2, 9)}`] = item.quantity;
      return acc;
    }, {} as Record<string, number>);
    setReturnQuantities(initialQuantities);
  }, [vocItems]);

  if (!isOpen) return null;
  
  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const maxQuantity = vocItems.find(i => i.id === itemId)?.quantity || 0;
    
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(numValue, maxQuantity))
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl max-h-[80vh] overflow-auto">
        <h2 className="text-xl font-semibold mb-4">Return Items to Inventory?</h2>
        
        <div className="mb-6">
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Select quantities to return to inventory:
          </p>
          
          <div className="space-y-3">
            {vocItems.map((item, index) => {
              const itemId = item.id || `temp-${index}`;
              return (
                <div key={itemId} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      Original Qty: {item.quantity}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 dark:text-gray-300">
                      Return Qty:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={returnQuantities[itemId] || 0}
                      onChange={(e) => handleQuantityChange(itemId, e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-xs text-gray-500">
                      (Max: {item.quantity})
                    </span>
                  </div>
                  
                  {item.type === 'Lens' && (
                    <div className="text-xs text-gray-500 mt-2">
                      <p>SPH: {item.details?.sph || '-'} | CYL: {item.details?.cyl || '-'} | AXIS: {item.details?.axis || '-'}</p>
                      {item.details?.addition && <p>Addition: {item.details.addition}</p>}
                      {item.category && (
                        <p className="text-green-600 font-medium">Category: {item.category}</p>
                      )}
                      {item.brand && (
                        <p className="text-purple-600">Brand: {item.brand}</p>
                      )}
                      {typeof item.index !== 'undefined' && (
                        <p className="text-indigo-600">Index: {item.index}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => onConfirm(false)}
          >
            Delete Without Returning
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => onConfirm(true, returnQuantities)}
          >
            Return Selected to Inventory
          </Button>
        </div>
      </div>
    </div>
  );
};
        
const VocPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  const { user, userRole } = useAuth();
  const [vocs, setVocs] = useState<any[]>([]);
  const [paidVocs, setPaidVocs] = useState<any[]>([]);
  const [depositVocs, setDepositVocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vocToDelete, setVocToDelete] = useState<any>(null);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editingVoc, setEditingVoc] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [totalAmount, setTotalAmount] = useState(0);
  const [cashTotal, setCashTotal] = useState(0);
  const [kpayTotal, setKpayTotal] = useState(0);
  const [yuanTotals, setYuanTotals] = useState<YuanTotals>({ actualYuan: 0 });
  const [depositTotal, setDepositTotal] = useState(0);
  const [remainingBalanceTotal, setRemainingBalanceTotal] = useState(0);
  const [isFullPayment, setIsFullPayment] = useState(false);
  
  // VOC Detail Modal State
  const [selectedVocForDetail, setSelectedVocForDetail] = useState<VocData | null>(null);
  const [vocDetailModalOpen, setVocDetailModalOpen] = useState(false);
  
  // Enhanced date filtering state - Initialize with today
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'>('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'deposit'>('all');
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [selectedVoc, setSelectedVoc] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showSalesSummary, setShowSalesSummary] = useState(true);
  const [showMonthlyTotals, setShowMonthlyTotals] = useState(true);
  const [returnToInventoryModalOpen, setReturnToInventoryModalOpen] = useState(false);
  const [editVocModalOpen, setEditVocModalOpen] = useState(false);
  const [vocToEdit, setVocToEdit] = useState<string | null>(null);
  
  // UPDATED: Separate period and monthly totals
  const [periodTotals, setPeriodTotals] = useState<PeriodTotals>({
    cash: 0,
    kpay: 0,
    yuanActual: 0,
    deposit: 0,
    remainingBalance: 0,
    total: 0
  });
  
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals>({
    cash: 0,
    kpay: 0,
    yuanActual: 0,
    deposit: 0,
    remainingBalance: 0,
    total: 0
  });

  const [salesByCategory, setSalesByCategory] = useState({
    lens: {} as Record<string, number>,
    frame: {} as Record<string, { [color: string]: number }>,
    accessories: 0,
    contactLenses: {} as Record<string, number>
  });

  // Permission checks
  const isAdmin = 
    user?.email?.includes('admin') || 
    user?.role === 'admin' || 
    user?.email === 'helium33hl@gmail.com' ||
    user?.email === 'kyawwinhtun564@gmail.com' ||
    user?.email === 'wpy.muse@gmail.com';
  const isOwner = user?.email === 'yannaing190792@gmail.com';
  const isWinStoreReadOnly = user?.email === 'winstore1717@gmail.com';
  
  // Store-specific email access control
  const getStoreSpecificEmail = (currentStore: string): string | null => {
    switch (currentStore?.toLowerCase()) {
      case 'win':
        return 'winvision1717@gmail.com';
      case 'pwint':
        return 'pwintoptical@gmail.com';
      case 'yangon':
        return 'ygnoptical@gmail.com';
      default:
        return null;
    }
  };

  // Check if current user can access this store's VOC page
  const canAccessStoreVOC = (): boolean => {
    if (!store) return false;
    
    // Owner and admin can access all stores
    if (isOwner || isAdmin) return true;
    
    // winstore1717@gmail.com can see all VOCs for any store
    if (user?.email === 'winstore1717@gmail.com') return true;

    // Store-specific staff can only access their assigned store
    const storeEmail = getStoreSpecificEmail(store);
    return user?.email === storeEmail;
  };

  // FIXED: Updated filtering logic to properly handle admin-created/edited VOCs
  const filterVOCsByStoreAccess = (vocData: any[]): any[] => {
    if (!store) return [];

    // Owner and admin can see all VOCs for the store
    if (isOwner || isAdmin) return vocData;

    // winstore1717@gmail.com can see all VOCs for any store
    if (user?.email === 'winstore1717@gmail.com') return vocData;

    // For store-specific staff, show VOCs based on store assignment
    // This includes VOCs created by them OR VOCs for their store (regardless of who created/edited them)
    const storeEmail = getStoreSpecificEmail(store);
    
    if (user?.email === storeEmail) {
      // Show all VOCs for this store - this ensures staff can see VOCs even after admin edits
      return vocData.filter(voc => {
        // Always show VOCs that belong to this store
        if (voc.store === store) {
          return true;
        }
        
        // Fallback: show VOCs created by this staff member
        return voc.staffEmail === user.email;
      });
    }

    // For specific email cases with additional filtering
    if (user?.email === 'ygnoptical@gmail.com') {
      return vocData.filter(voc => {
        // Show VOCs for Yangon store OR created by this user
        return voc.store === 'yangon' || 
               (voc.staffEmail === 'ygnoptical@gmail.com' && 
                (!voc.addedBy || voc.addedBy === 'ygnoptical@gmail.com'));
      });
    }

    // Default: no access
    return [];
  };

  // Staff can see daily sales, but only admin/owner can see monthly sales
  const canViewDailySales = canAccessStoreVOC(); // Only if user can access this store
  const canViewMonthlySales = isAdmin || isOwner; // Only admin/owner can see monthly sales

  // Calculate date range based on selection
  const getDateRange = () => {
    const today = new Date();
    
    switch (dateRange) {
      case 'today':
        return {
          start: startOfDay(today),
          end: endOfDay(today)
        };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        };
      case 'last7days':
        return {
          start: startOfDay(subDays(today, 6)), // Last 7 days including today
          end: endOfDay(today)
        };
      case 'last30days':
        return {
          start: startOfDay(subDays(today, 29)), // Last 30 days including today
          end: endOfDay(today)
        };
      case 'custom':
        try {
          const start = parseISO(startDate);
          const end = parseISO(endDate);
          
          if (!isValid(start) || !isValid(end)) {
            console.error('Invalid custom date range');
            return {
              start: startOfDay(today),
              end: endOfDay(today)
            };
          }
          
          return {
            start: startOfDay(start),
            end: endOfDay(end)
          };
        } catch (error) {
          console.error('Error parsing custom dates:', error);
          return {
            start: startOfDay(today),
            end: endOfDay(today)
          };
        }
      default:
        return {
          start: startOfDay(today),
          end: endOfDay(today)
        };
    }
  };

  // Get display text for current date range
  const getDateRangeText = () => {
    const { start, end } = getDateRange();

    // If custom, last7days, or last30days, always show full date range
    if (dateRange === 'custom' || dateRange === 'last7days' || dateRange === 'last30days') {
      return `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`;
    }

    // For today/yesterday, show only that date
    switch (dateRange) {
      case 'today':
        return `Today (${format(start, 'MMM dd, yyyy')})`;
      case 'yesterday':
        return `Yesterday (${format(start, 'MMM dd, yyyy')})`;
      default:
        return `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`;
    }
  };

  // Convert Firebase VOC data to VocData format for detail modal
  const convertToVocData = (firebaseVoc: any): VocData => {
    return {
      id: firebaseVoc.id,
      vocNumber: firebaseVoc.vocNumber || '',
      customerName: firebaseVoc.customerName || '',
      customerAge: firebaseVoc.customerAge,
      customerPhone: firebaseVoc.customerPhone,
      customerGender: firebaseVoc.customerGender,
      date: firebaseVoc.createdAt ? format(firebaseVoc.createdAt, 'yyyy-MM-dd') : '',
      store: firebaseVoc.store || '',
      paymentMethod: firebaseVoc.paymentMethod,
      items: firebaseVoc.items || [],
      discount: firebaseVoc.discount || 0,
      deposit: firebaseVoc.depositAmount || 0,
      refundAmount: firebaseVoc.refund?.amount || 0,
      notes: firebaseVoc.notes || '',
      isError: firebaseVoc.hasErrors || false,
      errorStore: firebaseVoc.errorStore,
      errorCategory: firebaseVoc.errorCategory,
      errorDescription: firebaseVoc.errorDescription,
      totalErrorQuantity: firebaseVoc.totalErrorQuantity || 0,
      errorInfo: firebaseVoc.errorInfo
    };
  };

  // Handle VOC detail view
  const handleViewVocDetail = (voc: any) => {
    const vocData = convertToVocData(voc);
    setSelectedVocForDetail(vocData);
    setVocDetailModalOpen(true);
  };

  // Initialize data fetching
  useEffect(() => {
    if (store && canAccessStoreVOC()) {
      fetchVocs();
    }
  }, [store, user?.email]); // Only run when store or user changes initially

  // Separate effect for date range changes
  useEffect(() => {
    if (store && canAccessStoreVOC()) {
      fetchVocs();
      if (canViewMonthlySales) {
        fetchMonthlyTotals();
      }
    }
  }, [dateRange, startDate, endDate]); // Run when date filters change

  // Separate effect for monthly totals
  useEffect(() => {
    if (store && canViewMonthlySales && canAccessStoreVOC()) {
      fetchMonthlyTotals();
    }
  }, [store, canViewMonthlySales, user?.email]); // Only run when these specific dependencies change

  // FIXED: Calculate totals with proper error quantity handling - ERROR QUANTITIES ARE FREE
  const calculateTotals = (vocData: any[]) => {
    let cash = 0;
    let kpay = 0;
    let yuanActualTotal = 0;
    let deposit = 0;
    let remainingBalance = 0;
    let total = 0;
    let totalRefunds = 0;

    vocData.forEach(voc => {
      const discountAmount = voc.discount || 0;
      
      // CRITICAL FIX: Calculate total based on sold quantities only (excluding error quantities)
      let calculatedTotal = 0;
      if (voc.items && Array.isArray(voc.items)) {
        calculatedTotal = voc.items.reduce((sum: number, item: any) => {
          if (item.isFOC) return sum; // FOC items don't contribute to total
          
          // Only sold quantity gets priced - error quantities are FREE
          const soldQuantity = item.quantity - (item.errorQuantity || 0);
          const itemTotal = item.customTotal || (item.price * soldQuantity);
          const itemDiscount = item.itemDiscount || 0;
          
          return sum + Math.max(itemTotal - itemDiscount, 0);
        }, 0);
      } else {
        // Fallback to stored total amount if items not available
        calculatedTotal = voc.totalAmount || 0;
      }
      
      const finalTotal = Math.max(calculatedTotal - discountAmount, 0);
      total += finalTotal;
      
      // Track refunds
      if (voc.refund && voc.refund.amount) {
        totalRefunds += voc.refund.amount;
      }
      
      // CRITICAL FIX: Calculate payment method totals with proper deposit handling
      if (voc.paymentType === 'Deposit') {
        const depositAmount = voc.depositAmount || 0;
        const balance = voc.balance || 0;
        
        // Add deposit amount to deposit total
        deposit += depositAmount;
        
        // Add remaining balance to remaining balance total
        remainingBalance += balance;
        
        // Add deposit to appropriate payment method total
        if (voc.paymentMethod === 'Cash') {
          cash += depositAmount;
        } else if (voc.paymentMethod === 'KPay') {
          kpay += depositAmount;
        } else if (voc.paymentMethod === 'Yuan') {
          yuanActualTotal += (voc.yuanAmount || 0);
          if (voc.mmkAmount) {
            cash += voc.mmkAmount;
          }
        } else if (voc.paymentMethod === 'Cash+KPay') {
          cash += (voc.cashAmount || 0);
          kpay += (voc.kpayAmount || 0);
        } else if (voc.paymentMethod === 'Cash+Yuan') {
          cash += (voc.cashAmount || 0);
          yuanActualTotal += (voc.yuanAmount || 0);
        } else if (voc.paymentMethod === 'Yuan+KPay') {
          yuanActualTotal += (voc.yuanAmount || 0);
          kpay += (voc.kpayAmount || 0);
        }
      } else {
        // Full payment handling
        if (voc.paymentMethod === 'Cash') {
          cash += finalTotal;
        } else if (voc.paymentMethod === 'KPay') {
          kpay += finalTotal;
        } else if (voc.paymentMethod === 'Yuan') {
          yuanActualTotal += (voc.yuanAmount || 0);
          if (voc.mmkAmount) {
            cash += voc.mmkAmount;
          }
        } else if (voc.paymentMethod === 'Cash+KPay') {
          cash += (voc.cashAmount || 0);
          kpay += (voc.kpayAmount || 0);
        } else if (voc.paymentMethod === 'Cash+Yuan') {
          cash += (voc.cashAmount || 0);
          yuanActualTotal += (voc.yuanAmount || 0);
        } else if (voc.paymentMethod === 'Yuan+KPay') {
          yuanActualTotal += (voc.yuanAmount || 0);
          kpay += (voc.kpayAmount || 0);
        }
      }
    });

    // Deduct refunds from cash only
    const finalCashTotal = cash - totalRefunds;

    return {
      cash: finalCashTotal,
      kpay,
      yuanActual: yuanActualTotal,
      deposit,
      remainingBalance,
      total
    };
  };

  const fetchMonthlyTotals = async () => {
    if (!canViewMonthlySales || !canAccessStoreVOC()) return;
    
    try {
      // Use current date range for monthly totals calculation
      const { start: currentStart } = getDateRange();
      const startDate = startOfMonth(currentStart);
      const endDate = endOfMonth(currentStart);
      
      let monthlyQuery = query(
        collection(db, 'vouchers'),
        where('store', '==', store),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(monthlyQuery);
      let monthlyVocData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      // Apply store-specific filtering
      monthlyVocData = filterVOCsByStoreAccess(monthlyVocData);

      const monthlyCalculatedTotals = calculateTotals(monthlyVocData);
      setMonthlyTotals(monthlyCalculatedTotals);
    } catch (error) {
      console.error('Error fetching monthly totals:', error);
      toast.error('Failed to fetch monthly totals');
    }
  };

  const fetchVocs = async () => {
    if (!canAccessStoreVOC()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get the correct date range
      const { start: queryStart, end: queryEnd } = getDateRange();
      
      console.log('Fetching VOCs for date range:', {
        dateRange,
        start: format(queryStart, 'yyyy-MM-dd HH:mm:ss'),
        end: format(queryEnd, 'yyyy-MM-dd HH:mm:ss'),
        startDate,
        endDate
      });
      
      let vocQuery = query(
        collection(db, 'vouchers'),
        where('store', '==', store),
        where('createdAt', '>=', queryStart),
        where('createdAt', '<=', queryEnd),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(vocQuery);
      let vocData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      console.log(`Found ${vocData.length} VOCs before filtering`);

      // Apply store-specific filtering
      vocData = filterVOCsByStoreAccess(vocData);

      console.log(`Found ${vocData.length} VOCs after filtering`);

      const paid = vocData.filter(voc => 
        voc.paymentType === 'Full' || 
        (voc.depositAmount && voc.depositAmount >= voc.totalAmount)
      );
      
      const deposits = vocData.filter(voc => 
        voc.paymentType === 'Deposit' && 
        (!voc.depositAmount || voc.depositAmount < voc.totalAmount)
      );

      setPaidVocs(paid);
      setDepositVocs(deposits);
      setVocs(vocData);

      // Calculate period totals
      const periodCalculatedTotals = calculateTotals(vocData);
      setPeriodTotals(periodCalculatedTotals);

      // Set legacy state for backward compatibility
      setTotalAmount(periodCalculatedTotals.total);
      setCashTotal(periodCalculatedTotals.cash);
      setKpayTotal(periodCalculatedTotals.kpay);
      setYuanTotals({ actualYuan: periodCalculatedTotals.yuanActual });
      setDepositTotal(periodCalculatedTotals.deposit);
      setRemainingBalanceTotal(periodCalculatedTotals.remainingBalance);

      // Calculate sales by category
      const salesTracker = {
        lens: {} as Record<string, number>,
        frame: {} as Record<string, { [color: string]: number }>,
        accessories: 0,
        contactLenses: {} as Record<string, number>
      };

      vocData.forEach(voc => {
        voc.items.forEach((item: any) => {
          if (item.type === 'Lens') {
            salesTracker.lens[item.category] = (salesTracker.lens[item.category] || 0) + item.quantity;
          } else if (item.type === 'Frame') {
            const category = item.category || 'Unknown';
            
            if (!salesTracker.frame[category]) {
              salesTracker.frame[category] = {};
            }
            
            const color = item.details?.color || 'Unknown';
            salesTracker.frame[category][color] = (salesTracker.frame[category][color] || 0) + item.quantity;
          } else if (item.type === 'Accessories') {
            salesTracker.accessories += item.quantity;
          } else if (item.type === 'Contact Lens') {
            salesTracker.contactLenses[item.category || 'Unknown'] = 
              (salesTracker.contactLenses[item.category || 'Unknown'] || 0) + item.quantity;
          }
        });
      });

      setSalesByCategory(salesTracker);
    } catch (error) {
      console.error('Error fetching VOCs:', error);
      toast.error('Failed to fetch VOCs');
    } finally {
      setLoading(false);
    }
  };

 const handleDeleteVoc = (voc: any) => {
  if (!isAdmin && !isOwner) {
    toast.error('Only admins can delete VOCs');
    return;
  }
  if (!voc || !voc.id) {
    toast.error('Failed to delete: Invalid VOC data');
    return;
  }
  
  // Ensure items have IDs
  const vocWithIds = {
    ...voc,
    items: voc.items.map((item: any) => ({
      ...item,
      id: item.id || `temp-${Math.random().toString(36).substring(2, 9)}`
    }))
  };
  
  setVocToDelete(vocWithIds);
  setReturnToInventoryModalOpen(true);
};

  const handleEditVoc = (vocId: string) => {
    if (!isAdmin && !isOwner) {
      toast.error('Only admins can edit VOCs');
      return;
    }
    setVocToEdit(vocId);
    setEditVocModalOpen(true);
  };

  // CRITICAL: Handle return to inventory without deleting VOC
  const handleReturnToInventory = async (voc: any) => {
    if (!isAdmin && !isOwner) {
      toast.error('Only admins can return items to inventory');
      return;
    }
    
    if (!voc || !voc.id) {
      toast.error('Failed to return: Invalid VOC data');
      return;
    }

    if (!voc.items || voc.items.length === 0) {
      toast.error('No items to return to inventory');
      return;
    }

    const confirmMessage = `Return all items from VOC ${voc.vocNumber} to inventory?\n\nThis will restore both sold and error quantities to inventory.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('🔄 Starting return to inventory for VOC:', voc.vocNumber);
      
      // Use the returnInventoryForVOC function
      const { returnInventoryForVOC } = await import('../../lib/InventoryUtlis');
      const result = await returnInventoryForVOC(voc.items);
      
      if (result.success) {
        toast.success(`Successfully returned ${result.successCount} items from VOC ${voc.vocNumber} to inventory`);
        console.log(`✅ Return successful for VOC ${voc.vocNumber}:`, {
          successCount: result.successCount,
          totalItems: voc.items.length
        });
        
        // Refresh the VOC list to show updated data
        await fetchVocs();
        if (canViewMonthlySales) {
          await fetchMonthlyTotals();
        }
      } else {
        toast.error(`Failed to return items to inventory: ${result.errors.join(', ')}`);
        console.error(`❌ Return failed for VOC ${voc.vocNumber}:`, result.errors);
      }
    } catch (error) {
      console.error('Error returning items to inventory:', error);
      toast.error(`Error returning items to inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
const handleConfirmDelete = async (returnToInventory: boolean, returnQuantities?: Record<string, number>) => {
  if (!vocToDelete?.id) return;

  try {
    // Track the deletion in history
    await trackItemHistory({
      itemId: vocToDelete.id,
      itemType: 'voc',
      itemName: vocToDelete.vocNumber,
      itemCode: vocToDelete.vocNumber,
      action: 'delete',
      changes: [
        {
          field: 'status',
          oldValue: 'active',
          newValue: 'deleted'
        },
        {
          field: 'total_amount',
          oldValue: formatCurrency(vocToDelete.totalAmount),
          newValue: '0'
        }
      ],
      store: store || '',
      staffEmail: user?.email || 'unknown',
      totalQty: vocToDelete.items.reduce((sum: number, item: VocItem) => sum + item.quantity, 0)
    });

    if (returnToInventory && returnQuantities) {
      console.log('🔄 Returning selected items to inventory...');
      
      // Filter out items with 0 return quantity
      const itemsToReturn = vocToDelete.items.filter(item => {
        const itemId = item.id || `temp-${vocToDelete.items.indexOf(item)}`;
        return (returnQuantities[itemId] || 0) > 0;
      });

      if (itemsToReturn.length > 0) {
        // Return lens inventory (handles both sold and error quantities)
        const lensReturnResult = await returnLensInventoryForVOC(
          itemsToReturn.filter(item => item.type === 'Lens'),
          returnQuantities
        );
        
        if (lensReturnResult.success) {
          console.log(`✅ Successfully returned ${lensReturnResult.successCount} lens items to inventory`);
        } else {
          console.warn(`⚠️ Lens return partially failed: ${lensReturnResult.errors.join(', ')}`);
        }

        // Handle other item types (frames, accessories, contact lenses)
        for (const item of itemsToReturn) {
          if (item.type === 'Lens' || item.isFOC) continue; // Lenses handled, FOC items don't affect stock

          const itemId = item.id || `temp-${vocToDelete.items.indexOf(item)}`;
          const quantityToReturn = returnQuantities[itemId] || 0;
          if (quantityToReturn <= 0) continue;

          const collectionName = getCollectionNameByItemType(item.type);
          if (!collectionName) continue;

          const itemRef = doc(db, collectionName, item.id);
          const itemDoc = await getDoc(itemRef);

          if (itemDoc.exists()) {
            const currentQty = itemDoc.data().qty || 0;
            const currentSoldQty = itemDoc.data().soldQty || 0;
            const currentErrorQty = itemDoc.data().errorQty || 0;

            // Calculate how much of the return quantity was sold vs error
            const originalErrorQty = item.errorQuantity || 0;
            const originalSoldQty = item.quantity - originalErrorQty;
            
            // Proportionally return sold and error quantities
            const errorQtyToReturn = Math.min(quantityToReturn, originalErrorQty);
            const soldQtyToReturn = quantityToReturn - errorQtyToReturn;

            const newQty = currentQty + quantityToReturn;
            const newSoldQty = Math.max(0, currentSoldQty - soldQtyToReturn);
            const newErrorQty = Math.max(0, currentErrorQty - errorQtyToReturn);

            await updateDoc(itemRef, {
              qty: newQty,
              soldQty: newSoldQty,
              errorQty: newErrorQty,
              updatedAt: serverTimestamp(),
            });

            await trackItemHistory({
              itemId: item.id,
              itemType: item.type as ItemType,
              itemName: item.name,
              itemCode: item.id,
              action: 'return',
              changes: [
                {
                  field: 'qty',
                  oldValue: String(currentQty),
                  newValue: String(newQty)
                },
                {
                  field: 'soldQty',
                  oldValue: String(currentSoldQty),
                  newValue: String(newSoldQty)
                },
                {
                  field: 'errorQty',
                  oldValue: String(currentErrorQty),
                  newValue: String(newErrorQty)
                }
              ],
              store: store || '',
              staffEmail: user?.email || 'unknown',
              totalQty: newQty
            });
            
            console.log(`✅ Returned ${quantityToReturn} ${item.name} (${soldQtyToReturn} sold + ${errorQtyToReturn} error) to inventory`);
          }
        }
      }
      
      // Show success message
      const totalReturned = Object.values(returnQuantities).reduce((sum, qty) => sum + qty, 0);
      toast.success(`VOC deleted and ${totalReturned} items returned to inventory`);
    } else {
      toast.success('VOC deleted without returning items to inventory');
    }

    await deleteDoc(doc(db, 'vouchers', vocToDelete.id));

    await fetchVocs();
    if (canViewMonthlySales) {
      await fetchMonthlyTotals();
    }
  } catch (error) {
    console.error('Error deleting VOC:', error);
    toast.error('Failed to delete VOC. Please try again.');
  } finally {
    setReturnToInventoryModalOpen(false);
    setVocToDelete(null);
  }
};

  function getCollectionNameByItemType(type: ItemType): string {
    switch (type) {
      case 'Lens': return 'lenses';
      case 'Frame': return 'frames';
      case 'Accessories': return 'accessories';
      case 'Contact Lens': return 'contactLenses';
      default: return '';
    }
  }

  const handleEditPayment = (voc: any) => {
    if (!isAdmin && !isOwner) {
      toast.error('Only admins can edit payments');
      return;
    }
    setEditingVoc(voc);
    setDepositAmount(voc.depositAmount || 0);
    setPaymentMethod(voc.paymentMethod);
    setIsFullPayment(voc.paymentType === 'Full');
    setEditPaymentOpen(true);
  };

  const handleProcessRefund = (voc: any) => {
 
    setSelectedVoc(voc);
    setRefundAmount(0);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingVoc) return;

    try {
      const vocRef = doc(db, 'vouchers', editingVoc.id);
      const updateData = {
        depositAmount: isFullPayment ? editingVoc.totalAmount : depositAmount,
        paymentMethod,
        paymentType: isFullPayment ? 'Full' : 'Deposit',
        paidAmount: isFullPayment ? editingVoc.totalAmount : depositAmount,
        balance: isFullPayment ? 0 : editingVoc.totalAmount - depositAmount,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(vocRef, updateData);
      await fetchVocs();
      if (canViewMonthlySales) {
        await fetchMonthlyTotals();
      }

      toast.success('Payment updated successfully');
      setEditPaymentOpen(false);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleRefund = async () => {
    if (!selectedVoc) return;

    try {
      const vocRef = doc(db, 'vouchers', selectedVoc.id);
      
      const refundData: RefundData = {
        amount: refundAmount,
        reason: refundReason,
        date: new Date()
      };

      await updateDoc(vocRef, {
        refund: refundData,
        updatedAt: serverTimestamp(),
      });

      toast.success('Refund processed successfully');
      setRefundModalOpen(false);
      setRefundAmount(0);
      setRefundReason('');
      fetchVocs();
      if (canViewMonthlySales) {
        fetchMonthlyTotals();
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      const filename = `voc-list-${store}-${dateRange}-${format(new Date(), 'yyyy-MM-dd')}`;
      
      // Pass totals to the export function for enhanced formatting
      const totals = canViewDailySales ? {
        totalAmount: periodTotals.total,
        kpayTotal: periodTotals.kpay,
        yuanTotal: periodTotals.yuanActual,
        depositTotal: periodTotals.deposit,
        remainingBalance: periodTotals.remainingBalance,
        cashTotal: periodTotals.cash
      } : undefined;
      
      exportToExcel(vocs, filename, totals);
      toast.success('Data exported to Excel successfully!');
      setExportModalOpen(false);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportGoogleSheets = async () => {
    try {
      setExportLoading(true);
      const filename = `voc-list-${store}-${dateRange}-${format(new Date(), 'yyyy-MM-dd')}`;
      
      // Pass totals to the export function for enhanced formatting
      const totals = canViewDailySales ? {
        totalAmount: periodTotals.total,
        kpayTotal: periodTotals.kpay,
        yuanTotal: periodTotals.yuanActual,
        depositTotal: periodTotals.deposit,
        remainingBalance: periodTotals.remainingBalance,
        cashTotal: periodTotals.cash
      } : undefined;
      
      exportToGoogleSheets(vocs, filename, totals);
      toast.success('Data exported to CSV. Please import into Google Sheets', {
        duration: 5000,
      });
      setExportModalOpen(false);
    } catch (error) {
      console.error('Google Sheets export error:', error);
      toast.error('Failed to export to Google Sheets. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle date range changes
  const handleDateRangeChange = (newRange: typeof dateRange) => {
    setDateRange(newRange);
    
    // Set default dates for custom range
    if (newRange === 'custom') {
      const today = new Date();
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    
    // Ensure end date is not before start date
    if (endDate < newStartDate) {
      setEndDate(newStartDate);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    
    // Ensure end date is not before start date
    if (newEndDate >= startDate) {
      setEndDate(newEndDate);
    } else {
      toast.error('End date cannot be before start date');
    }
  };

  // FIXED: Handle VOC creation success with date adjustment
  const handleVocCreationSuccess = (createdVocDate?: string) => {
    // Show the form again to allow creating more VOCs
    setShowForm(false);
    
    // Check if the created VOC date falls within the current date range
    if (createdVocDate) {
      const vocDate = parseISO(createdVocDate);
      const { start, end } = getDateRange();
      
      // If the created VOC is outside the current date range, show a message and suggestion
      if (vocDate < start || vocDate > end) {
        const shouldAdjustRange = window.confirm(
          `The VOC was created for ${format(vocDate, 'MMM dd, yyyy')} which is outside the current date range (${getDateRangeText()}).\n\nWould you like to adjust the date range to include the new VOC?`
        );
        
        if (shouldAdjustRange) {
          // Adjust date range to include the created VOC
          if (vocDate < start) {
            // VOC is before current range - set custom range from VOC date to current end
            setDateRange('custom');
            setStartDate(format(vocDate, 'yyyy-MM-dd'));
            setEndDate(format(end, 'yyyy-MM-dd'));
          } else {
            // VOC is after current range - set custom range from current start to VOC date
            setDateRange('custom');
            setStartDate(format(start, 'yyyy-MM-dd'));
            setEndDate(format(vocDate, 'yyyy-MM-dd'));
          }
          
          toast.success('Date range adjusted to show the new VOC', {
            duration: 4000,
            icon: '📅'
          });
        } else {
          // Show information about where to find the VOC
          toast(`The new VOC can be found by changing the date range to include ${format(vocDate, 'MMM dd, yyyy')}`, {
            duration: 6000,
            icon: '💡'
          });
        }
      } else {
        // VOC is within current range, just refresh
        fetchVocs();
        if (canViewMonthlySales) {
          fetchMonthlyTotals();
        }
      }
    } else {
      // No date provided, just refresh
      fetchVocs();
      if (canViewMonthlySales) {
        fetchMonthlyTotals();
      }
    }
  };

  const columns = [
    { key: 'vocNumber', header: 'VOC #', sortable: true },
    { key: 'customerName', header: 'Customer', sortable: true },
    {
      key: 'lens',
      header: 'Lens',
      render: (row: any) => <DataDisplay items={row.items} type="Lens" />
    },
    {
      key: 'frame',
      header: 'Frame',
      render: (row: any) => <DataDisplay items={row.items} type="Frame" />
    },
    {
      key: 'accessories',
      header: 'Accessories',
      render: (row: any) => <DataDisplay items={row.items} type="Accessories" />
    },
    {
      key: 'contactLenses',
      header: 'Contact Lens',
      render: (row: any) => <DataDisplay items={row.items} type="Contact Lens" />
    },
    { 
      key: 'paymentType', 
      header: 'Status',
      render: (row: any) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.paymentType === 'Full' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
        }`}>
          {row.paymentType === 'Full' ? 'Paid' : 'Deposit'}
        </span>
      )
    },
    { 
      key: 'discount', 
      header: 'Discount',
      sortable: true,
      render: (row: any) => row.discount ? formatCurrency(row.discount) : '-'
    },
    {
      key: 'refund',
      header: 'Refund',
      render: (row: any) => {
        if (row.refund && row.refund.amount) {
          // Safely convert Firestore Timestamp or string to JS Date
          let refundDate: Date | null = null;
          if (row.refund.date instanceof Date) {
            refundDate = row.refund.date;
          } else if (row.refund.date && typeof row.refund.date.toDate === 'function') {
            refundDate = row.refund.date.toDate();
          } else if (typeof row.refund.date === 'string' || typeof row.refund.date === 'number') {
            refundDate = new Date(row.refund.date);
          }
          return (
            <div className="space-y-1">
              <div className="text-sm text-red-600 font-medium">
                -{formatCurrency(row.refund.amount)}
              </div>
              <div className="text-xs text-gray-500">
                {refundDate ? format(refundDate, 'MMM dd, yyyy') : '-'}
              </div>
              {row.refund.reason && (
                <div className="text-xs text-gray-400 truncate max-w-20" title={row.refund.reason}>
                  {row.refund.reason}
                </div>
              )}
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      }
    },
    { 
      key: 'totalAmount', 
      header: 'Total',
      sortable: true,
      render: (row: any) => {
        const discountAmount = row.discount || 0;
        
        // FIXED: Calculate total based on sold quantities only (excluding error quantities)
        let calculatedTotal = 0;
        if (row.items && Array.isArray(row.items)) {
          calculatedTotal = row.items.reduce((sum: number, item: any) => {
            if (item.isFOC) return sum; // FOC items don't contribute to total
            
            // Only sold quantity gets priced - error quantities are FREE
            const soldQuantity = item.quantity - (item.errorQuantity || 0);
            const itemTotal = item.customTotal || (item.price * soldQuantity);
            const itemDiscount = item.itemDiscount || 0;
            
            return sum + Math.max(itemTotal - itemDiscount, 0);
          }, 0);
        } else {
          // Fallback to stored total amount if items not available
          calculatedTotal = row.totalAmount || 0;
        }
        
        const finalTotal = Math.max(calculatedTotal - discountAmount, 0);
        const refundAmount = row.refund?.amount || 0;
        const netTotal = finalTotal - refundAmount;
        
        return (
          <div className="space-y-1">
            {/* Show error quantity info if present */}
            {row.hasErrors && row.totalErrorQuantity > 0 && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                {row.totalErrorQuantity} error items (FREE)
              </div>
            )}
            
            {/* Show payment method breakdown */}
            {row.paymentMethod.includes('Cash') && row.cashAmount > 0 && (
              <div className="text-sm text-purple-600">
                Cash: {formatCurrency(row.cashAmount)}
              </div>
            )}
            {row.paymentMethod.includes('KPay') && row.kpayAmount > 0 && (
              <div className="text-sm text-green-600">
                KPay: {formatCurrency(row.kpayAmount)}
              </div>
            )}
            {row.paymentMethod.includes('Yuan') && row.yuanAmount > 0 && (
              <div className="text-sm text-blue-600 space-y-1">
                <div>Yuan: {formatYuan(row.yuanAmount)}</div>
                {row.mmkAmount > 0 && (
                  <div className="text-xs text-gray-600">
                    + {formatCurrency(row.mmkAmount)} MMK
                  </div>
                )}
              </div>
            )}
            {/* Show deposit info for deposit payments */}
            {row.paymentType === 'Deposit' && (
              <div className="text-sm text-amber-600">
                Deposit: {formatCurrency(row.depositAmount || 0)}
              </div>
            )}
            {row.paymentType === 'Deposit' && row.balance > 0 && (
              <div className="text-sm text-red-600">
                Balance: {formatCurrency(row.balance)}
              </div>
            )}
            {/* Show total amount */}
            <div className="font-medium">
              {row.paymentMethod === 'Yuan' 
                ? `${formatYuan(row.yuanAmount || 0)}${row.mmkAmount ? ` + ${formatCurrency(row.mmkAmount)}` : ''}`
                : row.paymentMethod.includes('Yuan')
                ? `${formatYuan(row.yuanAmount || 0)} + ${formatCurrency(row.cashAmount || row.kpayAmount || 0)}`
                : formatCurrency(finalTotal)
              }
            </div>
            {/* Show net total if there's a refund */}
            {refundAmount > 0 && (
              <div className="text-sm text-gray-600 border-t pt-1">
                Net: {formatCurrency(netTotal)}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'errorCategory',
      header: 'Error Category',
      sortable: true,
      width: '150px',
      render: (row: any) => {
        if (!row.hasErrors || !row.errorCategory) {
          return <span className="text-gray-400">-</span>;
        }
        
        const category = ERROR_CATEGORIES.find(cat => cat.value === row.errorCategory);
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-medium flex items-center gap-1">
            <AlertTriangle size={12} />
            {category?.label || row.errorCategory}
          </span>
        );
      }
    },
    {
      key: 'errorDescription',
      header: 'Error Details',
      width: '200px',
      render: (row: any) => {
        if (!row.hasErrors || !row.errorDescription) {
          return <span className="text-gray-400">-</span>;
        }
        
        return (
          <div className="max-w-xs">
            <p className="text-xs text-red-600 dark:text-red-400 truncate" title={row.errorDescription}>
              {row.errorDescription}
            </p>
          </div>
        );
      }
    },
    { 
      key: 'createdAt', 
      header: 'Date & Time',
      sortable: true,
      render: (row: any) => (
        <div className="text-sm">
          <div className="font-medium">{format(row.createdAt, 'MMM dd, yyyy')}</div>
          <div className="text-gray-500">{format(row.createdAt, 'HH:mm')}</div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex space-x-1">
          {/* Detail View Button - Available to all users */}
          <Button 
            variant="outline" 
            size="xs"
            onClick={() => handleViewVocDetail(row)}
            className="p-1"
            title="View Details"
          >
            <Eye size={14} />
          </Button>
              <Button 
                variant="outline" 
                size="xs"
                onClick={() => handleProcessRefund(row)}
                className="p-1"
                title="Process Refund"
              >
                <Circle size={14} className="text-blue-500" />
              </Button>
          
          {/* Admin/Owner only actions */}
          {(isAdmin || isOwner) && (
            <>
              <Button 
                variant="outline" 
                size="xs"
                onClick={() => handleEditVoc(row.id)}
                className="p-1"
                title="Edit VOC"
              >
                <Edit size={14} />
              </Button>
              <Button 
                variant="outline" 
                size="xs"
                onClick={() => handleEditPayment(row)}
                className="p-1"
                title="Edit Payment"
              >
                <DollarSign size={14} />
              </Button>
          
              <Button 
                variant="outline" 
                size="xs"
                onClick={() => handleReturnToInventory(row)}
                className="p-1"
                title="Return to Inventory"
              >
                <RotateCcw size={14} className="text-blue-600" />
              </Button>
              <Button 
                variant="danger" 
                size="xs"
                onClick={() => handleDeleteVoc(row)}
                className="p-1"
                title="Delete VOC"
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // Monthly Totals Section - Only visible to admin/owner
  const MonthlyTotalsSection = () => {
    if (!canViewMonthlySales) return null;
    
    return (
      <div className="mb-4">
        <div 
          className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 p-3 rounded-lg cursor-pointer mb-2 border border-indigo-200 dark:border-indigo-700"
          onClick={() => setShowMonthlyTotals(!showMonthlyTotals)}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-medium text-indigo-800 dark:text-indigo-200">
              Monthly Totals - {format(getDateRange().start, 'MMMM yyyy')}
            </h3>
          </div>
          {showMonthlyTotals ? <ChevronUp size={18} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronDown size={18} className="text-indigo-600 dark:text-indigo-400" />}
        </div>
        
        {showMonthlyTotals && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 p-4 rounded-lg shadow-sm border border-emerald-200 dark:border-emerald-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-100">Monthly Cash</h4>
              </div>
              <p className="text-xl font-bold text-emerald-900 dark:text-white">{formatCurrency(monthlyTotals.cash)}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded-lg shadow-sm border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-green-600 dark:text-green-400" />
                <h4 className="text-sm font-medium text-green-800 dark:text-green-100">Monthly KPay</h4>
              </div>
              <p className="text-xl font-bold text-green-900 dark:text-white">{formatCurrency(monthlyTotals.kpay)}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-100">Monthly Yuan</h4>
              </div>
              <p className="text-lg font-bold text-blue-900 dark:text-white">{formatYuan(monthlyTotals.yuanActual)}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 p-4 rounded-lg shadow-sm border border-amber-200 dark:border-amber-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-amber-600 dark:text-amber-400" />
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-100">Monthly Deposits</h4>
              </div>
              <p className="text-xl font-bold text-amber-900 dark:text-white">{formatCurrency(monthlyTotals.deposit)}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 p-4 rounded-lg shadow-sm border border-red-200 dark:border-red-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-red-600 dark:text-red-400" />
                <h4 className="text-sm font-medium text-red-800 dark:text-red-100">Monthly Remaining Balance</h4>
              </div>
              <p className="text-xl font-bold text-red-900 dark:text-white">{formatCurrency(monthlyTotals.remainingBalance)}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 rounded-lg shadow-sm border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-medium text-purple-800 dark:text-purple-100">Monthly Total</h4>
              </div>
              <p className="text-xl font-bold text-purple-900 dark:text-white">{formatCurrency(monthlyTotals.total)}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const SalesSummary = () => (
    <div className="mb-4">
      <div 
        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg cursor-pointer mb-2"
        onClick={() => setShowSalesSummary(!showSalesSummary)}
      >
        <h3 className="text-lg font-medium">Sales Summary - {getDateRangeText()}</h3>
        {showSalesSummary ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      
      {showSalesSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
            <h3 className="text-base font-medium mb-2 border-b pb-1">Lens Sales</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(salesByCategory.lens).map(([category, quantity]) => (
                <div key={category} className="flex justify-between">
                  <span>{category}:</span>
                  <span className="font-medium">{quantity} pairs</span>
                </div>
              ))}
              {Object.keys(salesByCategory.lens).length === 0 && (
                <div className="text-gray-500">No lens sales</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
            <h3 className="text-base font-medium mb-2 border-b pb-1">Frame Sales</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(salesByCategory.frame).map(([category, colors]) => (
                <div key={category} className="mb-1">
                  <div className="font-medium">{category}</div>
                  {Object.entries(colors).map(([color, quantity]) => (
                    <div key={color} className="flex justify-between pl-3 text-xs text-gray-600 dark:text-gray-300">
                      <span>{color}:</span>
                      <span>{quantity} units</span>
                    </div>
                  ))}
                </div>
              ))}
              {Object.keys(salesByCategory.frame).length === 0 && (
                <div className="text-gray-500">No frame sales</div>
              )}
            </div>
          </div>

         <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
      <h3 className="text-base font-medium mb-2 border-b pb-1">Contact Lens Sales</h3>
      <div className="space-y-1 text-sm">
        {Object.entries(salesByCategory.contactLenses).map(([category, quantity]) => (
          <div key={category} className="flex justify-between">
            <span>{category}:</span>
            <span className="font-medium">{quantity} units</span>
          </div>
        ))}
        {Object.keys(salesByCategory.contactLenses).length === 0 && (
          <div className="text-gray-500">No contact lens sales</div>
        )}
      </div>
    </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
            <h3 className="text-base font-medium mb-2 border-b pb-1">Accessories Sales</h3>
            <div className="flex justify-between text-sm">
              <span>Total Units:</span>
              <span className="font-medium">{salesByCategory.accessories}</span>
            </div>
            {salesByCategory.accessories === 0 && (
              <div className="text-gray-500 mt-1 text-sm">No accessories sales</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Store parameter is required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please select a valid store to view VOC data.
          </p>
        </div>
      </div>
    );
  }

  if (!canAccessStoreVOC()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access VOC data for the {store?.toUpperCase()} store.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {store && (
              <p>
                Only <span className="font-medium text-blue-600 dark:text-blue-400">
                  {getStoreSpecificEmail(store)}
                </span> can access this store's VOC data.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      <Header title={`VOC Management - ${store?.toUpperCase()}`} />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {/* Store Access Info */}
        {!isOwner && !isAdmin && user?.email !== 'winstore1717@gmail.com' && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
          Viewing VOC data for <span className="font-medium">{store?.toUpperCase()}</span> store 
          as <span className="font-medium">{user?.email}</span>
              </p>
            </div>
          </div>
        )}

        {/* Current Date Range Display */}
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
              Current Period: {getDateRangeText()}
            </h3>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
            Showing {vocs.length} VOCs for this period
          </p>
        </div>

        {/* UPDATED: Period Totals with proper deposit handling */}
        {canViewDailySales && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-3 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-100 mb-1">Period Total</h3>
              <p className="text-xl font-bold text-blue-900 dark:text-white">{formatCurrency(periodTotals.total)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-3 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-100 mb-1">Period Cash</h3>
              <p className="text-xl font-bold text-purple-900 dark:text-white">{formatCurrency(periodTotals.cash)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-3 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-100 mb-1">Period KPay</h3>
              <p className="text-xl font-bold text-green-900 dark:text-white">{formatCurrency(periodTotals.kpay)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 p-3 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-100 mb-1">Period Yuan</h3>
              <p className="text-lg font-bold text-orange-900 dark:text-white">{formatYuan(periodTotals.yuanActual)}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 p-3 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-100 mb-1">Period Deposits</h3>
              <p className="text-xl font-bold text-yellow-900 dark:text-white">{formatCurrency(periodTotals.deposit)}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 p-3 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-100 mb-1">Period Remaining Balance</h3>
              <p className="text-xl font-bold text-red-900 dark:text-white">{formatCurrency(periodTotals.remainingBalance)}</p>
            </div>
          </div>
        )}

        {/* Monthly Totals - Only show to admin/owner */}
        <MonthlyTotalsSection />

        <SalesSummary />

        {/* Enhanced Date Controls */}
        <div className="flex flex-col gap-4 mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Select Date Range
            </label>
            
            {/* Quick Date Range Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                variant={dateRange === 'today' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('today')}
              >
                Today
              </Button>
              <Button
                variant={dateRange === 'yesterday' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('yesterday')}
              >
                Yesterday
              </Button>
              <Button
                variant={dateRange === 'last7days' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('last7days')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateRange === 'last30days' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('last30days')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={dateRange === 'custom' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('custom')}
              >
                Custom Range
              </Button>
            </div>

            {/* Custom Date Range Inputs */}
            {dateRange === 'custom' && (
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="w-40"
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    className="w-40"
                    min={startDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="h-9"
              disabled={exportLoading}
            >
              <FileSpreadsheet size={16} className="mr-1" />
              {exportLoading ? 'Exporting...' : 'Export'}
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="h-9"
            >
              {showForm ? 'View VOCs' : 'Create VOC'}
            </Button>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="flex border-b mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'all' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            All VOCs ({vocs.length})
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'paid' 
                ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Paid ({paidVocs.length})
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'deposit' 
                ? 'border-b-2 border-yellow-500 text-yellow-600 dark:text-yellow-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Deposits ({depositVocs.length})
          </button>
        </div>
        
        {/* Main Content Area */}
        {showForm ? (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <VocForm store={store} onSuccess={handleVocCreationSuccess} />
          </div>
        ) : (
          loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <DataTable 
              data={activeTab === 'all' ? vocs : activeTab === 'paid' ? paidVocs : depositVocs}
              columns={columns} 
              filterKey="vocNumber"
              itemsPerPage={25}
            />
          )
        )}
      </div>

      {/* Modals */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={`VOC ${vocToDelete?.vocNumber}`}
        onDelete={() => {}}
      />

      <ReturnToInventoryModal
        isOpen={returnToInventoryModalOpen}
        onClose={() => setReturnToInventoryModalOpen(false)}
        onConfirm={handleConfirmDelete}
        vocItems={vocToDelete?.items || []}
      />

      <FormModal
        isOpen={editPaymentOpen}
        onClose={() => setEditPaymentOpen(false)}
        title="Edit Payment"
      >
        <div className="space-y-4">
          <div className="flex items-center mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <input
              type="checkbox"
              id="fullPayment"
              checked={isFullPayment}
              onChange={(e) => setIsFullPayment(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="fullPayment" className="font-medium">
              Mark as fully paid
            </label>
          </div>

          {!isFullPayment && (
            <Input
              label="Deposit Amount"
              type="number"
              min={0}
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
            />
          )}
          
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'KPay', label: 'KPay' },
              { value: 'Yuan', label: 'Yuan' },
              { value: 'Cash+KPay', label: 'Cash + KPay' },
              { value: 'Cash+Yuan', label: 'Cash + Yuan' },
              { value: 'Yuan+KPay', label: 'Yuan + KPay' },
            ]}
          />

          <Button
            onClick={handleUpdatePayment}
            className="w-full"
          >
            Update Payment
          </Button>
        </div>
      </FormModal>

      <FormModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="Process Refund"
      >
        <div className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Original Amount</p>
              <p className="text-base font-semibold">
                {selectedVoc && formatCurrency(selectedVoc.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Previous Refunds</p>
              <p className="text-base font-semibold text-red-600 dark:text-red-400">
                {selectedVoc?.refund ? formatCurrency(selectedVoc.refund.amount) : '-'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Refund amount will be deducted from cash totals only, not from Yuan amounts.
            </p>
          </div>

          <Input
            label="Refund Amount"
            type="number"
            min={0}
            max={selectedVoc?.totalAmount}
            value={refundAmount}
            onChange={(e) => setRefundAmount(Number(e.target.value))}
          />

          <Input
            label="Refund Reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />

          <Button
            onClick={handleRefund}
            className="w-full"
            disabled={!refundAmount || !refundReason}
          >
            Process Refund
          </Button>
        </div>
      </FormModal>

      <FormModal
        isOpen={editVocModalOpen}
        onClose={() => setEditVocModalOpen(false)}
        title="Edit VOC"
        size="lg"
      >
        {vocToEdit && (
          <VocEditForm 
            vocId={vocToEdit} 
            onSuccess={() => {
              setEditVocModalOpen(false);
              fetchVocs();
              if (canViewMonthlySales) {
                fetchMonthlyTotals();
              }
            }}
            onCancel={() => setEditVocModalOpen(false)}
          />
        )}
      </FormModal>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExportExcel={handleExportExcel}
        onExportGoogleSheets={handleExportGoogleSheets}
        totalAmount={canViewDailySales ? periodTotals.total : 0}
        kpayTotal={canViewDailySales ? periodTotals.kpay : 0}
        yuanTotal={canViewDailySales ? periodTotals.yuanActual : 0}
        depositTotal={canViewDailySales ? periodTotals.deposit : 0}
        remainingBalance={canViewDailySales ? periodTotals.remainingBalance : 0}
        cashTotal={canViewDailySales ? periodTotals.cash : 0}
        loading={exportLoading}
      />

      {/* VOC Detail Modal */}
      {selectedVocForDetail && (
        <VocDetailModal
          voc={selectedVocForDetail}
          onClose={() => {
            setVocDetailModalOpen(false);
            setSelectedVocForDetail(null);
          }}
        />
      )}
    </div>
  );
};

export default VocPage;