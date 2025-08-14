import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import TransferManagement from '../components/transfer/TransferManagement';

const TransferPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Store parameter is required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please select a valid store to view transfer data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      <Header title={`Transfer Management - ${store.toUpperCase()}`} />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <TransferManagement currentStore={store} />
      </div>
    </div>
  );
};

export default TransferPage;