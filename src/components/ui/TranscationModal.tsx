import React from 'react';
import { X, Edit, Trash2, Calendar, CreditCard, Tag, FileText, Hash, MapPin } from 'lucide-react';
import { Transaction } from '../../types/transaction';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import Button from './Button';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !transaction) return null;

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'daily-cash': return 'Daily Cash';
      case 'monthly-cash': return 'Monthly Cash';
      case 'daily-kapy': return 'Daily Kapy';
      case 'monthly-kapy': return 'Monthly Kapy';
      default: return category;
    }
  };

  const getLocationLabel = (location?: string) => {
    switch (location) {
      case 'win': return 'Win';
      case 'pwint': return 'Pwint';
      case 'yangon': return 'Yangon';
      default: return 'Not specified';
    }
  };

  const handleEdit = () => {
    onEdit(transaction);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${transaction.description}"?`)) {
      onDelete(transaction);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="inline-block w-full max-w-2xl p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className={`px-6 py-4 ${
            transaction.type === 'income' 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200' 
              : 'bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  transaction.type === 'income' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {transaction.type === 'income' ? '↗' : '↘'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{transaction.description}</h3>
                  <p className={`text-sm ${
                    transaction.type === 'income' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {transaction.type === 'income' ? 'Income' : 'Expense'} Transaction
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Amount */}
            <div className="text-center mb-6">
              <div className={`text-4xl font-bold ${
                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date</p>
                    <p className="text-gray-900">{format(new Date(transaction.date), 'PPPP')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Mode</p>
                    <p className="text-gray-900">{transaction.paymentMode}</p>
                  </div>
                </div>

                {transaction.location && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="text-gray-900">{getLocationLabel(transaction.location)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">C</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Category</p>
                    <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                      transaction.category === 'daily-cash' ? 'bg-blue-100 text-blue-700' :
                      transaction.category === 'monthly-cash' ? 'bg-purple-100 text-purple-700' :
                      transaction.category === 'daily-kapy' ? 'bg-orange-100 text-orange-700' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {getCategoryLabel(transaction.category)}
                    </span>
                  </div>
                </div>

                {transaction.reference && (
                  <div className="flex items-center space-x-3">
                    <Hash className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reference</p>
                      <p className="text-gray-900 font-mono">{transaction.reference}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Tag className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Tags</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {transaction.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {transaction.notes && (
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 italic">"{transaction.notes}"</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                {transaction.createdAt && (
                  <div>
                    <p className="font-medium">Created</p>
                    <p>{format(new Date(transaction.createdAt), 'PPp')}</p>
                  </div>
                )}
                {transaction.updatedAt && transaction.updatedAt !== transaction.createdAt && (
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p>{format(new Date(transaction.updatedAt), 'PPp')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;