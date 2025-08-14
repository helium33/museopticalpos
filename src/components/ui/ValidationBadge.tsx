import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface ValidationBadgeProps {
  status: 'success' | 'warning' | 'error' | 'pending';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  status,
  message,
  size = 'md',
  showIcon = true
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-800 dark:text-green-200',
          borderColor: 'border-green-200 dark:border-green-700',
          defaultMessage: 'Validated'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          borderColor: 'border-yellow-200 dark:border-yellow-700',
          defaultMessage: 'Warning'
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          textColor: 'text-red-800 dark:text-red-200',
          borderColor: 'border-red-200 dark:border-red-700',
          defaultMessage: 'Error'
        };
      case 'pending':
        return {
          icon: Clock,
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-800 dark:text-blue-200',
          borderColor: 'border-blue-200 dark:border-blue-700',
          defaultMessage: 'Pending'
        };
      default:
        return {
          icon: Clock,
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-800 dark:text-gray-200',
          borderColor: 'border-gray-200 dark:border-gray-600',
          defaultMessage: 'Unknown'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 12;
      case 'lg':
        return 20;
      default:
        return 16;
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;
  const displayMessage = message || config.defaultMessage;

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full border font-medium
      ${config.bgColor} ${config.textColor} ${config.borderColor} ${getSizeClasses()}
    `}>
      {showIcon && <IconComponent size={getIconSize()} className="flex-shrink-0" />}
      {displayMessage}
    </span>
  );
};

export default ValidationBadge;