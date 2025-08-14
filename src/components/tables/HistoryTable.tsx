import React from 'react';
import { format } from 'date-fns';
import DataTable from '../tables/DataTable';
import { ItemHistory } from '../../lib/utils';

interface ItemHistoryTableProps {
  history: ItemHistory[];
}

const ItemHistoryTable: React.FC<ItemHistoryTableProps> = ({ history }) => {
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
    { key: 'action', header: 'Action', sortable: true },
    { 
      key: 'changes',
      header: 'Changes',
      render: (row: ItemHistory) => {
        if (row.action === 'delete') {
          return <span className="text-red-600">Item deleted</span>;
        }
        
        return row.changes?.map((change, index) => (
          <div key={index} className="mb-1">
            <span className="font-medium">{change.field}: </span>
            <span className="text-red-600">{change.oldValue}</span>
            <span> → </span>
            <span className="text-green-600">{change.newValue}</span>
          </div>
        ));
      }
    },
    { key: 'staffEmail', header: 'Staff', sortable: true },
  ];

  return (
    <DataTable
      data={history}
      columns={columns}
      filterKey="itemName"
      itemsPerPage={10}
    />
  );
};

export default ItemHistoryTable;