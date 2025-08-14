import React from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
  isActive: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  isActive
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[48px]">
        From:
      </label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
            focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white w-full sm:w-auto"
      />
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[32px]">
        To:
      </label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white w-full sm:w-auto"
      />
      </div>
      
      {isActive && (
      <button
        onClick={onClear}
        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white
            transition-colors duration-200 ease-in-out w-full sm:w-auto"
      >
        Clear
      </button>
      )}
    </div>
  );
};

export default DateRangePicker;