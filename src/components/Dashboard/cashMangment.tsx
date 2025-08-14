import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard,
  PlusCircle,
  Download,
} from 'lucide-react';
import { Transaction, DashboardStats } from './types/transaction';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateStats, formatCurrency, exportTransactionsToCSV } from './lib/utils';
import StatsCard from './components/dashboard/StatsCard';
import TransactionForm from './components/forms/TransactionForm';
import TransactionList from './components/dashboard/TransactionList';
import MonthlyReport from './components/dashboard/MonthlyReport';
import TransactionDetailModal from './components/ui/TransactionDetailModal';
import TransactionsPage from './components/pages/TransactionsPage';
import Sidebar from './components/ui/Sidebar';
import Button from './components/ui/Button';
import Modal from './components/ui/Modal';
import Tabs from './components/ui/Tabs';

const CashManagementDashboard: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<'win' | 'pwint' | 'yangon'>('win');
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    dailyCash: 0,
    monthlyCash: 0,
    dailyKapy: 0,
    monthlyKapy: 0,
    monthlyStats: {},
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<'daily-cash' | 'monthly-cash' | 'daily-kapy' | 'monthly-kapy'>('daily-cash');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStats(calculateStats(transactions));
  }, [transactions]);

  const handleAddTransaction = (category: 'daily-cash' | 'monthly-cash' | 'daily-kapy' | 'monthly-kapy') => {
    setCurrentCategory(category);
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentCategory(transaction.category);
    setEditingTransaction(transaction);
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
      if (editingTransaction?.id) {
        setTransactions(prev => 
          prev.map(t => t.id === editingTransaction.id ? { ...data, id: t.id, updatedAt: new Date().toISOString() } : t)
        );
      } else {
        const newTransaction = {
          ...data,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        setTransactions(prev => [...prev, newTransaction]);
      }
      
      setIsModalOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryTransactions = (category: string) => {
    return transactions.filter(t => t.category === category);
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(transactions);
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          {/* Header with Export */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>
              <p className="text-gray-600">Complete view of your financial status across all locations</p>
            </div>
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

          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Income"
              value={formatCurrency(stats.totalIncome)}
              icon={TrendingUp}
              color="green"
            />
            <StatsCard
              title="Total Expenses"
              value={formatCurrency(stats.totalExpenses)}
              icon={TrendingDown}
              color="red"
            />
            <StatsCard
              title="Net Balance"
              value={formatCurrency(stats.netBalance)}
              icon={DollarSign}
              color={stats.netBalance >= 0 ? 'green' : 'red'}
            />
            <StatsCard
              title="Total Transactions"
              value={transactions.length.toString()}
              icon={CreditCard}
              color="blue"
            />
          </div>

          {/* Category Balances */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Balances</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Daily Cash"
                value={formatCurrency(stats.dailyCash)}
                icon={Wallet}
                color="blue"
              />
              <StatsCard
                title="Monthly Cash"
                value={formatCurrency(stats.monthlyCash)}
                icon={Wallet}
                color="purple"
              />
              <StatsCard
                title="Daily Kapy"
                value={formatCurrency(stats.dailyKapy)}
                icon={CreditCard}
                color="orange"
              />
              <StatsCard
                title="Monthly Kapy"
                value={formatCurrency(stats.monthlyKapy)}
                icon={CreditCard}
                color="indigo"
              />
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <span className="text-sm text-gray-500">Last 10 transactions</span>
            </div>
            <TransactionList
              transactions={transactions.slice(0, 10)}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onView={handleViewTransaction}
              showFilters={false}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'daily-cash',
      label: 'Daily Cash',
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Daily Cash Management</h2>
              <p className="text-gray-600">Track your daily cash income and expenses across Win, Pwint, and Yangon</p>
            </div>
            <Button
              onClick={() => handleAddTransaction('daily-cash')}
              className="flex items-center gap-2"
            >
              <PlusCircle size={16} />
              Add Transaction
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Daily Cash Balance"
              value={formatCurrency(stats.dailyCash)}
              icon={Wallet}
              color="blue"
            />
            <StatsCard
              title="Income"
              value={formatCurrency(
                getCategoryTransactions('daily-cash')
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              icon={TrendingUp}
              color="green"
            />
            <StatsCard
              title="Expenses"
              value={formatCurrency(
                getCategoryTransactions('daily-cash')
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              icon={TrendingDown}
              color="red"
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Cash Transactions</h3>
            <TransactionList
              transactions={getCategoryTransactions('daily-cash')}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onView={handleViewTransaction}
              category="daily-cash"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'monthly-cash',
      label: 'Monthly Cash',
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Monthly Cash Management</h2>
              <p className="text-gray-600">Track your monthly cash income and expenses</p>
            </div>
            <Button
              onClick={() => handleAddTransaction('monthly-cash')}
              className="flex items-center gap-2"
            >
              <PlusCircle size={16} />
              Add Transaction
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Monthly Cash Balance"
              value={formatCurrency(stats.monthlyCash)}
              icon={Wallet}
              color="purple"
            />
            <StatsCard
              title="Income"
              value={formatCurrency(
                getCategoryTransactions('monthly-cash')
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              icon={TrendingUp}
              color="green"
            />
            <StatsCard
              title="Expenses"
              value={formatCurrency(
                getCategoryTransactions('monthly-cash')
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              icon={TrendingDown}
              color="red"
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Cash Transactions</h3>
            <TransactionList
              transactions={getCategoryTransactions('monthly-cash')}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onView={handleViewTransaction}
              category="monthly-cash"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'daily-kapy',
      label: 'Daily Kapy',
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Daily Kapy Management</h2>
              <p className="text-gray-600">Track your daily kapy income and expenses</p>
            </div>
            <Button
              onClick={() => handleAddTransaction('daily-kapy')}
              className="flex items-center gap-2"
            >
              <PlusCircle size={16} />
              Add Transaction
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Daily Kapy Balance"
              value={formatCurrency(stats.dailyKapy)}
              icon={CreditCard}
              color="orange"
            />
            <StatsCard
              title="Income"
              value={formatCurrency(
                getCategoryTransactions('daily-kapy')
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              icon={TrendingUp}
              color="green"
            />
            <StatsCard
              title="Expenses"
              value={formatCurrency(
                getCategoryTransactions('daily-kapy')
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              icon={TrendingDown}
              color="red"
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Kapy Transactions</h3>
            <TransactionList
              transactions={getCategoryTransactions('daily-kapy')}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onView={handleViewTransaction}
              category="daily-kapy"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'monthly-kapy',
      label: 'Monthly Kapy',
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Monthly Kapy Management</h2>
              <p className="text-gray-600">Track your monthly kapy income and expenses</p>
            </div>
            <Button
              onClick={() => handleAddTransaction('monthly-kapy')}
              className="flex items-center gap-2"
            >
              <PlusCircle size={16} />
              Add Transaction
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Monthly Kapy Balance"
              value={formatCurrency(stats.monthlyKapy)}
              icon={CreditCard}
              color="indigo"
            />
            <StatsCard
              title="Income"
              value={formatCurrency(
                getCategoryTransactions('monthly-kapy')
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              icon={TrendingUp}
              color="green"
            />
            <StatsCard
              title="Expenses"
              value={formatCurrency(
                getCategoryTransactions('monthly-kapy')
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              icon={TrendingDown}
              color="red"
            />
          </div>

              
        </div>
      ),
    },
    {
      id: 'reports',
      label: 'Reports',
      content: <MonthlyReport stats={stats} />,
    },
  ];

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar 
          currentLocation={currentLocation}
          onLocationChange={setCurrentLocation}
        />
        
        <div className="flex-1 lg:ml-80">
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Cash Management Dashboard</h1>
                    <p className="mt-2 text-gray-600">
                      Financial management for {currentLocation.charAt(0).toUpperCase() + currentLocation.slice(1)} location
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Current Location: <span className="font-medium text-gray-900">{currentLocation.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Tabs tabs={tabs} defaultTab="overview" />} />
              <Route path="/transactions/*" element={<TransactionsPage />} />
              <Route path="/reports" element={<MonthlyReport stats={stats} />} />
            </Routes>
          </div>
        </div>

        {/* Transaction Form Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          title={`${editingTransaction ? 'Edit' : 'Add'} ${currentCategory.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Transaction`}
        >
          <TransactionForm
            onSubmit={handleFormSubmit}
            initialData={editingTransaction || undefined}
            isSubmitting={isSubmitting}
            category={currentCategory}
          />
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
    </Router>
  );
};

export default CashManagementDashboard;