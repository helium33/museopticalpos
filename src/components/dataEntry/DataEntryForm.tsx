import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { Calendar, Package, TrendingUp, AlertCircle } from 'lucide-react';

interface DataEntryDisplayProps {
  filterDate: string;
  filterType: 'daily' | 'monthly';
}

interface EntryData {
  id: string;
  date: string;
  store: string;
  itemType: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason?: string;
  createdAt: any;
}

const DataEntryDisplay: React.FC<DataEntryDisplayProps> = ({ filterDate, filterType }) => {
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEntries: 0,
    completedStores: 0,
    pendingItems: 0
  });

  useEffect(() => {
    fetchEntries();
  }, [filterDate, filterType]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      
      let entriesQuery;
      if (filterType === 'daily') {
        const selectedDate = new Date(filterDate);
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
        
        entriesQuery = query(
          collection(db, 'dailyEntries'),
          where('createdAt', '>=', startOfDay),
          where('createdAt', '<=', endOfDay),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Monthly filter logic
        const [year, month] = filterDate.split('-');
        const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
        
        entriesQuery = query(
          collection(db, 'dailyEntries'),
          where('createdAt', '>=', startOfMonth),
          where('createdAt', '<=', endOfMonth),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(entriesQuery);
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EntryData));

      setEntries(entriesData);
      
      // Calculate stats
      const uniqueStores = new Set(entriesData.map(entry => entry.store));
      setStats({
        totalEntries: entriesData.length,
        completedStores: uniqueStores.size,
        pendingItems: Math.max(0, 100 - entriesData.length) // Mock calculation
      });

    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (filterType === 'monthly') {
      const [year, month] = dateString.split('-');
      return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy');
    }
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType.toLowerCase()) {
      case 'lens':
        return '👓';
      case 'frame':
        return '🕶️';
      case 'accessories':
        return '🔧';
      case 'contact lens':
        return '👁️';
      default:
        return '📦';
    }
  };

  const getStoreColor = (store: string) => {
    switch (store.toLowerCase()) {
      case 'win':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pwint':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'yangon':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Data Entries for {formatDisplayDate(filterDate)}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filterType === 'daily' ? 'Daily' : 'Monthly'} inventory tracking
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Entries</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalEntries}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Stores</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.completedStores}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending Items</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.pendingItems}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Entries</h3>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No entries found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              No data entries recorded for {formatDisplayDate(filterDate)}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {entries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getItemTypeIcon(entry.itemType)}</div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {entry.itemName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStoreColor(entry.store)}`}>
                          {entry.store.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {entry.itemType}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {entry.quantity} units
                    </div>
                    {entry.reason && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Reason: {entry.reason}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {entry.createdAt && format(entry.createdAt.toDate(), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataEntryDisplay;