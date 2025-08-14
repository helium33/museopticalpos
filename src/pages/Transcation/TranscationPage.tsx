import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Download, 
  Calculator,
  DollarSign,
  Coins,
  Banknote
} from 'lucide-react';
import { Transaction, DashboardStats } from '../../type/transcation';
import { useLocalStorage } from '../../hooks/useLocalStorge';
import { calculateStats, formatCurrency, exportTransactionsToCSV } from '../../lib/utils';
import TransactionForm from '../../components/transcationForm.tsx/TransctionForm';
import TransactionList from '../../components/Dashboard/TransitionList';
import TransactionDetailModal from '../../components/ui/TranscationModal';
import Button from '../../components/ui/Button';
import Modal from '../..//components/ui/Modal';
import StatsCard from '../../components/Dashboard/StartCard';

interface CurrencyConverterProps {
  onConvert: (amount: number, currency: string) => void;
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ onConvert }) => {
  const [amount, setAmount] = useState<number>(0);
  const [fromCurrency, setFromCurrency] = useState<'yuan' | 'kapy'>('yuan');
  const [convertedAmount, setConvertedAmount] = useState<number>(0);

  // Exchange rates (you can update these as needed)
  const exchangeRates = {
    yuan: 600, // 1 Yuan = 310 MMK
    kapy: 1.2   // 1 Kapy = 1.2 MMK
  };

  useEffect(() => {
    const converted = amount * exchangeRates[fromCurrency];
    setConvertedAmount(converted);
  }, [amount, fromCurrency]);

  const handleConvert = () => {
    onConvert(convertedAmount, fromCurrency);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Currency Converter</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value as 'yuan' | 'kapy')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="yuan">Chinese Yuan (¥)</option>
            <option value="kapy">Kapy</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To MMK</label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium">
            {formatCurrency(convertedAmount)}
          </div>
        </div>
        
        <Button
          onClick={handleConvert}
          className="flex items-center gap-2"
          disabled={amount <= 0}
        >
          <Calculator size={16} />
          Use Amount
        </Button>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Exchange Rates:</strong> 1 Yuan = {exchangeRates.yuan} MMK | 1 Kapy = {exchangeRates.kapy} MMK
        </p>
      </div>
    </div>
  );
};

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    dailyCash: 0,
    dailyRemaingDeposite: 0,
    dailyyuantommk: 0,
    monthlyStats: {},
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<'daily-cash' | 'monthly-cash' | 'daily-kapy' | 'monthly-kapy'>('daily-cash');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  useEffect(() => {
    setStats(calculateStats(transactions));
  }, [transactions]);

  const handleAddTransaction = (category: 'daily-cash' | 'daily-remaininng-' | 'daily-kapy' | 'monthly-kapy') => {
    setCurrentCategory(category);
    setEditingTransaction(null);
    setConvertedAmount(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentCategory(transaction.category);
    setEditingTransaction(transaction);
    setConvertedAmount(null);
    setIsModalOpen(true);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setViewingTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    if (window.confirm(`Are you sure you want to delete "${transaction.description}"?`)) {
      setTransactions(prev => prev.filter(t => t.id !== transaction.id));
    }
  };

  const handleFormSubmit = async (data: Transaction) => {
    setIsSubmitting(true);
    
    try {
      const transactionData = {
        ...data,
        amount: convertedAmount || data.amount
      };

      if (editingTransaction?.id) {
        setTransactions(prev => 
          prev.map(t => t.id === editingTransaction.id ? { 
            ...transactionData, 
            id: t.id, 
            updatedAt: new Date().toISOString() 
          } : t)
        );
      } else {
        const newTransaction = {
          ...transactionData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        setTransactions(prev => [...prev, newTransaction]);
      }
      
      setIsModalOpen(false);
      setEditingTransaction(null);
      setConvertedAmount(null);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrencyConvert = (amount: number, currency: string) => {
    setConvertedAmount(amount);
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(transactions);
  };

  const paymentModeStats = {
    cash: transactions.filter(t => t.paymentMode === 'Cash').reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
    kapy: transactions.filter(t => t.paymentMode === 'Kapy').reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
    yuan: transactions.filter(t => t.paymentMode === 'Yuan').reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Transactions</h1>
          <p className="text-gray-600">Manage all your financial transactions across categories</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
            disabled={transactions.length === 0}
          >
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Currency Converter */}
      <CurrencyConverter onConvert={handleCurrencyConvert} />

      {/* Payment Mode Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Cash Balance"
          value={formatCurrency(paymentModeStats.cash)}
          icon={Banknote}
          color={paymentModeStats.cash >= 0 ? 'green' : 'red'}
        />
        <StatsCard
          title="Kapy Balance"
          value={formatCurrency(paymentModeStats.kapy)}
          icon={Coins}
          color={paymentModeStats.kapy >= 0 ? 'green' : 'red'}
        />
        <StatsCard
          title="Yuan Balance (MMK)"
          value={formatCurrency(paymentModeStats.yuan)}
          icon={DollarSign}
          color={paymentModeStats.yuan >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Quick Add Buttons */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add Transaction</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={() => handleAddTransaction('daily-cash')}
            className="flex items-center gap-3 justify-center"
            variant="outline"
          >
            <PlusCircle size={16} />
            Daily Cash
          </Button>
          <Button
            onClick={() => handleAddTransaction('daily-remaining')}
            className="flex items-center gap-3 justify-center"
            variant="outline"
          >
            <PlusCircle size={16} />
            Daily Remaining Deposite
          </Button>
          <Button
            onClick={() => handleAddTransaction('daily-yuan to-mmk')}
            className="flex items-center gap-3 justify-center"
            variant="outline"
          >
            <PlusCircle size={16} />
            Yuan To MMK
          </Button>
         
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
          <span className="text-sm text-gray-500">{transactions.length} total transactions</span>
        </div>
        
        <TransactionList
          transactions={transactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onView={handleViewTransaction}
          showFilters={true}
        />
      </div>

      {/* Transaction Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
          setConvertedAmount(null);
        }}
        title={`${editingTransaction ? 'Edit' : 'Add'} ${currentCategory.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Transaction`}
      >
        <div className="space-y-4">
          {convertedAmount && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">
                <strong>Converted Amount:</strong> {formatCurrency(convertedAmount)} MMK
              </p>
            </div>
          )}
          <TransactionForm
            onSubmit={handleFormSubmit}
            initialData={editingTransaction || undefined}
            isSubmitting={isSubmitting}
            category={currentCategory}
            convertedAmount={convertedAmount}
          />
        </div>
      </Modal>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setViewingTransaction(null);
        }}
        transaction={viewingTransaction}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
};

export default TransactionsPage;