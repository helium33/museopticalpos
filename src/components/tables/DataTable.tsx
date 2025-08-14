import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

interface Column<T extends object> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortType?: 'number' | 'string';
  getValue?: (row: T) => number | string;
  width?: string;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  itemsPerPage?: number;
  searchable?: boolean;
  filterKey?: keyof T;
  additionalFilters?: {
    key: keyof T;
    value: any;
  }[];
  className?: string;
}

// Custom hook for debounced search with exact match option
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function DataTable<T extends object>({
  data,
  columns,
  itemsPerPage = 10,
  searchable = true,
  filterKey,
  additionalFilters,
  className = '',
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [exactSearchTerm, setExactSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isExactSearch, setIsExactSearch] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Debounce search term with 300ms delay for partial search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Track when search is in progress
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm && !isExactSearch) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm, isExactSearch]);

  // Helper function to display quantity with proper zero handling
  const displayQuantity = (qty: number | undefined | null): string => {
    return String(qty || 0);
  };

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === column.key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key: column.key, direction });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    setIsExactSearch(false);
    setExactSearchTerm('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExactSearch();
    }
  };

  const handleExactSearch = () => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      setIsExactSearch(true);
      setExactSearchTerm(searchTerm.trim());
      setCurrentPage(1);
      
      // Simulate loading for better UX
      setTimeout(() => {
        setIsSearching(false);
      }, 500);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setExactSearchTerm('');
    setIsExactSearch(false);
    setCurrentPage(1);
  };

  const sortedData = useMemo(() => {
    let sortableData = [...data];
    
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const column = columns.find(col => col.key === sortConfig.key);
        
        let aValue: any = column?.getValue ? column.getValue(a) : a[sortConfig.key as keyof T];
        let bValue: any = column?.getValue ? column.getValue(b) : b[sortConfig.key as keyof T];
        
        // Handle code sorting specially to maintain natural order (EG1, EG2, ..., EG100)
        if (sortConfig.key === 'code') {
          const aMatch = String(aValue).match(/(\D+)(\d+)/);
          const bMatch = String(bValue).match(/(\D+)(\d+)/);
          
          if (aMatch && bMatch) {
            const [, aPrefix, aNum] = aMatch;
            const [, bPrefix, bNum] = bMatch;
            
            if (aPrefix === bPrefix) {
              return sortConfig.direction === 'asc' 
                ? parseInt(aNum) - parseInt(bNum)
                : parseInt(bNum) - parseInt(aNum);
            }
          }
        }

        // Handle special sorting for SPH, CYL, AXIS
        if (['sph', 'cyl', 'axis'].includes(String(sortConfig.key))) {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }
        
        if (column?.sortType === 'number') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }
        
        if (sortConfig.direction === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      });
    }
    
    return sortableData;
  }, [data, sortConfig, columns]);

  const filteredData = useMemo(() => {
    let filtered = sortedData;

    // Apply search filtering
    if (searchable && filterKey) {
      if (isExactSearch && exactSearchTerm) {
        // Exact search - match exactly
        filtered = filtered.filter(item => {
          const value = String(item[filterKey]).toLowerCase();
          const searchValue = exactSearchTerm.toLowerCase();
          
          // For numeric fields, try exact numeric match first
          if (!isNaN(Number(searchValue)) && !isNaN(Number(value))) {
            return Number(value) === Number(searchValue);
          }
          
          // For text fields, exact match
          return value === searchValue;
        });
      } else if (!isExactSearch && debouncedSearchTerm) {
        // Partial search - contains match
        filtered = filtered.filter(item => 
          String(item[filterKey])
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase())
        );
      }
    }

    if (additionalFilters) {
      filtered = filtered.filter(item =>
        additionalFilters.every(filter => item[filter.key] === filter.value)
      );
    }

    return filtered;
  }, [sortedData, debouncedSearchTerm, exactSearchTerm, isExactSearch, filterKey, additionalFilters, searchable]);

  // Refresh data when items are updated (for real-time inventory updates)
  useEffect(() => {
    // This effect will trigger when data prop changes, ensuring tables refresh
    // when inventory is updated after VOC creation
  }, [data]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  const endIndex = startIndex + paginatedData.length;

  // Show loading state when searching
  const showLoadingState = isSearching && (searchTerm.length > 0 || exactSearchTerm.length > 0);
  
  // Show no data state when not searching and no results
  const showNoDataState = !isSearching && filteredData.length === 0 && (
    (searchable && (debouncedSearchTerm.length > 0 || exactSearchTerm.length > 0)) || 
    (!searchable && data.length === 0)
  );

  const activeSearchTerm = isExactSearch ? exactSearchTerm : debouncedSearchTerm;

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Enhanced Search Bar */}
      {searchable && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-24 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-all duration-200"
            placeholder="Search... (Press Enter for exact match)"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
          />
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
            {searchTerm && (
              <>
                {/* Enter button for exact search */}
                <button
                  onClick={handleExactSearch}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
                  title="Exact search (Enter)"
                >
                  Enter
                </button>
                {/* Clear button */}
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-1"
                  title="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search Results Info */}
      {searchable && activeSearchTerm && !isSearching && (
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800">
          {filteredData.length > 0 ? (
            <>
              Found <span className="font-semibold text-blue-700 dark:text-blue-300">{filteredData.length}</span> result{filteredData.length !== 1 ? 's' : ''} for 
              <span className="font-semibold"> "{activeSearchTerm}"</span>
              {isExactSearch && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                  Exact Match
                </span>
              )}
            </>
          ) : (
            <>
              No {isExactSearch ? 'exact ' : ''}results found for "<span className="font-semibold">{activeSearchTerm}</span>"
              {isExactSearch && (
                <span className="ml-2 text-xs text-gray-500">
                  (Try partial search by typing without pressing Enter)
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Search Mode Indicator */}
      {searchable && searchTerm && !isSearching && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isExactSearch ? 'bg-green-500' : 'bg-blue-500'}`}></div>
            <span>{isExactSearch ? 'Exact Search Mode' : 'Partial Search Mode'}</span>
          </div>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span>Press Enter for exact match</span>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {/* Fixed Header */}
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  #
                </th>
                {columns.map((column) => (
                  <th 
                    key={column.key.toString()} 
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none' : ''
                    }`}
                    onClick={() => handleSort(column)}
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {column.sortable && (
                        <ArrowUpDown 
                          className={`h-4 w-4 transition-colors ${
                            sortConfig?.key === column.key 
                              ? 'text-blue-500' 
                              : 'text-gray-400'
                          } ${
                            sortConfig?.key === column.key && sortConfig.direction === 'desc' 
                              ? 'transform rotate-180' 
                              : ''
                          }`} 
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Scrollable Body */}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {showLoadingState ? (
                <tr>
                  <td 
                    colSpan={columns.length + 1} 
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                      <span>
                        {isExactSearch ? 'Searching for exact match...' : 'Searching...'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {displayQuantity(startIndex + index + 1)}
                    </td>
                    {columns.map((column) => (
                      <td 
                        key={column.key.toString()} 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                      >
                        {column.render
                          ? column.render(row)
                          : (column.key in row
                              ? String(row[column.key as keyof T] ?? '')
                              : ''
                            )
                        }
                      </td>
                    ))}
                  </tr>
                ))
              ) : showNoDataState ? (
                <tr>
                  <td 
                    colSpan={columns.length + 1} 
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <Search className="h-8 w-8 text-gray-300" />
                      <div className="space-y-1">
                        <span className="block font-medium">
                          No {isExactSearch ? 'exact ' : ''}matches found
                        </span>
                        {searchable && activeSearchTerm && (
                          <div className="text-xs space-y-1">
                            <span className="block">
                              Try {isExactSearch ? 'partial search (type without Enter)' : 'exact search (press Enter)'}
                            </span>
                            <span className="block">
                              or adjust your search terms
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && !showLoadingState && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">{displayQuantity(startIndex + 1)}</span>
                  {' '}to{' '}
                  <span className="font-medium">{displayQuantity(endIndex)}</span>
                  {' '}of{' '}
                  <span className="font-medium">{displayQuantity(filteredData.length)}</span>
                  {' '}results
                  {searchable && activeSearchTerm && (
                    <span className="text-blue-600 dark:text-blue-400 ml-1">
                      ({isExactSearch ? 'exact' : 'filtered'})
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <Button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md"
                  >
                    First
                  </Button>
                  
                  <Button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="relative inline-flex items-center px-2 py-2"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {displayQuantity(currentPage)} / {displayQuantity(totalPages)}
                  </span>
                  
                  <Button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="relative inline-flex items-center px-2 py-2"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md"
                  >
                    Last
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;