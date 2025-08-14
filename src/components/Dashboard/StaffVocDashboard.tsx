import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Store } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { User, Eye, Wrench, TrendingUp, Calendar, Filter, RefreshCw, Store as StoreIcon, Building2 } from 'lucide-react';
import Button from '../ui/Button';
import Select from '../ui/Select';

interface StaffVocDashboardProps {
  store: Store;
}

interface VocData {
  id: string;
  vocNumber: string;
  customerName: string;
  salePerson: string;
  eyeTest: string;
  fitting: string;
  totalAmount: number;
  createdAt: any;
  store: string;
}

interface StaffStats {
  name: string;
  vocCount: number;
  totalAmount: number;
  percentage: number;
  storeBreakdown?: { [store: string]: { count: number; amount: number } };
}

interface StoreStats {
  store: string;
  vocCount: number;
  totalAmount: number;
  percentage: number;
  color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const STORE_COLORS = {
  win: '#3B82F6',      // Blue
  pwint: '#10B981',    // Green  
  yangon: '#8B5CF6',   // Purple
  unknown: '#6B7280'   // Gray
};

const StaffVocDashboard: React.FC<StaffVocDashboardProps> = ({ store }) => {
  const [vocs, setVocs] = useState<VocData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedStaffType, setSelectedStaffType] = useState<'salePerson' | 'eyeTest' | 'fitting'>('salePerson');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<'all' | Store>('all');

  useEffect(() => {
    // Set up real-time listener for VOC data
    const setupRealtimeListener = () => {
      try {
        setLoading(true);
        const startDate = startOfMonth(new Date(selectedMonth));
        const endDate = endOfMonth(new Date(selectedMonth));

        // Fetch VOCs from all stores to show comprehensive data
        const vocQuery = query(
          collection(db, 'vouchers'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );

        // Set up real-time listener
        const unsubscribe = onSnapshot(vocQuery, (snapshot) => {
          const vocData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as VocData[];

          setVocs(vocData);
          setLoading(false);
        }, (error) => {
          console.error('Error in real-time VOC listener:', error);
          // Fallback to regular fetch if real-time fails
          fetchVocData();
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up real-time listener:', error);
        fetchVocData();
        return () => {};
      }
    };

    const unsubscribe = setupRealtimeListener();
    
    // Cleanup listener on unmount or dependency change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedMonth]);

  const fetchVocData = async () => {
    try {
      setLoading(true);
      const startDate = startOfMonth(new Date(selectedMonth));
      const endDate = endOfMonth(new Date(selectedMonth));

      // Fetch VOCs from all stores
      let vocQuery = query(
        collection(db, 'vouchers'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
      );

      const vocSnapshot = await getDocs(vocQuery);
      const vocData = vocSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VocData[];

      setVocs(vocData);
    } catch (error) {
      console.error('Error fetching VOC data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter VOCs based on selected store filter
  const filteredVocs = selectedStoreFilter === 'all' 
    ? vocs 
    : vocs.filter(voc => voc.store === selectedStoreFilter);

  const getStoreStats = (): StoreStats[] => {
    const storeMap = new Map<string, { count: number; totalAmount: number }>();
    
    vocs.forEach(voc => {
      const vocStore = voc.store || 'unknown';
      const existing = storeMap.get(vocStore) || { count: 0, totalAmount: 0 };
      
      storeMap.set(vocStore, {
        count: existing.count + 1,
        totalAmount: existing.totalAmount + (voc.totalAmount || 0)
      });
    });

    const totalVocs = vocs.length;
    const stats: StoreStats[] = Array.from(storeMap.entries()).map(([store, data]) => ({
      store,
      vocCount: data.count,
      totalAmount: data.totalAmount,
      percentage: totalVocs > 0 ? (data.count / totalVocs) * 100 : 0,
      color: STORE_COLORS[store as keyof typeof STORE_COLORS] || STORE_COLORS.unknown
    }));

    // Sort by VOC count
    return stats.sort((a, b) => b.vocCount - a.vocCount);
  };

  const getStaffStats = (staffType: 'salePerson' | 'eyeTest' | 'fitting'): StaffStats[] => {
    const staffMap = new Map<string, { count: number; totalAmount: number; storeBreakdown: { [store: string]: { count: number; amount: number } } }>();
    
    filteredVocs.forEach(voc => {
      const staffName = voc[staffType];
      const vocStore = voc.store || 'unknown';
      
      // Handle both existing VOCs (without staff fields) and new VOCs (with staff fields)
      if (staffName && staffName.trim()) {
        const existing = staffMap.get(staffName.trim()) || { count: 0, totalAmount: 0, storeBreakdown: {} };
        const storeData = existing.storeBreakdown[vocStore] || { count: 0, amount: 0 };
        
        staffMap.set(staffName.trim(), {
          count: existing.count + 1,
          totalAmount: existing.totalAmount + (voc.totalAmount || 0),
          storeBreakdown: {
            ...existing.storeBreakdown,
            [vocStore]: {
              count: storeData.count + 1,
              amount: storeData.amount + (voc.totalAmount || 0)
            }
          }
        });
      } else {
        // For VOCs without staff information, group them as "Not Specified"
        const notSpecifiedKey = "⚠️ Not Specified";
        const existing = staffMap.get(notSpecifiedKey) || { count: 0, totalAmount: 0, storeBreakdown: {} };
        const storeData = existing.storeBreakdown[vocStore] || { count: 0, amount: 0 };
        
        staffMap.set(notSpecifiedKey, {
          count: existing.count + 1,
          totalAmount: existing.totalAmount + (voc.totalAmount || 0),
          storeBreakdown: {
            ...existing.storeBreakdown,
            [vocStore]: {
              count: storeData.count + 1,
              amount: storeData.amount + (voc.totalAmount || 0)
            }
          }
        });
      }
    });

    const totalVocs = filteredVocs.length;
    const stats: StaffStats[] = Array.from(staffMap.entries()).map(([name, data]) => ({
      name,
      vocCount: data.count,
      totalAmount: data.totalAmount,
      percentage: totalVocs > 0 ? (data.count / totalVocs) * 100 : 0,
      storeBreakdown: data.storeBreakdown
    }));

    // Sort by VOC count, but put "Not Specified" at the end
    return stats.sort((a, b) => {
      if (a.name.includes('Not Specified')) return 1;
      if (b.name.includes('Not Specified')) return -1;
      return b.vocCount - a.vocCount;
    });
  };

  const salePersonStats = getStaffStats('salePerson');
  const eyeTestStats = getStaffStats('eyeTest');
  const fittingStats = getStaffStats('fitting');
  const storeStats = getStoreStats();

  const getCurrentStats = () => {
    switch (selectedStaffType) {
      case 'salePerson': return salePersonStats;
      case 'eyeTest': return eyeTestStats;
      case 'fitting': return fittingStats;
      default: return salePersonStats;
    }
  };

  const getStaffTypeLabel = () => {
    switch (selectedStaffType) {
      case 'salePerson': return 'Sale Person';
      case 'eyeTest': return 'Eye Test';
      case 'fitting': return 'Fitting';
      default: return 'Sale Person';
    }
  };

  const getStaffTypeIcon = () => {
    switch (selectedStaffType) {
      case 'salePerson': return <User size={20} />;
      case 'eyeTest': return <Eye size={20} />;
      case 'fitting': return <Wrench size={20} />;

      default: return <User size={20} />;
    }
  };

  const getStoreDisplayName = (store: string) => {
    switch (store) {
      case 'win': return '🏪 Win Store';
      case 'pwint': return '🏪 Pwint Store';
      case 'yangon': return '🏪 Yangon Store';
      default: return '❓ Unknown Store';
    }
  };

  const currentStats = getCurrentStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading staff data...</span>
      </div>
    );
  }

  // Show message if no VOCs found
  if (vocs.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-blue-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Staff VOC Dashboard - All Stores
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* No Data Message */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <TrendingUp size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              No VOC Data Found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 max-w-md">
              No VOCs found across all stores in {format(new Date(selectedMonth), 'MMMM yyyy')}. 
              Create some VOCs to see staff performance data here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Staff VOC Dashboard - All Stores
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value as 'all' | Store)}
              options={[
                { value: 'all', label: 'All Stores' },
                { value: 'win', label: 'Win Store' },
                { value: 'pwint', label: 'Pwint Store' },
                { value: 'yangon', label: 'Yangon Store' }
              ]}
            />
            <Select
              value={selectedStaffType}
              onChange={(e) => setSelectedStaffType(e.target.value as 'salePerson' | 'eyeTest' | 'fitting')}
              options={[
                { value: 'salePerson', label: 'Sale Person' },
                { value: 'eyeTest', label: 'Eye Test' },
                { value: 'fitting', label: 'Fitting' },

              ]}
            />
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="text-blue-600" size={20} />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Total VOCs {selectedStoreFilter !== 'all' && `(${selectedStoreFilter.toUpperCase()})`}
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{filteredVocs.length}</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="text-green-600" size={20} />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Sale Persons</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{salePersonStats.length}</p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Eye className="text-purple-600" size={20} />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Eye Test Staff</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{eyeTestStats.length}</p>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Wrench className="text-orange-600" size={20} />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Fitting Staff</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{fittingStats.length}</p>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="text-indigo-600" size={20} />
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Active Stores</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{storeStats.length}</p>
          </div>
        </div>
      </div>

      {/* Store Distribution Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <StoreIcon className="text-indigo-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            VOC Distribution by Store
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store Bar Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={storeStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="store" 
                tickFormatter={(value) => value.toUpperCase()}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [value, name === 'vocCount' ? 'VOC Count' : 'Total Amount']}
                labelFormatter={(label) => getStoreDisplayName(label)}
              />
              <Legend />
              <Bar dataKey="vocCount" fill="#8884d8" name="VOC Count" />
            </BarChart>
          </ResponsiveContainer>

          {/* Store Pie Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={storeStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ store, percentage }) => `${store.toUpperCase()}: ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="vocCount"
              >
                {storeStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Store Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {storeStats.map((stat) => (
            <div 
              key={stat.store} 
              className="p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md"
              style={{ borderColor: stat.color, backgroundColor: `${stat.color}10` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: stat.color }}
                  ></div>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {getStoreDisplayName(stat.store)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold" style={{ color: stat.color }}>
                    {stat.vocCount} VOCs
                  </div>
                  <div className="text-xs text-gray-500">
                    {stat.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Total: {stat.totalAmount.toLocaleString()} MMK
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            {getStaffTypeIcon()}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {getStaffTypeLabel()} VOC Count
              {selectedStoreFilter !== 'all' && (
                <span className="text-sm text-gray-500 ml-2">
                  ({selectedStoreFilter.toUpperCase()} Store)
                </span>
              )}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentStats.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [value, name === 'vocCount' ? 'VOC Count' : 'Total Amount']}
              />
              <Legend />
              <Bar dataKey="vocCount" fill="#8884d8" name="VOC Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            {getStaffTypeIcon()}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {getStaffTypeLabel()} Distribution
              {selectedStoreFilter !== 'all' && (
                <span className="text-sm text-gray-500 ml-2">
                  ({selectedStoreFilter.toUpperCase()} Store)
                </span>
              )}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={currentStats.slice(0, 8)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="vocCount"
              >
                {currentStats.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Stats Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sale Person Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Sale Person Stats
              {selectedStoreFilter !== 'all' && (
                <span className="text-sm text-gray-500 block">
                  ({selectedStoreFilter.toUpperCase()} Store)
                </span>
              )}
            </h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {salePersonStats.map((stat, index) => (
              <div key={stat.name} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-white">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{stat.vocCount} VOCs</div>
                    <div className="text-xs text-gray-500">{stat.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                {/* Store Breakdown - Only show if filtering all stores and staff has multiple stores */}
                {selectedStoreFilter === 'all' && stat.storeBreakdown && Object.keys(stat.storeBreakdown).length > 1 && (
                  <div className="mt-2 pl-8 space-y-1">
                    {Object.entries(stat.storeBreakdown).map(([store, data]) => (
                      <div key={store} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>📍 {store.toUpperCase()}:</span>
                        <span>{data.count} VOCs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Eye Test Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="text-purple-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Eye Test Stats
              {selectedStoreFilter !== 'all' && (
                <span className="text-sm text-gray-500 block">
                  ({selectedStoreFilter.toUpperCase()} Store)
                </span>
              )}
            </h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {eyeTestStats.map((stat, index) => (
              <div key={stat.name} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-white">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-600">{stat.vocCount} VOCs</div>
                    <div className="text-xs text-gray-500">{stat.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                {/* Store Breakdown */}
                {selectedStoreFilter === 'all' && stat.storeBreakdown && Object.keys(stat.storeBreakdown).length > 1 && (
                  <div className="mt-2 pl-8 space-y-1">
                    {Object.entries(stat.storeBreakdown).map(([store, data]) => (
                      <div key={store} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>📍 {store.toUpperCase()}:</span>
                        <span>{data.count} VOCs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fitting Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="text-orange-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Fitting Stats
              {selectedStoreFilter !== 'all' && (
                <span className="text-sm text-gray-500 block">
                  ({selectedStoreFilter.toUpperCase()} Store)
                </span>
              )}
            </h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {fittingStats.map((stat, index) => (
              <div key={stat.name} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-white">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-600">{stat.vocCount} VOCs</div>
                    <div className="text-xs text-gray-500">{stat.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                {/* Store Breakdown */}
                {selectedStoreFilter === 'all' && stat.storeBreakdown && Object.keys(stat.storeBreakdown).length > 1 && (
                  <div className="mt-2 pl-8 space-y-1">
                    {Object.entries(stat.storeBreakdown).map(([store, data]) => (
                      <div key={store} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>📍 {store.toUpperCase()}:</span>
                        <span>{data.count} VOCs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent VOCs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Recent VOCs
          {selectedStoreFilter !== 'all' && (
            <span className="text-sm text-gray-500 ml-2">
              ({selectedStoreFilter.toUpperCase()} Store)
            </span>
          )}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  VOC Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sale Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Eye Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fitting
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVocs.slice(0, 10).map((voc) => (
                <tr key={voc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {voc.vocNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {voc.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: STORE_COLORS[voc.store as keyof typeof STORE_COLORS] || STORE_COLORS.unknown }}
                    >
                      📍 {(voc.store || 'unknown').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {voc.salePerson || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      {voc.eyeTest || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                      {voc.fitting || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {voc.totalAmount?.toLocaleString()} MMK
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {voc.createdAt ? format(voc.createdAt.toDate(), 'MMM dd, yyyy') : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffVocDashboard;