import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  ArrowRightLeft, 
  PiggyBank,
  TrendingUp,
  Building2,
  Filter,
  Download
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { transferService, DailyTransferSummary } from '../../services/transfersService';

interface TransferDashboardProps {
  store?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  onTransferTypeFilter?: (type: string) => void;
}

const TransferDashboard: React.FC<TransferDashboardProps> = ({
  store,
  onDateRangeChange,
  onTransferTypeFilter
}) => {
  const [dailySummaries, setDailySummaries] = useState<DailyTransferSummary[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<string>('7days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedTransferType, setSelectedTransferType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate date range based on selection
  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (selectedDateRange) {
      case 'today':
        startDate = today;
        break;
      case '3days':
        startDate = subDays(today, 2);
        break;
      case '7days':
        startDate = subDays(today, 6);
        break;
      case '10days':
        startDate = subDays(today, 9);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          startDate = subDays(today, 6);
        }
        break;
      default:
        startDate = subDays(today, 6);
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  };

  // Load daily summaries
  const loadDailySummaries = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const summaries = await transferService.getDailyTransferSummary(
        startDate,
        endDate,
        store !== 'all' ? store : undefined
      );
      setDailySummaries(summaries);
      
      // Notify parent component about date range change
      if (onDateRangeChange) {
        onDateRangeChange(startDate, endDate);
      }
    } catch (error) {
      console.error('Error loading daily summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDailySummaries();
  }, [selectedDateRange, customStartDate, customEndDate, store]);

  // Calculate totals
  const totals = dailySummaries.reduce(
    (acc, summary) => ({
      cash: acc.cash + summary.cash,
      yuan: acc.yuan + summary.yuan,
      yuanToMmk: acc.yuanToMmk + summary.yuanToMmk,
      remainingDeposit: acc.remainingDeposit + summary.remainingDeposit,
      totalTransactions: acc.totalTransactions + summary.totalTransactions
    }),
    { cash: 0, yuan: 0, yuanToMmk: 0, remainingDeposit: 0, totalTransactions: 0 }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const handleTransferTypeClick = (type: string) => {
    setSelectedTransferType(type);
    if (onTransferTypeFilter) {
      onTransferTypeFilter(type);
    }
  };

  const getDateRangeLabel = () => {
    const { startDate, endDate } = getDateRange();
    if (startDate === endDate) {
      return format(new Date(startDate), 'MMM dd, yyyy');
    }
    return `${format(new Date(startDate), 'MMM dd')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Transfer Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getDateRangeLabel()} • {store !== 'all' ? `${store} Store` : 'All Stores'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDailySummaries}
          disabled={isLoading}
        >
          <Download size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-3">
          <Calendar size={18} className="text-gray-500 mr-2" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Date Range
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          {[
            { value: 'today', label: 'Today' },
            { value: '3days', label: '3 Days' },
            { value: '7days', label: '7 Days' },
            { value: '10days', label: '10 Days' },
            { value: 'custom', label: 'Custom' }
          ].map((option) => (
            <Button
              key={option.value}
              variant={selectedDateRange === option.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedDateRange(option.value)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {selectedDateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
            selectedTransferType === 'cash' 
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
              : 'border-gray-200 dark:border-gray-700'
          }`}
          onClick={() => handleTransferTypeClick('cash')}
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Cash</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(totals.cash)}
              </p>
              <p className="text-xs text-gray-500">MMK</p>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
            selectedTransferType === 'yuan_to_mmk' 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-200 dark:border-gray-700'
          }`}
          onClick={() => handleTransferTypeClick('yuan_to_mmk')}
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Yuan Converted</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(totals.yuan)}
              </p>
              <p className="text-xs text-gray-500">
                = {formatCurrency(totals.yuanToMmk)} MMK
              </p>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
            selectedTransferType === 'remaining_deposit' 
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
              : 'border-gray-200 dark:border-gray-700'
          }`}
          onClick={() => handleTransferTypeClick('remaining_deposit')}
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
              <PiggyBank className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Deposits</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(totals.remainingDeposit)}
              </p>
              <p className="text-xs text-gray-500">MMK</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {totals.totalTransactions}
              </p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Daily Breakdown
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Cash (MMK)
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Yuan
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Yuan to MMK
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Deposits (MMK)
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Transactions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {dailySummaries.map((summary) => (
                <tr key={summary.date} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                    {format(new Date(summary.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                    {formatCurrency(summary.cash)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                    {formatCurrency(summary.yuan)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                    {formatCurrency(summary.yuanToMmk)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                    {formatCurrency(summary.remainingDeposit)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                    {summary.totalTransactions}
                  </td>
                </tr>
              ))}
              
              {dailySummaries.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No transfer data found for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransferDashboard;