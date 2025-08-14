import React, { useState } from 'react';
import { doc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import { trackItemHistory } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

interface VocDeleteModalProps {
  voc: any;
  onClose: () => void;
  onSuccess: () => void;
}

const VocDeleteModal: React.FC<VocDeleteModalProps> = ({ voc, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteType, setDeleteType] = useState<'without_return' | 'return_to_inventory'>('without_return');

  const getCollectionNameByItemType = (type: string): string | null => {
    switch (type) {
      case 'Lens':
        return 'lenses';
      case 'Frame':
        return 'frames';
      case 'Contact Lens':
        return 'contactLenses';
      case 'Accessories':
        return 'accessories';
      default:
        return null;
    }
  };

  const isBifocalLens = (item: any) => {
    return item.category && (item.category.includes('fuse') || item.category.includes('flattop'));
  };

  const handleDelete = async () => {
    try {
      setLoading(true);

      // Return items to inventory if selected
      if (deleteType === 'return_to_inventory') {
        console.log('🔄 Starting inventory return process for VOC:', voc.vocNumber);

        for (const item of voc.items) {
          if (item.isFOC) {
            console.log(`⏭️ Skipping FOC item: ${item.name}`);
            continue; // Skip FOC items
          }

          const collectionName = getCollectionNameByItemType(item.type);
          if (!collectionName) {
            console.log(`⚠️ Unknown item type: ${item.type} for item: ${item.name}`);
            continue;
          }

          const itemRef = doc(db, collectionName, item.id);

          // Calculate error and sold quantities
          const errorQty = item.errorQuantity || 0;
          const soldQty = item.quantity - errorQty;

          console.log(`📦 Processing ${item.name}:`);
          console.log(`   - Total quantity: ${item.quantity}`);
          console.log(`   - Sold quantity: ${soldQty}`);
          console.log(`   - Error quantity: ${errorQty}`);

          // For bifocal lenses, return individual eye quantities
          if (isBifocalLens(item) && item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
            // Calculate proportional right/left quantities for errors
            const rightErrorQty = Math.round((item.details.rightQty / item.quantity) * errorQty);
            const leftErrorQty = errorQty - rightErrorQty;
            const rightSoldQty = item.details.rightQty - rightErrorQty;
            const leftSoldQty = item.details.leftQty - leftErrorQty;

            await updateDoc(itemRef, {
              qty: increment(item.quantity),
              soldQty: increment(-soldQty),
              errorQty: increment(-errorQty),
              rightQty: increment(item.details.rightQty),
              leftQty: increment(item.details.leftQty),
              rightSoldQty: increment(-rightSoldQty),
              leftSoldQty: increment(-leftSoldQty),
              rightErrorQty: increment(-rightErrorQty),
              leftErrorQty: increment(-leftErrorQty),
              updatedAt: serverTimestamp()
            });

            console.log(`✅ Bifocal lens ${item.name} returned:`);
            console.log(`   - Right: ${item.details.rightQty} (${rightSoldQty} sold, ${rightErrorQty} error)`);
            console.log(`   - Left: ${item.details.leftQty} (${leftSoldQty} sold, ${leftErrorQty} error)`);
          } else {
            // Regular items - return both sold and error quantities
            await updateDoc(itemRef, {
              qty: increment(item.quantity),
              soldQty: increment(-soldQty),
              errorQty: increment(-errorQty),
              updatedAt: serverTimestamp()
            });

            console.log(`✅ ${item.type} ${item.name} returned:`);
            console.log(`   - Total: ${item.quantity}`);
            console.log(`   - Sold returned: ${soldQty}`);
            console.log(`   - Error returned: ${errorQty}`);
          }

          // Track inventory return with detailed information
          await trackItemHistory({
            itemId: item.id,
            itemType: item.type.toLowerCase(),
            itemName: item.name,
            itemCode: item.code || item.id,
            action: 'return_from_voc',
            changes: [
              {
                field: 'quantity',
                oldValue: '0',
                newValue: item.quantity.toString()
              },
              {
                field: 'soldQty',
                oldValue: soldQty.toString(),
                newValue: '0'
              },
              {
                field: 'errorQty',
                oldValue: errorQty.toString(),
                newValue: '0'
              }
            ],
            store: item.store || voc.store,
            staffEmail: user?.email || 'unknown',
            totalQty: item.quantity,
            notes: `Returned from deleted VOC: ${voc.vocNumber} (${soldQty} sold + ${errorQty} error items)`
          });
        }

        console.log('✅ All items returned to inventory successfully');
      }

      // Track VOC deletion
      await trackItemHistory({
        itemId: voc.id,
        itemType: 'voc',
        itemName: voc.vocNumber,
        itemCode: voc.vocNumber,
        action: 'delete',
        changes: [{
          field: 'status',
          oldValue: 'active',
          newValue: deleteType === 'return_to_inventory' ? 'deleted_with_return' : 'deleted_without_return'
        }],
        store: voc.store,
        staffEmail: user?.email || 'unknown',
        totalQty: voc.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        notes: deleteType === 'return_to_inventory' 
          ? 'Items returned to inventory (including both sold and error quantities)' 
          : 'Items not returned to inventory'
      });

      // Delete the VOC document
      const vocRef = doc(db, 'vouchers', voc.id);
      await deleteDoc(vocRef);

      const successMessage = deleteType === 'return_to_inventory' 
        ? 'VOC deleted successfully and all items (sold + error quantities) returned to inventory'
        : 'VOC deleted successfully';

      toast.success(successMessage);
      onSuccess();
    } catch (error) {
      console.error('❌ Error deleting VOC:', error);
      toast.error('Failed to delete VOC');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total items with error breakdown for display
  const totalItems = voc.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const totalErrorItems = voc.items.reduce((sum: number, item: any) => sum + (item.errorQuantity || 0), 0);
  const totalSoldItems = totalItems - totalErrorItems;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Delete VOC</h3>
        </div>

        <p className="text-gray-600 mb-4">
          Are you sure you want to delete VOC <strong>{voc.vocNumber}</strong>? This action cannot be undone.
        </p>

        {/* Show item breakdown if there are error items */}
        {totalErrorItems > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Items Breakdown</span>
            </div>
            <div className="text-sm text-yellow-700 space-y-1">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span>Sold Items:</span>
                <span className="font-medium text-green-600">{totalSoldItems}</span>
              </div>
              <div className="flex justify-between">
                <span>Error Items:</span>
                <span className="font-medium text-red-600">{totalErrorItems}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="deleteType"
              value="without_return"
              checked={deleteType === 'without_return'}
              onChange={(e) => setDeleteType(e.target.value as 'without_return')}
              className="text-red-600"
            />
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              <div>
                <p className="font-medium text-gray-900">Delete without returning</p>
                <p className="text-sm text-gray-500">Items will not be returned to inventory</p>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="deleteType"
              value="return_to_inventory"
              checked={deleteType === 'return_to_inventory'}
              onChange={(e) => setDeleteType(e.target.value as 'return_to_inventory')}
              className="text-blue-600"
            />
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Return to inventory</p>
                <p className="text-sm text-gray-500">
                  {totalErrorItems > 0 
                    ? `Both sold (${totalSoldItems}) and error (${totalErrorItems}) items will be returned to inventory`
                    : 'Items will be returned to inventory stock'
                  }
                </p>
              </div>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Deleting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete VOC
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VocDeleteModal;