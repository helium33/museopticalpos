import React from 'react';
import { Plus, Minus } from 'lucide-react';
import Button from './Button';

interface QuantityControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  showControls?: boolean;
  step?: number;
  error?: string;
}

const QuantityControl: React.FC<QuantityControlProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  disabled = false,
  className = '',
  showControls = true,
  step = 1,
  error
}) => {
  const handleIncrement = () => {
    const newValue = value + step;
    if (!max || newValue <= max) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = value - step;
    if (newValue >= min) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    if (newValue >= min && (!max || newValue <= max)) {
      onChange(newValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        {showControls && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className="p-2 h-10 w-10 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 dark:border-red-600"
          >
            <Minus size={16} />
          </Button>
        )}
        
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center font-medium"
        />
        
        {showControls && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleIncrement}
            disabled={disabled || (max !== undefined && value >= max)}
            className="p-2 h-10 w-10 flex items-center justify-center hover:bg-green-50 dark:hover:bg-green-900/20 border-green-300 dark:border-green-600"
          >
            <Plus size={16} />
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default QuantityControl;