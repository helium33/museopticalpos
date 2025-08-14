import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'compact' | 'large';
  responsive?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, variant = 'default', responsive = true, ...props }, ref) => {
    
    // Responsive sizing based on variant
    const getVariantClasses = () => {
      switch (variant) {
        case 'compact':
          return 'p-2 text-xs sm:text-sm'; // Compact for mobile
        case 'large':
          return 'p-3 sm:p-4 text-sm sm:text-base lg:text-lg'; // Large for desktop
        default:
          return 'p-2 sm:p-2.5 lg:p-3 text-xs sm:text-sm lg:text-base'; // Progressive sizing
      }
    };
    
    // Responsive classes for proper containment
    const responsiveClasses = responsive ? 
      'min-w-0 max-w-full overflow-hidden text-ellipsis' : 
      '';
      
    return (
      <div className="w-full min-w-0"> {/* min-w-0 prevents flex overflow */}
        {label && (
          <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-white leading-tight">
            <span className="break-words">{label}</span>
          </label>
        )}
        <input
          className={cn(
            // Base responsive styles
            "bg-gray-50 border text-gray-900 rounded-lg block w-full transition-all",
            "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white",
            "dark:focus:ring-blue-500 dark:focus:border-blue-500",
            
            // Responsive sizing
            getVariantClasses(),
            
            // Responsive containment - FIXES LONG INPUT ISSUE
            responsiveClasses,
            "box-border", // Ensures padding doesn't cause overflow
            
            // Touch optimization for mobile
            "touch-manipulation",
            "focus:outline-none", // Remove default focus outline
            
            // Border and error states
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600",
            
            // Long text handling
            "placeholder:truncate",
            
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-500 leading-tight break-words">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;