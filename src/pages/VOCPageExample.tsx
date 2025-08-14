import React from 'react';
import VOCManagementPage from './VOCManagementPage';
import { Store } from '../lib/utils';

// Example usage of the VOC Management Page
const VOCPageExample: React.FC = () => {
  // You can change this to 'mandalay' or other store names
  const currentStore: Store = 'yangon';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <VOCManagementPage store={currentStore} />
      </div>
    </div>
  );
};

export default VOCPageExample;