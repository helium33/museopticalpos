import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import useStoreStore from '../../stores/useStoreStore';
import TransferSidebar from '../../components/TransferSidebar/TransferSidebar';
import TransferDashboard from '../../components/TransferSidebar/TransferDashboard';
import DataTable from '../../components/tables/DataTable';
import { transferService, Transfer } from '../../services/transfersService';
import toast from 'react-hot-toast';

const TransfersPage: React.FC = () => {
  const { theme } = useTheme();
  const { currentStore } = useStoreStore();
  
  // State management
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [showTransferSidebar, setShowTransferSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: ''
  });

  // Load transfers
  const loadTransfers = async () => {
    setIsLoading(true);
    try {
      const filters = {
        store: selectedStore,
        type: selectedType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      const transfersData = await transferService.getTransfers(filters);
      setTransfers(transfersData);
      setFilteredTransfers(transfersData);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast.error('Failed to load transfers');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTransfers();
  }, [selectedStore, selectedType, dateRange]);

  // Real-time updates
  useEffect(() => {
    const unsubscribe = transferService.subscribeToTransfers(
      (transfersData) => {
        setTransfers(transfersData);
        setFilteredTransfers(transfersData);
      },
      {
        store: selectedStore,
        type: selectedType
      }
    );

    return unsubscribe;
  }, [selectedStore, selectedType]);

  const handleAddTransfer = async (transferData: Omit<Transfer, 'id' | 'createdAt'>) => {
    try {
      await transferService.addTransfer(transferData);
      loadTransfers(); // Refresh the list
    } catch (error) {
      console.error('Error adding transfer:', error);
    }
  };

  const handleDeleteTransfer = async (transferId: string) => {
    if (window.confirm('Are you sure you want to delete this transfer?')) {
      try {
        await transferService.deleteTransfer(transferId);
        loadTransfers(); // Refresh the list
      } catch (error) {
        console.error('Error deleting transfer:', error);
      }
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  const handleTransferTypeFilter = (type: string) => {
    setSelectedType(type);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cash': return 'Cash';
      case 'yuan_to_mmk': return 'Yuan to MMK';
      case 'remaining_deposit': return 'Remaining Deposit';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cash': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'yuan_to_mmk': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'remaining_deposit': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  // Table columns
  const columns = [
    {
      key: 'transactionNo',
      header: 'Transaction No',
      sortable: true,
      render: (transfer: Transfer) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {transfer.transactionNo}
        </div>
      )
    },
    {
      key: 'store',
      header: 'Store',
      sortable: true,
      render: (transfer: Transfer) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {transfer.store}
        </span>
      )
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (transfer: Transfer) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(transfer.type)}`}>
          {getTypeLabel(transfer.type)}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortType: 'number' as const,
      render: (transfer: Transfer) => (
        <div className="text-sm text-gray-900 dark:text-white">
          <div className="font-medium">
            {formatCurrency(transfer.amount)} {transfer.type === 'yuan_to_mmk' ? 'Yuan' : 'MMK'}
          </div>
          {transfer.type === 'yuan_to_mmk' && transfer.rate && (
            <div className="text-xs text-gray-500">
              = {formatCurrency(transfer.amount * transfer.rate)} MMK
            </div>
          )}
        </div>
      )
    },
    {
      key: 'rate',
      header: 'Rate',
      render: (transfer: Transfer) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {transfer.rate ? `${transfer.rate} MMK/Yuan` : '-'}
        </span>
      )
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (transfer: Transfer) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {new Date(transfer.date).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (transfer: Transfer) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
          {transfer.description || '-'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (transfer: Transfer) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteTransfer(transfer.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Money Transfers
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage money transfers across stores
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={loadTransfers}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowTransferSidebar(true)}
            className="flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Add Transfer
          </Button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="mb-6">
        <TransferDashboard
          store={selectedStore}
          onDateRangeChange={handleDateRangeChange}
          onTransferTypeFilter={handleTransferTypeFilter}
        />
      </div>

      {/* Store Filter */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Store Filter:
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Stores</option>
              <option value="Win">Win Store</option>
              <option value="Pwint">Pwint Store</option>
              <option value="Yangon">Yangon Store</option>
              <option value="yangon-office">Yangon Head Office</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transfer History ({filteredTransfers.length} records)
          </h3>
        </div>

        <div className="p-6">
          <DataTable
            data={filteredTransfers}
            columns={columns}
            searchable={true}
            filterKey="transactionNo"
            itemsPerPage={10}
          />
        </div>
      </div>

      {/* Transfer Sidebar */}
      <TransferSidebar
        isOpen={showTransferSidebar}
        onClose={() => setShowTransferSidebar(false)}
        onAddTransfer={handleAddTransfer}
      />
    </div>
  );
};

export default TransfersPage;