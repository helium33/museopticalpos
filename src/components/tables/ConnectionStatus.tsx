// src/components/ConnectionStatus.tsx
import { useEffect, useState } from 'react';
import { getFirestoreStatus } from '../../lib/firebase';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const ConnectionStatus = () => {
  const isBrowserOnline = useNetworkStatus();
  const [isFirestoreOnline, setIsFirestoreOnline] = useState(true);
  const [persistenceStatus, setPersistenceStatus] = useState('checking...');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await getFirestoreStatus();
        setIsFirestoreOnline(status);
      } catch (err) {
        setIsFirestoreOnline(false);
      }
    };

    const interval = setInterval(checkConnection, 10000);
    checkConnection();

    return () => clearInterval(interval);
  }, []);

  const getStatusMessage = () => {
    if (!isBrowserOnline) return 'Offline - Working locally';
    if (!isFirestoreOnline) return 'Online but Firestore unavailable - Using cached data';
    return 'Online - Connected to Firestore';
  };

  const getStatusColor = () => {
    if (!isBrowserOnline) return 'bg-red-500';
    if (!isFirestoreOnline) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`fixed bottom-4 hidden left-4 px-2 py-2 rounded-lg shadow-lg z-50 opacity-100 ${getStatusColor()} text-white font-medium`}>
      {getStatusMessage()}
      <div className="text-xs mt-1 opacity-100">
        Persistence: {persistenceStatus}
      </div>
    </div>
  );
};