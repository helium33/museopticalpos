import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, serverTimestamp, or } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/ui/Button';
import FormModal from '../../components/modals/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { formatCurrency } from '../../lib/utils';
import { exportDepositsToExcel, exportDepositsToGoogleSheets } from '../../lib/exportUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { FileDown, FileSpreadsheet, Calendar, CheckCircle, Clock, DollarSign, CreditCard, Star, Award } from 'lucide-react';

const DepositsPage: React.FC = () => {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'KPay' | 'Yuan'>('Cash');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchDeposits();
  }, [filter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      
      // FIXED: Query to include both current deposits AND vouchers that were originally deposits but are now paid
      const depositsQuery = query(
        collection(db, 'vouchers'),
        or(
          where('paymentType', '==', 'Deposit'), // Current deposits
          where('originalPaymentType', '==', 'Deposit'), // Originally deposits, now paid
          where('wasDeposit', '==', true) // Backup flag for deposits that became paid
        ),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(depositsQuery);
      
      const depositsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // ENHANCED: More robust paid status detection
        const isPaid = (data.depositAmount || 0) >= data.totalAmount || 
                      data.paymentType === 'Full' || 
                      data.balance === 0 ||
                      data.paidAmount >= data.totalAmount ||
                      data.completionDate; // If completion date exists, it's paid
        
        // CRITICAL: Ensure we're only showing actual deposit-related vouchers
        const isDepositRelated = data.paymentType === 'Deposit' || 
                                data.originalPaymentType === 'Deposit' ||
                                data.wasDeposit === true ||
                                (data.depositAmount && data.depositAmount > 0);
        
        return {
          id: doc.id,
          vocNumber: data.vocNumber,
          customerName: data.customerName,
          depositAmount: data.depositAmount || 0,
          totalAmount: data.totalAmount,
          remainingAmount: Math.max(0, data.totalAmount - (data.depositAmount || 0)),
          date: data.createdAt.toDate(),
          status: isPaid ? 'paid' : 'pending',
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate?.toDate(),
          lastPaymentDate: data.lastPaymentDate?.toDate(),
          completionDate: data.completionDate?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          // Enhanced tracking
          completionPercentage: Math.min(100, Math.round(((data.depositAmount || 0) / data.totalAmount) * 100)),
          isPermanentlyPaid: isPaid,
          originalPaymentType: data.originalPaymentType || data.paymentType,
          currentPaymentType: data.paymentType,
          balance: data.balance || 0,
          paidAmount: data.paidAmount || 0,
          wasDeposit: data.wasDeposit || false,
          isDepositRelated, // Flag to ensure we only show deposit-related vouchers
        };
      }).filter(deposit => deposit.isDepositRelated); // Filter out non-deposit vouchers

      // ENHANCED: Sort to show paid deposits prominently
      const sortedDeposits = depositsData.sort((a, b) => {
        // First, sort by paid status (paid first when viewing all)
        if (filter === 'all') {
          if (a.status === 'paid' && b.status !== 'paid') return -1;
          if (a.status !== 'paid' && b.status === 'paid') return 1;
        }
        // Then sort by date (newest first)
        return b.date.getTime() - a.date.getTime();
      });

      // Filter based on status
      const filteredDeposits = filter === 'all' 
        ? sortedDeposits 
        : sortedDeposits.filter(deposit => deposit.status === filter);
      
      console.log(`Found ${depositsData.length} total deposits, ${filteredDeposits.length} after filtering by ${filter}`);
      console.log('Paid deposits:', depositsData.filter(d => d.status === 'paid').length);
      console.log('Pending deposits:', depositsData.filter(d => d.status === 'pending').length);
      
      setDeposits(filteredDeposits);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast.error('Failed to fetch deposits');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (deposit: any) => {
    setEditingDeposit(deposit);
    setPaymentAmount(deposit.remainingAmount);
    setPaymentMethod(deposit.paymentMethod);
    setEditModalOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingDeposit) return;

    try {
      const vocRef = doc(db, 'vouchers', editingDeposit.id);
      
      const newDepositAmount = editingDeposit.depositAmount + paymentAmount;
      const isFullyPaid = newDepositAmount >= editingDeposit.totalAmount;
      
      const updateData = {
        depositAmount: newDepositAmount,
        paymentMethod,
        paymentDate: serverTimestamp(),
        lastPaymentDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // ENHANCED: Comprehensive payment completion tracking with backup flags
        ...(isFullyPaid && { 
          paymentType: 'Full', // Mark as fully paid
          originalPaymentType: 'Deposit', // CRITICAL: Remember it was originally a deposit
          wasDeposit: true, // BACKUP FLAG: Ensure we can always find this record
          paidAmount: editingDeposit.totalAmount,
          balance: 0,
          completionDate: serverTimestamp(), // Track when it was completed
          completedBy: 'system', // Track completion method
          finalPaymentAmount: paymentAmount, // Track final payment amount
          isPermanentlyPaid: true, // Permanent flag
        })
      };

      await updateDoc(vocRef, updateData);
      await fetchDeposits(); // Refresh the list

      if (isFullyPaid) {
        toast.success('🎉 ပေးချေမှုပြီးစီးပါပြီ! Deposit ကို အပြည့်အဝပေးချေပြီးဖြစ်ပါသည်။', {
          duration: 5000,
          icon: '✅',
        });
      } else {
        toast.success('Payment updated successfully');
      }
      
      setEditModalOpen(false);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      const filename = `deposits-report-${format(new Date(), 'yyyy-MM-dd')}`;
      exportDepositsToExcel(deposits, filename);
      toast.success('Deposits exported to Excel successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export to Excel. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportToGoogleSheets = async () => {
    try {
      setExportLoading(true);
      const filename = `deposits-report-${format(new Date(), 'yyyy-MM-dd')}`;
      exportDepositsToGoogleSheets(deposits, filename);
      toast.success('Deposits exported to CSV. Please import into Google Sheets', {
        duration: 5000,
      });
    } catch (error) {
      console.error('Google Sheets export error:', error);
      toast.error('Failed to export to Google Sheets. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    { 
      key: 'vocNumber', 
      header: 'VOC Number', 
      sortable: true,
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.vocNumber}</span>
          {row.status === 'paid' && (
            <div className="flex items-center gap-1">
              <Award size={16} className="text-green-600" title="Fully Paid" />
              <CheckCircle size={14} className="text-green-600" title="Completed" />
            </div>
          )}
          {/* Show payment type transition */}
          {row.originalPaymentType === 'Deposit' && row.currentPaymentType === 'Full' && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Deposit → Paid
            </span>
          )}
        </div>
      )
    },
    { key: 'customerName', header: 'Customer Name', sortable: true },
    { 
      key: 'depositAmount', 
      header: 'Deposit Amount',
      render: (row: any) => (
        <div className="space-y-1">
          <div className="font-medium">{formatCurrency(row.depositAmount)}</div>
          <div className="text-xs text-gray-500">
            {row.completionPercentage}% of total
          </div>
          {row.status === 'paid' && (
            <div className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle size={12} />
              COMPLETED
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'totalAmount', 
      header: 'Total Amount',
      render: (row: any) => formatCurrency(row.totalAmount)
    },
    { 
      key: 'remainingAmount', 
      header: 'Remaining',
      render: (row: any) => (
        <div className={`font-medium ${
          row.remainingAmount === 0 ? 'text-green-600' : 'text-orange-600'
        }`}>
          {formatCurrency(row.remainingAmount)}
          {row.status === 'paid' && (
            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <Star size={12} />
              FULLY PAID
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Payment Status',
      render: (row: any) => (
        <div className="space-y-2">
          {/* ENHANCED: More prominent paid status display */}
          <div className={`px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-2 ${
            row.status === 'paid'
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900 dark:to-emerald-900 dark:text-green-200 border-2 border-green-400 shadow-md'
              : 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 dark:from-yellow-900 dark:to-amber-900 dark:text-yellow-200 border-2 border-yellow-400'
          }`}>
            {row.status === 'paid' ? (
              <>
                <CheckCircle size={18} className="text-green-600" />
                <div className="flex flex-col">
                  <span className="font-bold text-lg">ပေးချေပြီး</span>
                  <span className="text-xs font-normal">FULLY COMPLETED</span>
                  {row.originalPaymentType === 'Deposit' && (
                    <span className="text-xs font-normal text-green-600">Originally Deposit</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <Clock size={16} className="text-yellow-600" />
                <span className="font-bold">ပေးချေရန်ကျန်</span>
              </>
            )}
          </div>
          
          {/* Progress Bar for Pending Deposits */}
          {row.status === 'pending' && (
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-amber-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${row.completionPercentage}%` }}
              ></div>
            </div>
          )}
          
          {/* ENHANCED: Completion Badge for Paid Deposits */}
          {row.status === 'paid' && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 px-3 py-2 rounded-lg border-2 border-green-300 dark:border-green-600 shadow-sm">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} className="text-green-600" />
                  <Star size={14} className="text-green-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">100% COMPLETE</span>
                  <span className="text-xs">PERMANENTLY PAID</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'paymentMethod', 
      header: 'Payment Method',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <CreditCard size={14} className="text-gray-500" />
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            row.paymentMethod === 'Cash' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
            row.paymentMethod === 'KPay' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            row.paymentMethod === 'Yuan' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          }`}>
            {row.paymentMethod}
          </span>
        </div>
      )
    },
    { 
      key: 'date', 
      header: 'Deposit Date',
      render: (row: any) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-gray-500" />
          <div>
            <div className="font-medium">{format(row.date, 'yyyy-MM-dd')}</div>
            <div className="text-xs text-gray-500">{format(row.date, 'HH:mm')}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'paymentDate', 
      header: 'Payment Completion',
      render: (row: any) => {
        if (row.status === 'paid' && (row.completionDate || row.paymentDate || row.lastPaymentDate)) {
          const displayDate = row.completionDate || row.paymentDate || row.lastPaymentDate;
          return (
            <div className="space-y-1">
              {/* ENHANCED: More prominent paid completion display */}
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 px-4 py-3 rounded-lg border-l-4 border-green-500 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <CheckCircle size={18} className="text-green-600" />
                    <Award size={16} className="text-green-600" />
                  </div>
                  <div>
                    <div className="font-bold text-green-800 dark:text-green-200 text-base">
                      ✅ PAID COMPLETE
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {format(displayDate, 'yyyy-MM-dd HH:mm')}
                    </div>
                    <div className="text-xs text-green-500 dark:text-green-400">
                      Permanently Completed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        } else if (row.status === 'pending' && (row.paymentDate || row.lastPaymentDate)) {
          const displayDate = row.paymentDate || row.lastPaymentDate;
          return (
            <div className="space-y-1">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border-l-4 border-blue-400">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                      Last Payment
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      {format(displayDate, 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={14} />
              <span className="text-sm">No payment yet</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="space-y-1">
          {row.status === 'pending' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleEditPayment(row)}
              className="flex items-center gap-2 w-full"
            >
              <DollarSign size={14} />
              Update Payment
            </Button>
          ) : (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-3 py-2 rounded-lg border-2 border-green-300 dark:border-green-600 shadow-sm">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} />
                  <Award size={12} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">COMPLETED</span>
                  <span className="text-xs">Permanently Paid</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <Header title="Deposits Management - Payment Status Tracking" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        {/* Debug Info - Remove in production */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Debug Info:</strong> Total deposits found: {deposits.length} | 
            Paid: {deposits.filter(d => d.status === 'paid').length} | 
            Pending: {deposits.filter(d => d.status === 'pending').length}
          </div>
        </div>

        {/* ENHANCED: Summary Cards with more prominent paid status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-lg shadow-sm border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-100">Total Deposits</h4>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-white">{deposits.length}</p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">All deposit records</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 p-4 rounded-lg shadow-sm border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-100">Pending Payment</h4>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-white">
              {deposits.filter(d => d.status === 'pending').length}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">Awaiting completion</p>
          </div>

          {/* ENHANCED: More prominent paid deposits card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900 dark:to-emerald-800 p-4 rounded-lg shadow-lg border-2 border-green-400">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-sm font-bold text-green-800 dark:text-green-100">✅ PAID COMPLETE</h4>
            </div>
            <p className="text-3xl font-bold text-green-900 dark:text-white">
              {deposits.filter(d => d.status === 'paid').length}
            </p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1 font-bold">
              🎉 Permanently Completed Deposits
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 rounded-lg shadow-sm border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h4 className="text-sm font-medium text-purple-800 dark:text-purple-100">Total Value</h4>
            </div>
            <p className="text-lg font-bold text-purple-900 dark:text-white">
              {formatCurrency(deposits.reduce((sum, d) => sum + d.totalAmount, 0))}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">Combined deposits</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              className="flex items-center gap-1"
            >
              <Calendar size={14} />
              All ({deposits.length})
            </Button>
            <Button
              onClick={() => setFilter('pending')}
              variant={filter === 'pending' ? 'primary' : 'outline'}
              size="sm"
              className="flex items-center gap-1 bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
            >
              <Clock size={14} />
              Pending ({deposits.filter(d => d.status === 'pending').length})
            </Button>
            {/* ENHANCED: More prominent paid filter button */}
            <Button
              onClick={() => setFilter('paid')}
              variant={filter === 'paid' ? 'primary' : 'outline'}
              size="sm"
              className="flex items-center gap-1 bg-green-50 border-green-300 text-green-800 hover:bg-green-100 font-bold"
            >
              <div className="flex items-center gap-1">
                <CheckCircle size={14} />
                <Award size={12} />
              </div>
              ✅ PAID ({deposits.filter(d => d.status === 'paid').length})
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              className="flex items-center gap-1"
              disabled={exportLoading}
            >
              <FileSpreadsheet size={16} />
              {exportLoading ? 'Exporting...' : 'Export Excel'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToGoogleSheets}
              className="flex items-center gap-1"
              disabled={exportLoading}
            >
              <FileDown size={16} />
              Export CSV
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={deposits} 
            columns={columns} 
            filterKey="vocNumber"
            itemsPerPage={20}
          />
        )}
      </div>

      <FormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Update Payment - Complete Deposit"
      >
        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
              <DollarSign size={18} />
              Payment Summary
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Total Amount</p>
                <p className="text-xl font-bold text-blue-800 dark:text-blue-100">
                  {editingDeposit && formatCurrency(editingDeposit.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Current Deposit</p>
                <p className="text-xl font-bold text-blue-800 dark:text-blue-100">
                  {editingDeposit && formatCurrency(editingDeposit.depositAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-300">Remaining Balance</p>
                <p className="text-xl font-bold text-orange-800 dark:text-orange-100">
                  {editingDeposit && formatCurrency(editingDeposit.remainingAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-300">After This Payment</p>
                <p className="text-xl font-bold text-green-800 dark:text-green-100">
                  {editingDeposit && formatCurrency(Math.max(0, editingDeposit.remainingAmount - paymentAmount))}
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Payment Amount"
            type="number"
            min={0}
            max={editingDeposit?.remainingAmount}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            className="border-green-300 focus:border-green-500"
          />
          
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'KPay' | 'Yuan')}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'KPay', label: 'KPay' },
              { value: 'Yuan', label: 'Yuan' },
            ]}
          />

          {/* ENHANCED: Payment Status Preview */}
          {editingDeposit && paymentAmount > 0 && (
            <div className={`p-4 rounded-lg border-2 ${
              (editingDeposit.depositAmount + paymentAmount) >= editingDeposit.totalAmount
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-400 dark:border-green-600 shadow-lg'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600'
            }`}>
              <div className="flex items-center gap-3">
                {(editingDeposit.depositAmount + paymentAmount) >= editingDeposit.totalAmount ? (
                  <>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={24} className="text-green-600" />
                      <Award size={20} className="text-green-600" />
                    </div>
                    <div>
                      <div className="text-green-800 dark:text-green-200 font-bold text-xl">
                        🎉 DEPOSIT WILL BE MARKED AS PAID!
                      </div>
                      <div className="text-green-600 dark:text-green-400 text-sm font-medium">
                        ✅ This payment will complete the deposit and mark it as permanently paid
                      </div>
                      <div className="text-green-500 dark:text-green-400 text-xs mt-1">
                        Status will be permanently saved as "PAID COMPLETE" and will always appear in deposits list
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock size={20} className="text-yellow-600" />
                    <div>
                      <div className="text-yellow-800 dark:text-yellow-200 font-bold">
                        Partial Payment
                      </div>
                      <div className="text-yellow-600 dark:text-yellow-400 text-sm">
                        Remaining balance: {formatCurrency(editingDeposit.remainingAmount - paymentAmount)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleUpdatePayment}
            className="w-full flex items-center justify-center gap-2 text-lg py-3"
            disabled={!paymentAmount || paymentAmount > (editingDeposit?.remainingAmount || 0)}
          >
            <div className="flex items-center gap-1">
              <CheckCircle size={18} />
              {editingDeposit && (editingDeposit.depositAmount + paymentAmount) >= editingDeposit.totalAmount && (
                <Award size={16} />
              )}
            </div>
            {editingDeposit && (editingDeposit.depositAmount + paymentAmount) >= editingDeposit.totalAmount 
              ? '✅ Complete Payment & Mark as PERMANENTLY PAID' 
              : 'Update Payment'
            }
          </Button>
        </div>
      </FormModal>
    </div>
  );
};

export default DepositsPage;