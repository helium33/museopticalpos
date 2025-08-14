import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, FileDown, Calendar, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import CustomerForm, { CustomerFormData } from '../../components/customer/CustomerForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import DateRangePicker from '../../components/ui/DataRangePicker';
import toast from 'react-hot-toast';
import { CustomerType } from '../../lib/utils';
import * as XLSX from 'xlsx';

const CustomerPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  
  const [customers, setCustomers] = useState<CustomerFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<CustomerType | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  const [customerStats, setCustomerStats] = useState({
    children: 0,
    male16to35: 0,
    female16to35: 0,
    male36to50: 0,
    female36to50: 0,
    male50plus: 0,
    female50plus: 0,
    total: 0,
    todayAdded: 0,
    thisWeekAdded: 0,
    thisMonthAdded: 0
  });
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerFormData | null>(null);

  const calculateCustomerStats = (customerList: CustomerFormData[]) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const stats = {
      children: 0,
      male16to35: 0,
      female16to35: 0,
      male36to50: 0,
      female36to50: 0,
      male50plus: 0,
      female50plus: 0,
      total: customerList.length,
      todayAdded: 0,
      thisWeekAdded: 0,
      thisMonthAdded: 0
    };

    customerList.forEach(customer => {
      const age = customer.age;
      const gender = customer.gender;
      
      // Calculate recent additions
      const customerDate = new Date(customer.date);
      if (customerDate >= startOfToday) {
        stats.todayAdded++;
      }
      if (customerDate >= startOfWeek) {
        stats.thisWeekAdded++;
      }
      if (customerDate >= startOfMonth) {
        stats.thisMonthAdded++;
      }

      if (age <= 15) {
        stats.children++;
      } else if (age <= 35) {
        gender === 'Male' ? stats.male16to35++ : stats.female16to35++;
      } else if (age <= 50) {
        gender === 'Male' ? stats.male36to50++ : stats.female36to50++;
      } else {
        gender === 'Male' ? stats.male50plus++ : stats.female50plus++;
      }
    });

    return stats;
  };

  // Manual refresh function for real-time updates
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCustomers();
      toast.success('Customer data refreshed successfully!', {
        icon: '🔄',
        duration: 2000
      });
    } catch (error) {
      toast.error('Failed to refresh customer data');
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds to catch new customers from VOC forms
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchCustomers();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loading, refreshing, store, selectedType, startDate, endDate, isDateFilterActive]);

  const exportToExcel = () => {
    // Export both statistics and customer list
    const statsData = [
      ['Customer Statistics', '', '', ''],
      ['Age Group', 'Male', 'Female', 'Total'],
      ['Children (0-15)', customerStats.children, '-', customerStats.children],
      ['16-35', customerStats.male16to35, customerStats.female16to35, customerStats.male16to35 + customerStats.female16to35],
      ['36-50', customerStats.male36to50, customerStats.female36to50, customerStats.male36to50 + customerStats.female36to50],
      ['50+', customerStats.male50plus, customerStats.female50plus, customerStats.male50plus + customerStats.female50plus],
      ['Total', 
        customerStats.male16to35 + customerStats.male36to50 + customerStats.male50plus,
        customerStats.female16to35 + customerStats.female36to50 + customerStats.female50plus,
        customerStats.total
      ],
      ['', '', '', ''],
      ['Recent Additions', '', '', ''],
      ['Today', customerStats.todayAdded, '', ''],
      ['This Week', customerStats.thisWeekAdded, '', ''],
      ['This Month', customerStats.thisMonthAdded, '', '']
    ];

    // Customer list data
    const customerListData = [
      ['Customer List', '', '', '', '', '', '', '', '', ''],
      ['Number', 'Name', 'Type', 'Gender', 'Age', 'Phone', 'Address', 'WeChat', 'Store', 'Date'],
      ...customers.map(customer => [
        customer.number || '',
        customer.name || '',
        customer.type || '',
        customer.gender || '',
        customer.age || '',
        customer.phone || '',
        customer.address || '',
        customer.wechatName || '',
        customer.store || '',
        customer.date || ''
      ])
    ];

    const wb = XLSX.utils.book_new();
    
    // Add statistics sheet
    const statsWs = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');
    
    // Add customer list sheet
    const customerWs = XLSX.utils.aoa_to_sheet(customerListData);
    XLSX.utils.book_append_sheet(wb, customerWs, 'Customer List');
    
    // Generate filename with filter information
    let filename = `customer-statistics-${store}`;
    if (selectedType) filename += `-${selectedType}`;
    if (isDateFilterActive) filename += `-${startDate}_to_${endDate}`;
    filename += `-${new Date().toISOString().split('T')[0]}`;
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    toast.success('Excel file exported successfully!', {
      icon: '📊',
      duration: 3000
    });
  };

  const exportToGoogleSheets = () => {
    const data = [
      ['Age Group', 'Male', 'Female', 'Total'],
      ['Children (0-15)', customerStats.children, '-', customerStats.children],
      ['16-35', customerStats.male16to35, customerStats.female16to35, customerStats.male16to35 + customerStats.female16to35],
      ['36-50', customerStats.male36to50, customerStats.female36to50, customerStats.male36to50 + customerStats.female36to50],
      ['50+', customerStats.male50plus, customerStats.female50plus, customerStats.male50plus + customerStats.female50plus],
      ['Total', 
        customerStats.male16to35 + customerStats.male36to50 + customerStats.male50plus,
        customerStats.female16to35 + customerStats.female36to50 + customerStats.female50plus,
        customerStats.total
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Generate filename with filter information
    let filename = `customer-statistics-${store}`;
    if (selectedType) filename += `-${selectedType}`;
    if (isDateFilterActive) filename += `-${startDate}_to_${endDate}`;
    filename += `-${new Date().toISOString().split('T')[0]}`;
    
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.open('https://docs.google.com/spreadsheets/create', '_blank');
    
    toast.success('CSV file exported and Google Sheets opened!', {
      icon: '📈',
      duration: 3000
    });
  };
  
  useEffect(() => {
    fetchCustomers();
  }, [store, selectedType, startDate, endDate, isDateFilterActive]);

  const fetchCustomers = async () => {
    if (!store) return;
    
    try {
      setLoading(true);
      
      let customerQuery = query(
        collection(db, 'customers'),
        where('store', '==', store)
      );
      
      if (selectedType) {
        customerQuery = query(
          customerQuery,
          where('type', '==', selectedType)
        );
      }
      
      const snapshot = await getDocs(customerQuery);
      
      let customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as CustomerFormData));
      
      // Sort by date (newest first) to show recent VOC customers at the top
      customersData.sort((a, b) => {
        const dateA = new Date(a.date || '1970-01-01');
        const dateB = new Date(b.date || '1970-01-01');
        return dateB.getTime() - dateA.getTime();
      });
      
      // Apply date filtering in JavaScript after fetching data
      // This is more flexible than using Firebase queries for date ranges
      if (isDateFilterActive && startDate && endDate) {
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0); // Start of day
        
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of day
        
        customersData = customersData.filter(customer => {
          // Parse the customer date (YYYY-MM-DD format)
          const customerDate = new Date(customer.date);
          customerDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
          
          return customerDate >= startDateObj && customerDate <= endDateObj;
        });
      }
      
      setCustomers(customersData);
      setCustomerStats(calculateCustomerStats(customersData));
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditCustomer = (customer: CustomerFormData) => {
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteCustomer = (customer: CustomerFormData) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };
  
  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      setIsSubmitting(true);
      
      const customerData = {
        ...data,
        store,
        updatedAt: serverTimestamp(),
      };
      
      if (editingCustomer?.id) {
        const customerRef = doc(db, 'customers', editingCustomer.id);
        await updateDoc(customerRef, customerData);
        
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer.id === editingCustomer.id ? { ...customerData, id: customer.id } : customer
          )
        );
        
        toast.success('Customer updated successfully');
      } else {
        const newCustomer = {
          ...customerData,
          createdAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'customers'), newCustomer);
        
        setCustomers(prevCustomers => [...prevCustomers, { ...newCustomer, id: docRef.id }]);
        
        toast.success('Customer added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!customerToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'customers', customerToDelete.id));
      
      setCustomers(prevCustomers => 
        prevCustomers.filter(customer => customer.id !== customerToDelete.id)
      );
      
      toast.success('Customer deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (date && endDate) {
      setIsDateFilterActive(true);
    }
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    if (startDate && date) {
      setIsDateFilterActive(true);
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsDateFilterActive(false);
  };

  const toggleDateFilter = () => {
    setShowDateFilter(!showDateFilter);
    if (!showDateFilter) {
      // Initialize with last 30 days when opening filter
      if (!startDate && !endDate) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
        setIsDateFilterActive(true);
      }
    }
  };
  
  const customerColumns = [
    { key: 'number', header: 'Number' },
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type' },
    { key: 'gender', header: 'Gender' },
    { key: 'age', header: 'Age' },
    { key: 'phone', header: 'Phone' },
    { key: 'address', header: 'Address' },
    { key: 'wechatName', header: 'WeChat Name' },
    { key: 'store', header: 'Store' },
    { 
      key: 'date', 
      header: 'Date',
      render: (row: CustomerFormData) => {
        const customerDate = new Date(row.date);
        const today = new Date();
        const isToday = customerDate.toDateString() === today.toDateString();
        
        return (
          <span className={isToday ? 'font-bold text-green-600 bg-green-50 px-2 py-1 rounded' : ''}>
            {row.date}
            {isToday && ' (Today)'}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: CustomerFormData) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEditCustomer(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeleteCustomer(row)}
            className="p-1"
          >
            <Trash2 size={16} />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <Header title={`Customer Management - ${store?.toUpperCase()}`} />
      
      {/* Recent Activity Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-md p-4 border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Recent Customer Activity</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">Auto-updated from VOC forms</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">{customerStats.todayAdded}</div>
            <div className="text-sm text-blue-700 dark:text-blue-400">Added Today</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">{customerStats.thisWeekAdded}</div>
            <div className="text-sm text-indigo-700 dark:text-indigo-400">This Week</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">{customerStats.thisMonthAdded}</div>
            <div className="text-sm text-purple-700 dark:text-purple-400">This Month</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-100 dark:bg-blue-900/20 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Children (0-15)</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">{customerStats.children}</p>
          </div>
          
          <div className="bg-green-100 dark:bg-green-900/20 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Age 16-35</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-green-700 dark:text-green-300">Male</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-300">{customerStats.male16to35}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700 dark:text-green-300">Female</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-300">{customerStats.female16to35}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-100 dark:bg-yellow-900/20 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Age 36-50</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-yellow-700 dark:text-yellow-300">Male</span>
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">{customerStats.male36to50}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-700 dark:text-yellow-300">Female</span>
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">{customerStats.female36to50}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-100 dark:bg-purple-900/20 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">Age 50+</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-purple-700 dark:text-purple-300">Male</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">{customerStats.male50plus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-700 dark:text-purple-300">Female</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">{customerStats.female50plus}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Customers 
                {selectedType ? ` - ${selectedType}` : ''} 
                {isDateFilterActive ? ` (${startDate} to ${endDate})` : ''}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: {customerStats.total} customers • Auto-synced with VOC forms
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDateFilter}
                className="flex items-center gap-1"
              >
                <Calendar size={16} />
                {showDateFilter ? 'Hide Date Filter' : 'Show Date Filter'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="flex items-center gap-1"
              >
                <FileDown size={16} />
                Export Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportToGoogleSheets}
                className="flex items-center gap-1"
              >
                <FileDown size={16} />
                Export Google Sheets
              </Button>
              
              <Button
                variant="success"
                size="sm"
                onClick={handleAddCustomer}
                className="flex items-center gap-1"
              >
                <PlusCircle size={16} />
                Add Customer
              </Button>
            </div>
          </div>
          
          {showDateFilter && (
            <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md animate-fadeIn">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                onClear={clearDateFilter}
                isActive={isDateFilterActive}
              />
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedType === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              All Types
            </Button>
            
            <Button 
              variant={selectedType === 'Original' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('Original')}
            >
              Original
            </Button>
            
            <Button 
              variant={selectedType === 'Membership' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('Membership')}
            >
              Membership
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={customers} 
            columns={customerColumns} 
            filterKey="name"
            itemsPerPage={10}
          />
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <CustomerForm
          onSubmit={handleFormSubmit}
          initialData={editingCustomer || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={customerToDelete?.name || ''}
        onDelete={confirmDelete}
      />
    </div>
  );
};

export default CustomerPage;