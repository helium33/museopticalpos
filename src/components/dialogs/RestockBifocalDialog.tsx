import React, { useState } from 'react';
import { X, Package, Plus, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface RestockBifocalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  currentRightQty: number;
  currentLeftQty: number;
  onRestock: (rightQty: number, leftQty: number, reason: string, supplier: string) => void;
}

const RestockBifocalDialog: React.FC<RestockBifocalDialogProps> = ({
  isOpen,
  onClose,
  itemName,
  currentRightQty,
  currentLeftQty,
  onRestock,
}) => {
  const [restockRightQty, setRestockRightQty] = useState(0);
  const [restockLeftQty, setRestockLeftQty] = useState(0);
  const [reason, setReason] = useState('');
  const [supplier, setSupplier] = useState('');
  const [errors, setErrors] = useState<{ right?: string; left?: string; reason?: string; supplier?: string }>({});

  if (!isOpen) return null;

  // Helper function to validate 0.5 increments
  const validateHalfIncrement = (value: number): boolean => {
    return (value * 2) % 1 === 0;
  };

  // Helper function to round to nearest 0.5
  const roundToHalf = (value: number): number => {
    return Math.round(value * 2) / 2;
  };

  const validateInputs = () => {
    const newErrors: { right?: string; left?: string; reason?: string; supplier?: string } = {};
    
    if (restockRightQty < 0) {
      newErrors.right = 'Right quantity cannot be negative';
    } else if (!validateHalfIncrement(restockRightQty)) {
      newErrors.right = 'Right quantity must be in 0.5 increments';
    }
    
    if (restockLeftQty < 0) {
      newErrors.left = 'Left quantity cannot be negative';
    } else if (!validateHalfIncrement(restockLeftQty)) {
      newErrors.left = 'Left quantity must be in 0.5 increments';
    }
    
    if (restockRightQty === 0 && restockLeftQty === 0) {
      newErrors.right = 'Must restock at least 0.5 pieces';
    }
    
    if (!reason.trim()) {
      newErrors.reason = 'Reason is required';
    }
    
    if (!supplier.trim()) {
      newErrors.supplier = 'Supplier is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRestock = () => {
    if (validateInputs()) {
      onRestock(restockRightQty, restockLeftQty, reason, supplier);
      handleClose();
    }
  };

  const handleClose = () => {
    setRestockRightQty(0);
    setRestockLeftQty(0);
    setReason('');
    setSupplier('');
    setErrors({});
    onClose();
  };

  const handleQuickRestock = (type: 'pair' | 'half-pair' | 'right' | 'left' | 'right-half' | 'left-half') => {
    switch (type) {
      case 'pair':
        setRestockRightQty(1);
        setRestockLeftQty(1);
        break;
      case 'half-pair':
        setRestockRightQty(0.5);
        setRestockLeftQty(0.5);
        break;
      case 'right':
        setRestockRightQty(1);
        setRestockLeftQty(0);
        break;
      case 'left':
        setRestockRightQty(0);
        setRestockLeftQty(1);
        break;
      case 'right-half':
        setRestockRightQty(0.5);
        setRestockLeftQty(0);
        break;
      case 'left-half':
        setRestockRightQty(0);
        setRestockLeftQty(0.5);
        break;
    }
    setErrors({});
  };

  const handleQuantityChange = (type: 'right' | 'left', value: string) => {
    const numValue = parseFloat(value) || 0;
    const roundedValue = roundToHalf(numValue);
    
    if (type === 'right') {
      setRestockRightQty(roundedValue);
      setErrors(prev => ({ ...prev, right: '' }));
    } else {
      setRestockLeftQty(roundedValue);
      setErrors(prev => ({ ...prev, left: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Restock Flattop Lens
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {itemName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Current Right Stock
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {currentRightQty}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">pieces</div>
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Current Left Stock
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {currentLeftQty}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">pieces</div>
              </div>
            </div>
          </div>

          {/* Quantity Info */}
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
              <AlertCircle size={16} />
              <span>Restock quantities must be in 0.5 increments (0.5, 1, 1.5, 2, etc.)</span>
            </div>
          </div>

          {/* Quick Restock Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Restock:</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRestock('pair')}
                className="flex flex-col items-center p-3 h-auto border-green-300 text-green-700 hover:bg-green-50"
              >
                <div className="text-xs font-medium">1 Full Pair</div>
                <div className="text-xs text-green-600">R: 1, L: 1</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRestock('half-pair')}
                className="flex flex-col items-center p-3 h-auto border-green-300 text-green-700 hover:bg-green-50"
              >
                <div className="text-xs font-medium">0.5 Pair</div>
                <div className="text-xs text-green-600">R: 0.5, L: 0.5</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRestock('right')}
                className="flex flex-col items-center p-3 h-auto border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <div className="text-xs font-medium">Right 1</div>
                <div className="text-xs text-blue-500">R: 1</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRestock('right-half')}
                className="flex flex-col items-center p-3 h-auto border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <div className="text-xs font-medium">Right 0.5</div>
                <div className="text-xs text-blue-500">R: 0.5</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRestock('left')}
                className="flex flex-col items-center p-3 h-auto border-green-300 text-green-700 hover:bg-green-50"
              >
                <div className="text-xs font-medium">Left 1</div>
                <div className="text-xs text-green-500">L: 1</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickRestock('left-half')}
                className="flex flex-col items-center p-3 h-auto border-green-300 text-green-700 hover:bg-green-50"
              >
                <div className="text-xs font-medium">Left 0.5</div>
                <div className="text-xs text-green-500">L: 0.5</div>
              </Button>
            </div>
          </div>

          {/* Manual Input */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Restock Quantities:</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Right Eye Qty"
                  type="number"
                  value={restockRightQty}
                  onChange={(e) => handleQuantityChange('right', e.target.value)}
                  min="0"
                  step="0.5"
                  error={errors.right}
                  className="border-blue-300 focus:border-blue-500"
                  placeholder="0.5, 1, 1.5..."
                />
              </div>
              
              <div>
                <Input
                  label="Left Eye Qty"
                  type="number"
                  value={restockLeftQty}
                  onChange={(e) => handleQuantityChange('left', e.target.value)}
                  min="0"
                  step="0.5"
                  error={errors.left}
                  className="border-green-300 focus:border-green-500"
                  placeholder="0.5, 1, 1.5..."
                />
              </div>
            </div>
          </div>

          {/* Reason and Supplier */}
          <div className="space-y-4">
            <Input
              label="Restock Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              error={errors.reason}
              placeholder="e.g., Weekly delivery, Emergency restock..."
              required
            />
            
            <Input
              label="Supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              error={errors.supplier}
              placeholder="e.g., Supplier name or code..."
              required
            />
          </div>

          {/* Summary */}
          {(restockRightQty > 0 || restockLeftQty > 0) && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Restock Summary:
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total pieces to add:</span>
                  <span className="font-bold">{roundToHalf(restockRightQty + restockLeftQty)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Right: {restockRightQty}, Left: {restockLeftQty}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 pt-1 border-t">
                  <span>New totals will be:</span>
                  <span>R: {currentRightQty + restockRightQty}, L: {currentLeftQty + restockLeftQty}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRestock}
            disabled={restockRightQty + restockLeftQty === 0 || !reason.trim() || !supplier.trim()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus size={16} />
            Restock Lens
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestockBifocalDialog;