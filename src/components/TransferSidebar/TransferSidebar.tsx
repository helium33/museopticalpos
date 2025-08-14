import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  Plus, 
  X, 
  DollarSign, 
  Building2, 
  Hash,
  Calendar,
  FileText
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useTheme } from '../../context/ThemeContext';

interface Transfer {
  id: string;
  transactionNo: string;
  store: 'Win' | 'Pwint' | 'Yangon';
  type: 'cash' | 'yuan_to_mmk' | 'remaining_deposit';
  amount: number;
  rate?: number;
  date: string;
  description?: string;
  createdAt: string;
}

interface TransferSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransfer: (transfer: Omit<Transfer, 'id' | 'date' | 'createdAt'>) => void;
}

const TransferSidebar: React.FC<TransferSidebarProps> = ({
  isOpen,
  onClose,
  onAddTransfer
}) => {
  const { theme } = useTheme();
  
  const [formData, setFormData] = useState({
    transactionNo: '',
    store: 'Win' as 'Win' | 'Pwint' | 'Yangon',
    type: 'cash' as 'cash' | 'yuan_to_mmk' | 'remaining_deposit',
    amount: '',
    rate: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.transactionNo.trim()) {
      newErrors.transactionNo = 'Transaction number is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (formData.type === 'yuan_to_mmk' && (!formData.rate || parseFloat(formData.rate) <= 0)) {
      newErrors.rate = 'Exchange rate is required for Yuan to MMK transfers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) return;

  const transferData = {
    transactionNo: formData.transactionNo,
    store: formData.store,
    type: formData.type,
    amount: parseFloat(formData.amount),
    // Only include rate if it exists and is not empty
  ...(formData.rate && { rate: parseFloat(formData.rate) }),
    description: formData.description
  };

  onAddTransfer(transferData);
  
  // Reset form
  setFormData({
    transactionNo: '',
    store: 'Win',
    type: 'cash',
    amount: '',
    rate: '',
    description: ''
  });
  setErrors({});
  onClose();
};

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cash': return 'Cash Transfer';
      case 'yuan_to_mmk': return 'Yuan to MMK';
      case 'remaining_deposit': return 'Remaining Deposit';
      default: return type;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ArrowRightLeft className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  New Transfer
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add money transfer record
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Transaction Number */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Hash size={16} className="mr-2" />
                  Transaction Number
                </label>
                <Input
                  type="text"
                  value={formData.transactionNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionNo: e.target.value }))}
                  placeholder="Enter transaction number"
                  className={`w-full ${errors.transactionNo ? 'border-red-500' : ''}`}
                />
                {errors.transactionNo && (
                  <p className="mt-1 text-sm text-red-600">{errors.transactionNo}</p>
                )}
              </div>

              {/* Store Selection */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 size={16} className="mr-2" />
                  Store
                </label>
                <select
                  value={formData.store}
                  onChange={(e) => setFormData(prev => ({ ...prev, store: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="Win">Win Store</option>
                  <option value="Pwint">Pwint Store</option>
                  <option value="Yangon">Yangon Store</option>
                </select>
              </div>

              {/* Transfer Type */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <ArrowRightLeft size={16} className="mr-2" />
                  Transfer Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="cash">Cash Transfer</option>
                  <option value="yuan_to_mmk">Yuan to MMK</option>
                  <option value="remaining_deposit">Remaining Deposit</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {getTypeLabel(formData.type)}
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign size={16} className="mr-2" />
                  Amount {formData.type === 'yuan_to_mmk' ? '(Yuan)' : '(MMK)'}
                </label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  className={`w-full ${errors.amount ? 'border-red-500' : ''}`}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Exchange Rate (only for Yuan to MMK) */}
              {formData.type === 'yuan_to_mmk' && (
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <ArrowRightLeft size={16} className="mr-2" />
                    Exchange Rate (MMK per Yuan)
                  </label>
                  <Input
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                    placeholder="Enter exchange rate"
                    min="0"
                    step="0.01"
                    className={`w-full ${errors.rate ? 'border-red-500' : ''}`}
                  />
                  {errors.rate && (
                    <p className="mt-1 text-sm text-red-600">{errors.rate}</p>
                  )}
                  {formData.rate && formData.amount && (
                    <p className="mt-1 text-sm text-green-600">
                      Total MMK: {(parseFloat(formData.amount) * parseFloat(formData.rate)).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText size={16} className="mr-2" />
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description or notes"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Summary Card */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Transfer Summary
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Store:</span>
                    <span className="text-gray-900 dark:text-white">{formData.store}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="text-gray-900 dark:text-white">{getTypeLabel(formData.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formData.amount ? parseFloat(formData.amount).toLocaleString() : '0'} {formData.type === 'yuan_to_mmk' ? 'Yuan' : 'MMK'}
                    </span>
                  </div>
                  {formData.type === 'yuan_to_mmk' && formData.rate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">MMK Value:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formData.amount && formData.rate 
                          ? (parseFloat(formData.amount) * parseFloat(formData.rate)).toLocaleString() 
                          : '0'} MMK
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={!formData.transactionNo || !formData.amount}
                className="flex-1"
              >
                <Plus size={16} className="mr-2" />
                Add Transfer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransferSidebar;