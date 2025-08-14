import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Header from '../components/layout/Header';
import { formatCurrency, Store, STORES } from '../lib/utils';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import DataTable from '../components/tables/DataTable';
import Button from '../components/ui/Button';
import { 
  FileDown, 
  FileSpreadsheet, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  Eye,
  ShoppingBag,
  Glasses,
  Package
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { exportToExcel, exportToGoogleSheets } from '../lib/utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

interface SalesData {
  lens: Record<string, number>;
  frame: Record<string, { [color: string]: number }>;
  accessories: Record<string, number>;
  contactLens: Record<string, number>;
}

interface DailySummary {
  date: string;
  totalRevenue: number;
  totalItems: number;
  lensCount: number;
  frameCount: number;
  accessoriesCount: number;
  contactLensCount: number;
}

interface MonthlySummary {
  month: string;
  totalRevenue: number;
  totalItems: number;
  lensCount: number;
  frameCount: number;
  accessoriesCount: number;
  contactLensCount: number;
  averageDailyRevenue: number;
}

// Helper function to convert 0.25 increments to 0.5 increments
const convertToHalfIncrements = (quantity: number): number => {
  // Convert 0.25 -> 0.5, 0.5 -> 1, 0.75 -> 1, 1 -> 2, etc.
  return Math.ceil(quantity * 2) / 2;
};

// Helper function to format quantity display
const formatQuantity = (quantity: number): string => {
  const converted = convertToHalfIncrements(quantity);
  return converted % 1 === 0 ? converted.toString() : converted.toFixed(1);
};

const SalesDataPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData>({
    lens: {},
    frame: {},
    accessories: {},
    contactLens: {}
  });
  const [searchDate, setSearchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStore, setSelectedStore] = useState<Store | 'all'>('all');
  const [viewType, setViewType] = useState<'daily' | 'monthly'>('daily');
  const [salesList, setSalesList] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [showCharts, setShowCharts] = useState(true);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [searchDate, selectedStore, viewType]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      
      if (viewType === 'daily') {
        startDate = startOfDay(new Date(searchDate));
        endDate = endOfDay(new Date(searchDate));
      } else {
        startDate = startOfMonth(new Date(searchDate));
        endDate = endOfMonth(new Date(searchDate));
      }

      let vocQuery = query(
        collection(db, 'vouchers'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
      );

      // Add store filter if not 'all'
      if (selectedStore !== 'all') {
        vocQuery = query(
          collection(db, 'vouchers'),
          where('store', '==', selectedStore),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(vocQuery);
      
      const salesTracker: SalesData = {
        lens: {},
        frame: {},
        accessories: {},
        contactLens: {}
      };

      const salesDetails: any[] = [];
      const dailyTracker: Record<string, DailySummary> = {};
      const monthlyTracker: Record<string, MonthlySummary> = {};
      let revenue = 0;

      snapshot.docs.forEach(doc => {
        const voc = doc.data();
        const vocDate = voc.createdAt.toDate();
        const dateKey = format(vocDate, 'yyyy-MM-dd');
        const monthKey = format(vocDate, 'yyyy-MM');
        
        // Initialize daily summary if not exists
        if (!dailyTracker[dateKey]) {
          dailyTracker[dateKey] = {
            date: dateKey,
            totalRevenue: 0,
            totalItems: 0,
            lensCount: 0,
            frameCount: 0,
            accessoriesCount: 0,
            contactLensCount: 0
          };
        }

        // Initialize monthly summary if not exists
        if (!monthlyTracker[monthKey]) {
          monthlyTracker[monthKey] = {
            month: monthKey,
            totalRevenue: 0,
            totalItems: 0,
            lensCount: 0,
            frameCount: 0,
            accessoriesCount: 0,
            contactLensCount: 0,
            averageDailyRevenue: 0
          };
        }

        const vocTotal = Math.max((voc.totalAmount || 0) - (voc.discount || 0), 0);
        revenue += vocTotal;
        dailyTracker[dateKey].totalRevenue += vocTotal;
        monthlyTracker[monthKey].totalRevenue += vocTotal;

        voc.items.forEach((item: any) => {
          if (item.isFOC) return; // Skip FOC items from sales data

          const itemTotal = item.price * item.quantity;
          
          // Check if it's a bifocal lens
          const isBifocal = item.category && (item.category.includes('fuse') || item.category.includes('flattop'));
          
          // Calculate proper lens quantity for display
          let displayQuantity = item.quantity;
          let actualLensCount = item.quantity;
          
          if (item.type === 'Lens') {
            if (isBifocal) {
              // For bifocal lenses, if we have left/right quantities, use those
              if (item.details?.leftEyeQty !== undefined && item.details?.rightEyeQty !== undefined) {
                const leftQty = convertToHalfIncrements(item.details.leftEyeQty || 0);
                const rightQty = convertToHalfIncrements(item.details.rightEyeQty || 0);
                actualLensCount = leftQty + rightQty;
                displayQuantity = actualLensCount / 2; // Show as pairs
              } else {
                // If no separate left/right quantities, convert and assume pairs
                const convertedQty = convertToHalfIncrements(item.quantity);
                displayQuantity = convertedQty / 2;
                actualLensCount = convertedQty;
              }
            } else {
              // For regular lenses, convert 0.25 increments to 0.5 increments
              displayQuantity = convertToHalfIncrements(item.quantity);
              actualLensCount = displayQuantity;
            }
          }

          const saleDetail = {
            vocNumber: voc.vocNumber,
            store: voc.store,
            date: vocDate,
            itemName: item.name,
            type: item.type,
            category: item.category,
            quantity: displayQuantity,
            originalQuantity: item.quantity, // Keep original for reference
            actualQuantity: actualLensCount, // Keep track of actual count for calculations
            price: item.price,
            total: itemTotal,
            details: item.details || {},
            isBifocal: isBifocal
          };
          salesDetails.push(saleDetail);

          // Update counters with converted quantities
          dailyTracker[dateKey].totalItems += actualLensCount;
          monthlyTracker[monthKey].totalItems += actualLensCount;

          if (item.type === 'Lens') {
            const category = item.category || 'Unknown';
            salesTracker.lens[category] = (salesTracker.lens[category] || 0) + actualLensCount;
            dailyTracker[dateKey].lensCount += actualLensCount;
            monthlyTracker[monthKey].lensCount += actualLensCount;
          } else if (item.type === 'Frame') {
            // FIXED: Use item.name instead of item.category for frame tracking
            const frameName = item.name || 'Unknown Frame';
            if (!salesTracker.frame[frameName]) {
              salesTracker.frame[frameName] = {};
            }
            const color = item.details?.color || 'Unknown';
            salesTracker.frame[frameName][color] = (salesTracker.frame[frameName][color] || 0) + item.quantity;
            dailyTracker[dateKey].frameCount += item.quantity;
            monthlyTracker[monthKey].frameCount += item.quantity;
          } else if (item.type === 'Accessories') {
            salesTracker.accessories[item.name] = (salesTracker.accessories[item.name] || 0) + item.quantity;
            dailyTracker[dateKey].accessoriesCount += item.quantity;
            monthlyTracker[monthKey].accessoriesCount += item.quantity;
          } else if (item.type === 'Contact Lens') {
            salesTracker.contactLens[item.category] = (salesTracker.contactLens[item.category] || 0) + item.quantity;
            dailyTracker[dateKey].contactLensCount += item.quantity;
            monthlyTracker[monthKey].contactLensCount += item.quantity;
          }
        });
      });

      // Calculate average daily revenue for monthly summaries
      Object.values(monthlyTracker).forEach(summary => {
        const daysInMonth = new Date(new Date(summary.month).getFullYear(), new Date(summary.month).getMonth() + 1, 0).getDate();
        summary.averageDailyRevenue = summary.totalRevenue / daysInMonth;
      });

      setSalesData(salesTracker);
      setSalesList(salesDetails);
      setTotalRevenue(revenue);
      setDailySummaries(Object.values(dailyTracker).sort((a, b) => b.date.localeCompare(a.date)));
      setMonthlySummaries(Object.values(monthlyTracker).sort((a, b) => b.month.localeCompare(a.month)));
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    const data = salesList.map(sale => ({
      'Date': format(sale.date, 'yyyy-MM-dd HH:mm'),
      'Store': sale.store,
      'VOC Number': sale.vocNumber,
      'Item Name': sale.itemName,
      'Type': sale.type,
      'Category': sale.category,
      'Details': sale.type === 'Frame' ? `Color: ${sale.details.color || 'N/A'}` :
                sale.type === 'Lens' ? 
                  `SPH: ${sale.details.sph || 'N/A'}, CYL: ${sale.details.cyl || 'N/A'}, AXIS: ${sale.details.axis || 'N/A'}` + 
                  (sale.details?.addition ? `, ADD: ${sale.details.addition}` : '') +
                  (sale.isBifocal ? 
                    ` | Bifocal: Left(${formatQuantity(sale.details.leftEyeQty || 0)}), Right(${formatQuantity(sale.details.rightEyeQty || 0)})` : 
                    '') :
                sale.type === 'Contact Lens' ? `Power: ${sale.details.power || 'N/A'}` : '',
      'Quantity': sale.isBifocal ? `${formatQuantity(sale.quantity)} pairs` : formatQuantity(sale.quantity),
      'Price': formatCurrency(sale.price),
      'Total': formatCurrency(sale.total),
      'Bifocal': sale.isBifocal ? 'Yes' : 'No'
    }));

    const filename = `sales-data-${selectedStore}-${searchDate}-${viewType}`;
    exportToExcel(data, filename);
  };

  const handleExportToGoogleSheets = () => {
    const data = salesList.map(sale => ({
      'Date': format(sale.date, 'yyyy-MM-dd HH:mm'),
      'Store': sale.store,
      'VOC Number': sale.vocNumber,
      'Item Name': sale.itemName,
      'Type': sale.type,
      'Category': sale.category,
      'Details': sale.type === 'Frame' ? `Color: ${sale.details.color || 'N/A'}` :
                sale.type === 'Lens' ? 
                  `SPH: ${sale.details.sph || 'N/A'}, CYL: ${sale.details.cyl || 'N/A'}, AXIS: ${sale.details.axis || 'N/A'}` + 
                  (sale.details?.addition ? `, ADD: ${sale.details.addition}` : '') +
                  (sale.isBifocal ? 
                    ` | Bifocal: Left(${formatQuantity(sale.details.leftEyeQty || 0)}), Right(${formatQuantity(sale.details.rightEyeQty || 0)})` : 
                    '') :
                sale.type === 'Contact Lens' ? `Power: ${sale.details.power || 'N/A'}` : '',
      'Quantity': sale.isBifocal ? formatQuantity(sale.quantity) : formatQuantity(sale.quantity),
      'Price': sale.price,
      'Total': sale.total,
      'Bifocal': sale.isBifocal ? 'Yes' : 'No'
    }));

    const filename = `sales-data-${selectedStore}-${searchDate}-${viewType}`;
    exportToGoogleSheets(data, filename);
  };

  const prepareChartData = () => {
    const lensData = Object.entries(salesData.lens).map(([category, quantity]) => ({
      name: category.toUpperCase(),
      value: quantity,
      fill: COLORS[Object.keys(salesData.lens).indexOf(category) % COLORS.length]
    }));

    // FIXED: Show frame names instead of "Unknown - Color"
    const frameData = Object.entries(salesData.frame).flatMap(([frameName, colors]) =>
      Object.entries(colors).map(([color, quantity]) => ({
        name: `${frameName} - ${color}`,
        value: quantity
      }))
    );

    const contactLensData = Object.entries(salesData.contactLens).map(([category, quantity]) => ({
      name: category,
      value: quantity,
      fill: COLORS[Object.keys(salesData.contactLens).indexOf(category) % COLORS.length]
    }));

    const accessoriesData = Object.entries(salesData.accessories).map(([name, quantity]) => ({
      name,
      value: quantity
    }));

    // Prepare trend data
    const trendData = viewType === 'daily' 
      ? dailySummaries.slice(0, 7).reverse().map(summary => ({
          date: format(new Date(summary.date), 'MMM dd'),
          revenue: summary.totalRevenue,
          items: summary.totalItems
        }))
      : monthlySummaries.slice(0, 6).reverse().map(summary => ({
          date: format(new Date(summary.month), 'MMM yyyy'),
          revenue: summary.totalRevenue,
          items: summary.totalItems
        }));

    return {
      lensData,
      frameData,
      contactLensData,
      accessoriesData,
      trendData
    };
  };

  const columns = [
    { 
      key: 'date', 
      header: 'Date & Time',
      render: (row: any) => format(row.date, 'MMM dd, yyyy HH:mm')
    },
    { key: 'store', header: 'Store', render: (row: any) => row.store?.toUpperCase() },
    { key: 'vocNumber', header: 'VOC Number' },
    { key: 'itemName', header: 'Item Name' },
    { 
      key: 'type', 
      header: 'Type',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          {row.type === 'Lens' && <Eye size={16} className="text-blue-500" />}
          {row.type === 'Frame' && <Glasses size={16} className="text-green-500" />}
          {row.type === 'Accessories' && <Package size={16} className="text-amber-500" />}
          {row.type === 'Contact Lens' && <ShoppingBag size={16} className="text-purple-500" />}
          <span>{row.type}</span>
          {row.isBifocal && (
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              Bifocal
            </span>
          )}
        </div>
      )
    },
    { key: 'category', header: 'Category' },
    { 
      key: 'details', 
      header: 'Details',
      render: (row: any) => {
        if (row.type === 'Frame' && row.details.color) {
          return (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              {row.details.color}
            </span>
          );
        }
        if (row.type === 'Lens') {
          return (
            <div className="text-xs space-y-1">
              <div>SPH: {row.details.sph || '-'}</div>
              <div>CYL: {row.details.cyl || '-'}</div>
              <div>AXIS: {row.details.axis || '-'}</div>
              {row.details.addition && <div>ADD: {row.details.addition}</div>}
              {row.isBifocal && row.details.leftEyeQty !== undefined && row.details.rightEyeQty !== undefined && (
                <div className="text-purple-600 font-medium">
                  L: {formatQuantity(row.details.leftEyeQty)} | R: {formatQuantity(row.details.rightEyeQty)}
                </div>
              )}
            </div>
          );
        }
        if (row.type === 'Contact Lens' && row.details.power) {
          return (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
              Power: {row.details.power}
            </span>
          );
        }
        return '-';
      }
    },
    { 
      key: 'quantity', 
      header: 'Quantity',
      render: (row: any) => (
        <div className="font-medium">
          {row.type === 'Lens' && row.isBifocal ? (
            <div className="text-center">
              <div className="text-sm">{formatQuantity(row.quantity)}</div>
              <div className="text-xs text-gray-500">pairs</div>
            </div>
          ) : (
            <span>{row.type === 'Lens' ? formatQuantity(row.quantity) : row.quantity}</span>
          )}
        </div>
      )
    },
    { 
      key: 'price', 
      header: 'Price',
      render: (row: any) => formatCurrency(row.price)
    },
    { 
      key: 'total', 
      header: 'Total',
      render: (row: any) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(row.total)}
        </span>
      )
    },
  ];

  const { lensData, frameData, contactLensData, accessoriesData, trendData } = prepareChartData();

  const SummaryCards = () => {
    const summaries = viewType === 'daily' ? dailySummaries : monthlySummaries;
    const currentSummary = summaries[0];
    
    if (!currentSummary) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-100">
                {viewType === 'daily' ? 'Daily' : 'Monthly'} Revenue
              </h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-white">
                {formatCurrency(currentSummary.totalRevenue)}
              </p>
            </div>
          </div>
          {viewType === 'monthly' && (
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Avg Daily: {formatCurrency((currentSummary as MonthlySummary).averageDailyRevenue)}
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded-xl shadow-sm border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800 dark:text-green-100">Total Items</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-white">
                {formatQuantity(currentSummary.totalItems)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 rounded-xl shadow-sm border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Eye size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-100">Lenses</h3>
              <p className="text-2xl font-bold text-purple-900 dark:text-white">
                {formatQuantity(currentSummary.lensCount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 p-4 rounded-xl shadow-sm border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Glasses size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-100">Frames</h3>
              <p className="text-2xl font-bold text-amber-900 dark:text-white">
                {currentSummary.frameCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <Header title="Sales Analytics Dashboard" />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-500" />
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-40"
              />
            </div>
            
            <Select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value as Store | 'all')}
              options={[
                { value: 'all', label: 'All Stores' },
                ...STORES.map(store => ({ value: store, label: store.toUpperCase() }))
              ]}
              className="w-40"
            />

            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewType('daily')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === 'daily' 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Daily View
              </button>
              <button
                onClick={() => setViewType('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === 'monthly' 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Monthly View
              </button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              className="flex items-center gap-2"
            >
              <FileDown size={16} />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToGoogleSheets}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet size={16} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards />

        {/* Summary Section */}
        <div className="mb-6">
          <div 
            className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-lg cursor-pointer mb-4 border border-gray-200 dark:border-gray-600"
            onClick={() => setShowSummary(!showSummary)}
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-gray-600 dark:text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {viewType === 'daily' ? 'Daily' : 'Monthly'} Sales Summary
              </h3>
            </div>
            {showSummary ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          
          {showSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Lens Sales */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={18} className="text-blue-600" />
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Lens Sales</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {Object.entries(salesData.lens).slice(0, 5).map(([category, quantity]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">{category.toUpperCase()}:</span>
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        {formatQuantity(quantity)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(salesData.lens).length === 0 && (
                    <div className="text-gray-500 text-center py-2">No lens sales</div>
                  )}
                </div>
              </div>

              {/* Frame Sales - FIXED: Show actual frame names */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-2 mb-3">
                  <Glasses size={18} className="text-green-600" />
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Frame Sales</h4>
                </div>
                <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                  {Object.entries(salesData.frame).slice(0, 3).map(([frameName, colors]) => (
                    <div key={frameName} className="space-y-1">
                      <div className="font-medium text-green-700 dark:text-green-300 truncate" title={frameName}>
                        {frameName}
                      </div>
                      {Object.entries(colors).slice(0, 2).map(([color, quantity]) => (
                        <div key={color} className="flex justify-between items-center pl-3 text-xs">
                          <span className="text-gray-600 dark:text-gray-400">{color}:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{quantity}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {Object.keys(salesData.frame).length === 0 && (
                    <div className="text-gray-500 text-center py-2">No frame sales</div>
                  )}
                </div>
              </div>

              {/* Contact Lens Sales */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag size={18} className="text-purple-600" />
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200">Contact Lens Sales</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {Object.entries(salesData.contactLens).map(([category, quantity]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">{category}:</span>
                      <span className="font-medium text-purple-700 dark:text-purple-300">{quantity}</span>
                    </div>
                  ))}
                  {Object.keys(salesData.contactLens).length === 0 && (
                    <div className="text-gray-500 text-center py-2">No contact lens sales</div>
                  )}
                </div>
              </div>

              {/* Accessories Sales */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={18} className="text-amber-600" />
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200">Accessories Sales</h4>
                </div>
                <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                  {Object.entries(salesData.accessories).slice(0, 5).map(([name, quantity]) => (
                    <div key={name} className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{name}:</span>
                      <span className="font-medium text-amber-700 dark:text-amber-300">{quantity}</span>
                    </div>
                  ))}
                  {Object.keys(salesData.accessories).length === 0 && (
                    <div className="text-gray-500 text-center py-2">No accessories sales</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="mb-6">
          <div 
            className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg cursor-pointer mb-4 border border-indigo-200 dark:border-indigo-700"
            onClick={() => setShowCharts(!showCharts)}
          >
            <div className="flex items-center gap-2">
              <PieChartIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200">Sales Analytics</h3>
            </div>
            {showCharts ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  {viewType === 'daily' ? 'Daily' : 'Monthly'} Revenue Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'revenue' ? formatCurrency(value) : formatQuantity(value),
                        name === 'revenue' ? 'Revenue' : 'Items'
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: '#f9fafb', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Lens Distribution */}
              {lensData.length > 0 && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Lens Sales Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={lensData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, value }) => `${name} (${(percent * 100).toFixed(0)}%) - ${formatQuantity(value)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {lensData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatQuantity(value), 'Quantity']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Frame Sales - FIXED: Show actual frame names in chart */}
              {frameData.length > 0 && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Frame Sales by Name & Color</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={frameData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        stroke="#6b7280"
                        fontSize={10}
                      />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        formatter={(value) => [value, 'Quantity']}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: '#f9fafb', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Contact Lens Distribution */}
              {contactLensData.length > 0 && (
                <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Contact Lens Sales</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={contactLensData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8b5cf6"
                        dataKey="value"
                      >
                        {contactLensData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Quantity']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Detailed Sales Data ({salesList.length} items)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Revenue: <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
              </p>
            </div>
            <DataTable 
              data={salesList} 
              columns={columns} 
              filterKey="itemName"
              itemsPerPage={20}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesDataPage;