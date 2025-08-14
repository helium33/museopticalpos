import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Package, ArrowUpRight, ArrowDownLeft, Eye, Calendar, User } from 'lucide-react';
import Button from '../ui/Button';
import TransferStatusIndicator from './TransferStatusIndicator';

interface TransferRecord {
  id: string;
  transferId: string;
  action: 'transfer_in' | 'transfer_out';
  store: string;
  performedBy: string;
  performedAt: any;
  notes: string;
  fromStore?: string;
  toStore?: string;
  quantity?: number;
}

interface TransferSummaryCardProps {
  itemId: string;
  itemType: 'frames' | 'accessories' | 'contactLenses';
  itemName: string;
  currentStore: string;
  transferInQty?: number;
  transferOutQty?: number;
  className?: string;
}

const TransferSummaryCard: React.FC<TransferSummaryCardProps> = ({
  itemId,
  itemType,
  itemName,
  currentStore,
  transferInQty = 0,
  transferOutQty = 0,
  className = ''
}) => {
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (showDetails && itemId) {
      fetchTransferHistory();
    }
  }, [showDetails, itemId]);

  const fetchTransferHistory = async () => {
    setLoading(true);
    try {
      const historyQuery = query(
        collection(db, 'itemHistory'),
        where('itemId', '==', itemId),
        where('action', 'in', ['transfer_in', 'transfer_out']),
        orderBy('performedAt', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(historyQuery);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        performedAt: doc.data().performedAt?.toDate() || new Date()
      })) as TransferRecord[];

      setTransferHistory(history);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasTransfers = transferInQty > 0 || transferOutQty > 0;

  if (!hasTransfers) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
          <Package className="h-4 w-4 mr-2" />
          No transfer history
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Transfer Summary
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span>{showDetails ? 'Hide' : 'Show'} Details</span>
          </Button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {itemName} - {currentStore.toUpperCase()} Store
        </p>
      </div>

      {/* Transfer Status Overview */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Transfer In */}
          {transferInQty > 0 && (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">
                    Transfer In (ရောက်လာ)
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    from other stores
                  </div>
                </div>
              </div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {transferInQty}
              </div>
            </div>
          )}

          {/* Transfer Out */}
          {transferOutQty > 0 && (
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <div className="font-medium text-purple-800 dark:text-purple-200">
                    Transfer Out (ပို့လိုက်)
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    to other stores
                  </div>
                </div>
              </div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {transferOutQty}
              </div>
            </div>
          )}
        </div>

        {/* Net Transfer Effect */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              Net Transfer Effect (အနေဖြင့်)
            </div>
            <div className={`font-bold ${
              (transferInQty - transferOutQty) > 0 
                ? 'text-green-600 dark:text-green-400' 
                : (transferInQty - transferOutQty) < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {transferInQty - transferOutQty > 0 ? '+' : ''}{transferInQty - transferOutQty} units
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Transfer History */}
      {showDetails && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Recent Transfer History
            </h4>
            
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : transferHistory.length > 0 ? (
              <div className="space-y-3">
                {transferHistory.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className={`p-2 rounded-full ${
                      record.action === 'transfer_in' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                    }`}>
                      {record.action === 'transfer_in' ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {record.action === 'transfer_in' ? 'Received' : 'Sent'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.action === 'transfer_in'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {record.action === 'transfer_in' ? 'IN' : 'OUT'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {record.notes}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{record.performedAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{record.performedBy}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No detailed transfer history available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferSummaryCard;