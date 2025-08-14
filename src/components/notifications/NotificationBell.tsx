import React, { useState, useEffect } from 'react';
import { Bell, User, AlertTriangle, Stethoscope, Eye } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Notification, ActivityLog } from '../../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const NotificationBell: React.FC = () => {
  const { isAdmin, user, userRole } = useAuth();
  const [notifications, setNotifications] = useState<(Notification | ActivityLog)[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Check if user should see notifications (admin/owner only)
  const isOwner = user?.email === 'kyawwinhtun564@gmail.com';
  const canViewNotifications = isOwner || (isAdmin && userRole === 'admin');

  useEffect(() => {
    if (!user || !canViewNotifications) return;

    try {
      // Create a query for notifications
      const notificationsQuery = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      // Create a query for activity logs
      const activityLogsQuery = query(
        collection(db, 'activityLogs'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      // Subscribe to both notifications and activity logs
      const unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notificationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            isNotification: true
          }));

          // Get activity logs
          getDocs(activityLogsQuery).then((logsSnapshot) => {
            const logsData = logsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate() || new Date(),
              isActivityLog: true
            }));

            // Combine and sort notifications and logs
            const combinedData = [...notificationsData, ...logsData].sort((a, b) => {
              const dateA = a.isNotification ? a.createdAt : a.timestamp;
              const dateB = b.isNotification ? b.createdAt : b.timestamp;
              return dateB.getTime() - dateA.getTime();
            });

            setNotifications(combinedData);
            setUnreadCount(notificationsData.filter(n => !n.isRead).length);
          });

          setError(null);
        },
        (err) => {
          console.error('Error fetching notifications:', err);
          setError('Unable to load notifications. Please try again later.');
        }
      );

      return () => {
        unsubscribeNotifications();
      };
    } catch (err) {
      console.error('Error setting up notifications listener:', err);
      setError('Unable to initialize notifications. Please try again later.');
    }
  }, [isAdmin, user, canViewNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { isRead: true });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (item: any) => {
    if (item.isNotification) {
      if (item.type === 'staff_data_entry') {
        if (item.lensType === 'SMS') return <Stethoscope size={16} className="text-blue-500" />;
        if (item.lensType === 'Error') return <AlertTriangle size={16} className="text-red-500" />;
        return <Eye size={16} className="text-green-500" />;
      }
      return <Bell size={16} className="text-blue-500" />;
    }
    return <User size={16} className="text-gray-500" />;
  };

  const renderItem = (item: any) => {
    if (item.isNotification) {
      const isStaffEntry = item.type === 'staff_data_entry';
      
      return (
        <div
          key={item.id}
          className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
            !item.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
          }`}
          onClick={() => markAsRead(item.id)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(item)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.message}
                  </p>
                  
                  {/* Enhanced details for staff data entry */}
                  {isStaffEntry && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div><strong>Staff:</strong> {item.staffEmail}</div>
                        <div><strong>Store:</strong> {item.store?.toUpperCase()}</div>
                        <div><strong>Type:</strong> {item.lensType}</div>
                        <div><strong>Category:</strong> {item.itemCategory}</div>
                        {item.quantity && <div><strong>Qty:</strong> {item.quantity}</div>}
                        {item.price && <div><strong>Price:</strong> {item.price} MMK</div>}
                      </div>
                      <div className="mt-1 text-gray-600 dark:text-gray-400">
                        <strong>Details:</strong> {item.details}
                      </div>
                    </div>
                  )}
                </div>
                {!item.isRead && (
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {format(item.createdAt, 'PPp')}
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div
          key={item.id}
          className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(item)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {item.action}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {item.details}
                {item.note && (
                  <span className="block italic text-gray-500 mt-1">{item.note}</span>
                )}
              </p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {item.staffEmail}
                </p>
                <p className="text-xs text-gray-500">
                  {format(item.timestamp, 'PPp')}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  // Don't render for non-admin/owner users
  if (!canViewNotifications) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 relative transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform bg-red-600 rounded-full min-w-[18px] h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Activity Feed
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs px-2 py-1 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {error ? (
                <div className="p-4 text-center text-red-600 dark:text-red-400">
                  <AlertTriangle size={20} className="mx-auto mb-2" />
                  {error}
                </div>
              ) : notifications.length > 0 ? (
                notifications.map(item => renderItem(item))
              ) : (
                <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                  <Bell size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No activities to show</p>
                  <p className="text-xs mt-1">Staff data entries will appear here</p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Showing recent activity and staff data entries
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;