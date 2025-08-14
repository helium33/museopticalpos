// src/components/NetworkStatusIndicator.tsx
import { useNetworkStatus } from '../../hooks/useNetworkstatus';

export const NetworkStatusIndicator = () => {
  const isOnline = useNetworkStatus();

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      isOnline ? 'bg-green-500' : 'bg-red-500'
    } text-white font-medium`}>
      {isOnline ? 'Online' : 'Offline - Working locally'}
    </div>
  );
};