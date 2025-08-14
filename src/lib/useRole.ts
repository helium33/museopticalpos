// User role definitions and permissions
export type UserRole = 'owner' | 'admin' | 'staff' | 'readonly';

export interface UserPermissions {
  // System permissions
  canManageSystem: boolean;
  canManageStaff: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  
  // Inventory permissions
  canManageInventory: boolean;
  canViewInventory: boolean;
  canEditInventory: boolean;
  canDeleteInventory: boolean;
  canAddInventory: boolean;
  
  // Financial permissions
  canManageFinances: boolean;
  canViewFinances: boolean;
  canEditFinances: boolean;
  
  // Customer permissions
  canManageCustomers: boolean;
  canViewCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  
  // VOC permissions
  canManageVOC: boolean;
  canViewVOC: boolean;
  canEditVOC: boolean;
  canDeleteVOC: boolean;
  
  // Data entry permissions
  canDataEntry: boolean;
}

export const USER_ROLES = {
  OWNER: 'owner' as const,
  ADMIN: 'admin' as const,
  STAFF: 'staff' as const,
  READONLY: 'readonly' as const
};

// Define user hierarchy and access levels
export const USER_HIERARCHY = {
  [USER_ROLES.OWNER]: 4,      // Highest level - full system access
  [USER_ROLES.ADMIN]: 3,      // High level - most features except system expansion
  [USER_ROLES.STAFF]: 2,      // Medium level - operational features
  [USER_ROLES.READONLY]: 1    // Lowest level - view and limited edit access
};

// User email to role mapping
export const USER_EMAIL_ROLES: Record<string, UserRole> = {
  // Owner
  'yannaning190791@gmail.com': USER_ROLES.OWNER,
  
  // Admins

  'kyawwinhtun564@gmail.com': USER_ROLES.ADMIN,
  'wpy.muse@gmail.com': USER_ROLES.ADMIN,
  'yannaning190792@gmail.com': USER_ROLES.ADMIN,
 // Replace with actual admin email
  
  // Staff
  'winvision1717@gmail.com': USER_ROLES.STAFF,
  'pwintoptical2@gmail.com.com': USER_ROLES.STAFF, // Replace with actual staff email
  'ygnoptical@gmail.com': USER_ROLES.STAFF, // Replace with actual staff email
  
  // Readonly
  'p95050553@gmail.com': USER_ROLES.READONLY
};

// Get user role by email
export const getUserRoleByEmail = (email: string): UserRole => {
  return USER_EMAIL_ROLES[email] || USER_ROLES.STAFF;
};

// Check if user has higher or equal access level
export const hasAccessLevel = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return USER_HIERARCHY[userRole] >= USER_HIERARCHY[requiredRole];
};

// Get all authorized emails
export const getAllAuthorizedEmails = (): string[] => {
  return Object.keys(USER_EMAIL_ROLES);
};

// Get emails by role
export const getEmailsByRole = (role: UserRole): string[] => {
  return Object.entries(USER_EMAIL_ROLES)
    .filter(([_, userRole]) => userRole === role)
    .map(([email]) => email);
};

// Permission templates for different roles
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [USER_ROLES.OWNER]: {
    canManageSystem: true,
    canManageStaff: true,
    canManageSettings: true,
    canViewReports: true,
    canManageInventory: true,
    canViewInventory: true,
    canEditInventory: true,
    canDeleteInventory: true,
    canAddInventory: true,
    canManageFinances: true,
    canViewFinances: true,
    canEditFinances: true,
    canManageCustomers: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canManageVOC: true,
    canViewVOC: true,
    canEditVOC: true,
    canDeleteVOC: true,
    canDataEntry: true
  },
  
  [USER_ROLES.ADMIN]: {
    canManageSystem: false,
    canManageStaff: true,
    canManageSettings: true,
    canViewReports: true,
    canManageInventory: true,
    canViewInventory: true,
    canEditInventory: true,
    canDeleteInventory: true,
    canAddInventory: true,
    canManageFinances: true,
    canViewFinances: true,
    canEditFinances: true,
    canManageCustomers: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canManageVOC: true,
    canViewVOC: true,
    canEditVOC: true,
    canDeleteVOC: true,
    canDataEntry: true
  },
  
  [USER_ROLES.STAFF]: {
    canManageSystem: false,
    canManageStaff: false,
    canManageSettings: false,
    canViewReports: false,
    canManageInventory: false,
    canViewInventory: true,
    canEditInventory: false,
    canDeleteInventory: false,
    canAddInventory: false,
    canManageFinances: false,
    canViewFinances: false,
    canEditFinances: false,
    canManageCustomers: true,
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canManageVOC: false,
    canViewVOC: true,
    canEditVOC: false,
    canDeleteVOC: false,
    canDataEntry: true,
   
  },
  
  [USER_ROLES.READONLY]: {
    canManageSystem: false,
    canManageStaff: false,
    canManageSettings: false,
    canViewReports: false,
    canManageInventory: false,
    canViewInventory: true,
    canEditInventory: false,
    canDeleteInventory: false,
    canAddInventory: false,
    canManageFinances: false,
    canViewFinances: false,
    canEditFinances: false,
    canManageCustomers: true,
    canViewCustomers: true,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canManageVOC: false,
    canViewVOC: true,
    canEditVOC: false,
    canDeleteVOC: false,
    canDataEntry: true
  }
};

// Get permissions for a specific role
export const getPermissionsForRole = (role: UserRole): UserPermissions => {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[USER_ROLES.STAFF];
};