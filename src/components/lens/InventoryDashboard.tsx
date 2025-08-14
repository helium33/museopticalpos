import React from 'react';
import { LensFormData } from './LensForm';
import { formatCurrency } from '../../lib/utils';
import { Eye, Glasses, AlertTriangle, TrendingDown, Stethoscope, MapPin, AreaChart, CheckCircle, Package, ShoppingCart, Edit } from 'lucide-react';
import Button from '../ui/Button';

interface EnhancedLensDetailViewProps {
  lens: LensFormData;
  onEdit?: () => void;
  onSell?: () => void;
  onQuickSell?: (quantity: number) => void;
  canEdit?: boolean;
  canSell?: boolean;
}

const EnhancedLensDetailView: React.FC<EnhancedLensDetailViewProps> = ({
  lens,
  onEdit,
  onSell,
  onQuickSell,
  canEdit = false,
  canSell = false
}) => {
  // Helper function to check if lens is bifocal flattop
  const isBifocalFlattop = (lens: LensFormData) => {
    return (lens.type === 'Bifocal' && lens.bifocalType === 'Flattop') || 
           (lens.type === 'SMS' && lens.smsBifocalType === 'Flattop');
  };

  // Calculate accuracy metrics for bifocal flattop
  const calculateFlattopMetrics = () => {
    if (!isBifocalFlattop(lens)) return null;

    const rightOriginal = lens.originalRightQty || 0;
    const leftOriginal = lens.originalLeftQty || 0;
    const rightRemaining = lens.rightQty || 0;
    const leftRemaining = lens.leftQty || 0;
    const rightSold = lens.rightSoldQty || 0;
    const leftSold = lens.leftSoldQty || 0;
    const rightError = lens.rightErrorQty || 0;
    const leftError = lens.leftErrorQty || 0;

    // Calculate utilization rates
    const rightUtilization = rightOriginal > 0 ? ((rightSold + rightError) / rightOriginal) * 100 : 0;
    const leftUtilization = leftOriginal > 0 ? ((leftSold + leftError) / leftOriginal) * 100 : 0;
    
    // Calculate error rates
    const rightErrorRate = rightOriginal > 0 ? (rightError / rightOriginal) * 100 : 0;
    const leftErrorRate = leftOriginal > 0 ? (leftError / leftOriginal) * 100 : 0;

    return {
      rightUtilization,
      leftUtilization,
      rightErrorRate,
      leftErrorRate,
      totalSold: rightSold + leftSold,
      totalError: rightError + leftError,
      balanceRatio: leftOriginal > 0 && rightOriginal > 0 ? (rightRemaining / leftRemaining) : 1
    };
  };

  const flattopMetrics = calculateFlattopMetrics();

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Type Indicators */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            lens.type === 'Error' ? 'bg-red-100 dark:bg-red-900' :
            lens.type === 'SMS' ? 'bg-blue-100 dark:bg-blue-900' :
            lens.type === 'Yangon Order' ? 'bg-orange-100 dark:bg-orange-900' :
            'bg-blue-100 dark:bg-blue-900'
          }`}>
            {lens.type === 'Error' ? <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" /> :
             lens.type === 'SMS' ? <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" /> :
             lens.type === 'Yangon Order' ? <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" /> :
             <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {lens.code}
            </h3>
            <p className={`text-sm font-medium ${
              lens.type === 'Error' ? 'text-red-600 dark:text-red-400' :
              lens.type === 'SMS' ? 'text-blue-600 dark:text-blue-400' :
              lens.type === 'Yangon Order' ? 'text-orange-600 dark:text-orange-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {lens.type}
              {lens.type === 'Error' && lens.errorReason && ` - ${lens.errorReason}`}
              {isBifocalFlattop(lens) && (
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                  👓 Bifocal Flattop
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Status Badges */}
        <div className="flex flex-col gap-1">
          {lens.category === 'factory error' && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              Factory Error
            </span>
          )}
          {lens.type === 'SMS' && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full flex items-center gap-1">
              <Package size={10} />
              Auto Deducted
            </span>
          )}
          {lens.type !== 'Error' && (lens.errorQty || 0) > 0 && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full flex items-center gap-1">
              <TrendingDown size={10} />
              Has Errors: {lens.errorQty}
            </span>
          )}
        </div>
      </div>

      {/* Basic Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-gray-700 dark:text-gray-300">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</p>
          <p className="font-semibold text-lg break-all">{lens.code}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
          <div className="flex items-center gap-2">
            <p className="font-medium">{lens.type}</p>
            {lens.type === 'SMS' && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                <Stethoscope size={10} />
                SMS
              </span>
            )}
            {lens.type === 'Error' && (
              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full flex items-center gap-1">
                <AlertTriangle size={10} />
                Error
              </span>
            )}
            {lens.type === 'Yangon Order' && (
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full flex items-center gap-1">
                <MapPin size={10} />
                Yangon Order
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</p>
          <div className="flex items-center gap-2">
            <p className="font-medium">{lens.category}</p>
          </div>
        </div>

        {/* Error Reason Display */}
        {lens.type === 'Error' && lens.errorReason && (
          <div className="space-y-1 col-span-full">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Error Reason</p>
            <div className="bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded border border-red-200 dark:border-red-700">
              <p className="font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertTriangle size={14} />
                {lens.errorReason}
              </p>
            </div>
          </div>
        )}

        {/* Yangon Order Name Display */}
        {(lens.category === 'yangon order' || lens.type === 'Yangon Order') && lens.yangonOrderName && (
          <div className="space-y-1 col-span-full">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Yangon Order Name</p>
            <div className="bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded border border-orange-200 dark:border-orange-700">
              <p className="font-medium text-orange-800 dark:text-orange-200">{lens.yangonOrderName}</p>
            </div>
          </div>
        )}

        {/* Prescription Details */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SPH</p>
          <p className="font-medium">{lens.sph || '-'}</p>
        </div>

        {isBifocalFlattop(lens) && (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Addition</p>
              <p className="font-medium">{lens.addition || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {lens.type === 'SMS' ? 'SMS Bifocal Type' : 'Bifocal Type'}
              </p>
              <p className="font-medium">{lens.bifocalType || lens.smsBifocalType || '-'}</p>
            </div>
          </>
        )}

        {!isBifocalFlattop(lens) && (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">CYL</p>
              <p className="font-medium">{lens.cyl || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Axis</p>
              <p className="font-medium">{lens.axis || '-'}</p>
            </div>
          </>
        )}
      </div>

      {/* ENHANCED: Bifocal Flattop Detailed Breakdown */}
      {isBifocalFlattop(lens) && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
          <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-6 flex items-center gap-2">
            <Glasses size={20} />
            {lens.type === 'SMS' ? 'SMS Bifocal Flattop' : 'Bifocal Flattop'} - Enhanced Eye-Specific Tracking
          </h4>
          
          {/* Eye-specific detailed breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Right Eye Details */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                👁️ Right Eye Analysis
              </h5>
              
              {/* Right Eye Prescription */}
              {lens.Right && (
                <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                  <h6 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Prescription</h6>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Power:</span> {lens.Right}</div>
                    {lens.rightCyl && <div><span className="font-medium">CYL:</span> {lens.rightCyl}</div>}
                    {lens.rightAxis && <div><span className="font-medium">AXIS:</span> {lens.rightAxis}</div>}
                    {lens.addition && <div><span className="font-medium">ADD:</span> {lens.addition}</div>}
                  </div>
                </div>
              )}
              
              {/* Right Eye Quantity Tracking */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                  <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">Original Quantity:</span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">{lens.originalRightQty || 0} pcs</span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200">
                  <span className="text-orange-700 dark:text-orange-300 text-sm font-medium flex items-center gap-1">
                    <ShoppingCart size={12} />
                    {lens.type === 'Error' ? 'Error Quantity:' : lens.type === 'SMS' ? 'SMS Quantity:' : 'Sold Quantity:'}
                  </span>
                  <span className="font-bold text-orange-800 dark:text-orange-200">{lens.rightSoldQty || 0} pcs</span>
                </div>
                
                {lens.type !== 'Error' && (lens.rightErrorQty || 0) > 0 && (
                  <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                    <span className="text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Error Quantity:
                    </span>
                    <span className="font-bold text-red-800 dark:text-red-200">{lens.rightErrorQty || 0} pcs</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200">
                  <span className="text-green-700 dark:text-green-300 text-sm font-medium">Current Remaining:</span>
                  <span className="font-bold text-lg text-green-800 dark:text-green-200">{lens.rightQty || 0} pcs</span>
                </div>
                
                {flattopMetrics && (
                  <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-indigo-600 dark:text-indigo-400">Utilization:</span>
                      <span className="font-medium">{flattopMetrics.rightUtilization.toFixed(1)}%</span>
                    </div>
                    {lens.type !== 'Error' && (
                      <div className="flex justify-between text-xs">
                        <span className="text-red-600 dark:text-red-400">Error Rate:</span>
                        <span className="font-medium">{flattopMetrics.rightErrorRate.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Left Eye Details */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
              <h5 className="font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
                👁️ Left Eye Analysis
              </h5>
              
              {/* Left Eye Prescription */}
              {lens.Left && (
                <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                  <h6 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Prescription</h6>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Power:</span> {lens.Left}</div>
                    {lens.leftCyl && <div><span className="font-medium">CYL:</span> {lens.leftCyl}</div>}
                    {lens.leftAxis && <div><span className="font-medium">AXIS:</span> {lens.leftAxis}</div>}
                    {lens.addition && <div><span className="font-medium">ADD:</span> {lens.addition}</div>}
                  </div>
                </div>
              )}
              
              {/* Left Eye Quantity Tracking */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                  <span className="text-green-700 dark:text-green-300 text-sm font-medium">Original Quantity:</span>
                  <span className="font-bold text-green-800 dark:text-green-200">{lens.originalLeftQty || 0} pcs</span>
                </div>
                
                <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200">
                  <span className="text-orange-700 dark:text-orange-300 text-sm font-medium flex items-center gap-1">
                    <ShoppingCart size={12} />
                    {lens.type === 'Error' ? 'Error Quantity:' : lens.type === 'SMS' ? 'SMS Quantity:' : 'Sold Quantity:'}
                  </span>
                  <span className="font-bold text-orange-800 dark:text-orange-200">{lens.leftSoldQty || 0} pcs</span>
                </div>
                
                {lens.type !== 'Error' && (lens.leftErrorQty || 0) > 0 && (
                  <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                    <span className="text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Error Quantity:
                    </span>
                    <span className="font-bold text-red-800 dark:text-red-200">{lens.leftErrorQty || 0} pcs</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200">
                  <span className="text-green-700 dark:text-green-300 text-sm font-medium">Current Remaining:</span>
                  <span className="font-bold text-lg text-green-800 dark:text-green-200">{lens.leftQty || 0} pcs</span>
                </div>
                
                {flattopMetrics && (
                  <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-indigo-600 dark:text-indigo-400">Utilization:</span>
                      <span className="font-medium">{flattopMetrics.leftUtilization.toFixed(1)}%</span>
                    </div>
                    {lens.type !== 'Error' && (
                      <div className="flex justify-between text-xs">
                        <span className="text-red-600 dark:text-red-400">Error Rate:</span>
                        <span className="font-medium">{flattopMetrics.leftErrorRate.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Total Summary with Advanced Metrics */}
          <div className={`p-4 rounded-lg border ${
            lens.type === 'Error' 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : lens.type === 'SMS' 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
              : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
          }`}>
            <h5 className={`font-semibold mb-4 ${
              lens.type === 'Error'
                ? 'text-red-900 dark:text-red-100'
                : lens.type === 'SMS'
                ? 'text-blue-900 dark:text-blue-100'
                : 'text-purple-900 dark:text-purple-100'
            }`}>
              📊 Complete Bifocal Flattop Summary & Analytics
            </h5>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className={`text-sm ${
                  lens.type === 'Error'
                    ? 'text-red-700 dark:text-red-300'
                    : lens.type === 'SMS'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-purple-700 dark:text-purple-300'
                }`}>
                  Total Original
                </div>
                <div className={`text-2xl font-bold ${
                  lens.type === 'Error'
                    ? 'text-red-600 dark:text-red-400'
                    : lens.type === 'SMS'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-purple-600 dark:text-purple-400'
                }`}>
                  {(lens.originalRightQty || 0) + (lens.originalLeftQty || 0)} pcs
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  R: {lens.originalRightQty || 0} | L: {lens.originalLeftQty || 0}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-orange-700 dark:text-orange-300">
                  {lens.type === 'Error' ? 'Total Error' : lens.type === 'SMS' ? 'Total SMS' : 'Total Sold'}
                </div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {flattopMetrics?.totalSold || 0} pcs
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  R: {lens.rightSoldQty || 0} | L: {lens.leftSoldQty || 0}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-red-700 dark:text-red-300">Total Errors</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {lens.type === 'Error' ? 'N/A' : (flattopMetrics?.totalError || 0)} pcs
                </div>
                {lens.type !== 'Error' && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    R: {lens.rightErrorQty || 0} | L: {lens.leftErrorQty || 0}
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-sm text-green-700 dark:text-green-300">Total Remaining</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {lens.qty} pcs
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  R: {lens.rightQty || 0} | L: {lens.leftQty || 0}
                </div>
              </div>
            </div>
            
            {/* Advanced Analytics for Bifocal Flattop */}
            {flattopMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="flex items-center gap-2 mb-2">
                    <AreaChart size={16} className="text-indigo-600" />
                    <span className="font-medium text-indigo-700 dark:text-indigo-300">Overall Utilization</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Right Eye:</span>
                      <span className="font-medium">{flattopMetrics.rightUtilization.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Left Eye:</span>
                      <span className="font-medium">{flattopMetrics.leftUtilization.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-medium">Average:</span>
                      <span className="font-bold">{((flattopMetrics.rightUtilization + flattopMetrics.leftUtilization) / 2).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                {lens.type !== 'Error' && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown size={16} className="text-red-600" />
                      <span className="font-medium text-red-700 dark:text-red-300">Error Analysis</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Right Eye:</span>
                        <span className="font-medium">{flattopMetrics.rightErrorRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Left Eye:</span>
                        <span className="font-medium">{flattopMetrics.leftErrorRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-medium">Average:</span>
                        <span className="font-bold">{((flattopMetrics.rightErrorRate + flattopMetrics.leftErrorRate) / 2).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-300">Balance Status</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>R/L Ratio:</span>
                      <span className="font-medium">{flattopMetrics.balanceRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${
                        Math.abs(flattopMetrics.balanceRatio - 1) < 0.2 
                          ? 'text-green-600' 
                          : 'text-orange-600'
                      }`}>
                        {Math.abs(flattopMetrics.balanceRatio - 1) < 0.2 ? 'Balanced' : 'Imbalanced'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 pt-1">
                      {Math.abs(flattopMetrics.balanceRatio - 1) < 0.2 
                        ? '✅ Good inventory balance' 
                        : '⚠️ Consider restocking'
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regular Lens Summary (Non-Flattop) */}
      {!isBifocalFlattop(lens) && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Eye size={20} />
            Quantity Summary with Error Tracking
          </h4>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Original</p>
              <p className={`text-2xl font-bold ${
                lens.type === 'Error' ? 'text-red-600 dark:text-red-400' :
                lens.type === 'SMS' ? 'text-blue-600 dark:text-blue-400' :
                'text-purple-600 dark:text-purple-400'
              }`}>
                {lens.originalQty || lens.qty} pcs
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {lens.type === 'Error' ? 'Error Quantity' : lens.type === 'SMS' ? 'SMS Quantity' : 'Sold Quantity'}
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {lens.soldQty || 0} pcs
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Error Quantity</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {lens.type === 'Error' ? 'N/A' : (lens.errorQty || 0)} pcs
                {lens.type !== 'Error' && (lens.errorQty || 0) > 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded-full">
                    Has Errors
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remaining Quantity</p>
              <p className={`text-2xl font-bold ${lens.qty <= 2 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {lens.qty} pcs
                {lens.qty <= 2 && lens.qty > 0 && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded-full">
                    Low Stock
                  </span>
                )}
                {lens.qty === 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded-full">
                    Out of Stock
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Price Information */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
        <p className="text-xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(lens.price)}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t">
        {canEdit && onEdit && (
          <Button
            variant="outline"
            onClick={onEdit}
            className="transition-all duration-200 hover:scale-[0.98]"
          >
            <Edit size={16} className="mr-2" />
            Edit Lens
          </Button>
        )}
        {lens.type !== 'Error' && lens.type !== 'SMS' && lens.type !== 'Yangon Order' && canSell && onSell && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="primary"
              onClick={onSell}
              disabled={lens.qty <= 0}
              className="transition-all duration-200 hover:scale-[0.98]"
            >
              <ShoppingCart size={16} className="mr-2" />
              Sell Lens
            </Button>
            
            {/* Quick Sell Buttons */}
            {lens.qty > 0 && onQuickSell && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 self-center mr-2">Quick sell:</span>
                {[0.5, 1, 1.5, 2, 2.5].map((qty) => (
                  lens.qty >= qty && (
                    <Button
                      key={qty}
                      variant="outline"
                      size="sm"
                      onClick={() => onQuickSell(qty)}
                      className="px-3 py-1 text-xs hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900 dark:hover:text-green-300"
                      title={`Quick sell ${qty} pcs`}
                    >
                      {qty}
                    </Button>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedLensDetailView;