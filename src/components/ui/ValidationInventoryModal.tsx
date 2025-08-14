import React from 'react';
import { AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { ValidationResult } from '../hooks/useInventoryValidation';

interface InventoryValidationModalProps {
  validationResult: ValidationResult;
  onContinue: () => void;
  onCancel: () => void;
  onRetry: () => void;
  loading?: boolean;
}

const InventoryValidationModal: React.FC<InventoryValidationModalProps> = ({
  validationResult,
  onContinue,
  onCancel,
  onRetry,
  loading = false
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {validationResult.isValid ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Inventory Validation Results
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div className="mb-6">
              <h4 className="text-red-700 dark:text-red-300 font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Errors ({validationResult.errors.length})
              </h4>
              <div className="space-y-2">
                {validationResult.errors.map((error, index) => (
                  <div
                    key={index}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
                  >
                    <div className="font-medium text-red-800 dark:text-red-200">
                      {error.itemName}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-300">
                      {error.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div className="mb-6">
              <h4 className="text-yellow-700 dark:text-yellow-300 font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings ({validationResult.warnings.length})
              </h4>
              <div className="space-y-2">
                {validationResult.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg"
                  >
                    <div className="font-medium text-yellow-800 dark:text-yellow-200">
                      {warning.itemName}
                    </div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-300">
                      {warning.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success message */}
          {validationResult.isValid && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">All items validated successfully!</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          {!validationResult.isValid && (
            <button
              onClick={onRetry}
              disabled={loading}
              className="px-4 py-2 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Retry Validation
            </button>
          )}
          
          <button
            onClick={onContinue}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {validationResult.isValid ? 'Continue' : 'Continue Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryValidationModal;