import React from 'react';
import { useForm } from 'react-hook-form';
import { Transaction } from '../../types/transaction';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface TransactionFormProps {
  onSubmit: (data: Transaction) => void;
  initialData?: Transaction;
  isSubmitting?: boolean;
  category: 'daily-cash' | 'monthly-cash' | 'daily-kapy' | 'monthly-kapy';
  convertedAmount?: number | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
  category,
  convertedAmount,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Transaction>({
    defaultValues: initialData || {
      type: 'income',
      category,
      description: '',
      amount: 0,
      paymentMode: 'Cash',
      date: new Date().toISOString().substring(0, 10),
      location: 'win',
    },
  });

  const getCategoryLabel = () => {
    switch (category) {
      case 'daily-cash': return 'Daily Cash';
      case 'monthly-remaing': return 'Monthly Remaining';
      case 'daily-kapy': return 'Daily Yuan to MMK';
;
      default: return 'Transaction';
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <h3 className="font-medium text-blue-900">{getCategoryLabel()} Transaction</h3>
      </div>

      <Select
        label="Transaction Type"
        options={[
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
        ]}
        {...register('type', { required: 'Transaction type is required' })}
        error={errors.type?.message}
      />

      <Input
        label="Description"
        placeholder={`Enter ${getCategoryLabel().toLowerCase()} description`}
        {...register('description', { required: 'Description is required' })}
        error={errors.description?.message}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Amount"
          type="number"
          min={0}
          step="0.01"
          placeholder={convertedAmount ? convertedAmount.toString() : "0.00"}
          value={convertedAmount || undefined}
          readOnly={!!convertedAmount}
          {...register('amount', { 
            required: 'Amount is required',
            valueAsNumber: true,
            value: convertedAmount || undefined,
            min: { value: 0, message: 'Amount must be 0 or greater' } 
          })}
          error={errors.amount?.message}
        />
        <Select
          label="Payment Mode"
          options={[
            { value: 'Cash', label: 'Cash' },
            { value: 'Kapy', label: 'Kapy' },
            { value: 'Yuan', label: 'Chinese Yuan' },
            
          ]}
          {...register('paymentMode', { required: 'Payment mode is required' })}
          error={errors.paymentMode?.message}
        />
      </div>

      {convertedAmount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Using converted amount:</strong> {convertedAmount.toLocaleString()} MMK
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          {...register('date', { required: 'Date is required' })}
          error={errors.date?.message}
        />
        <Select
          label="Location"
          options={[
            { value: 'win', label: 'Win' },
            { value: 'pwint', label: 'Pwint' },
            { value: 'yangon', label: 'Yangon' },
          ]}
          {...register('location')}
        />
      </div>

      <Input
        label="Reference (Optional)"
        placeholder="Enter reference number"
        {...register('reference')}
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add any additional notes..."
        />
      </div>

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Transaction' : 'Add Transaction'}
      </Button>
    </form>
  );
};

export default TransactionForm;