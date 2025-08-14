import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Header from '../components/layout/Header';
import DataTable from '../components/tables/DataTable';
import { formatCurrency, exportToExcel, ItemHistoryType, ItemHistoryAction } from '../lib/utils';
import { AlertTriangle, TrendingUp, Package, DollarSign, FileDown, History, Edit, Trash2, CreditCard } from 'lucide-react';
import Button from '../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
// import { Edit, Trash2, History } from 'lucide-react';

type RecentHistoryItem = {
  id: string;
  createdAt: Date;
  itemType: ItemHistoryType;
  itemName: string;
  itemCode?: string;
  action: ItemHistoryAction;
  staffEmail: string;
  changes?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
};

type SalesStats = {
  dailySales: number;
  monthlySales: number;
  topSellingItems: any[];
  lowStockItems: any[];
  todayOrders: any[];
  dailyTransactions: number;
  dailyItemsSold: number;
  lensSales: number;
  frameSales: number;
  accessoriesSales: number;
  contactLensSales: number;
  recentHistory: RecentHistoryItem[];
  dailyExpenses: number;
  monthlyExpenses: number;
};

const Dashboard: React.FC = () => {
  const [salesStats, setSalesStats] = useState<SalesStats>({
    dailySales: 0,
    monthlySales: 0,
    topSellingItems: [],
    lowStockItems: [],
    todayOrders: [],
    dailyTransactions: 0,
    dailyItemsSold: 0,
    lensSales: 0,
    frameSales: 0,
    accessoriesSales: 0,
    contactLensSales: 0,
    recentHistory: [],
    dailyExpenses: 0,
    monthlyExpenses: 0,
  });

  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'monthly'>('daily');
  const [selectedTab, setSelectedTab] = useState<'all' | 'lens' | 'frame' | 'accessories' | 'contact'>('all');
  const [historyTab, setHistoryTab] = useState<'all' | 'edit' | 'delete'>('all');

  useEffect(() => {
    fetchDashboardData();
  }, [salesPeriod]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Fetch daily sales
      const dailySalesQuery = query(
        collection(db, 'vouchers'),
        where('createdAt', '>=', Timestamp.fromDate(today)),
        orderBy('createdAt', 'desc')
      );

      const dailySalesSnapshot = await getDocs(dailySalesQuery);
      const dailyTotal = dailySalesSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().totalAmount || 0),
        0
      );

      // Calculate sales by item type
      let lensSales = 0;
      let frameSales = 0;
      let accessoriesSales = 0;
      let contactLensSales = 0;
      let voc = 0;

      dailySalesSnapshot.docs.forEach(doc => {
        const items = doc.data().items || [];
        items.forEach((item: any) => {
          const itemTotal = item.price * item.quantity;
          switch (item.type) {
            case 'Lens':
              lensSales += itemTotal;
              break;
            case 'Frame':
              frameSales += itemTotal;
              break;
            case 'Accessories':
              accessoriesSales += itemTotal;
              break;
            case 'Contact Lens':
              contactLensSales += itemTotal;
              break;
            case 'voc':
              voc += itemTotal;
              break;
          }
        });
      });

      // Calculate daily transactions and items sold
      const dailyTransactions = dailySalesSnapshot.docs.length;
      const dailyItemsSold = dailySalesSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0),
        0
      );

      // Fetch monthly sales
      const monthlySalesQuery = query(
        collection(db, 'vouchers'),
        where('createdAt', '>=', Timestamp.fromDate(monthStart)),
        orderBy('createdAt', 'desc')
      );

      const monthlySalesSnapshot = await getDocs(monthlySalesQuery);
      const monthlyTotal = monthlySalesSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().totalAmount || 0),
        0
      );

      // Fetch today's orders
      const todayOrdersQuery = query(
        collection(db, 'vouchers'),
        where('createdAt', '>=', Timestamp.fromDate(today)),
        orderBy('createdAt', 'desc')
      );

      const todayOrdersSnapshot = await getDocs(todayOrdersQuery);
      const todayOrders = todayOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      // Fetch low stock items
      const lowStockItems: any[] = [];
      const itemCollections = ['lenses', 'frames', 'accessories', 'contactLenses'];

      for (const collectionName of itemCollections) {
        const lowStockQuery = query(
          collection(db, collectionName),
          where('qty', '<=', 5)
        );

        const snapshot = await getDocs(lowStockQuery);
        lowStockItems.push(
          ...snapshot.docs.map(doc => ({
            id: doc.id,
            type: collectionName,
            ...doc.data()
          }))
        );
      }

      // Fetch recent history (last 20 changes)
      const historyQuery = query(
        collection(db, 'itemHistory'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const historySnapshot = await getDocs(historyQuery);
      const recentHistory = historySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          changes: data.changes || [],
        };
      });

      // Fetch daily expenses
      const dailyExpensesQuery = query(
        collection(db, 'expenses'),
        where('date', '>=', today.toISOString().substring(0, 10)),
        orderBy('date', 'desc')
      );

      const dailyExpensesSnapshot = await getDocs(dailyExpensesQuery);
      const dailyExpensesTotal = dailyExpensesSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      // Fetch monthly expenses
      const monthStartISO = monthStart.toISOString().substring(0, 10);
      const monthlyExpensesQuery = query(
        collection(db, 'expenses'),
        where('date', '>=', monthStartISO),
        orderBy('date', 'desc')
      );

      const monthlyExpensesSnapshot = await getDocs(monthlyExpensesQuery);
      const monthlyExpensesTotal = monthlyExpensesSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      setSalesStats({
        dailySales: dailyTotal,
        monthlySales: monthlyTotal,
        topSellingItems: [],
        lowStockItems,
        todayOrders,
        dailyTransactions,
        dailyItemsSold,
        lensSales,
        frameSales,
        accessoriesSales,
        contactLensSales,
        recentHistory,
        dailyExpenses: dailyExpensesTotal,
        monthlyExpenses: monthlyExpensesTotal,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleExportTodaySalesExcel = () => {
    const filteredOrders = salesStats.todayOrders.filter(order => {
      if (selectedTab === 'all') return true;
      return order.items.some((item: any) => {
        switch (selectedTab) {
          case 'lens':
            return item.type === 'Lens';
          case 'frame':
            return item.type === 'Frame';
          case 'accessories':
            return item.type === 'Accessories';
          case 'contact':
            return item.type === 'Contact Lens';
          default:
            return true;
        }
      });
    });

    const data = filteredOrders.map(order => ({
      'VOC Number': order.vocNumber,
      'Customer': order.customerName,
      'Items': order.items
        .filter((item: any) => {
          if (selectedTab === 'all') return true;
          switch (selectedTab) {
            case 'lens':
              return item.type === 'Lens';
            case 'frame':
              return item.type === 'Frame';
            case 'accessories':
              return item.type === 'Accessories';
            case 'contact':
              return item.type === 'Contact Lens';
            default:
              return true;
          }
        })
        .map((item: any) => {
          let details = `${item.name} (${item.quantity}x)`;
          if (item.type === 'Lens' && item.details) {
            details += ` - SPH: ${item.details.sph || '-'}, CYL: ${item.details.cyl || '-'}, AXIS: ${item.details.axis || '-'}`;
          }
          if (item.type === 'Frame' && item.details?.color) {
            details += ` - Color: ${item.details.color}`;
          }
          if (item.type === 'Contact Lens' && item.details?.power) {
            details += ` - Power: ${item.details.power}`;
          }
          return details;
        }).join('; '),
      'Total Amount': formatCurrency(order.totalAmount),
      'Payment Method': order.paymentMethod,
      'Staff': order.staffEmail,
    }));

    exportToExcel(data, 'today-sales');
  };

  const todayOrderColumns = [
    { key: 'vocNumber', header: 'VOC Number', sortable: true },
    { key: 'customerName', header: 'Customer', sortable: true },
    { 
      key: 'items', 
      header: 'Items', 
      render: (row: any) => (
        <div className="space-y-1">
          {row.items
            .filter((item: any) => {
              if (selectedTab === 'all') return true;
              switch (selectedTab) {
                case 'lens':
                  return item.type === 'Lens';
                case 'frame':
                  return item.type === 'Frame';
                case 'accessories':
                  return item.type === 'Accessories';
                case 'contact':
                  return item.type === 'Contact Lens';
                default:
                  return true;
              }
            })
            .map((item: any, index: number) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{item.name}</span> ({item.quantity}x)
                {item.type === 'Lens' && item.details && (
                  <span className="text-gray-600 dark:text-gray-400">
                    {' '}- SPH: {item.details.sph || '-'}, 
                    CYL: {item.details.cyl || '-'}, 
                    AXIS: {item.details.axis || '-'}
                  </span>
                )}
                {item.type === 'Frame' && item.details?.color && (
                  <span className="text-gray-600 dark:text-gray-400">
                    {' '}- Color: {item.details.color}
                  </span>
                )}
                {item.type === 'Contact Lens' && item.details?.power && (
                  <span className="text-gray-600 dark:text-gray-400">
                    {' '}- Power: {item.details.power}
                  </span>
                )}
              </div>
            ))}
        </div>
      )
    },
    { 
      key: 'totalAmount', 
      header: 'Amount', 
      sortable: true,
      render: (row: any) => formatCurrency(row.totalAmount)
    },
    { key: 'paymentMethod', header: 'Payment Method' },
    { key: 'staffEmail', header: 'Staff' },
    { 
      key: 'createdAt', 
      header: 'Date', 
      sortable: true,
      render: (row: any) => format(row.createdAt, 'PPpp')
    },
  ];

  const lowStockColumns = [
    { key: 'name', header: 'Item Name' },
    { key: 'type', header: 'Type' },
    { key: 'qty', header: 'Quantity' },
  ];

  const filteredOrders = salesStats.todayOrders.filter(order => {
    if (selectedTab === 'all') return true;
    return order.items.some((item: any) => {
      switch (selectedTab) {
        case 'lens':
          return item.type === 'Lens';
        case 'frame':
          return item.type === 'Frame';
        case 'accessories':
          return item.type === 'Accessories';
        case 'contact':
          return item.type === 'Contact Lens';
        default:
          return true;
      }
    });
  });

  const filteredHistory = salesStats.recentHistory.filter(item => {
    if (historyTab === 'all') return true;
    return item.action === historyTab;
  });

  const historyColumns = [
    {
      key: 'createdAt',
      header: 'Date & Time',
      sortable: true,
      render: (row: any) => format(row.createdAt, 'PPpp'),
    },
    { 
      key: 'itemType', 
      header: 'Item Type', 
      sortable: true
    },
    { 
      key: 'itemName', 
      header: 'Item Name', 
      sortable: true
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (row: any) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.action === 'update' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
        }`}>
          {row.action === 'update' ? 'Edit' : 'Delete'}
        </span>
      )
    },
    {
      key: 'changes',
      header: 'Changes',
      render: (row: any) => {
        if (row.action === 'delete') {
          return <span className="text-red-600">Item deleted</span>;
        }
        
        if (!row.changes || row.changes.length === 0) {
          return <span className="text-gray-500">No details available</span>;
        }
        
        return (
          <div className="space-y-1 text-sm">
            {row.changes.map((change: any, index: number) => (
              <div key={index} className="flex flex-col">
                <span className="font-medium">{change.field}:</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-red-500">{change.oldValue}</span>
                  <span className="text-green-600">→</span>
                  <span className="text-green-600">{change.newValue}</span>
                </div>
                {change.field === 'qty' && (
                  <div className="text-xs text-gray-600 mt-1">
                    <span>Total: {row.totalQty || 'N/A'}</span>
                    <span className="mx-2">|</span>
                    <span>Remaining: {change.newValue}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      key: 'staffEmail',
      header: 'Staff',
      sortable: true
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <Header title="Dashboard" />
      
      {/* Sales Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-500 text-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Daily Sales</p>
              <h3 className="text-2xl font-bold">{formatCurrency(salesStats.dailySales)}</h3>
            </div>
            <DollarSign size={24} className="opacity-75" />
          </div>
        </div>
        
        <div className="bg-green-500 text-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Monthly Sales</p>
              <h3 className="text-2xl font-bold">{formatCurrency(salesStats.monthlySales)}</h3>
            </div>
            <TrendingUp size={24} className="opacity-75" />
          </div>
        </div>
        
        <div className="bg-purple-500 text-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Today's Transactions</p>
              <h3 className="text-2xl font-bold">{salesStats.dailyTransactions}</h3>
              <p className="text-sm opacity-75">{salesStats.dailyItemsSold} items sold</p>
            </div>
            <Package size={24} className="opacity-75" />
          </div>
        </div>
        
        <div className="bg-red-500 text-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Low Stock Items</p>
              <h3 className="text-2xl font-bold">{salesStats.lowStockItems.length}</h3>
            </div>
            <AlertTriangle size={24} className="opacity-75" />
          </div>
        </div>
      </div>

      {/* Sales by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-indigo-500 text-white rounded-lg shadow-md p-4">
          <p className="text-sm opacity-75">Lens Sales</p>
          <h3 className="text-2xl font-bold">{formatCurrency(salesStats.lensSales)}</h3>
        </div>
        
        <div className="bg-pink-500 text-white rounded-lg shadow-md p-4">
          <p className="text-sm opacity-75">Frame Sales</p>
          <h3 className="text-2xl font-bold">{formatCurrency(salesStats.frameSales)}</h3>
        </div>
        
        <div className="bg-yellow-500 text-white rounded-lg shadow-md p-4">
          <p className="text-sm opacity-75">Accessories Sales</p>
          <h3 className="text-2xl font-bold">{formatCurrency(salesStats.accessoriesSales)}</h3>
        </div>
        
        <div className="bg-cyan-500 text-white rounded-lg shadow-md p-4">
          <p className="text-sm opacity-75">Contact Lens Sales</p>
          <h3 className="text-2xl font-bold">{formatCurrency(salesStats.contactLensSales)}</h3>
        </div>
      </div>

      {/* Expenses and Net Profit */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-orange-500 text-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Daily Expenses</p>
              <h3 className="text-2xl font-bold">{formatCurrency(salesStats.dailyExpenses)}</h3>
            </div>
            <CreditCard size={24} className="opacity-75" />
          </div>
        </div>
        
        <div className="bg-amber-500 text-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Monthly Expenses</p>
              <h3 className="text-2xl font-bold">{formatCurrency(salesStats.monthlyExpenses)}</h3>
            </div>
            <CreditCard size={24} className="opacity-75" />
          </div>
        </div>
        
        <div className="bg-emerald-600 text-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Daily Net Profit</p>
              <h3 className="text-2xl font-bold">
                {formatCurrency(salesStats.dailySales - salesStats.dailyExpenses)}
              </h3>
              <p className="text-xs opacity-75">
                Sales - Expenses
              </p>
            </div>
            <TrendingUp size={24} className="opacity-75" />
          </div>
        </div>
        
        <div className="bg-teal-600 text-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Monthly Net Profit</p>
              <h3 className="text-2xl font-bold">
                {formatCurrency(salesStats.monthlySales - salesStats.monthlyExpenses)}
              </h3>
              <p className="text-xs opacity-75">
                Sales - Expenses
              </p>
            </div>
            <DollarSign size={24} className="opacity-75" />
          </div>
        </div>
      </div>
      
      {/* Today's Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Today's Orders
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTodaySalesExcel}
              className="flex items-center gap-1"
            >
              <FileDown size={16} />
              Export Excel
            </Button>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as typeof selectedTab)}>
          <TabsList>
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="lens">Lens Orders</TabsTrigger>
            <TabsTrigger value="frame">Frame Orders</TabsTrigger>
            <TabsTrigger value="accessories">Accessories Orders</TabsTrigger>
            <TabsTrigger value="contact">Contact Lens Orders</TabsTrigger>
          </TabsList>
          <TabsContent value={selectedTab}>
            <DataTable 
              data={filteredOrders} 
              columns={todayOrderColumns}
              itemsPerPage={5}
            />
          </TabsContent>
        </Tabs>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
      <History size={20} />
      VOC Changes History
    </h2>
    <Button
      variant="outline"
      size="sm"
      onClick={fetchDashboardData}
      className="flex items-center gap-2"
    >
      <History size={16} />
      Refresh
    </Button>
  </div>

  <Tabs value={historyTab} onValueChange={(value) => setHistoryTab(value as typeof historyTab)}>
    <TabsList>
      <TabsTrigger value="all">All Changes</TabsTrigger>
      <TabsTrigger value="update" className="flex items-center gap-1">
        <Edit size={14} />
        Edits
      </TabsTrigger>
      <TabsTrigger value="delete" className="flex items-center gap-1">
        <Trash2 size={14} />
        Deletions
      </TabsTrigger>
    </TabsList>
    <TabsContent value={historyTab}>
      <DataTable 
        data={salesStats.recentHistory.filter(item => {
          if (historyTab === 'all') return item.itemType === 'voc';
          return item.itemType === 'voc' && item.action === historyTab;
        })}
        columns={[
          {
            key: 'createdAt',
            header: 'Date & Time',
            sortable: true,
            render: (row: any) => format(row.createdAt, 'PPpp'),
          },
          { 
            key: 'itemName', 
            header: 'VOC Number', 
            sortable: true
          },
          {
            key: 'action',
            header: 'Action',
            sortable: true,
            render: (row: any) => (
              <span className={`px-2 py-1 rounded-full text-xs ${
                row.action === 'update' 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
              }`}>
                {row.action === 'update' ? 'Edit' : 'Delete'}
              </span>
            )
          },
          {
            key: 'changes',
            header: 'Changes',
            render: (row: any) => {
              if (row.action === 'delete') {
                return <span className="text-red-600">VOC deleted</span>;
              }
              
              if (!row.changes || row.changes.length === 0) {
                return <span className="text-gray-500">No details available</span>;
              }
              
              return (
                <div className="space-y-1 text-sm">
                  {row.changes.map((change: any, index: number) => (
                    <div key={index} className="flex flex-col">
                      <span className="font-medium">{change.field}:</span>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-red-500">{change.oldValue}</span>
                        <span className="text-green-600">→</span>
                        <span className="text-green-600">{change.newValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
          },
          {
            key: 'staffEmail',
            header: 'Staff',
            sortable: true
          },
        ]}
        itemsPerPage={10}
        searchable={true}
        filterKey="itemName"
      />
    </TabsContent>
  </Tabs>
</div>
      
      {/* Recent Changes History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <History size={20} />
            Recent Changes History
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="flex items-center gap-2"
          >
            <History size={16} />
            Refresh History
          </Button>
        </div>
        
        <Tabs value={historyTab} onValueChange={(value) => setHistoryTab(value as typeof historyTab)}>
          <TabsList>
            <TabsTrigger value="all">All Changes</TabsTrigger>
            <TabsTrigger value="update" className="flex items-center gap-1">
              <Edit size={14} />
              Edits
            </TabsTrigger>
            <TabsTrigger value="delete" className="flex items-center gap-1">
              <Trash2 size={14} />
              Deletions
            </TabsTrigger>
          </TabsList>
          <TabsContent value={historyTab}>
            <DataTable 
              data={filteredHistory}
              columns={historyColumns}
              itemsPerPage={10}
              searchable={true}
              filterKey="itemName"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Low Stock Alert
        </h2>
        <DataTable 
          data={salesStats.lowStockItems} 
          columns={lowStockColumns}
          itemsPerPage={5}
        />
      </div>
    </div>
  );
};

export default Dashboard;