// Real-time Inventory Monitoring Component
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { formatCurrency } from '../lib/utils';
import { 
  Package, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  RefreshCw
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  code: string;
  type: string;
  category: string;
  qty: number;
  soldQty: number;
  originalQty: number;
  rightQty?: number;
  leftQty?: number;
  rightSoldQty?: number;
  leftSoldQty?: number;
  price: number;
  store: string;
  lastUpdated: any;
}

interface InventoryMonitorProps {
  store?: string;
  itemType?: string;
}

const InventoryMonitor: React.FC<InventoryMonitorProps> = ({ 
  store, 
  itemType = 'Lens' 
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const collectionName = getCollectionName(itemType);
    let itemsQuery = query(
      collection(db, collectionName),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const itemsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryItem[];

        // Filter by store if specified
        const filteredItems = store 
          ? itemsData.filter(item => item.store === store)
          : itemsData;

        setItems(filteredItems);
        setLastUpdate(new Date());
        setLoading(false);
        
        console.log('📡 Real-time inventory update:', filteredItems.length, 'items');
      },
      (error) => {
        console.error('❌ Error in inventory monitoring:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [store, itemType]);

  const getCollectionName = (type: string): string => {
    switch (type) {
      case 'Lens': return 'lenses';
      case 'Frame': return 'frames';
      case 'Accessories': return 'accessories';
      case 'Contact Lens': return 'contactLenses';
      default: return 'lenses';
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const remainingQty = item.qty || 0;
    const isOutOfStock = remainingQty === 0;
    const isLowStock = remainingQty > 0 && remainingQty <= 2;
    const isNormalStock = remainingQty > 2;

    return {
      isOutOfStock,
      isLowStock,
      isNormalStock,
      remainingQty,
      soldQty: item.soldQty || 0,
      originalQty: item.originalQty || remainingQty + (item.soldQty || 0),
      salesPercentage: item.originalQty > 0 
        ? ((item.soldQty || 0) / item.originalQty) * 100 
        : 0
    };
  };

  const getStatusColor = (status: ReturnType<typeof getStockStatus>) => {
    if (status.isOutOfStock) return 'text-red-600 bg-red-50 border-red-200';
    if (status.isLowStock) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = (status: ReturnType<typeof getStockStatus>) => {
    if (status.isOutOfStock) return <AlertTriangle size={16} />;
    if (status.isLowStock) return <TrendingDown size={16} />;
    return <CheckCircle size={16} />;
  };

  // Calculate summary statistics
  const summary = {
    totalItems: items.length,
    outOfStock: items.filter(item => getStockStatus(item).isOutOfStock).length,
    lowStock: items.filter(item => getStockStatus(item).isLowStock).length,
    normalStock: items.filter(item => getStockStatus(item).isNormalStock).length,
    totalValue: items.reduce((sum, item) => sum + (item.qty * item.price), 0),
    totalSold: items.reduce((sum, item) => sum + (item.soldQty || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Real-time Inventory Monitor
          </h2>
          {store && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {store.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw size={14} />
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {summary.totalItems}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Normal Stock</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {summary.normalStock}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <TrendingDown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                {summary.lowStock}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {summary.outOfStock}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sold</p>
              <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                {summary.totalSold}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Inventory Items
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Original
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sales %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.slice(0, 50).map(item => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {item.code} • {item.store}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        {status.isOutOfStock ? 'Out of Stock' :
                         status.isLowStock ? 'Low Stock' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{status.remainingQty}</span>
                        {itemType === 'Lens' && item.rightQty !== undefined && (
                          <span className="text-xs text-gray-500">
                            (R:{item.rightQty} L:{item.leftQty})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{status.soldQty}</span>
                        {itemType === 'Lens' && item.rightSoldQty !== undefined && (
                          <span className="text-xs text-gray-500">
                            (R:{item.rightSoldQty} L:{item.leftSoldQty})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {status.originalQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(status.salesPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">
                          {status.salesPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(item.qty * item.price)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {items.length > 50 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing first 50 items of {items.length} total
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryMonitor;