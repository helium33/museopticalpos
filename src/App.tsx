import React, { useEffect, useState, Suspense } from 'react';
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
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/lens\" replace />} />
              
              {/* Admin Only Routes */}
              <Route path="transcation" element={<TransactionsPage />  } />

              <Route path="expenses" element={<AdminRoute><ExpensesPage /></AdminRoute>} />
              <Route path="suppliers" element={<AdminRoute><SuppliersPage /></AdminRoute>} />
              <Route path="staff" element={<AdminRoute><StaffPage /></AdminRoute>} />
              <Route path="settings/*" element={<AdminRoute><SettingsPage /></AdminRoute>} />
              
              {/* Dashboard - Only for owner and admin */}
              <Route path="dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="staff-dashboard" element={<AdminRoute><StaffDashboard /></AdminRoute>} />

              
              {/* Inventory Routes - Accessible to all authorized users */}
              <Route path="lens" element={<LensPage />} />
              <Route path="frame/:store" element={<FramePage />} />
              <Route path="accessories/:store" element={<AccessoriesPage />} />
              <Route path="contact-lens/:store" element={<ContactLensPage />} />

              
              {/* Sales Related Routes - Accessible to all authorized users */}
              <Route path="voc/:store" element={<VocPage />} />
              <Route path="sales" element={<SalesDataPage />} />
              
              {/* Transfers - Accessible to all authorized users */}
              <Route path="transfers" element={<TransfersPage />} />
              
              {/* Data Entry - Accessible to staff and above */}
              <Route path="data-entry" element={<DataEntryPage />} />
              
              {/* History - Only for owner and admin */}
              <Route path="history" element={<AdminRoute><HistoryPage /></AdminRoute>} />
              
              {/* Customer and Payment Routes */}
              <Route path="customer/:store" element={<CustomerPage />} />
              <Route path="payment/:store" element={<PaymentPage />} />
              
              {/* Deposits - Only for owner and admin */}
              <Route path="deposits" element={<DepositsPage />} />

              <Route path="yangon-office/frame" element={<YangonFramePage />} />
              <Route path="yangon-office/accessories" element={<YangonAccessoriesPage />} />
              <Route path="yangon-office/content-lens" element={<YangonContentLensPage />} />

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