import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Header from '../../src/components/layout/Header';
import { Mail, Eye, EyeOff, Shield, Users, Building } from 'lucide-react';

// Store constants
const STORES = ['win', 'pwint', 'yangon'] as const;
type Store = typeof STORES[number];

// Store email mapping
const STORE_EMAILS: Record<Store, string> = {
  win: 'winoptics123@gmail.com',
  pwint: 'pwintoptical@gmail.com',
  yangon: 'ygnoptical@gmail.com'
};

// Function to get store email
const getStoreEmail = (store: Store): string => {
  return STORE_EMAILS[store];
};

// Function to check if user can see a specific store email
const canUserSeeStoreEmail = (userEmail: string, store: Store): boolean => {
  // Admin/owner can see all emails
  if (userEmail === 'kyawwinhtun564@gmail.com' || 
      userEmail === 'helium33hl@gmail.com' ||
      userEmail === 'yannaing190792@gmail.com') {
    return true;
  }

  // Specific store access rules
  switch (store) {
    case 'win':
      return userEmail === 'winoptics123@gmail.com';
    case 'pwint':
      return userEmail === 'pwintoptical@gmail.com';
    case 'yangon':
      return userEmail === 'ygnoptical@gmail.com';
    default:
      return false;
  }
};

// Function to get visible stores for a user
const getVisibleStoresForEmail = (userEmail: string): Store[] => {
  return STORES.filter(store => canUserSeeStoreEmail(userEmail, store));
};

const StoreEmailManager: React.FC = () => {
  const { user } = useAuth();
  const userEmail = user?.email || '';
  const visibleStores = getVisibleStoresForEmail(userEmail);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <Header title="Store Email Management" />
        
        {/* Store Email Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STORES.map(store => {
            const storeEmail = getStoreEmail(store);
            const isVisible = canUserSeeStoreEmail(userEmail, store);
            
            return (
              <Card key={store} className={`p-6 transition-all duration-200 ${!isVisible ? 'opacity-50 grayscale' : 'hover:shadow-lg'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Building className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                      {store} Store
                    </h3>
                  </div>
                  {isVisible ? (
                    <Eye className="w-5 h-5 text-green-500" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-red-500" />
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Contact Email:</span>
                  </div>
                  
                  <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    isVisible 
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  }`}>
                    <p className={`font-mono text-sm break-all ${
                      isVisible 
                        ? 'text-green-800 dark:text-green-200' 
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {isVisible ? storeEmail : '*** Access Restricted ***'}
                    </p>
                  </div>
                  
                  <div className={`text-xs px-2 py-1 rounded-full text-center ${
                    isVisible 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {isVisible ? 'Accessible' : 'Restricted'}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        
        {/* Access Rules Explanation */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Email Visibility Rules
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="font-medium text-blue-800 dark:text-blue-200">Win Store Access</p>
                </div>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">
                  <strong>Visible:</strong> winoptics123@gmail.com
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-xs">
                  Pwint and Yangon store emails are hidden for security
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Building className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="font-medium text-purple-800 dark:text-purple-200">Pwint Store Access</p>
                </div>
                <p className="text-purple-700 dark:text-purple-300 text-sm mb-2">
                  <strong>Visible:</strong> pwintoptical@gmail.com
                </p>
                <p className="text-purple-600 dark:text-purple-400 text-xs">
                  Win and Yangon store emails are hidden for security
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2 mb-2">
                  <Building className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="font-medium text-green-800 dark:text-green-200">Yangon Store Access</p>
                </div>
                <p className="text-green-700 dark:text-green-300 text-sm mb-2">
                  <strong>Visible:</strong> ygnoptical@gmail.com
                </p>
                <p className="text-green-600 dark:text-green-400 text-xs">
                  Win and Pwint store emails are hidden for security
                </p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <p className="font-medium text-gray-800 dark:text-gray-200">Admin/Owner Access</p>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Administrators and owners can view all store emails for management and coordination purposes
              </p>
            </div>
          </div>
        </Card>
        
        {/* Current User Access Status */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Current Access
            </h3>
          </div>
          
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 dark:text-blue-200 font-medium">Logged in as:</span>
                <span className="text-blue-900 dark:text-blue-100 font-mono text-sm bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                  {userEmail}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-blue-800 dark:text-blue-200 font-medium">Accessible stores:</span>
                <div className="flex flex-wrap gap-1">
                  {visibleStores.length > 0 ? (
                    visibleStores.map(store => (
                      <span key={store} className="text-blue-900 dark:text-blue-100 text-xs bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded capitalize">
                        {store}
                      </span>
                    ))
                  ) : (
                    <span className="text-red-600 dark:text-red-400 text-sm">No stores accessible</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-blue-800 dark:text-blue-200 font-medium">Access level:</span>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                  visibleStores.length === STORES.length 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : visibleStores.length > 0
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {visibleStores.length === STORES.length 
                    ? 'Full Access' 
                    : visibleStores.length > 0 
                    ? 'Limited Access' 
                    : 'No Access'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Security Notice */}
        <Card className="p-6 border-l-4 border-l-amber-500">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h4 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Security & Privacy Notice
              </h4>
              <div className="text-amber-700 dark:text-amber-300 text-sm space-y-2">
                <p>
                  • Store email addresses are restricted based on your account permissions to maintain security and privacy.
                </p>
                <p>
                  • Each store's contact information is only visible to authorized personnel for that specific location.
                </p>
                <p>
                  • If you need access to additional store information, please contact your system administrator.
                </p>
                <p>
                  • This system helps prevent unauthorized access to sensitive store contact details.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StoreEmailManager;