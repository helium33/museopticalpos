import React from 'react';
import { CalendarIcon, ClipboardCheck } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

interface DataEntryCardProps {
  title: string;
  date: string;
  type: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
  details: Record<string, any>;
  onClick?: () => void;
}

const DataEntryCard: React.FC<DataEntryCardProps> = ({
  title,
  date,
  type,
  details,
  onClick
}) => {
  const getTypeColor = (itemType: string): string => {
    switch (itemType) {
      case 'Lens':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'Frame':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'Accessories':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'Contact Lens':
        return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'Lens':
        return <span className="text-blue-500">👓</span>;
      case 'Frame':
        return <span className="text-green-500">🔎</span>;
      case 'Accessories':
        return <span className="text-amber-500">🧰</span>;
      case 'Contact Lens':
        return <span className="text-purple-500">👁️</span>;
      default:
        return <ClipboardCheck className="text-gray-500" />;
    }
  };

  const renderDetailContent = () => {
    switch (type) {
      case 'Lens':
        return (
          <>
            <div className="text-sm font-medium">{details.lensType}</div>
            {details.lensCategory && (
              <div className="text-sm text-gray-500 dark:text-gray-400">{details.lensCategory}</div>
            )}
            {details.sph && details.cyl && details.axis && (
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="inline-block px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">
                  SPH: {details.sph}
                </span>
                <span className="inline-block px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">
                  CYL: {details.cyl}
                </span>
                <span className="inline-block px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">
                  AXIS: {details.axis}
                </span>
              </div>
            )}
          </>
        );
      case 'Frame':
        return (
          <div className="text-sm">
            Color: <span className="font-medium">{details.frameColor}</span>
          </div>
        );
      case 'Accessories':
        return (
          <div className="text-sm truncate max-w-[200px]" title={details.accessoriesValue}>
            {details.accessoriesValue}
          </div>
        );
      case 'Contact Lens':
        return (
          <>
            <div className="text-sm font-medium">{details.contactLensType}</div>
            {details.power && (
              <div className="mt-1">
                <span className="inline-block px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">
                  Power: {details.power}
                </span>
              </div>
            )}
          </>
        );
      default:
        return <div className="text-sm">No details available</div>;
    }
  };

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
        getTypeColor(type)
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {getTypeIcon(type)}
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        </div>
      </div>

      <div className="space-y-2">
        {renderDetailContent()}
        
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          <CalendarIcon size={12} className="mr-1" />
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
};

export default DataEntryCard;