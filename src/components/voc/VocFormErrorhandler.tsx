import React, { useState } from 'react';
import { VocItem, ERROR_CATEGORIES } from '../../types/voc';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { AlertTriangle, Plus, Minus } from 'lucide-react';
import { calculateSoldQuantity, calculateErrorQuantity, validateErrorQuantity } from '../lib/InventoryCalculation';

interface Props {
  item: VocItem;
  onUpdateItem: (updatedItem: VocItem) => void;
  onRemoveItem: () => void;
}

const VocFormErrorHandler: React.FC<Props> = ({ item, onUpdateItem, onRemoveItem }) => {
  const [showErrorDetails, setShowErrorDetails] = useState(item.hasError || false);

  const handleErrorToggle = (hasError: boolean) => {
    const updatedItem: VocItem = {
      ...item,
      hasError,
      errorQuantity: hasError ? 1 : 0,
      errorCategory: hasError ? 'form_error' : undefined,
      errorDescription: hasError ? '' : undefined
    };
    onUpdateItem(updatedItem);
    setShowErrorDetails(hasError);
  };

  const handleErrorQuantityChange = (errorQuantity: number) => {
    const validation = validateErrorQuantity(item, errorQuantity);
    
    if (validation.isValid) {
      const updatedItem: VocItem = {
        ...item,
        errorQuantity: Math.max(0, Math.min(errorQuantity, item.quantity))
      };
      onUpdateItem(updatedItem);
    }
  };

  const handleErrorCategoryChange = (errorCategory: string) => {
    const updatedItem: VocItem = {
      ...item,
      errorCategory
    };
    onUpdateItem(updatedItem);
  };

  const handleErrorDescriptionChange = (errorDescription: string) => {
    const updatedItem: VocItem = {
      ...item,
      errorDescription
    };
    onUpdateItem(updatedItem);
  };

  const soldQuantity = calculateSoldQuantity(item);
  const errorQuantity = calculateErrorQuantity(item);
  const unitPrice = item.price || 0;
  const soldAmount = soldQuantity * unitPrice;
  const errorAmount = errorQuantity * unitPrice * 0.5; // 50% discount for errors
  const totalItemAmount = soldAmount + errorAmount - (item.itemDiscount || 0);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      {/* Item Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h3>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
            {item.type}
          </span>
          {item.hasError && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded flex items-center gap-1">
              <AlertTriangle size={12} />
              Error Item
            </span>
          )}
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={onRemoveItem}
          leftIcon={<Minus size={14} />}
        >
          Remove
        </Button>
      </div>

      {/* Basic Item Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Total Quantity
          </label>
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdateItem({ ...item, quantity: parseInt(e.target.value) || 0 })}
            min="1"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unit Price (MMK)
          </label>
          <Input
            type="number"
            value={item.price}
            onChange={(e) => onUpdateItem({ ...item, price: parseFloat(e.target.value) || 0 })}
            min="0"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Item Discount (MMK)
          </label>
          <Input
            type="number"
            value={item.itemDiscount || 0}
            onChange={(e) => onUpdateItem({ ...item, itemDiscount: parseFloat(e.target.value) || 0 })}
            min="0"
            className="w-full"
          />
        </div>
      </div>

      {/* Error Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`error-${item.id}`}
          checked={item.hasError || false}
          onChange={(e) => handleErrorToggle(e.target.checked)}
          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <label htmlFor={`error-${item.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          This item has errors
        </label>
      </div>

      {/* Error Details */}
      {showErrorDetails && item.hasError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertTriangle size={16} />
            Error Details
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                Error Quantity
              </label>
              <Input
                type="number"
                value={item.errorQuantity || 0}
                onChange={(e) => handleErrorQuantityChange(parseInt(e.target.value) || 0)}
                min="0"
                max={item.quantity}
                className="w-full"
              />
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Max: {item.quantity} | Sold: {soldQuantity}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                Error Category
              </label>
              <Select
                value={item.errorCategory || ''}
                onChange={(e) => handleErrorCategoryChange(e.target.value)}
                className="w-full"
              >
                <option value="">Select category</option>
                {ERROR_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
              Error Description
            </label>
            <Textarea
              value={item.errorDescription || ''}
              onChange={(e) => handleErrorDescriptionChange(e.target.value)}
              placeholder="Describe the error..."
              rows={3}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Amount Breakdown */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Amount Breakdown</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-green-600 dark:text-green-400">
              Sold: {soldQuantity} {item.type === 'Lens' ? 'pairs' : 'pcs'} × {unitPrice.toLocaleString()} MMK
            </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {soldAmount.toLocaleString()} MMK
            </span>
          </div>
          
          {errorQuantity > 0 && (
            <div className="flex justify-between">
              <span className="text-red-600 dark:text-red-400">
                Error: {errorQuantity} {item.type === 'Lens' ? 'pairs' : 'pcs'} × {unitPrice.toLocaleString()} MMK × 50%
              </span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {errorAmount.toLocaleString()} MMK
              </span>
            </div>
          )}
          
          {(item.itemDiscount || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-yellow-600 dark:text-yellow-400">Item Discount</span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                -{(item.itemDiscount || 0).toLocaleString()} MMK
              </span>
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between font-medium">
            <span>Total Item Amount</span>
            <span>{Math.max(0, totalItemAmount).toLocaleString()} MMK</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VocFormErrorHandler;