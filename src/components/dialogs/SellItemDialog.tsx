import React, { useState } from 'react';
import { Eye, Minus, Plus } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface SellItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  maxQuantity: number;
  itemType?: string;
  leftQty?: number;
  rightQty?: number;
  onSell: (quantity: number, side?: 'left' | 'right') => void;
}

const SellItemDialog: React.FC<SellItemDialogProps> = ({
  isOpen,
  onClose,
  itemName,
  maxQuantity,
  itemType,
  leftQty = 0,
  rightQty = 0,
  onSell,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSide, setSelectedSide] = useState<'left' | 'right' | 'both'>('both');
  const [leftSellQty, setLeftSellQty] = useState(0.5);
  const [rightSellQty, setRightSellQty] = useState(0.5);

  const isBifocal = itemType === 'Bifocal';

  if (!isOpen) return null;

  const handleSell = () => {
    if (isBifocal) {
      if (selectedSide === 'left') {
        onSell(leftSellQty, 'left');
      } else if (selectedSide === 'right') {
        onSell(rightSellQty, 'right');
      } else {
        // Sell both sides
        onSell(leftSellQty, 'left');
        setTimeout(() => onSell(rightSellQty, 'right'), 100);
      }
    } else {
      onSell(quantity);
    }
    onClose();
  };

  const formatPairQuantity = (qty: number) => {
    const pairs = qty / 2;
    return pairs === Math.floor(pairs) ? pairs.toString() : pairs.toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-medium mb-4">
          Sell {itemName}
        </h3>

        {isBifocal ? (
          <div className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-2 mb-3">
                <Eye size={16} className="text-purple-600" />
                <span className="font-medium text-purple-800 dark:text-purple-200">
                  Bifocal Lens - Individual Eye Control
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Right</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatPairQuantity(rightQty * 2)} pairs
                  </p>
                  <p className="text-xs text-gray-500">({rightQty} pieces)</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Left</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatPairQuantity(leftQty * 2)} pairs
                  </p>
                  <p className="text-xs text-gray-500">({leftQty} pieces)</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Side to Sell
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={selectedSide === 'right' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSide('right')}
                  className="w-full"
                >
                  Right Only
                </Button>
                <Button
                  type="button"
                  variant={selectedSide === 'left' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSide('left')}
                  className="w-full"
                >
                  Left Only
                </Button>
                <Button
                  type="button"
                  variant={selectedSide === 'both' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSide('both')}
                  className="w-full"
                >
                  Both
                </Button>
              </div>
            </div>

            {(selectedSide === 'right' || selectedSide === 'both') && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Right Quantity to Sell
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRightSellQty(Math.max(0.5, rightSellQty - 0.5))}
                    disabled={rightSellQty <= 0.5}
                  >
                    <Minus size={16} />
                  </Button>
                  <Input
                    type="number"
                    step={0.5}
                    min={0.5}
                    max={rightQty}
                    value={rightSellQty}
                    onChange={(e) => setRightSellQty(Math.min(rightQty, Math.max(0.5, parseFloat(e.target.value) || 0.5)))}
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRightSellQty(Math.min(rightQty, rightSellQty + 0.5))}
                    disabled={rightSellQty >= rightQty}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {formatPairQuantity(rightSellQty * 2)} pairs
                </p>
              </div>
            )}

            {(selectedSide === 'left' || selectedSide === 'both') && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Left Quantity to Sell
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLeftSellQty(Math.max(0.5, leftSellQty - 0.5))}
                    disabled={leftSellQty <= 0.5}
                  >
                    <Minus size={16} />
                  </Button>
                  <Input
                    type="number"
                    step={0.5}
                    min={0.5}
                    max={leftQty}
                    value={leftSellQty}
                    onChange={(e) => setLeftSellQty(Math.min(leftQty, Math.max(0.5, parseFloat(e.target.value) || 0.5)))}
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLeftSellQty(Math.min(leftQty, leftSellQty + 0.5))}
                    disabled={leftSellQty >= leftQty}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {formatPairQuantity(leftSellQty * 2)} pairs
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity to sell (max: {maxQuantity})
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSell}
            disabled={
              isBifocal
                ? (selectedSide === 'right' && rightSellQty > rightQty) ||
                  (selectedSide === 'left' && leftSellQty > leftQty) ||
                  (selectedSide === 'both' && (rightSellQty > rightQty || leftSellQty > leftQty))
                : quantity > maxQuantity
            }
          >
            Sell Item
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SellItemDialog;