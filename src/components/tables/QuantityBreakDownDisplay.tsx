import React from 'react';
import { VocItem } from '../type/Vocerror';
import { 
  calculateSoldQuantity, 
  calculateErrorQuantity, 
  getQuantityBreakdown,
  validateQuantityCalculation 
} from '../InventoryCalculation';
import { CheckCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface QuantityBreakdownDisplayProps {
  item: VocItem;
  showPercentages?: boolean;
  showValidation?: boolean;
}

export const QuantityBreakdownDisplay: React.FC<QuantityBreakdownDisplayProps> = ({ 
  item, 
  showPercentages = true,
  showValidation = true 
}) => {
  const breakdown = getQuantityBreakdown(item);
  const validation = validateQuantityCalculation(item);
  
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">{item.name}</h4>
        {showValidation && (
          <div className="flex items-center gap-1">
            {validation.isValid ? (
              <CheckCircle size={16} className="text-green-500" />
            ) : (
              <AlertTriangle size={16} className="text-red-500" />
            )}
          </div>
        )}
      </div>
      
      {/* Visual Progress Bar */}
      <div className="mb-4">
        <div className="flex h-6 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
            style={{ width: `${breakdown.soldPercentage}%` }}
          >
            {breakdown.soldPercentage > 15 && `${breakdown.sold}`}
          </div>
          <div 
            className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
            style={{ width: `${breakdown.errorPercentage}%` }}
          >
            {breakdown.errorPercentage > 15 && `${breakdown.error}`}
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>ရောင်းလိုက်သည် ({breakdown.soldPercentage}%)</span>
          <span>အမှား ({breakdown.errorPercentage}%)</span>
        </div>
      </div>
      
      {/* Detailed Numbers */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{breakdown.total}</div>
          <div className="text-xs text-blue-800 font-medium">စုစုပေါင်း</div>
          <div className="text-xs text-blue-600">Total</div>
        </div>
        
        <div className="text-center p-2 bg-green-50 rounded border border-green-200">
          <div className="text-2xl font-bold text-green-600">{breakdown.sold}</div>
          <div className="text-xs text-green-800 font-medium">ရောင်းလိုက်သည်</div>
          <div className="text-xs text-green-600">Sold</div>
          {showPercentages && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <TrendingUp size={10} className="text-green-500" />
              <span className="text-xs text-green-600 font-bold">{breakdown.soldPercentage}%</span>
            </div>
          )}
        </div>
        
        <div className="text-center p-2 bg-red-50 rounded border border-red-200">
          <div className="text-2xl font-bold text-red-600">{breakdown.error}</div>
          <div className="text-xs text-red-800 font-medium">အမှား</div>
          <div className="text-xs text-red-600">Error</div>
          {showPercentages && breakdown.error > 0 && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <TrendingDown size={10} className="text-red-500" />
              <span className="text-xs text-red-600 font-bold">{breakdown.errorPercentage}%</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Calculation Formula */}
      <div className="bg-gray-50 p-2 rounded border text-sm">
        <div className="text-gray-600 text-center">
          <span className="font-mono">
            {breakdown.sold} (ရောင်းလိုက်သည်) + {breakdown.error} (အမှား) = {breakdown.total} (စုစုပေါင်း)
          </span>
        </div>
      </div>
      
      {/* Validation Message */}
      {showValidation && !validation.isValid && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle size={14} />
            <span>{validation.message}</span>
          </div>
        </div>
      )}
      
      {/* Myanmar Language Summary */}
      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
        <div className="text-sm text-amber-800">
          <div className="font-medium mb-1">အကျဉ်းချုပ်</div>
          <div>
            {item.name} ကို စုစုပေါင်း {breakdown.total} ခု ရှိပြီး၊ 
            ရောင်းလိုက်သည် {breakdown.sold} ခု နှင့် 
            အမှား {breakdown.error} ခု ရှိသည်။
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuantityBreakdownDisplay;