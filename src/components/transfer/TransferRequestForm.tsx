import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TransferRequest } from '../../type/transfer';
import { normalizeItemCode, sideCodeOf } from '../../lib/transferInventory';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/Textarea';
import toast from 'react-hot-toast';
import { Package, Search, AlertCircle } from 'lucide-react';

interface TransferRequestFormProps {
  onSubmit: (data: TransferRequest) => void;
  onClose: () => void;
  currentStore: string;
  isSubmitting: boolean;
}

interface ItemVariant {
  label: string;
  qty: number;
}

interface InventoryItem {
  id: string;
  code: string;
  sideCode: string;
  name: string;
  qty: number;
  store: string;
  type: 'frames' | 'accessories' | 'contactLenses';
  variants: ItemVariant[];
}

// Per-variant stock: C Numbers on Yangon office frames, colour counts on store frames.
// Empty variants are left out so only what can actually be sent is listed.
const variantsOf = (data: DocumentData): ItemVariant[] => {
  const variants: ItemVariant[] = Array.isArray(data.cNumbers) && data.cNumbers.length > 0
    ? data.cNumbers.map((c: DocumentData) => ({ label: String(c?.cNo ?? '').trim(), qty: Number(c?.qty) || 0 }))
    : Object.entries(data.colors && typeof data.colors === 'object' ? data.colors : {})
        .map(([color, qty]) => ({ label: color, qty: Number(qty) || 0 }));
  return variants.filter(v => v.label && v.qty > 0);
};

// Adds two variant lists together, label by label
const mergeVariants = (a: ItemVariant[], b: ItemVariant[]): ItemVariant[] => {
  const merged = new Map<string, number>();
  [...a, ...b].forEach(v => merged.set(v.label, (merged.get(v.label) || 0) + v.qty));
  return [...merged].map(([label, qty]) => ({ label, qty }));
};

// Side code stands out in amber so staff can match it against the frame in hand
const SideCodeBadge: React.FC<{ sideCode: string }> = ({ sideCode }) =>
  sideCode ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-sm font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
      {sideCode}
    </span>
  ) : (
    <span className="text-gray-400">—</span>
  );

const VariantChips: React.FC<{ variants: ItemVariant[] }> = ({ variants }) =>
  variants.length === 0 ? null : (
    <div className="flex flex-wrap gap-1">
      {variants.map(v => (
        <span
          key={v.label}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
        >
          {v.label}: {v.qty}
        </span>
      ))}
    </div>
  );

const TransferRequestForm: React.FC<TransferRequestFormProps> = ({
  onSubmit,
  onClose,
  currentStore,
  isSubmitting
}) => {

  const { user } = useAuth();
  const [formData, setFormData] = useState({
    itemType: 'frames' as 'frames' | 'accessories' | 'contactLenses',
    fromStore: '',
    itemCode: '',
    requestedQuantity: 1,
    reason: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
    customerName: '',
    customerPhone: '',
    orderNumber: '',
    receiverName: '',
    senderName: ''
  });

  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stores = [
    { value: 'main', label: 'Main Store', description: 'Central store location' },
    { value: 'win', label: 'Win Vision Store', description: 'Win Vision optical store' },
    { value: 'pwint', label: 'Pwint Optical Store', description: 'Pwint optical store' },
    { value: 'yangon', label: 'Yangon Store', description: 'Yangon retail store' },
    { value: 'yangon-office', label: 'Yangon Head Office', description: 'Yangon head office location' },
  ].filter(store => store.value !== currentStore);

  const itemTypes = [
    { value: 'frames', label: 'Frames' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'contactLenses', label: 'Contact Lenses' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' }
  ];

  const receiverNames = [
    { value: 'please check your Name', label: 'please check you name' },
    { value: 'Ei Ei Naing', label: 'Ei Ei Naing' },
    { value: 'Thiri Naing', label: 'Thiri Naing' },
    { value: 'Zu', label: 'Zu' },
    { value: 'Khaing Moe Oo', label: 'Khaing Moe Oo' },
    { value: 'Hnin Nu Wai', label: 'Hnin Nu Wai' },
    { value: 'Nan Ngin', label: 'Nan Ngin' },
    { value: 'Aye Nadi Htun', label: 'Aye Nadi Htun' },
      { value: 'KMMT', label: 'KMMT' },
    { value: 'Yadnar', label: 'Yadnar' },
    { value: 'KKT', label: 'KKT' }
  ];

  const senderNames = [
      { value: 'please check your Name', label: 'please check you name' },

    { value: 'KMMT', label: 'KMMT' },
    { value: 'Yadnar', label: 'Yadnar' },
    { value: 'KKT', label: 'KKT' },
       { value: 'Ei Ei Naing', label: 'Ei Ei Naing' },
    { value: 'Thiri Naing', label: 'Thiri Naing' },
    { value: 'Zu', label: 'Zu' },
    { value: 'Khaing Moe Oo', label: 'Khaing Moe Oo' },
    { value: 'Hnin Nu Wai', label: 'Hnin Nu Wai' },
    { value: 'Nan Ngin', label: 'Nan Ngin' },
    { value: 'Aye Nadi Htun', label: 'Aye Nadi Htun' }
  ];

  // Identifies one model: the same name, code and side code
  const itemKey = (item: InventoryItem) => `${item.code}\u0000${item.sideCode}\u0000${item.name}`;

  // Search for available items when store or item type changes
  useEffect(() => {
    if (formData.fromStore && formData.itemType) {
      searchItems();
    }
  }, [formData.fromStore, formData.itemType]);

  const searchItems = async () => {
    if (!formData.fromStore || !formData.itemType) return;

    setLoading(true);
    try {
      const collectionName = formData.itemType;
      const itemQuery = query(
        collection(db, collectionName),
        where('store', '==', formData.fromStore),
        where('qty', '>', 0)
      );

      const snapshot = await getDocs(itemQuery);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        code: normalizeItemCode(doc.data().code),
        sideCode: sideCodeOf(doc.data()),
        name: doc.data().name,
        qty: doc.data().qty,
        store: doc.data().store,
        type: formData.itemType,
        variants: variantsOf(doc.data())
      })) as InventoryItem[];

      // One entry per model - same name, code and side code. Frames sharing a name but
      // carrying a different code or side code are different models, so each gets its own row.
      const uniqueItems = items.reduce((acc, item) => {
        const key = itemKey(item);
        if (!acc[key]) {
          acc[key] = {
            ...item,
            qty: item.qty
          };
        } else {
          // Same model stored twice - count it as one item
          acc[key].qty += item.qty;
          acc[key].variants = mergeVariants(acc[key].variants, item.variants);
        }
        return acc;
      }, {} as Record<string, InventoryItem>);

      setAvailableItems(Object.values(uniqueItems).sort((a, b) =>
        (a.name || '').localeCompare(b.name || '') || a.code.localeCompare(b.code) || a.sideCode.localeCompare(b.sideCode)
      ));
    } catch (error) {
      console.error('Error searching items:', error);
      toast.error('Failed to search items');
    } finally {
      setLoading(false);
    }
  };

  const search = searchTerm.toLowerCase();
  const filteredItems = availableItems.filter(item =>
    item.code.toLowerCase().includes(search) ||
    item.sideCode.toLowerCase().includes(search) ||
    item.name.toLowerCase().includes(search)
  );

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData(prev => ({
      ...prev,
      itemCode: item.code
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedItem) {
      setSubmitError('Please select an item to transfer');
      return;
    }

    // Verify name exists
    if (!selectedItem.name) {
      setSubmitError('Selected item must have a name');
      return;
    }

    // Stock of this exact code - other codes with the same name don't count
    if (formData.requestedQuantity > selectedItem.qty) {
      const ids = [selectedItem.code, selectedItem.sideCode && `Side ${selectedItem.sideCode}`].filter(Boolean).join(' · ');
      setSubmitError(`Only ${selectedItem.qty} available for ${ids ? `${ids} - ` : ''}"${selectedItem.name}" (Requested: ${formData.requestedQuantity})`);
      return;
    }

    try {
      const transferRequest: TransferRequest = {
        itemType: formData.itemType,
        itemId: selectedItem.id,
        itemCode: selectedItem.code,
        itemSideCode: selectedItem.sideCode,
        itemName: selectedItem.name,
        fromStore: formData.fromStore,
        toStore: currentStore,
        requestedQuantity: formData.requestedQuantity,
        availableQuantity: selectedItem.qty,
        reason: formData.reason,
        urgency: formData.urgency,
        status: 'pending',
        requestedBy: user?.email || '',
        requestedAt: new Date(),
        receiverName: formData.receiverName,
        senderName: formData.senderName,
        // Leave blank optional fields out - Firestore rejects `undefined`, which made
        // every request without a phone or order number fail to submit
        customerInfo: {
          name: formData.customerName,
          ...(formData.customerPhone && { phone: formData.customerPhone }),
          ...(formData.orderNumber && { orderNumber: formData.orderNumber })
        }
      };

      await onSubmit(transferRequest);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to submit transfer request'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Item Type and Source Store Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Item Type"
          value={formData.itemType}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, itemType: e.target.value as any }));
            setSelectedItem(null);
            setAvailableItems([]);
          }}
          options={itemTypes}
          required
        />

        <Select
          label="ဘယ်ဆိုင်ကယူမလဲ (From Store)"
          value={formData.fromStore}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, fromStore: e.target.value }));
            setSelectedItem(null);
            setAvailableItems([]);
          }}
          options={stores}
          required
        />
      </div>

      {/* Item Search and Selection */}
      {formData.fromStore && formData.itemType && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Items
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Code / Side Code / Name နဲ့ရှာပါ..."
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {filteredItems.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => (
                    <div
                      key={itemKey(item)}
                      onClick={() => handleItemSelect(item)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedItem && itemKey(selectedItem) === itemKey(item)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' 
                          : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>
                              <span className="text-gray-500 dark:text-gray-400">Code </span>
                              <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{item.code || '—'}</span>
                            </span>
                            {(item.type === 'frames' || item.sideCode) && (
                              <span>
                                <span className="text-gray-500 dark:text-gray-400">Side Code </span>
                                <SideCodeBadge sideCode={item.sideCode} />
                              </span>
                            )}
                          </p>
                          <p className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Name </span>
                            <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                          </p>
                          <VariantChips variants={item.variants} />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.store.toUpperCase()} Store
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold leading-none text-green-600 dark:text-green-400">{item.qty}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">available</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No items found matching your search' : 'No items available'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Item Details */}
      {selectedItem && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Selected Item</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-700 dark:text-blue-300">Code: <span className="font-mono font-semibold">{selectedItem.code || '—'}</span></p>
              {(selectedItem.type === 'frames' || selectedItem.sideCode) && (
                <p className="text-blue-700 dark:text-blue-300">Side Code: <SideCodeBadge sideCode={selectedItem.sideCode} /></p>
              )}
              <p className="text-blue-700 dark:text-blue-300">Name: {selectedItem.name}</p>
            </div>
            <div>
              <p className="text-blue-700 dark:text-blue-300">Available: {selectedItem.qty}</p>
              <p className="text-blue-700 dark:text-blue-300">Store: {selectedItem.store.toUpperCase()}</p>
            </div>
          </div>
          {selectedItem.variants.length > 0 && (
            <div className="mt-2">
              <VariantChips variants={selectedItem.variants} />
            </div>
          )}
        </div>
      )}

      {/* Transfer Details */}
      {selectedItem && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Requested Quantity"
              type="number"
              value={formData.requestedQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, requestedQuantity: Number(e.target.value) }))}
              min={1}
              max={selectedItem.qty}
              required
            />

            <Select
              label="Urgency"
              value={formData.urgency}
              onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as any }))}
              options={urgencyLevels}
              required
            />
          </div>

          <TextArea
            label="Reason for Transfer"
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Explain why this transfer is needed..."
            rows={3}
            required
          />

          {/* Sender and Receiver Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Transfer Personnel</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Sender Name"
                value={formData.senderName}
                onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                options={senderNames}
                required
              />
              <Select
                label="Receiver Name"
                value={formData.receiverName}
                onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                options={receiverNames}
                required
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Customer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                required
              />

              <Input
                label="Customer Phone"
                value={formData.customerPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
              />
            </div>

            <Input
              label="Order Number (Optional)"
              value={formData.orderNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
              placeholder="Internal order reference..."
            />
          </div>
        </div>
      )}

      {/* Warning for high quantity requests */}
      {selectedItem && formData.requestedQuantity > selectedItem.qty * 0.5 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              You're requesting more than 50% of available stock. Please ensure this is necessary.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {submitError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200 text-sm">
              {submitError}
            </p>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !selectedItem}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
            </>
          ) : (
            'Submit Transfer Request'
          )}
        </Button>
      </div>
    </form>
  );
};

export default TransferRequestForm;