import React from 'react';
import { ArrowRight, ArrowLeft, Package, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface TransferStatusIndicatorProps {
  type: 'in' | 'out';
  quantity: number;
  fromStore?: string;
  toStore?: string;
  currentStore: string;
  status?: 'pending' | 'approved' | 'completed' | 'rejected';
  showStoreNames?: boolean;
  className?: string;
}

const TransferStatusIndicator: React.FC<TransferStatusIndicatorProps> = ({
  type,
  quantity,
  fromStore,
  toStore,
  currentStore,
  status = 'completed',
  showStoreNames = true,
  className = ''
}) => {
  if (quantity <= 0) return null;

  const isTransferIn = type === 'in';
  const sourceStore = isTransferIn ? fromStore : currentStore;
  const destinationStore = isTransferIn ? currentStore : toStore;

  // Color schemes based on transfer direction and status
  const getColorScheme = () => {
    if (status === 'rejected') {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
    }
    
    if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800';
    }

    if (isTransferIn) {
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
    }
    
    return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800';
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'approved':
        return <CheckCircle className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'rejected':
        return <XCircle className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const getDirectionIcon = () => {
    if (isTransferIn) {
      return <ArrowLeft className="h-3 w-3" />;
    }
    return <ArrowRight className="h-3 w-3" />;
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const getBurmeseText = () => {
    if (isTransferIn) {
      return {
        action: 'ရောက်လာ',
        direction: 'မှ',
        preposition: 'ကနေ'
      };
    }
    return {
      action: 'ပို့လိုက်',
      direction: 'သို့',
      preposition: 'ကို'
    };
  };

  const burmeseText = getBurmeseText();

  return (
    <div className={`inline-flex flex-col items-center space-y-1 p-2 rounded-lg border ${getColorScheme()} ${className}`}>
      {/* Main transfer info */}
      <div className="flex items-center space-x-1">
        {getDirectionIcon()}
        <span className="font-medium text-sm">
          {quantity} units {burmeseText.action}
        </span>
        {getStatusIcon()}
      </div>

      {/* Store information */}
      {showStoreNames && (sourceStore || destinationStore) && (
        <div className="flex items-center space-x-1 text-xs">
          {isTransferIn ? (
            <>
              <span className="font-medium">{sourceStore?.toUpperCase()}</span>
              <span>{burmeseText.preposition}</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {destinationStore?.toUpperCase()}
              </span>
            </>
          ) : (
            <>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {sourceStore?.toUpperCase()}
              </span>
              <span>{burmeseText.preposition}</span>
              <span className="font-medium">{destinationStore?.toUpperCase()}</span>
            </>
          )}
        </div>
      )}

      {/* Status indicator */}
      <div className="text-xs font-medium opacity-75">
        Status: {getStatusText()}
      </div>

      {/* Direction helper text */}
      <div className="text-xs opacity-60">
        {isTransferIn ? 'ပြင်ပဆိုင်မှ ရောက်လာ' : 'အခြားဆိုင်သို့ ပို့လိုက်'}
      </div>
    </div>
  );
};

export default TransferStatusIndicator;