import React from 'react';

interface FastLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const FastLoader: React.FC<FastLoaderProps> = ({ 
  size = 'md', 
  text = 'Loading...', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 ${sizeClasses[size]}`}
        style={{
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {text && (
        <p className="text-sm text-gray-600 font-medium">
          {text}
        </p>
      )}
    </div>
  );
};

// Minimal page loader for route transitions
export const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <FastLoader size="lg" text="Loading page..." />
  </div>
);

// Inline loader for components
export const InlineLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center p-4">
    <FastLoader size="sm" text={text} />
  </div>
);

// Button loader for form submissions
export const ButtonLoader: React.FC = () => (
  <div className="flex items-center space-x-2">
    <div
      className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
      style={{ animation: 'spin 0.8s linear infinite' }}
    />
    <span>Processing...</span>
  </div>
);

export default FastLoader;