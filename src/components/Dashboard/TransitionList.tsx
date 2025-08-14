import React, { useState } from 'react';
import { Edit, Trash2, TrendingUp, TrendingDown, Filter, Search, Calendar, Tag, MapPin, Eye } from 'lucide-react';
import { Transaction } from '../../types/transaction';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onView?: (transaction: Transaction) => void;
  category?: string;
  showFilters?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  onView,
  category,
  showFilters = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredTransactions = category 
    ? transactions.filter(t => t.category === category)
    : transactions;

  // Apply filters and search
  const processedTransactions = filteredTransactions
    .filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (transaction.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                           (transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'all' || transaction.type === filterType;
      const matchesPayment = filterPayment === 'all' || transaction.paymentMode === filterPayment;
      const matchesLocation = filterLocation === 'all' || transaction.location === filterLocation;
      
      return matchesSearch && matchesType && matchesPayment && matchesLocation;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'daily-cash': return 'Daily Cash';
      case 'monthly-cash': return 'Monthly Cash';
      case 'daily-kapy': return 'Daily Kapy';
      case 'monthly-kapy': return 'Monthly Kapy';
      default: return cat;
    }
  };

  const getLocationLabel = (location?: string) => {
    switch (location) {
      case 'win': return 'Win';
      case 'pwint': return 'Pwint';
      case 'yangon': return 'Yangon';
      default: return '';
    }
  };

  const getUniquePaymentModes = () => {
    const modes = [...new Set(transactions.map(t => t.paymentMode))];
    return modes.map(mode => ({ value: mode, label: mode }));
  };

  if (processedTransactions.length === 0 && searchTerm === '' && filterType === 'all') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
        <p className="text-gray-500">Start by adding your first transaction</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter size={16} />
            <span>Filters & Search</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <Select
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'income', label: 'Income Only' },
                { value: 'expense', label: 'Expenses Only' },
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            />
            
            <Select
              options={[
                { value: 'all', label: 'All Payment Modes' },
                ...getUniquePaymentModes(),
              ]}
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            />

            <Select
              options={[
                { value: 'all', label: 'All Locations' },
                { value: 'win', label: 'Win' },
                { value: 'pwint', label: 'Pwint' },
                { value: 'yangon', label: 'Yangon' },
              ]}
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            />
            
            <div className="flex gap-2">
              <Select
                options={[
                  { value: 'date', label: 'Sort by Date' },
                  { value: 'amount', label: 'Sort by Amount' },
                  { value: 'description', label: 'Sort by Description' },
                ]}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Showing {processedTransactions.length} of {filteredTransactions.length} transactions</span>
            {(searchTerm || filterType !== 'all' || filterPayment !== 'all' || filterLocation !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterPayment('all');
                  setFilterLocation('all');
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-3">
        {processedTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`p-3 rounded-full ${
                  transaction.type === 'income' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {transaction.type === 'income' ? (
                    <TrendingUp size={20} />
                  ) : (
                    <TrendingDown size={20} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">{transaction.description}</h4>
                    {transaction.reference && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        #{transaction.reference}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </span>
                    <span>{getCategoryLabel(transaction.category)}</span>
                    <span>{transaction.paymentMode}</span>
                    {transaction.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {getLocationLabel(transaction.location)}
                      </span>
                    )}
                  </div>
                  
                  {transaction.tags && transaction.tags.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <Tag size={14} className="text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {transaction.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {transaction.notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      "{transaction.notes}"
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4 ml-4">
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>
                
                <div className="flex space-x-1">
                  {onView && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(transaction)}
                      className="p-2"
                      title="View details"
                    >
                      <Eye size={14} />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(transaction)}
                    className="p-2"
                    title="Edit transaction"
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(transaction)}
                    className="p-2"
                    title="Delete transaction"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {processedTransactions.length === 0 && (searchTerm || filterType !== 'all' || filterPayment !== 'all' || filterLocation !== 'all') && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matching transactions</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default TransactionList;