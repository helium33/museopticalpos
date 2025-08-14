import React, { useState, useEffect } from 'react';
import { CalendarDays, List, Grid, Search } from 'lucide-react';
import DataEntryCard from './DataEntryCard';
import Button from '../ui/Button';
import Input from '../ui/Input';

// This would typically come from your database or state management
const MOCK_DATA = [
  {
    id: '1',
    title: 'Single Vision Lens',
    date: '2025-04-18',
    type: 'Lens' as const,
    details: {
      lensType: 'Single Vision',
      lensCategory: 'BB1.56',
      sph: '-2.25',
      cyl: '-0.75',
      axis: '180'
    }
  },
  {
    id: '2',
    title: 'Premium Frame',
    date: '2025-04-18',
    type: 'Frame' as const,
    details: {
      frameColor: 'Black'
    }
  },
  {
    id: '3',
    title: 'Cleaning Kit',
    date: '2025-04-17',
    type: 'Accessories' as const,
    details: {
      accessoriesValue: 'Premium Cleaning Kit with Microfiber Cloth'
    }
  },
  {
    id: '4',
    title: 'Premium Contact Lens',
    date: '2025-04-17',
    type: 'Contact Lens' as const,
    details: {
      contactLensType: 'Premium',
      power: '-3.25'
    }
  },
  {
    id: '5',
    title: 'Bifocal Lens',
    date: '2025-04-16',
    type: 'Lens' as const,
    details: {
      lensType: 'Bifocal',
      sph: '+1.50',
      cyl: '-0.50',
      axis: '90'
    }
  }
];

interface DataEntryDisplayProps {
  filterDate?: string;
  filterType?: 'daily' | 'monthly';
}

const DataEntryDisplay: React.FC<DataEntryDisplayProps> = ({
  filterDate,
  filterType = 'daily'
}) => {
  const [entries, setEntries] = useState(MOCK_DATA);
  const [filteredEntries, setFilteredEntries] = useState(MOCK_DATA);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Filter entries based on date and search term
    let filtered = [...entries];
    
    if (filterDate) {
      filtered = filtered.filter(entry => {
        if (filterType === 'daily') {
          return entry.date === filterDate;
        } else {
          // For monthly filter, check if the entry date starts with the month (YYYY-MM)
          return entry.date.startsWith(filterDate);
        }
      });
    }
    
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(entry.details).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredEntries(filtered);
  }, [entries, filterDate, filterType, searchTerm]);

  // Group entries by date for better organization
  const entriesByDate = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, typeof filteredEntries>);

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const handleCardClick = (id: string) => {
    console.log('Card clicked:', id);
    // Here you would typically navigate to a detail view or open an edit modal
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarDays size={20} />
          {filterType === 'daily' ? 'Daily' : 'Monthly'} Entries
        </h2>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={16} className="text-gray-500 dark:text-gray-400" />
            </div>
            <Input
              type="search"
              placeholder="Search entries..."
              className="pl-10 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex border rounded-md overflow-hidden">
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} />
            </Button>
            <Button
              type="button"
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>

      {sortedDates.length > 0 ? (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date} className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 border-b pb-2">
                {formatDate(date)}
              </h3>
              
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "space-y-3"
              }>
                {entriesByDate[date].map(entry => (
                  <DataEntryCard
                    key={entry.id}
                    title={entry.title}
                    date={entry.date}
                    type={entry.type}
                    details={entry.details}
                    onClick={() => handleCardClick(entry.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <p>No entries found for the selected criteria.</p>
        </div>
      )}
    </div>
  );
};

export default DataEntryDisplay;
