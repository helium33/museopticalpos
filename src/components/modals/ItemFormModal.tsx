import React, { useState, useEffect } from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { VocItem } from '../../type/Vocerror';
import { ErrorCategorySelector } from '../../components/ui/ErrorCatagorySelector';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VocItem) => void;
  editingItem?: VocItem | null;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem
}) => {
  const [formData, setFormData] = useState<VocItem>({
    name: '',
    type: 'Lens',
    quantity: 1,
    price: 0,
    isFOC: false,
    hasError: false,
    errorQuantity: 0,
    errorCategory: '',
    errorDescription: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        name: '',
        type: 'Lens',
        quantity: 1,
        price: 0,
        isFOC: false,
        hasError: false,
        errorQuantity: 0,
        errorCategory: '',
        errorDescription: ''
      });
    }
  }, [editingItem, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      alert('Please enter item name');
      return;
    }
    
    if (formData.hasError) {
      if (!formData.errorCategory) {
        alert('Please select error category');
        return;
      }
      if (!formData.errorQuantity || formData.errorQuantity <= 0) {
        alert('Please enter valid error quantity');
        return;
      }
      if (formData.errorQuantity > formData.quantity) {
        alert('Error quantity cannot exceed total quantity');
        return;
      }
    }

    onSave(formData);
    onClose();
  };

  const handleErrorToggle = () => {
    setFormData(prev => ({
      ...prev,
      hasError: !prev.hasError,
      errorQuantity: !prev.hasError ? 0 : prev.errorQuantity,
      errorCategory: !prev.hasError ? '' : prev.errorCategory,
      errorDescription: !prev.hasError ? '' : prev.errorDescription
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingItem ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Item Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter item name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  type: e.target.value as VocItem['type']
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Lens">Lens</option>
                <option value="Frame">Frame</option>
                <option value="Contact Lens">Contact Lens</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  quantity: parseInt(e.target.value) || 1 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (MMK)
              </label>
              <input
                type="number"
                min="0"
                value={formData.price || 0}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  price: parseInt(e.target.value) || 0 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* FOC Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFOC"
              checked={formData.isFOC}
              onChange={(e) => setFormData(prev => ({ ...prev, isFOC: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isFOC" className="text-sm font-medium text-gray-700">
              Free of Charge (FOC)
            </label>
          </div>

          {/* Error Toggle */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="hasError"
                checked={formData.hasError}
                onChange={handleErrorToggle}
                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="hasError" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <AlertTriangle size={16} className="text-red-600" />
                This item has errors
              </label>
            </div>

            {/* Error Details */}
            {formData.hasError && (
              <ErrorCategorySelector
                itemType={formData.type}
                selectedCategory={formData.errorCategory}
                errorQuantity={formData.errorQuantity}
                errorDescription={formData.errorDescription}
                onCategoryChange={(category) => setFormData(prev => ({ ...prev, errorCategory: category }))}
                onQuantityChange={(quantity) => setFormData(prev => ({ ...prev, errorQuantity: quantity }))}
                onDescriptionChange={(description) => setFormData(prev => ({ ...prev, errorDescription: description }))}
                onRemoveError={() => setFormData(prev => ({ 
                  ...prev, 
                  hasError: false, 
                  errorQuantity: 0, 
                  errorCategory: '', 
                  errorDescription: '' 
                }))}
                maxQuantity={formData.quantity}
              />
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              {editingItem ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemFormModal;