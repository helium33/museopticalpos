import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, Package, CheckCircle, Eye, Filter } from 'lucide-react';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { toast } from 'react-hot-toast';

interface DashboardData {
  date: string;
  totalItems: number;
  enteredItems: number;
  missingItems: number;
  completionRate: number;
  stores: {
    [key: string]: {
      total: number;
      entered: number;
      missing: number;
      rate: number;
    };
  };
}

interface ItemTypeSummary {
  type: string;
  total: number;
  entered: number;
  missing: number;
  rate: number;
  color: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
const STORES = ['win', 'pwint', 'yangon'];

const DailyEntryDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
  const [itemTypeSummary, setItemTypeSummary] = useState<ItemTypeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [selectedStore, setSelectedStore] = useState<string>('all');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, selectedStore]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = selectedPeriod === 'week' 
        ? startOfWeek(endDate) 
        : subDays(endDate, 30);

      const data: DashboardData[] = [];
      const itemTypes = new Map<string, { total: number; entered: number; missing: number }>();

      // Generate date range
      const dates: string[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(format(d, 'yyyy-MM-dd'));
      }

      for (const date of dates) {
        const dayData: DashboardData = {
          date,
          totalItems: 0,
          enteredItems: 0,
          missingItems: 0,
          completionRate: 0,
          stores: {}
        };

        const storesToCheck = selectedStore === 'all' ? STORES : [selectedStore];

        for (const store of storesToCheck) {
          // Fetch all items for this store
          const collections = ['lenses', 'frames', 'accessories', 'contactLenses'];
          let storeTotal = 0;
          let storeEntered = 0;

          for (const collectionName of collections) {
            const itemQuery = query(
              collection(db, collectionName),
              where('store', '==', store)
            );

            const snapshot = await getDocs(itemQuery);
            
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              const itemType = collectionName === 'lenses' ? 'Lens' :
                              collectionName === 'frames' ? 'Frame' :
                              collectionName === 'accessories' ? 'Accessories' : 'Contact Lens';

              storeTotal++;
              
              // Check if item has entry for this date
              const hasEntry = data.lastEntryDate === date;
              if (hasEntry) {
                storeEntered++;
              }

              // Update item type summary
              if (!itemTypes.has(itemType)) {
                itemTypes.set(itemType, { total: 0, entered: 0, missing: 0 });
              }
              const typeData = itemTypes.get(itemType)!;
              typeData.total++;
              if (hasEntry) {
                typeData.entered++;
              } else {
                typeData.missing++;
              }
            });
          }

          dayData.stores[store] = {
            total: storeTotal,
            entered: storeEntered,
            missing: storeTotal - storeEntered,
            rate: storeTotal > 0 ? (storeEntered / storeTotal) * 100 : 0
          };

          dayData.totalItems += storeTotal;
          dayData.enteredItems += storeEntered;
        }

        dayData.missingItems = dayData.totalItems - dayData.enteredItems;
        dayData.completionRate = dayData.totalItems > 0 
          ? (dayData.enteredItems / dayData.totalItems) * 100 
          : 0;

        data.push(dayData);
      }

      setDashboardData(data);

      // Convert item types to summary
      const typeSummary: ItemTypeSummary[] = Array.from(itemTypes.entries()).map(([type, data], index) => ({
        type,
        total: data.total,
        entered: data.entered,
        missing: data.missing,
        rate: data.total > 0 ? (data.entered / data.total) * 100 : 0,
        color: COLORS[index % COLORS.length]
      }));

      setItemTypeSummary(typeSummary);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTotalSummary = () => {
    const latest = dashboardData[dashboardData.length - 1];
    if (!latest) return { total: 0, entered: 0, missing: 0, rate: 0 };

    return {
      total: latest.totalItems,
      entered: latest.enteredItems,
      missing: latest.missingItems,
      rate: latest.completionRate
    };
  };

  const summary = getTotalSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Daily Entry Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track daily stock entry completion across all stores and item types
            </p>
          </div>
          <div className="flex gap-3">
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month')}
              options={[
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'Last 30 Days' }
              ]}
            />
            <Select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              options={[
                { value: 'all', label: 'All Stores' },
                ...STORES.map(store => ({ value: store, label: store.toUpperCase() }))
              ]}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-blue-800 dark:text-blue-200">Total Items</h3>
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-2">
              {summary.total}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-green-800 dark:text-green-200">Entered Today</h3>
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-2">
              {summary.entered}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-red-800 dark:text-red-200">Missing Entries</h3>
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-800 dark:text-red-200 mt-2">
              {summary.missing}
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-purple-800 dark:text-purple-200">Completion Rate</h3>
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200 mt-2">
              {summary.rate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Rate Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Daily Completion Rate Trend
          </h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMMM d, yyyy')}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']}
                />
                <Bar dataKey="completionRate" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Item Type Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Entry Completion by Item Type
          </h3>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {itemTypeSummary.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.type}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.entered} of {item.total} items
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {item.rate.toFixed(1)}%
                    </p>
                    <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${item.rate}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Store Performance */}
      {selectedStore === 'all' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Store Performance Today
          </h3>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STORES.map((store) => {
                const latest = dashboardData[dashboardData.length - 1];
                const storeData = latest?.stores[store] || { total: 0, entered: 0, missing: 0, rate: 0 };
                
                return (
                  <div key={store} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      {store.toUpperCase()} Store
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total Items:</span>
                        <span className="font-medium">{storeData.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Entered:</span>
                        <span className="font-medium text-green-600">{storeData.entered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Missing:</span>
                        <span className="font-medium text-red-600">{storeData.missing}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Rate:</span>
                        <span className="font-semibold">{storeData.rate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${storeData.rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyEntryDashboard;