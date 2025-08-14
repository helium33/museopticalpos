import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface StaffNotificationData {
  staffEmail: string;
  staffName?: string;
  action: string;
  itemType: 'lens' | 'frame' | 'accessory' | 'contact-lens';
  itemCode: string;
  itemCategory?: string;
  store: string;
  details: string;
  lensType?: string;
  quantity?: number;
  price?: number;
}

// Create notification for admins and owners when staff adds data
export const createStaffDataEntryNotification = async (data: StaffNotificationData): Promise<void> => {
  try {
    // Create notification for admin/owner visibility
    await addDoc(collection(db, 'notifications'), {
      title: `Staff Data Entry: ${data.action}`,
      message: `${data.staffEmail} added ${data.itemType}: ${data.itemCode} (${data.store.toUpperCase()} store)`,
      type: 'staff_data_entry',
      staffEmail: data.staffEmail,
      itemType: data.itemType,
      itemCode: data.itemCode,
      itemCategory: data.itemCategory,
      store: data.store,
      details: data.details,
      lensType: data.lensType,
      quantity: data.quantity,
      price: data.price,
      isRead: false,
      priority: 'normal',
      createdAt: serverTimestamp(),
    });

    // Also create an activity log entry
    await addDoc(collection(db, 'activityLogs'), {
      action: `Staff Added ${data.itemType}`,
      details: data.details,
      staffEmail: data.staffEmail,
      itemType: data.itemType,
      itemCode: data.itemCode,
      store: data.store,
      timestamp: serverTimestamp(),
      note: `New ${data.itemType} entry by staff member`,
    });

    console.log('Staff data entry notification created successfully');
  } catch (error) {
    console.error('Error creating staff notification:', error);
    // Don't throw error to prevent blocking the main operation
  }
};

// Create notification for lens-specific actions
export const createLensNotification = async (
  staffEmail: string,
  lensData: any,
  action: 'added' | 'updated' | 'deleted'
): Promise<void> => {
  const actionText = action === 'added' ? 'Added New Lens' : 
                    action === 'updated' ? 'Updated Lens' : 'Deleted Lens';
  
  const details = `${actionText}: ${lensData.code} | Type: ${lensData.type}${
    lensData.bifocalType ? ` (${lensData.bifocalType})` : ''
  }${lensData.smsBifocalType ? ` (SMS ${lensData.smsBifocalType})` : ''} | Category: ${lensData.category} | Qty: ${lensData.qty} | Price: ${lensData.price} MMK`;

  await createStaffDataEntryNotification({
    staffEmail,
    action: actionText,
    itemType: 'lens',
    itemCode: lensData.code,
    itemCategory: lensData.category,
    store: lensData.store || 'win',
    details,
    lensType: lensData.type,
    quantity: lensData.qty,
    price: lensData.price,
  });
};

// Check if user is staff (not admin/owner)
export const isStaffUser = (userEmail: string, userRole: string, isAdmin: boolean): boolean => {
  const ownerEmail = 'kyawwinhtun564@gmail.com';
  return userEmail !== ownerEmail && !isAdmin && userRole === 'staff';
};