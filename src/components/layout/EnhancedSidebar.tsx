import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Glasses, 
  Box, 
  Contact, 
  Users, 
  Clock,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Truck,
  UserCog,
  Settings,
  FileText,
  Wallet,
  BarChart3,
  Calendar,
  Receipt,
  ClipboardList,
  Sun,
  Moon,
  ArrowRightLeft,
  Eye,
  Package,
  Building2,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useStoreStore from '../../stores/useStoreStore';
import { STORES } from '../../lib/utils';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { usePermissions } from '../../hooks/useSidebarItem';
import { useResponsive } from '../../hooks/useResposive';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  hasSubmenu?: boolean;
  menuKey?: string;
  subCategories?: string[];
  noSubmenu?: boolean;
  adminOnly?: boolean;
  yangonSpecific?: boolean;
}

interface YangonSubmenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  categories?: string[];
}

export const EnhancedSidebar: React.FC = () => {
  const { isAdmin, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentStore, setCurrentStore } = useStoreStore();
  const { isMobile } = useResponsive();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateFilterType, setDateFilterType] = useState<'daily' | 'monthly'>('daily');
  const location = useLocation();
  const { sidebarItems } = usePermissions();

  // Check if user has Yangon Office access
  const hasYangonAccess = user?.email === 'yannaing190792@gmail.com' || user?.email === 'kyawwinhtun564@gmail.com';

  // Yangon Office specific submenu items
  const yangonSubmenuItems: YangonSubmenuItem[] = [
    {
      name: 'Frame',
      path: '/yangon-office/frame',
      icon: <Box size={18} />,
      categories: ['Eyeglasses', 'Sunglasses', 'Ready', 'Ready BB', 'Error']
    },
    {
      name: 'Accessories',
      path: '/yangon-office/accessories',
      icon: <Package size={18} />,
      categories: ['Accessories Category 1', 'Accessories Category 2']
    },
    {
      name: 'Content Lens',
      path: '/yangon-office/content-lens',
      icon: <Contact size={18} />,
      categories: ['မျက်ကပ်အကြည်', 'Ms မျက်ကပ်', 'Ms ပါဝါ color', 'Pretty and Shinning', 'Big Eye Black']
    }
  ];

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  // Enhanced responsive handling for tablets in both orientations
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsMobileOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Store types for filtering
  const storeOptions = ["Win", "Pwint", "Yangon"];
  const customerTypes = ["Original", "Membership"];

  const shouldShowHamburger = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1280;
  };

  // Memoized navigation items based on permissions
  const navItems = useMemo(() => {
    const baseNavItems: SidebarItem[] = [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard size={20} />,
        noSubmenu: true,
        adminOnly: false
      },
      {
        name: 'Staff Dashboard',
        path: '/staff-dashboard',
        icon: <UserCog size={20} />,
        noSubmenu: true,
        adminOnly: true,
      },
      { 
        name: 'Lens', 
        path: '/lens', 
        icon: <Glasses size={20} />,
        noSubmenu: true,
        adminOnly: false
      },
      { 
        name: 'Frame', 
        path: '/frame', 
        icon: <Box size={20} />, 
        hasSubmenu: true, 
        menuKey: 'frame',
        adminOnly: false
      },
      { 
        name: 'Accessories', 
        path: '/accessories', 
        icon: <Box size={20} />, 
        hasSubmenu: true, 
        menuKey: 'accessories',
        adminOnly: false
      },
      // Yangon Office specific menu item
      ...(hasYangonAccess ? [{
        name: 'Yangon Office',
        path: '/yangon-office',
        icon: <Building2 size={20} />,
        hasSubmenu: true,
        menuKey: 'yangonOffice',
        adminOnly: false,
        yangonSpecific: true
      }] : []),
      { 
        name: 'Data Entry', 
        path: '/data-entry', 
        icon: <ClipboardList size={20} />, 
        noSubmenu: true,
        adminOnly: false
      },
      { 
        name: 'Customer', 
        path: '/customer', 
        icon: <Users size={20} />, 
        hasSubmenu: true, 
        menuKey: 'customer',
        subCategories: customerTypes,
        adminOnly: false
      },
      { 
        name: 'VOC', 
        path: '/voc', 
        icon: <FileText size={20} />, 
        hasSubmenu: true, 
        menuKey: 'voc',
        adminOnly: false
      },
      {
        name: 'Contact Lens', 
        path: '/contact-lens', 
        icon: <Contact size={20} />, 
        hasSubmenu: true, 
        menuKey: 'contactLens',
        adminOnly: false
      },
      {
        name: 'Sales Data', 
        path: '/sales', 
        icon: <BarChart3 size={20} />,
        noSubmenu: true,
        menuKey: 'sales',
        adminOnly: false
      },
      {
        name: 'Deposits', 
        path: '/deposits', 
        icon: <Wallet size={20} />,
        noSubmenu: true,
        adminOnly: false
      },
      { 
        name: 'Expenses', 
        path: '/expenses', 
        icon: <Receipt size={20} />,
        noSubmenu: true,
        adminOnly: false
      },
      { 
        name: 'History', 
        path: '/history', 
        icon: <Clock size={20} />,
        noSubmenu: true,
        adminOnly: false
      },
      { 
        name: 'Transaction', 
        path: '/transcation', 
        icon: <ArrowRightLeft size={20} />,
        noSubmenu: true,
        adminOnly: true
      },
      { 
        name: 'Suppliers', 
        path: '/suppliers', 
        icon: <Truck size={20} />,
        noSubmenu: true,
        adminOnly: true
      },
      { 
        name: 'Settings', 
        path: '/settings', 
        icon: <Settings size={20} />,
        noSubmenu: true,
        adminOnly: true
      },
    ];

    // Filter items based on visibility settings and user role
    return baseNavItems.filter(item => {
      const itemKey = item.name.toLowerCase().replace(/\s+/g, '');
      const isVisible = sidebarItems[itemKey as keyof typeof sidebarItems] === true;
      const isAdminItem = item.adminOnly && !isAdmin;
      
      return isVisible && !isAdminItem;
    });
  }, [sidebarItems, isAdmin, hasYangonAccess]);

  // Check if a specific store is active in the customer section
  const isStoreActive = (store: string, customerType: string) => {
    const path = `/customer/${store.toLowerCase()}`;
    return location.pathname.includes(path) && location.search.includes(`category=${customerType}`);
  };

  // Render submenu items for Yangon Office
  const renderYangonSubmenu = () => {
    if (!expandedMenus['yangonOffice']) return null;

    return (
      <div className="ml-6 mt-2 space-y-1 border-l-2 border-blue-100 dark:border-blue-800 pl-4">
        {yangonSubmenuItems.map((item) => (
          <div key={item.name} className="space-y-1">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[0.98] ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`
              }
            >
              {item.icon}
              <span className="ml-3">{item.name}</span>
            </NavLink>
            
            {/* Categories for each submenu item */}
            {item.categories && (
              <div className="ml-6 space-y-1">
                {item.categories.map((category) => (
                  <NavLink
                    key={category}
                    to={`${item.path}?category=${encodeURIComponent(category)}`}
                    className={({ isActive }) =>
                      `block px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50'
                      }`
                    }
                  >
                    {category}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Hamburger menu button */}
      {shouldShowHamburger() && (
        <button
          type="button"
          className={`
            fixed top-4 left-4 z-50 p-3 rounded-xl
            bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700
            text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-700
            transition-all duration-300 ease-in-out
            backdrop-blur-sm
            ${isMobileOpen ? 'rotate-90 scale-110' : 'rotate-0 scale-100'}
            hover:scale-105 active:scale-95
          `}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle sidebar"
          aria-expanded={isMobileOpen}
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay for mobile and tablet */}
      {isMobileOpen && shouldShowHamburger() && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-60 z-30 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out
          bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700
          shadow-2xl
          ${shouldShowHamburger() 
            ? `
              w-[90vw] max-w-sm sm:w-[380px] md:w-[400px]
              ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            `
            : 'w-[280px] xl:w-[320px] translate-x-0 shadow-lg'
          }
        `}
        aria-hidden={shouldShowHamburger() ? !isMobileOpen : false}
      >
        <div className="h-full px-4 py-4 overflow-y-auto flex flex-col">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Glasses className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Optical Store
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Management System
                </p>
              </div>
            </div>
            
            {/* Theme Toggle and Mobile Close Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun size={18} className="text-yellow-500" />
                ) : (
                  <Moon size={18} className="text-gray-600" />
                )}
              </button>
              
              {shouldShowHamburger() && (
                <button
                  className="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Close sidebar"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Store Selection */}
          <div className="mb-6">
            <p className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Select Store
            </p>
            <div className="grid grid-cols-1 gap-2">
              {STORES.map((store) => (
                <Button
                  key={store}
                  variant={currentStore === store ? 'primary' : 'outline'}
                  size="sm"
                  className="capitalize w-full justify-start transition-all duration-200 hover:scale-[0.98]"
                  onClick={() => setCurrentStore(store)}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      currentStore === store ? 'bg-white' : 'bg-gray-400'
                    }`} />
                    {store}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-gray-500" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Date Filter
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={dateFilterType === 'daily' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilterType('daily')}
                  className="transition-all duration-200 hover:scale-[0.98]"
                >
                  Daily
                </Button>
                <Button
                  variant={dateFilterType === 'monthly' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilterType('monthly')}
                  className="transition-all duration-200 hover:scale-[0.98]"
                >
                  Monthly
                </Button>
              </div>
              {dateFilterType === 'daily' ? (
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-sm"
                />
              ) : (
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-sm"
                />
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1">
            <p className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Navigation
            </p>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <div key={item.name}>
                  {item.hasSubmenu ? (
                    <div>
                      <button
                        onClick={() => toggleMenu(item.menuKey!)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-[0.98]"
                      >
                        <div className="flex items-center">
                          {item.icon}
                          <span className="ml-3">{item.name}</span>
                          {item.yangonSpecific && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                              Special
                            </span>
                          )}
                        </div>
                        {expandedMenus[item.menuKey!] ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                      
                      {/* Yangon Office Submenu */}
                      {item.menuKey === 'yangonOffice' && renderYangonSubmenu()}
                      
                      {/* Regular Store Submenus */}
                      {item.menuKey !== 'yangonOffice' && expandedMenus[item.menuKey!] && (
                        <div className="ml-6 mt-2 space-y-1 border-l-2 border-gray-100 dark:border-gray-700 pl-4">
                          {item.subCategories ? (
                            // Customer submenu with categories
                            item.subCategories.map((category) => (
                              <div key={category} className="space-y-1">
                                <p className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  {category}
                                </p>
                                {storeOptions.map((store) => (
                                  <NavLink
                                    key={`${category}-${store}`}
                                    to={`${item.path}/${store.toLowerCase()}?category=${category}`}
                                    className={({ isActive }) =>
                                      `block px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                        isActive || isStoreActive(store, category)
                                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                                          : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50'
                                      }`
                                    }
                                  >
                                    {store}
                                  </NavLink>
                                ))}
                              </div>
                            ))
                          ) : (
                            // Regular store submenu
                            storeOptions.map((store) => (
                              <NavLink
                                key={store}
                                to={`${item.path}/${store.toLowerCase()}`}
                                className={({ isActive }) =>
                                  `block px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[0.98] ${
                                    isActive
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 shadow-sm'
                                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                  }`
                                }
                              >
                                {store}
                              </NavLink>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[0.98] ${
                          isActive
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`
                      }
                    >
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </NavLink>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* User Info */}
          {hasYangonAccess && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Building2 size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="ml-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  Yangon Office Access
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={logout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 hover:scale-[0.98]"
            >
              <LogOut size={20} />
              <span className="ml-3">Logout</span>
            </button>
            
            {/* User Info Display */}
            {user && (
              <div className="mt-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default EnhancedSidebar;