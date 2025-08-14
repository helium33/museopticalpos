import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Dashboard from './pages/Dashboard';
import LensPage from './pages/inventory/LensPage';
import FramePage from './pages/inventory/FramePage';
import AccessoriesPage from './pages/inventory/AccessoriesPage';
import ContactLensPage from './pages/inventory/ContactLensPage';
import CustomerPage from './pages/customer/CustomerPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import StaffPage from './pages/staff/StaffPage';
import HistoryPage from './pages/history/HistoryPage';
import SettingsPage from './pages/settings/SettingsPage';
import PaymentPage from './pages/payment/PaymentPage';
import DepositsPage from './pages/deposits/DepositsPage';
import VocPage from './pages/voc/VocPage';
import SalesDataPage from './pages/SalesDataPage';
import DataEntryPage from './pages/DataEntry/DataEntryPage';
import TransfersPage from './pages/transfers/TransfersPage';
import NotFound from './pages/NotFound';
import NotAuthorized from './pages/NotAuthorize';
import { ConnectionStatus } from './components/tables/ConnectionStatus';
import TransactionsPage from './pages/Transcation/TranscationPage';
import StaffDashboard from './pages/StaffDashboard';
import YangonFramePage from './pages/yangon-office/YangonFramePage';
import YangonAccessoriesPage from './pages/yangon-office/YangonAccessoriesPage';
import YangonContentLensPage from './pages/yangon-office/YangonContentLensPage';

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 640 && window.innerWidth < 1024);

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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