import React, { useEffect, useState, Suspense, startTransition } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { PageLoader } from './components/common/FastLoader';
import { PerformanceMonitor, useDebounce } from './utils/performanceUtils';

// Critical components (loaded immediately)
import Login from './pages/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import NotFound from './pages/NotFound';
import NotAuthorized from './pages/NotAuthorize';
import { ConnectionStatus } from './components/tables/ConnectionStatus';

// Lazy loaded components (loaded on demand)
const Layout = React.lazy(() => import('./components/layout/Layout'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const LensPage = React.lazy(() => import('./pages/inventory/LensPage'));
const FramePage = React.lazy(() => import('./pages/inventory/FramePage'));
const AccessoriesPage = React.lazy(() => import('./pages/inventory/AccessoriesPage'));
const ContactLensPage = React.lazy(() => import('./pages/inventory/ContactLensPage'));
const CustomerPage = React.lazy(() => import('./pages/customer/CustomerPage'));
const ExpensesPage = React.lazy(() => import('./pages/expenses/ExpensesPage'));
const SuppliersPage = React.lazy(() => import('./pages/suppliers/SuppliersPage'));
const StaffPage = React.lazy(() => import('./pages/staff/StaffPage'));
const HistoryPage = React.lazy(() => import('./pages/history/HistoryPage'));
const SettingsPage = React.lazy(() => import('./pages/settings/SettingsPage'));
const PaymentPage = React.lazy(() => import('./pages/payment/PaymentPage'));
const DepositsPage = React.lazy(() => import('./pages/deposits/DepositsPage'));
const VocPage = React.lazy(() => import('./pages/voc/VocPage'));
const SalesDataPage = React.lazy(() => import('./pages/SalesDataPage'));
const DataEntryPage = React.lazy(() => import('./pages/DataEntry/DataEntryPage'));
const TransfersPage = React.lazy(() => import('./pages/transfers/TransfersPage'));
const TransactionsPage = React.lazy(() => import('./pages/Transcation/TranscationPage'));
const StaffDashboard = React.lazy(() => import('./pages/StaffDashboard'));
const YangonFramePage = React.lazy(() => import('./pages/yangon-office/YangonFramePage'));
const YangonAccessoriesPage = React.lazy(() => import('./pages/yangon-office/YangonAccessoriesPage'));
const YangonContentLensPage = React.lazy(() => import('./pages/yangon-office/YangonContentLensPage'));

function App() {
  // Performance monitoring
  useEffect(() => {
    PerformanceMonitor.start('app-init');
    return () => {
      PerformanceMonitor.end('app-init');
    };
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 640 && window.innerWidth < 1024);

  // Dark mode detection
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Debounced screen size check for better performance
  const debouncedScreenSizeCheck = useDebounce(() => {
    const width = window.innerWidth;
    setIsMobile(width < 640);
    setIsTablet(width >= 640 && width < 1024);
  }, 150);

  useEffect(() => {
    // Initial check
    debouncedScreenSizeCheck();
    
    // Add resize listener
    window.addEventListener('resize', debouncedScreenSizeCheck);
    return () => window.removeEventListener('resize', debouncedScreenSizeCheck);
  }, [debouncedScreenSizeCheck]);

  const [currentView, setCurrentView] = useState<'voc' | 'lens'>('voc');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to trigger refresh of lens data when VOC is created
  const handleVocCreated = () => {
    console.log('📡 VOC created - triggering lens data refresh');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/not-authorized" element={<NotAuthorized />} />
            
            <Route path="/" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Layout /></Suspense></ProtectedRoute>}>
              <Route index element={<Navigate to="/lens" replace />} />
              
              {/* Admin Only Routes */}
              <Route path="transcation" element={<Suspense fallback={<PageLoader />}><TransactionsPage /></Suspense>} />

              <Route path="expenses" element={<AdminRoute><Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense></AdminRoute>} />
              <Route path="suppliers" element={<AdminRoute><Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense></AdminRoute>} />
              <Route path="staff" element={<AdminRoute><Suspense fallback={<PageLoader />}><StaffPage /></Suspense></AdminRoute>} />
              <Route path="settings/*" element={<AdminRoute><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></AdminRoute>} />
              
              {/* Dashboard - Only for owner and admin */}
              <Route path="dashboard" element={<AdminRoute><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></AdminRoute>} />
              <Route path="staff-dashboard" element={<AdminRoute><Suspense fallback={<PageLoader />}><StaffDashboard /></Suspense></AdminRoute>} />

              
              {/* Inventory Routes - Accessible to all authorized users */}
              <Route path="lens" element={<Suspense fallback={<PageLoader />}><LensPage /></Suspense>} />
              <Route path="frame/:store" element={<Suspense fallback={<PageLoader />}><FramePage /></Suspense>} />
              <Route path="accessories/:store" element={<Suspense fallback={<PageLoader />}><AccessoriesPage /></Suspense>} />
              <Route path="contact-lens/:store" element={<Suspense fallback={<PageLoader />}><ContactLensPage /></Suspense>} />

              
              {/* Sales Related Routes - Accessible to all authorized users */}
              <Route path="voc/:store" element={<Suspense fallback={<PageLoader />}><VocPage /></Suspense>} />
              <Route path="sales" element={<Suspense fallback={<PageLoader />}><SalesDataPage /></Suspense>} />
              
              {/* Transfers - Accessible to all authorized users */}
              <Route path="transfers" element={<Suspense fallback={<PageLoader />}><TransfersPage /></Suspense>} />
              
              {/* Data Entry - Accessible to staff and above */}
              <Route path="data-entry" element={<Suspense fallback={<PageLoader />}><DataEntryPage /></Suspense>} />
              
              {/* History - Only for owner and admin */}
              <Route path="history" element={<AdminRoute><Suspense fallback={<PageLoader />}><HistoryPage /></Suspense></AdminRoute>} />
              
              {/* Customer and Payment Routes */}
              <Route path="customer/:store" element={<Suspense fallback={<PageLoader />}><CustomerPage /></Suspense>} />
              <Route path="payment/:store" element={<Suspense fallback={<PageLoader />}><PaymentPage /></Suspense>} />
              
              {/* Deposits - Only for owner and admin */}
              <Route path="deposits" element={<Suspense fallback={<PageLoader />}><DepositsPage /></Suspense>} />

              <Route path="yangon-office/frame" element={<Suspense fallback={<PageLoader />}><YangonFramePage /></Suspense>} />
              <Route path="yangon-office/accessories" element={<Suspense fallback={<PageLoader />}><YangonAccessoriesPage /></Suspense>} />
              <Route path="yangon-office/content-lens" element={<Suspense fallback={<PageLoader />}><YangonContentLensPage /></Suspense>} />

              <Route path="*" element={<NotFound />} />
              
            </Route>
          </Routes>
        </Router>
        <ConnectionStatus />
      </ThemeProvider>
    </AuthProvider>



  );
}

export default App;