import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EnhancedSidebar from './EnhancedSidebar';

const Layout: React.FC = () => {
  const [shouldShowSidebar, setShouldShowSidebar] = useState(false);

  // Determine if we should show sidebar based on screen size
  useEffect(() => {
    const handleResize = () => {
      // Show sidebar only on desktop (>= 1280px)
      setShouldShowSidebar(window.innerWidth >= 1280);
    };

    // Initial check
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <EnhancedSidebar />
      <div 
        className={`
          flex-1 h-full overflow-auto transition-all duration-300 ease-in-out
          ${shouldShowSidebar 
            ? 'xl:ml-[320px] lg:ml-[280px]' 
            : 'ml-0'
          }
        `}
      >
        <Toaster position="top-right" />
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;