import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import useStoreStore from '../../stores/useStoreStore';
import NotificationBell from '../notifications/NotificationBell';

const Header: React.FC<{ title: string }> = ({ title }) => {
  const { user, logout } = useAuth();
  const { currentStore } = useStoreStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="w-full sticky top-0 z-30 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 px-2 py-2.5 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl md:text-2xl">
        {title}
        {currentStore && (
          <span className="ml-2 text-sm sm:text-base font-medium text-blue-600 dark:text-blue-400 capitalize">
          ({currentStore})
          </span>
        )}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationBell />
        {user && (
        <>
          <span className="hidden sm:block text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px] md:max-w-none">
          {user.email}
          </span>
          <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={handleLogout}
          >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
          </Button>
        </>
        )}
      </div>
      </div>
    </header>
  );
};

export default Header;