import React, { useState } from 'react';
import { X, Eye, ShoppingCart, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface SellBifocalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  rightQty: number;
  leftQty: number;
  onSell: (rightQty: number, leftQty: number) => void;
}

const SellBifocalDialog: React.FC<SellBifocalDialogProps> = ({
  isOpen,
  onClose,
  itemName,
  rightQty,
  leftQty,
  onSell,
}) => {
  const [sellRightQty, setSellRightQty] = useState(0);
  const [sellLeftQty, setSellLeftQty] = useState(0);
  const [errors, setErrors] = useState<{ right?: string; left?: string }>({});

  if (!isOpen) return null;

  // Helper function to validate 0.5 increments
  const validateHalfIncrement = (value: number): boolean => {
    return (value * 2) % 1 === 0;
  };

  // Helper function to round to nearest 0.5
  const roundToHalf = (value: number): number => {
    return Math.round(value * 2) / 2;
  };

  const validateQuantities = () => {
    const newErrors: { right?: string; left?: string } = {};
    
    if (sellRightQty < 0) {
      newErrors.right = 'Right quantity cannot be negative';
    } else if (!validateHalfIncrement(sellRightQty)) {
      newErrors.right = 'Right quantity must be in 0.5 increments';
    } else if (sellRightQty > rightQty) {
      newErrors.right = `Cannot sell more than ${rightQty} pieces`;
    }
    
    if (sellLeftQty < 0) {
      newErrors.left = 'Left quantity cannot be negative';
    } else if (!validateHalfIncrement(sellLeftQty)) {
      newErrors.left = 'Left quantity must be in 0.5 increments';
    } else if (sellLeftQty > leftQty) {
      newErrors.left = `Cannot sell more than ${leftQty} pieces`;
    }
    
    if (sellRightQty === 0 && sellLeftQty === 0) {
      newErrors.right = 'Must sell at least 0.5 pieces';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSell = () => {
    if (validateQuantities()) {
      onSell(sellRightQty, sellLeftQty);
      handleClose();
    }
  };

  const handleClose = () => {
    setSellRightQty(0);
    setSellLeftQty(0);
    setErrors({});
    onClose();
  };

  const handleQuickSell = (type: 'pair' | 'half-pair' | 'right' | 'left' | 'right-half' | 'left-half') => {
    switch (type) {
      case 'pair':
        setSellRightQty(Math.min(1, rightQty));
        setSellLeftQty(Math.min(1, leftQty));
        break;
      case 'half-pair':
        setSellRightQty(Math.min(0.5, rightQty));
        setSellLeftQty(Math.min(0.5, leftQty));
        break;
      case 'right':
        setSellRightQty(Math.min(1, rightQty));
        setSellLeftQty(0);
        break;
      case 'left':
        setSellRightQty(0);
        setSellLeftQty(Math.min(1, leftQty));
        break;
      case 'right-half':
        setSellRightQty(Math.min(0.5, rightQty));
        setSellLeftQty(0);
        break;
      case 'left-half':
        setSellRightQty(0);
        setSellLeftQty(Math.min(0.5, leftQty));
        break;
    }
    setErrors({});
  };

  const handleQuantityChange = (type: 'right' | 'left', value: string) => {
    const numValue = parseFloat(value) || 0;
    const roundedValue = roundToHalf(numValue);
    
    if (type === 'right') {
      setSellRightQty(roundedValue);
      setErrors(prev => ({ ...prev, right: '' }));
    } else {
      setSellLeftQty(roundedValue);
      setErrors(prev => ({ ...prev, left: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sell Bifocal Lens
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
          {/* Available Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Right Eye Available
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {rightQty}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">pieces</div>
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Left Eye Available
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {leftQty}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">pieces</div>
              </div>
            </div>
          </div>

          {/* Quantity Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <AlertCircle size={16} />
              <span>Quantities must be in 0.5 increments (0.5, 1, 1.5, 2, etc.)</span>
            </div>
          </div>

          {/* Quick Sell Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Sell:</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSell('pair')}
                disabled={rightQty < 1 || leftQty < 1}
                className="flex flex-col items-center p-3 h-auto"
              >
                <div className="text-xs font-medium">1 Full Pair</div>
                <div className="text-xs text-gray-500">R: 1, L: 1</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSell('half-pair')}
                disabled={rightQty < 0.5 || leftQty < 0.5}
                className="flex flex-col items-center p-3 h-auto"
              >
                <div className="text-xs font-medium">0.5 Pair</div>
                <div className="text-xs text-gray-500">R: 0.5, L: 0.5</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSell('right')}
                disabled={rightQty < 1}
                className="flex flex-col items-center p-3 h-auto border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <div className="text-xs font-medium">Right 1</div>
                <div className="text-xs text-blue-500">R: 1</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSell('right-half')}
                disabled={rightQty < 0.5}
                className="flex flex-col items-center p-3 h-auto border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <div className="text-xs font-medium">Right 0.5</div>
                <div className="text-xs text-blue-500">R: 0.5</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSell('left')}
                disabled={leftQty < 1}
                className="flex flex-col items-center p-3 h-auto border-green-300 text-green-700 hover:bg-green-50"
              >
                <div className="text-xs font-medium">Left 1</div>
                <div className="text-xs text-green-500">L: 1</div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSell('left-half')}
                disabled={leftQty < 0.5}
                className="flex flex-col items-center p-3 h-auto border-green-300 text-green-700 hover:bg-green-50"
              >
                <div className="text-xs font-medium">Left 0.5</div>
                <div className="text-xs text-green-500">L: 0.5</div>
              </Button>
            </div>
          </div>

          {/* Manual Input */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Quantity:</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Right Eye Qty"
                  type="number"
                  value={sellRightQty}
                  onChange={(e) => handleQuantityChange('right', e.target.value)}
                  min="0"
                  max={rightQty}
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
                  value={sellLeftQty}
                  onChange={(e) => handleQuantityChange('left', e.target.value)}
                  min="0"
                  max={leftQty}
                  step="0.5"
                  error={errors.left}
                  className="border-green-300 focus:border-green-500"
                  placeholder="0.5, 1, 1.5..."
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {(sellRightQty > 0 || sellLeftQty > 0) && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selling Summary:
              </div>
              <div className="flex justify-between text-sm">
                <span>Total pieces to sell:</span>
                <span className="font-bold">{roundToHalf(sellRightQty + sellLeftQty)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span>Right: {sellRightQty}, Left: {sellLeftQty}</span>
              </div>
            </div>
          )}

          {/* Warning for incomplete pairs */}
          {(sellRightQty > 0 && sellLeftQty === 0) || (sellLeftQty > 0 && sellRightQty === 0) ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  You're selling only one eye. Make sure this is intentional for single-eye prescriptions.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSell}
            disabled={sellRightQty + sellLeftQty === 0}
            className="flex items-center gap-2"
          >
            <ShoppingCart size={16} />
            Sell Lens
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SellBifocalDialog;