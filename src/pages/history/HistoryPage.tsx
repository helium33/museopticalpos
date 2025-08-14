import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import DataTable from '../../components/tables/DataTable';
import { ItemHistory, ItemHistoryType } from '../../lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const HistoryPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  const [history, setHistory] = useState<ItemHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ItemHistoryType | null>(null);
  const [selectedAction, setSelectedAction] = useState<'update' | 'delete' | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const itemTypes: ItemHistoryType[] = ['Lens', 'Frame', 'Accessories', 'Contact Lens'];
  const actionTypes = ['update', 'delete'];

  useEffect(() => {
    const fetchHistory = async () => {
      if (!store) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Base query constraints
        const constraints: QueryConstraint[] = [
          where('store', '==', store),
          orderBy('createdAt', 'desc')
        ];

        // Add type filter if selected
        if (selectedType) {
          constraints.push(where('itemType', '==', selectedType));
        }

        // Add action filter if selected
        if (selectedAction) {
          constraints.push(where('action', '==', selectedAction));
        }

        // Add date range filters if selected
        if (startDate) {
          const startDateTime = new Date(startDate);
          startDateTime.setHours(0, 0, 0, 0);
          constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDateTime)));
        }

        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          constraints.push(where('createdAt', '<=', Timestamp.fromDate(endDateTime)));
        }

        // Create and execute query
        const historyQuery = query(collection(db, 'itemHistory'), ...constraints);
        const querySnapshot = await getDocs(historyQuery);

        // Process results
        const historyData: ItemHistory[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            itemType: data.itemType,
            itemName: data.itemName,
            itemCode: data.itemCode,
            action: data.action,
            changes: data.changes || [],
            staffEmail: data.staffEmail,
            store: data.store,
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        });

        setHistory(historyData);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError('Failed to fetch history. Please ensure you have the proper indexes created.');
        toast.error('Error loading history data');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [store, selectedType, selectedAction, startDate, endDate]);
  

  const handleDownloadExcel = () => {
    try {
      const worksheetData = history.map(item => ({
        Date: format(item.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        'Item Type': item.itemType,
        'Item Name': item.itemName,
        'Item Code': item.itemCode,
        Action: item.action.toUpperCase(),
        Changes: item.action === 'delete' 
          ? 'Item deleted'
          : item.changes?.map(change => `${change.field}: ${change.oldValue} → ${change.newValue}`).join('; '),
        Staff: item.staffEmail,
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'History');
      XLSX.writeFile(workbook, `History_${store}_${Date.now()}.xlsx`);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to download Excel file');
    }
  };

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row: ItemHistory) => format(row.createdAt, 'yyyy-MM-dd HH:mm:ss')
    },
    { key: 'itemType', header: 'Item Type', sortable: true },
    { key: 'itemName', header: 'Item Name', sortable: true },
    { key: 'itemCode', header: 'Item Code', sortable: true },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (row: ItemHistory) => (
        <span className={`font-medium ${row.action === 'delete' ? 'text-red-600' : 'text-blue-600'}`}>
          {row.action.toUpperCase()}
        </span>
      )
    },
    {
      key: 'changes',
      header: 'Changes',
      render: (row: ItemHistory) => {
        if (row.action === 'delete') {
          return <span className="text-red-600">Item deleted</span>;
        }

        return (
          <div className="space-y-1">
            {row.changes?.map((change, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">{change.field}: </span>
                <span className="text-red-600">{change.oldValue}</span>
                <span> → </span>
                <span className="text-green-600">{change.newValue}</span>
              </div>
            ))}
          </div>
        );
      }
    },
    { key: 'staffEmail', header: 'Staff', sortable: true },
  ];

  return (
    <div className="space-y-6 p-4">
      <Header title={`Item History - ${store?.toUpperCase()}`} />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Item Update & Delete History
            </h2>
            <Button 
              onClick={handleDownloadExcel} 
              variant="outline" 
              className="ml-auto"
              disabled={history.length === 0}
            >
              Download Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="h-10 mt-6"
            >
              Clear Dates
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedType === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              All Types
            </Button>
            {itemTypes.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedAction === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedAction(null)}
            >
              All Actions
            </Button>
            {actionTypes.map(action => (
              <Button
                key={action}
                variant={selectedAction === action ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedAction(action as 'update' | 'delete')}
              >
                {action.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-800/70 z-10 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-3 text-gray-600 dark:text-gray-300">Loading history data...</p>
            </div>
          )}

          {error && (
            <div className="text-center p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center p-4 text-gray-600 dark:text-gray-400">
              No history records found
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <DataTable
              data={history}
              columns={columns}
              filterKey="itemName"
              itemsPerPage={10}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;