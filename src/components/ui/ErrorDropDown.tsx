import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, X } from 'lucide-react';
import { ERROR_CATEGORIES, ErrorCategory } from '../../type/voc';
import { VocItem } from '../../type/Voc';

interface ErrorDropdownProps {
  onErrorSelect: (category: ErrorCategory, description?: string) => void;
  onClearError: () => void;
  currentError?: string;
  currentDescription?: string;
}

export const ErrorDropdown: React.FC<ErrorDropdownProps> = ({
  onErrorSelect,
  onClearError,
  currentError,
  currentDescription
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | null>(null);

  const handleCategorySelect = (category: ErrorCategory) => {
    setSelectedCategory(category);
    if (category.id === 'other') {
      // For "Other" category, wait for custom description
      return;
    }
    onErrorSelect(category);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    if (selectedCategory && customDescription.trim()) {
      onErrorSelect(selectedCategory, customDescription.trim());
      setIsOpen(false);
      setCustomDescription('');
      setSelectedCategory(null);
    }
  };

  const handleClearError = () => {
    onClearError();
    setIsOpen(false);
    setCustomDescription('');
    setSelectedCategory(null);
  };

  const currentErrorCategory = currentError ? 
    ERROR_CATEGORIES.find(cat => cat.id === currentError) : null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border rounded-md transition-colors ${
          currentError 
            ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' 
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className={currentError ? 'text-red-500' : 'text-gray-400'} />
          <span className="truncate">
            {currentError ? 'Has Error' : 'Mark as Error'}
          </span>
        </div>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {/* Clear Error Option */}
          {currentError && (
            <>
              <button
                onClick={handleClearError}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50 border-b border-gray-200"
              >
                <X size={14} />
                Clear Error Status
              </button>
            </>
          )}

          {/* Error Categories */}
          {ERROR_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                currentError === category.id ? 'bg-red-50 text-red-700' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">{category.name}</div>
              <div className="text-xs text-gray-500 mt-1">{category.description}</div>
            </button>
          ))}

          {/* Custom Description Input for "Other" category */}
          {selectedCategory?.id === 'other' && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Describe the error:
              </label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Enter error description..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded resize-none"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customDescription.trim()}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Apply Error
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setCustomDescription('');
                  }}
                  className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Error Display */}
      {currentError && currentErrorCategory && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <div className="font-medium text-red-800">{currentErrorCategory.name}</div>
          {currentDescription && currentDescription !== currentErrorCategory.description && (
            <div className="text-red-600 mt-1">{currentDescription}</div>
          )}
        </div>
      )}
    </div>
  );
};