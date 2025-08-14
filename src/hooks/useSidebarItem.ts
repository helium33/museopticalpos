import { useAuth } from "../context/AuthContext";
import { getUserRoleByEmail, getPermissionsForRole, hasAccessLevel, USER_ROLES } from "../../src/lib/useRole";

export const usePermissions = () => {
  const { user } = useAuth();
  
  if (!user?.email) {
    return {
      // Sidebar items permissions
      sidebarItems: {
        dashboard: false,
        staffdashboard: false,
        expand: false,
        dataEntry: false,
        lens: false,
        frame: false,
        accessories: false,
        contactlens: false,
        voc: false,
        deposits: false,
        salesdata: false,
        staff: false,
        suppliers: false,
        settings: false,
        expenses: false,
        customer: false,
        history: false,
        transfers: false, // Added transfer permission
        yangonoffice: false // Added yangon office permission
      },
      
      // Store access functions
      getStoreAccess: () => [],
      canAccessStore: () => false,
      
      // User role flags
      isOwner: false,
      isAdminUser: false,
      
      // System permissions
      canManageSystem: false,
      canManageStaff: false,
      canManageSettings: false,
      canViewReports: false,
      
      // Inventory permissions
      canManageInventory: false,
      canViewInventory: false,
      canEditInventory: false,
      canDeleteInventory: false,
      canAddInventory: false,
      
      // Financial permissions
      canManageFinances: false,
      canViewFinances: false,
      canEditFinances: false,
      
      // Customer permissions
      canManageCustomers: false,
      canViewCustomers: false,
      canEditCustomers: false,
      canDeleteCustomers: false,
      
      // VOC permissions
      canManageVOC: false,
      canViewVOC: false,
      canEditVOC: false,
      canDeleteVOC: false,
      
      // Data entry permissions
      canDataEntry: false,
      
      // Inventory item specific permissions
      canManageLenses: false,
      canViewLenses: false,
      canEditLenses: false,
      canDeleteLenses: false,
      canAddLenses: false,
      
      canManageFrames: false,
      canViewFrames: false,
      canEditFrames: false,
      canDeleteFrames: false,
      canAddFrames: false,
      
      canManageAccessories: false,
      canViewAccessories: false,
      canEditAccessories: false,
      canDeleteAccessories: false,
      canAddAccessories: false,
      
      canManageContactLenses: false,
      canViewContactLenses: false,
      canEditContactLenses: false,
      canDeleteContactLenses: false,
      canAddContactLenses: false,
      
      // Transfer permissions
      canManageTransfers: false,
      canViewTransfers: false,
      canApproveTransfers: false
    };
  }

  const userRole = getUserRoleByEmail(user.email);
  const rolePermissions = getPermissionsForRole(userRole);
  const isOwner = user.email === 'yannaing190792@gmail.com';
  const isAdminUser = hasAccessLevel(userRole, USER_ROLES.ADMIN);

  // System-wide permissions
  const canManageSystem = isOwner;
  const canManageStaff = isOwner || isAdminUser;
  const canManageSettings = isOwner || isAdminUser;
  const canViewReports = isOwner || isAdminUser;
  
  // Inventory permissions - Staff can only view, not manage
  const canManageInventory = isOwner || isAdminUser;
  const canViewInventory = true; // All authenticated users can view
  const canEditInventory = isOwner || isAdminUser;
  const canDeleteInventory = isOwner || isAdminUser;
  const canAddInventory = isOwner || isAdminUser || user.email === "winstore1717@gmail.com"; // Removed staff access to add inventory
  
  // Financial permissions
  const canManageFinances = isOwner || isAdminUser;
  const canViewFinances = isOwner || isAdminUser || user.email === 'chittulay2001@gmail.com';
  const canEditFinances = isOwner || isAdminUser;
  
  // Customer permissions
  const canManageCustomers = true;
  const canViewCustomers = true;
  const canEditCustomers = true;
  const canDeleteCustomers = isOwner || isAdminUser;
  
  // VOC permissions
  const canManageVOC = isOwner || isAdminUser || user.email === 'chittulay2001@gmail.com';
  const canViewVOC = true;
  const canEditVOC = isOwner || isAdminUser || user.email === 'chittulay2001@gmail.com';
  const canDeleteVOC = isOwner || isAdminUser;
  
  // Data entry permissions
  const canDataEntry = userRole !== USER_ROLES.READONLY || user.email === 'p95050553@gmail.com';

  // Store access permissions
  const getStoreAccess = () => {
    // Owner has access to all stores including main and yangon head office
    if (isOwner) {
      return ['main', 'win', 'pwint', 'yangon', 'yangon-office'];
    }
    
    // Admin users have access to regular stores but NOT yangon head office unless specifically granted
    if (isAdminUser) {
      const stores = ['main', 'win', 'pwint', 'yangon'];
      // Only specific admins get yangon head office access
      if (user.email === 'kyawwinhtun564@gmail.com') {
        stores.push('yangon-office');
      }
      return stores;
    }
    
    // Store-specific access based on email
    switch (user.email) {
      case 'winvision1717@gmail.com':
        return ['win'];
      case 'pwintoptical@gmail.com':
        return ['pwint'];
      case 'ygnoptical@gmail.com':
        return ['yangon']; // Regular yangon store only, NOT head office
      // Add specific email for yangon head office access
      case 'yangonoffice@gmail.com': // Add the actual email for yangon head office staff
        return ['yangon-office'];
      default:
        return ['main', 'win', 'pwint', 'yangon']; // Regular stores, NOT head office
    }
  };

  const canAccessStore = (store: string) => {
    const allowedStores = getStoreAccess();
    return allowedStores.includes(store.toLowerCase());
  };

  // Transfer-specific permissions - Allow all staff to manage and view transfers
  const canManageTransfers = true; // All authenticated users can manage transfer requests
  const canViewTransfers = true; // All authenticated users can view transfer requests
  const canApproveTransfers = isOwner || isAdminUser || user.email === 'kyawwinhtun564@gmail.com' || user.email === 'yangonoffice@gmail.com'; // Owners/admins and yangon office staff can approve/reject transfers

  // Determine sidebar items based on user role/email
  const getSidebarItems = () => {
    const basePermissions = {
      dashboard: false,
      staffdashboard: false,
      expand: false,
      dataEntry: false,
      lens: false,
      frame: false,
      accessories: false,
      contactlens: false,
      voc: false,
      deposits: false,
      salesdata: false,
      staff: false,
      suppliers: false,
      settings: false,
      expenses: false,
      customer: false,
      history: false,
      transfers: false,
      transcation: false, // Added transactions permission
      yangonoffice: false // Added yangon office permission
    };

    // Owner (yannaing190792@gmail.com) - Full access to everything
    if (isOwner || user.email === 'yannaing190791@gmail.com') {
      return {
        ...basePermissions,
        dashboard: true,
        staffdashboard: true,
        expand: true,
        dataentry: true,
        lens: true,
        frame: true,
        accessories: true,
        contactlens: true,
        voc: true,
        deposits: true,
        salesdata: true,
        staff: true,
        suppliers: true,
        settings: true,
        expenses: true,
        history: true,
        customer: true,
        transfers: true,
        transcation: true, // Owner has access to transactions
        yangonoffice: true // Owner has access to yangon office
      };
    }

    // Admin users - Full access except expand (system expansion features)
    if (isAdminUser || user.email === 'kyawwinhtun564@gmail.com' || user.email === 'wpy.muse@gmail.com' || user.email === 'yannaing190792@gmail.com') {
      return {
      ...basePermissions,
      dashboard: true,
      dataentry: true,
      staffdashboard: true,
      lens: true,
      frame: true,
      accessories: true,
      contactlens: true,
      voc: true,
      deposits: true,
      salesdata: true,
      staff: true,
      suppliers: true,
      settings: true,
      expenses: true,
      history: true,
      customer: true,
      transfers: true,
      transcation : true, // Admins have access to transactions
      yangonoffice: user.email === 'yannaing190792@gmail.com' || user.email === 'kyawwinhtun564@gmail.com' || user.email === 'yangonoffice@gmail.com' // Only owner, specific admin, and yangon office staff have yangon office access
      };
    }

    // Specific staff members with custom permissions
    switch (user.email) {
      // Staff member 1 (chittulay2001@gmail.com) - Operational access
      case 'chittulay2001@gmail.com':
        return {
          ...basePermissions,
          deposits: true,
          history: true,
          frame: true,
          lens: true,
          accessories: true,
          dataEntry: true,
          voc: true,
          contactlens: true,
          transfers: true
        };
      
      // Staff member 2 (p95050553@gmail.com) - Readonly access with lens form access
      case 'p95950553@gmail.com':
        return {
          ...basePermissions,
          dataEntry: true,
          lens: true,
          frame: true,
          accessories: true,
          customer: true,
          contactlens: true,
          salesdata: true,
          transfers: true
        };
      
      // Store-specific staff emails
    
      case 'winvision1717@gmail.com':
      case 'winstore1717@gmail.com':
      case 'pwintoptical@gmail.com':
      case 'ygnoptical@gmail.com':
    
        return {
          ...basePermissions,
          deposits: true,
          frame: true,
          lens: true,
          accessories: true,
          dataEntry: true,
          voc: true,
          contactlens: true,
          transfers: true
        };
    }

    // Default for other staff members based on role
    if (userRole === USER_ROLES.STAFF) {
      return {
        ...basePermissions,
        customer: true,
        deposits: true,
        history: true,
        lens: true,
        frame: true,
        accessories: true,
        contactlens: true,
        salesdata: true,
        dataEntry: true,
        transfers: true
      };
    }

    // Default for readonly users
    if (userRole === USER_ROLES.READONLY) {
      return {
        ...basePermissions,
        dataEntry: true,
        lens: true,
        frame: true,
        accessories: true,
        customer: true,
        contactlens: true,
        salesdata: true,
        transfers: true
      };
    }

    return basePermissions;
  };

  const sidebarItemsResult = getSidebarItems();
  
  // Debug logging
  console.log('Permissions debug:', {
    userEmail: user.email,
    isOwner,
    isAdminUser,
    staffdashboard: sidebarItemsResult.staffdashboard
  });

  return {
    // Sidebar items permissions
    sidebarItems: sidebarItemsResult,
    
    // Store access functions
    getStoreAccess,
    canAccessStore,
    
    // User role flags
    isOwner,
    isAdminUser,
    
    // System permissions
    canManageSystem,
    canManageStaff,
    canManageSettings,
    canViewReports,
    
    // Inventory permissions
    canManageInventory,
    canViewInventory,
    canEditInventory,
    canDeleteInventory,
    canAddInventory,
    
    // Financial permissions
    canManageFinances,
    canViewFinances,
    canEditFinances,
    
    // Customer permissions
    canManageCustomers,
    canViewCustomers,
    canEditCustomers,
    canDeleteCustomers,
    
    // VOC permissions
    canManageVOC,
    canViewVOC,
    canEditVOC,
    canDeleteVOC,
    
    // Data entry permissions
    canDataEntry,
    
    // Inventory item specific permissions - Lens action buttons only for Owner/Admin
    canManageLenses: isOwner || isAdminUser, // Action buttons only for Owner/Admin
    canViewLenses: true, // Detail button for ALL staff
    canEditLenses: isOwner || isAdminUser, // Edit action only for Owner/Admin
    canDeleteLenses: isOwner || isAdminUser, // Delete action only for Owner/Admin
    canAddLenses: isOwner || isAdminUser, // Add action only for Owner/Admin
    
    // Inventory item specific permissions - Staff can only view, no action buttons
    canManageFrames: isOwner || isAdminUser || user.email === 'kyawwinhtun564@gmail.com' || user.email === 'yangonoffice@gmail.com' || 
                    user.email === 'winvision1717@gmail.com' || user.email === 'winstore1717@gmail.com' || 
                    user.email === 'pwintoptical@gmail.com' || user.email === 'ygnoptical@gmail.com' || 
                    user.email === 'chittulay2001@gmail.com',
    canViewFrames: canViewInventory,
    canEditFrames: canEditInventory || user.email === 'winvision1717@gmail.com' || user.email === 'winstore1717@gmail.com' || 
                  user.email === 'pwintoptical@gmail.com' || user.email === 'ygnoptical@gmail.com' || 
                  user.email === 'chittulay2001@gmail.com',
    canDeleteFrames: canDeleteInventory,
    canAddFrames: canAddInventory,
    
    canManageAccessories: isOwner || isAdminUser || user.email === 'kyawwinhtun564@gmail.com' || user.email === 'yangonoffice@gmail.com' || 
                         user.email === 'winvision1717@gmail.com' || user.email === 'winstore1717@gmail.com' || 
                         user.email === 'pwintoptical@gmail.com' || user.email === 'ygnoptical@gmail.com' || 
                         user.email === 'chittulay2001@gmail.com',
    canViewAccessories: canViewInventory,
    canEditAccessories: canEditInventory || user.email === 'winvision1717@gmail.com' || user.email === 'winstore1717@gmail.com' || 
                       user.email === 'pwintoptical@gmail.com' || user.email === 'ygnoptical@gmail.com' || 
                       user.email === 'chittulay2001@gmail.com',
    canDeleteAccessories: canDeleteInventory,
    canAddAccessories: canAddInventory,
    
    canManageContactLenses: isOwner || isAdminUser || user.email === 'kyawwinhtun564@gmail.com' || user.email === 'yangonoffice@gmail.com' || 
                           user.email === 'winvision1717@gmail.com' || user.email === 'winstore1717@gmail.com' || 
                           user.email === 'pwintoptical@gmail.com' || user.email === 'ygnoptical@gmail.com' || 
                           user.email === 'chittulay2001@gmail.com',
    canViewContactLenses: canViewInventory,
    canEditContactLenses: canEditInventory || user.email === 'winvision1717@gmail.com' || user.email === 'winstore1717@gmail.com' || 
                         user.email === 'pwintoptical@gmail.com' || user.email === 'ygnoptical@gmail.com' || 
                         user.email === 'chittulay2001@gmail.com',
    canDeleteContactLenses: canDeleteInventory,
    canAddContactLenses: canAddInventory,
    
    // Transfer permissions  
    canManageTransfers,
    canViewTransfers,
    canApproveTransfers
  };
};