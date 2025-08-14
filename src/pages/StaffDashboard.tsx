import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
// import StaffVocDashboard from '../components/dashboard/StaffVocDashboard';
import { Store } from '../lib/utils';
import Select from '../components/ui/Select';
import { BarChart3, Users, Eye, Wrench } from 'lucide-react';
import StaffVocDashboard from '../components/Dashboard/StaffVocDashboard';

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<Store>('win') ;

  const stores: Store[] = ['win', 'pwint', 'yangon'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-blue-600" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                  Staff Performance Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Track staff performance and VOC relationships
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Store:
                </label>
                <Select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value as Store)}
                  options={stores.map(store => ({ value: store, label: store }))}
                  className="min-w-32"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <StaffVocDashboard store={selectedStore} />

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                <BarChart3 size={16} className="text-blue-600 dark:text-blue-300" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                How to Use This Dashboard
              </h3>
              <div className="space-y-2 text-blue-700 dark:text-blue-300">
                <p className="flex items-center gap-2">
                  <Users size={16} />
                  <strong>Sale Person:</strong> Shows how many VOCs each sales person has handled
                </p>
                <p className="flex items-center gap-2">
                  <Eye size={16} />
                  <strong>Eye Test:</strong> Displays eye test staff performance and VOC count
                </p>
                <p className="flex items-center gap-2">
                  <Wrench size={16} />
                  <strong>Fitting:</strong> Tracks fitting staff workload and VOC relationships
                </p>
                <p className="text-sm mt-3">
                  Use the month selector to view historical data and the staff type dropdown to focus on specific roles.
                  The charts and tables show both VOC counts and percentages for easy comparison.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;