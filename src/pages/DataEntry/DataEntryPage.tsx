import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Plus, X, Calendar, TrendingUp } from 'lucide-react';
import DataEntryDisplay from '../../components/dataEntry/DataEntryForm';
import DailyStockEntry from '../../components/dataEntry/DailyStockEntry';
import DailyEntryDashboard from '../../components/Dasnboard/DailyEntryDashboard';
import RestockTrackingCard from '../../components/restock/RestockTrackingCard';
import Button from '../../components/ui/Button';

const DataEntryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const isMonthly = date.length === 7; // YYYY-MM format for monthly
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily-entry' | 'dashboard' | 'restock' | 'data-entry'>('daily-entry');

  const tabs = [
    {
      id: 'daily-entry' as const,
      label: 'Daily Stock Entry',
      icon: <Calendar className="h-4 w-4" />,
      description: 'Record daily stock counts'
    },
    {
      id: 'dashboard' as const,
      label: 'Entry Dashboard',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'View completion statistics'
    },
    {
      id: 'restock' as const,
      label: 'Restock Tracking',
      icon: <Plus className="h-4 w-4" />,
      description: 'Track items needing restock'
    },
    {
      id: 'data-entry' as const,
      label: 'Data Entry',
      icon: <FileText className="h-4 w-4" />,
      description: 'Traditional data entry'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText />
          Inventory Management
        </h1>
        
        {activeTab === 'data-entry' && (
          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            variant="primary"
            className="flex items-center gap-2"
          >
            {isFormOpen ? (
              <>
                <X size={18} />
                Close Form
              </>
            ) : (
              <>
                <Plus size={18} />
                New Entry
              </>
            )}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'daily-entry' && <DailyStockEntry />}
      
      {activeTab === 'dashboard' && <DailyEntryDashboard />}
      
      {activeTab === 'restock' && <RestockTrackingCard />}
      
      {activeTab === 'data-entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isFormOpen && (
            <div className="lg:col-span-1">
              {/* Form component goes here */}
            </div>
          )}
          
          <div className={isFormOpen ? "lg:col-span-2" : "lg:col-span-3"}>
            <DataEntryDisplay 
              filterDate={date}
              filterType={isMonthly ? 'monthly' : 'daily'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DataEntryPage;