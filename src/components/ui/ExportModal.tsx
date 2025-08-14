import React from 'react';
import { FileSpreadsheet, FileDown, X } from 'lucide-react';
import Button from './Button';
import { formatCurrency, formatYuan } from '../../lib/utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportExcel: () => void;
  onExportGoogleSheets: () => void;
  totalAmount?: number;
  kpayTotal?: number;
  yuanTotal?: number;
  depositTotal?: number;
  loading?: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportExcel,
  onExportGoogleSheets,
  totalAmount = 0,
  kpayTotal = 0,
  yuanTotal = 0,
  depositTotal = 0,
  loading = false
}) => {
  if (!isOpen) return null;

  const cashTotal = totalAmount - kpayTotal - yuanTotal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Export Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Preview */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg border border-blue-200 dark:border-blue-700">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
            📊 Export Summary
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-blue-600 dark:text-blue-300">💰 Cash Total:</span>
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                {formatCurrency(cashTotal)}
              </div>
            </div>
            <div>
              <span className="text-green-600 dark:text-green-300">📱 KPay Total:</span>
              <div className="font-semibold text-green-900 dark:text-green-100">
                {formatCurrency(kpayTotal)}
              </div>
            </div>
            <div>
              <span className="text-purple-600 dark:text-purple-300">💴 Yuan Total:</span>
              <div className="font-semibold text-purple-900 dark:text-purple-100">
                {formatYuan(yuanTotal)}
              </div>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-300">🏦 Deposits:</span>
              <div className="font-semibold text-amber-900 dark:text-amber-100">
                {formatCurrency(depositTotal)}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <div className="flex justify-between items-center">
              <span className="text-blue-800 dark:text-blue-200 font-medium">🎯 Grand Total:</span>
              <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <Button
            onClick={onExportExcel}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3"
            disabled={loading}
          >
            <FileSpreadsheet size={20} />
            <div className="text-left">
              <div className="font-semibold">Export to Excel</div>
              <div className="text-xs opacity-90">Professional formatting with navy & gold styling</div>
            </div>
          </Button>

          <Button
            onClick={onExportGoogleSheets}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 border-2 border-blue-300 hover:border-blue-400 py-3"
            disabled={loading}
          >
            <FileDown size={20} />
            <div className="text-left">
              <div className="font-semibold">Export to Google Sheets</div>
              <div className="text-xs text-gray-500">Download CSV for Google Sheets import</div>
            </div>
          </Button>
        </div>

        {/* Features List */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ✨ Export Features:
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Professional navy & gold color scheme</li>
            <li>• Detailed item breakdowns with prescriptions</li>
            <li>• Payment method summaries</li>
            <li>• Automatic currency formatting</li>
            <li>• Date and time stamps</li>
            <li>• Comprehensive totals and subtotals</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;