import React from 'react';
import ErrorQuantityTest from '../components/test/ErrorQuantityTest';

const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <ErrorQuantityTest />
      </div>
    </div>
  );
};

export default TestPage;