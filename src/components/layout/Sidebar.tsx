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
  ArrowRightLeft
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
}

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentStore, setCurrentStore } = useStoreStore();
  const { isMobile } = useResponsive();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateFilterType, setDateFilterType] = useState<'daily' | 'monthly'>('daily');
  const location = useLocation();
  const { sidebarItems, isOwner, isAdminUser } = usePermissions();

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
      // Close mobile menu when screen becomes desktop size (1280px and above)
      if (window.innerWidth >= 1280) {
        setIsMobileOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes (better UX)
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Store types for filtering
  const storeOptions = ["Win", "Pwint", "Yangon"];
  
  // Get store options based on menu type (only accessories gets Main Store)
  const getStoreOptionsForMenu = (menuKey: string) => {
    if (menuKey === 'accessories') {
      return ["Main Store", "Win", "Pwint", "Yangon"];
    }
    return storeOptions;
  };

  // Customer types
  const customerTypes = ["Original", "Membership"];

  // Determine if we should show hamburger menu (mobile + tablet in both orientations)
  const shouldShowHamburger = () => {
    if (typeof window === 'undefined') return false;
    
    // Show hamburger for:
    // 1. Mobile devices (< 768px)
    // 2. Tablets in portrait (768px - 1024px) 
    // 3. Tablets in landscape (1024px - 1279px)
    // Hide only for desktop (>= 1280px)
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
      name: 'Transcation', 
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
      { 
        name: 'Yangon Office', 
        path: '/yangon-office', 
        icon: <Box size={20} className="text-purple-500" />, 
        hasSubmenu: true, 
        menuKey: 'yangonOffice',
        subCategories: ['Frame', 'Accessories', 'Content Lens'],
        adminOnly: true
      },
    ];

    // Filter items based on visibility settings and user role
    return baseNavItems.filter(item => {
      const itemKey = item.name.toLowerCase().replace(/\s+/g, '');
      const isVisible = sidebarItems[itemKey as keyof typeof sidebarItems] === true;
      const isAdminItem = item.adminOnly && !isAdmin;
      
      // Debug logging for Staff Dashboard and Yangon Office
      if (item.name === 'Staff Dashboard') {
        console.log('Staff Dashboard debug:', {
          itemKey,
          isVisible,
          isAdminItem,
          isAdmin,
          sidebarItems: sidebarItems[itemKey as keyof typeof sidebarItems]
        });
      }
      
      if (item.name === 'Yangon Office') {
        console.log('Yangon Office debug:', {
          itemKey,
          isVisible,
          isAdminItem,
          isAdmin,
          sidebarItems: sidebarItems[itemKey as keyof typeof sidebarItems],
          allSidebarItems: sidebarItems
        });
      }
      
      return isVisible && !isAdminItem;
    });
  }, [sidebarItems, isAdmin]);

  // Check if a specific store is active in the customer section
  const isStoreActive = (store: string, customerType: string) => {
    const path = `/customer/${store.toLowerCase()}`;
    return location.pathname.includes(path) && location.search.includes(`category=${customerType}`);
  };

  return (
    <>
      {/* Hamburger menu button: Enhanced for all tablet orientations */}
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
              {/* Theme Toggle Button */}
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
              
              {/* Close button for mobile/tablet */}
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
                  className="w-full"
                />
              ) : (
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full"
                />
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="flex-grow">
            <p className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Navigation
            </p>
            <ul className="space-y-1 font-medium">
              {navItems.map((item) => (
                <li key={item.path}>
                  {item.hasSubmenu ? (
                    <div>
                      <button
                        className="flex items-center w-full p-3 text-gray-900 rounded-lg hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 group transition-all duration-200"
                        onClick={() => toggleMenu(item.menuKey!)}
                      >
                        <span className="flex items-center flex-grow">
                          <span className="p-1">
                            {item.icon}
                          </span>
                          <span className="ml-3 text-sm font-medium">{item.name}</span>
                        </span>
                        <span className={`transition-transform duration-200 ${
                          expandedMenus[item.menuKey!] ? 'rotate-180' : 'rotate-0'
                        }`}>
                          <ChevronDown size={16} />
                        </span>
                      </button>
                      {/* Submenu with animation */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedMenus[item.menuKey!] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <ul className="pl-8 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 ml-4">
                          {item.subCategories ? (
                            item.menuKey === 'yangonOffice' ? (
                              // Special handling for Yangon Office submenu
                              item.subCategories.map((subCat) => {
                                const pathMap = {
                                  'Frame': '/yangon-office/frame',
                                  'Accessories': '/yangon-office/accessories',
                                  'Content Lens': '/yangon-office/content-lens'
                                };
                                const path = pathMap[subCat as keyof typeof pathMap];
                                return (
                                  <li key={path}>
                                    <NavLink
                                      to={path}
                                      className={({ isActive }) =>
                                        `block px-3 py-2 rounded-md text-sm transition-all duration-200 hover:scale-[0.98] transform hover:translate-x-1 ${
                                          isActive
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 font-medium shadow-sm'
                                            : 'text-gray-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:bg-purple-900/20 hover:text-purple-600'
                                        }`
                                      }
                                      onClick={closeMobileMenu}
                                    >
                                      <span className="flex items-center">
                                        <span className="w-1.5 h-1.5 bg-current rounded-full mr-2 opacity-60" />
                                        <span className="font-medium">{subCat}</span>
                                      </span>
                                    </NavLink>
                                  </li>
                                );
                              })
                            ) : (
                              // Regular submenu handling for other items
                              item.subCategories.map((subCat) =>
                                getStoreOptionsForMenu(item.menuKey!).map((store) => {
                                  const path = `${item.path}/${store.toLowerCase().replace(' ', '-')}?category=${subCat}`;
                                  return (
                                    <li key={path}>
                                      <NavLink
                                        to={path}
                                        className={({ isActive }) =>
                                          `block px-3 py-2 rounded-md text-sm transition-all duration-200 hover:scale-[0.98] ${
                                            isStoreActive(store, subCat) || isActive
                                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 font-medium'
                                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                          }`
                                        }
                                        onClick={closeMobileMenu}
                                      >
                                        <span className="flex items-center">
                                          <span className="w-1.5 h-1.5 bg-current rounded-full mr-2 opacity-60" />
                                          {store} - {subCat}
                                        </span>
                                      </NavLink>
                                    </li>
                                  );
                                })
                              )
                            )
                          ) : (
                            getStoreOptionsForMenu(item.menuKey!).map((store) => {
                              const path = `${item.path}/${store.toLowerCase().replace(' ', '-')}`;
                              return (
                                <li key={path}>
                                  <NavLink
                                    to={path}
                                    className={({ isActive }) =>
                                      `block px-3 py-2 rounded-md text-sm transition-all duration-200 hover:scale-[0.98] ${
                                        isActive
                                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 font-medium'
                                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                      }`
                                    }
                                    onClick={closeMobileMenu}
                                  >
                                    <span className="flex items-center">
                                      <span className="w-1.5 h-1.5 bg-current rounded-full mr-2 opacity-60" />
                                      {store}
                                    </span>
                                  </NavLink>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center p-3 text-gray-900 rounded-lg hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 group transition-all duration-200 hover:scale-[0.98] ${
                          isActive ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 font-medium shadow-sm' : ''
                        }`
                      }
                      onClick={closeMobileMenu}
                    >
                      <span className="p-1">
                        {item.icon}
                      </span>
                      <span className="ml-3 text-sm font-medium">{item.name}</span>
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <p className="font-medium">© {new Date().getFullYear()} Optical Store</p>
              <p className="mt-1">Management System v2.0</p>
             <p className="mt-1 font-serif font-bold">By Ko Yan Naing Soe </p>

            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;