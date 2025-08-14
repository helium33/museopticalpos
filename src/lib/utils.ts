// Enhanced utility functions for lens management with automatic error deduction
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { exportVocToExcel, exportVocToGoogleSheets } from '../lib/exportUtils';
import { Transaction, DashboardStats } from '../type/transcation';


// Type definitions
export type Store = 'main' | 'win' | 'pwint' | 'yangon' | 'yangon-office';
export const STORES: Store[] = ['main', 'win', 'pwint', 'yangon', 'yangon-office'];
export type ItemType = 'Lens' | 'Frame' | 'Contact Lens' | 'Accessories';
export type LensType = 'Single Vision' | 'Bifocal' | 'SMS' | 'Error' | 'Yangon Order';
export type BifocalType = 'Fuse' | 'Flattop' | 'Multifocal';
export type SMSBifocalType = 'Fuse' | 'Flattop' | 'Multifocal';
export type YangonOrderSubType = 'Single Vision' | 'Bifocal' | 'Multifocal';
export type YangonOrderBifocalType = 'Fuse' | 'Flattop';
export type FrameCategory = 'Eyeglasses' | 'Sunglasses' | 'Promotion' | 'Ready' | 'Ready BB' | 'Error';
export type FrameColor = 'Black' | 'Gold' | 'Silver' | 'Brown' | 'Blue' | 'Red' | 'Pink' | 'Purple' | 'Green' | 'Other';
export type ContactLensCategory = 'မျက်ကပ်အကြည်' | 'Pretty and Shinning' | 'F.l' | 'Big Eye Black' | 'Ms plane' | 'Ms ပါဝါ color' | 'Original' | 'Premium';
export type PaymentType = 'Full' | 'Deposit' | 'FOC';
export type PaymentMethod = 'Cash' | 'KPay' | 'Yuan' | 'Cash+KPay' | 'Cash+Yuan' | 'Yuan+KPay';
export type CustomerType = 'Original' | 'Membership';
export type CustomerCategory = 'Win' | 'Pwint' | 'Yangon' | 'Children' | 'Male 16-35' | 'Female 16-35' | 'Male 36-50' | 'Female 36-50' | 'Male 50+' | 'Female 50+';
export type CustomerGender = 'Male' | 'Female';
export type CancelReason = 'Customer Dissatisfied' | 'Error in Order' | 'Out of Stock' | 'Price Dispute' | 'Other';
export type SystemStatus = 'open' | 'closed';
export type Currency = 'MMK' | 'CNY' | 'USD';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type Language = 'en' | 'my';
export type NotificationPriority = 'info' | 'warning' | 'error';
export type Theme = 'light' | 'dark';
export type ItemHistoryAction = 'create' | 'update' | 'delete' | 'sold' | 'transfer';
export type ItemHistoryType = 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens' | 'voc';
export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type TransferUrgency = 'low' | 'medium' | 'high';









// Interface definitions
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'staff_data_entry' | 'system' | 'warning' | 'info' | 'transfer';
  staffEmail?: string;
  itemType?: string;
  itemCode?: string;
  itemCategory?: string;
  store?: string;
  details?: string;
  lensType?: string;
  quantity?: number;
  price?: number;
  transferId?: string;
  fromStore?: string;
  toStore?: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  staffEmail: string;
  itemType?: string;
  itemCode?: string;
  store?: string;
  timestamp: Date;
  note?: string;
}

export interface ItemHistory {
  id: string;
  itemId: string;
  itemType: ItemHistoryType;
  itemName: string;
  itemCode: string;
  action: ItemHistoryAction;
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  staffEmail: string;
  store: string;
  createdAt: Date;
  totalQty?: number;
  transferId?: string;
  fromStore?: string;
  toStore?: string;
}

export interface InventoryItem {
  id: string;
  totalQty: number;
  soldQty: number;
  remainingQty: number;
}

export interface VocItem {
  id?: string;
  name: string;
  type: ItemType;
  category: string;
  quantity: number;
  price: number;
  selectedPriceLabel?: string;
  isFOC?: boolean;
  itemDiscount?: number;
  store?: string;
  isSMS?: boolean;
  isSMSBifocal?: boolean;
  isYangonOrder?: boolean;
  details?: {
    sph?: string;
    cyl?: string;
    axis?: string;
    addition?: string;
    Right?: string;
    Left?: string;
    rightCyl?: string;
    leftCyl?: string;
    rightAxis?: string;
    leftAxis?: string;
    rightQty?: number;
    leftQty?: number;
    yangonOrderName?: string;
    color?: string;
    power?: string;
  };
}

export interface Voc {
  id?: string;
  vocNumber: string;
  customerName: string;
  customerPhone?: string;
  paymentType: PaymentType;
  depositAmount: number;
  yuanAmount?: number;
  yuanRate?: number;
  mmkAmount?: number;
  cashAmount?: number;
  kpayAmount?: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentMethod: PaymentMethod;
  discount?: number;
  items: VocItem[];
  store: Store;
  staffEmail: string;
  createdAt: Date;
  notes?: string;
  refund?: {
    amount: number;
    reason: string;
    date: Date;
  };
}

export interface EnhancedLensData {
  id?: string;
  code: string;
  type: LensType;
  bifocalType?: BifocalType;
  smsBifocalType?: SMSBifocalType;
  yangonOrderSubType?: YangonOrderSubType;
  yangonOrderBifocalType?: YangonOrderBifocalType;
  category: string;
  qty: number;
  rightQty?: number;
  leftQty?: number;
  originalQty?: number;
  originalRightQty?: number;
  originalLeftQty?: number;
  soldQty?: number;
  rightSoldQty?: number;
  leftSoldQty?: number;
  errorQty?: number;
  rightErrorQty?: number;
  leftErrorQty?: number;
  price: number;
  sph?: string;
  cyl?: string;
  axis?: string;
  addition?: string;
  Right?: string;
  Left?: string;
  rightAxis?: string;
  leftAxis?: string;
  rightCyl?: string;
  leftCyl?: string;
  store?: string;
  errorReason?: string;
  yangonOrderName?: string;
  yangonOrderWithG?: boolean;
  samePowerBothEyes?: boolean;
  lastUpdated?: Date | any;
}

export interface LensMatchingCriteria {
  code: string;
  sph?: string;
  cyl?: string;
  axis?: string;
  addition?: string;
  Right?: string;
  Left?: string;
  rightCyl?: string;
  leftCyl?: string;
  rightAxis?: string;
  leftAxis?: string;
  bifocalType?: string;
  category: string;
  store: string;
}

// Utility functions
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting - Keep Yuan separate from MMK
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('my-MM', {
    style: 'currency',
    currency: 'MMK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatYuan(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatYuanInput(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// IMPORTANT: This function is for reference only - DO NOT use for cash calculations
export function calculateYuanInMMK(yuanAmount: number, rate: number): number {
  return yuanAmount * rate;
}

// Payment calculation helpers - Keep currencies separate
export interface PaymentBreakdown {
  cashAmount: number;
  kpayAmount: number;
  yuanAmount: number; // Keep Yuan separate
  mmkAmount: number; // Additional MMK for Yuan payments
  totalMMK: number; // Total MMK portion only
  totalYuan: number; // Total Yuan portion only
}

export function calculatePaymentBreakdown(
  paymentMethod: PaymentMethod,
  cashAmount: number = 0,
  kpayAmount: number = 0,
  yuanAmount: number = 0,
  mmkAmount: number = 0
): PaymentBreakdown {
  let totalMMK = 0;
  let totalYuan = 0;

  switch (paymentMethod) {
    case 'Cash':
      totalMMK = cashAmount;
      break;
    case 'KPay':
      totalMMK = kpayAmount;
      break;
    case 'Yuan':
      totalYuan = yuanAmount;
      totalMMK = mmkAmount; // Additional MMK amount
      break;
    case 'Cash+KPay':
      totalMMK = cashAmount + kpayAmount;
      break;
    case 'Cash+Yuan':
      totalMMK = cashAmount;
      totalYuan = yuanAmount;
      break;
    case 'Yuan+KPay':
      totalMMK = kpayAmount;
      totalYuan = yuanAmount;
      break;
  }

  return {
    cashAmount,
    kpayAmount,
    yuanAmount,
    mmkAmount,
    totalMMK,
    totalYuan
  };
}

// Quantity calculations and formatting
export const roundToHalf = (value: number): number => {
  return Math.round(value * 2) / 2;
};

export const validateHalfIncrement = (value: number): boolean => {
  return value >= 0 && (value * 2) % 1 === 0;
};

// In your utils file
export const calculateSoldQuantity = (item: VocItem): number => {
  return item.quantity - (item.errorQuantity || 0);
};

export const calculateErrorQuantity = (item: VocItem): number => {
  return item.errorQuantity || 0;
};

export const formatLensQuantity = (item: { quantity: number, type?: string }): string => {
  if (item.type === 'Lens') {
    return `${item.quantity} ${item.quantity === 1 ? 'pair' : 'pairs'}`;
  }
  return `${item.quantity}`;
};

export const getQuantityIncrement = (itemType: ItemType, isBifocal?: boolean): number => {
  return 0.5;
};

export const getMinimumQuantity = (): number => {
  return 0.5;
};

export const formatQuantityDisplay = (quantity: number, itemType: ItemType, isBifocal?: boolean, isSingleVision?: boolean): string => {
  if (itemType === 'Lens' && (isBifocal || isSingleVision)) {
    return `${quantity} pairs`;
  }
  return `${quantity} pcs`;
};

export const validateQuantity = (quantity: number): boolean => {
  return quantity >= 0.5 && (quantity * 2) % 1 === 0;
};

// Lens-related functions
export function getLensDisplayCategory(type: LensType, bifocalType: BifocalType | undefined, category: string): string {
  if (type === 'Single Vision') {
    return category.toUpperCase();
  }
  
  if (bifocalType === 'Fuse') {
    return category.toUpperCase();
  }
  
  if (bifocalType === 'Flattop') {
    return category.toUpperCase();
  }
  
  if (bifocalType === 'Multifocal') {
    return category.toUpperCase();
  }
  
  return category.toUpperCase();
}

// Enhanced lens matching function with comprehensive prescription matching
export function findMatchingLensesForErrorDeduction(
  errorLens: EnhancedLensData,
  availableLenses: EnhancedLensData[]
): EnhancedLensData[] {
  console.log('🔍 Finding matching lenses for error deduction:', {
    errorCode: errorLens.code,
    errorType: errorLens.type,
    errorCategory: errorLens.category,
    errorStore: errorLens.store
  });

  // Determine target lens types based on error lens properties
  let targetTypes: LensType[] = ['Single Vision'];
  
  if (errorLens.bifocalType) {
    targetTypes = ['Bifocal'];
  }

  console.log(`🎯 Searching for lens types: ${targetTypes.join(', ')} in store: ${errorLens.store || 'win'}`);

  // Filter lenses by basic criteria first
  const candidateLenses = availableLenses.filter(lens => {
    // Skip error lenses, SMS lenses, and Yangon Order lenses
    if (lens.type === 'Error' || lens.type === 'SMS' || lens.type === 'Yangon Order') {
      return false;
    }

    // Check if lens type matches our target types
    if (!targetTypes.includes(lens.type)) {
      return false;
    }

    // Must have remaining quantity to deduct from
    if (lens.qty <= 0) {
      return false;
    }

    // Must be from the same store
    if (lens.store !== errorLens.store) {
      return false;
    }

    return true;
  });

  console.log(`📋 Found ${candidateLenses.length} candidate lenses after basic filtering`);

  // Apply enhanced prescription matching
  const matchingLenses = candidateLenses.filter(lens => {
    return matchLensPrescription(errorLens, lens);
  });

  console.log(`📋 Found ${matchingLenses.length} matching lenses after prescription filtering`);

  // Sort by remaining quantity (highest first) for better selection
  return matchingLenses.sort((a, b) => (b.qty || 0) - (a.qty || 0));
}

// Enhanced function to automatically deduct error quantities from matching lenses


// Enhanced prescription matching function with flexible matching
export function matchLensPrescription(
  errorLens: EnhancedLensData,
  targetLens: EnhancedLensData
): boolean {
  console.log('🔍 Checking prescription match:', {
    errorCode: errorLens.code,
    targetCode: targetLens.code,
    errorCategory: errorLens.category,
    targetCategory: targetLens.category
  });

  // For error lenses, we prioritize prescription matching over code similarity
  // This allows more flexible matching when exact code matches aren't available
  
  // Check category compatibility (more flexible for error deduction)
  const categoryMatch = checkCategoryCompatibility(errorLens.category, targetLens.category);
  if (!categoryMatch) {
    console.log('❌ Category incompatible:', { 
      errorCategory: errorLens.category, 
      targetCategory: targetLens.category 
    });
    return false;
  }

  // Check SPH match (exact)
  if (errorLens.sph && targetLens.sph && errorLens.sph !== targetLens.sph) {
    console.log('❌ SPH mismatch:', { error: errorLens.sph, target: targetLens.sph });
    return false;
  }
  
  // Check CYL match (exact)
  if (errorLens.cyl && targetLens.cyl && errorLens.cyl !== targetLens.cyl) {
    console.log('❌ CYL mismatch:', { error: errorLens.cyl, target: targetLens.cyl });
    return false;
  }
  
  // Check AXIS match (exact)
  if (errorLens.axis && targetLens.axis && errorLens.axis !== targetLens.axis) {
    console.log('❌ AXIS mismatch:', { error: errorLens.axis, target: targetLens.axis });
    return false;
  }
  
  // Check Addition match for bifocal lenses (exact)
  if (errorLens.addition && targetLens.addition && errorLens.addition !== targetLens.addition) {
    console.log('❌ Addition mismatch:', { error: errorLens.addition, target: targetLens.addition });
    return false;
  }
  
  // For Flattop bifocal lenses, check individual eye prescriptions (exact)
  if (errorLens.Right && targetLens.Right && errorLens.Right !== targetLens.Right) {
    console.log('❌ Right eye mismatch:', { error: errorLens.Right, target: targetLens.Right });
    return false;
  }
  
  if (errorLens.Left && targetLens.Left && errorLens.Left !== targetLens.Left) {
    console.log('❌ Left eye mismatch:', { error: errorLens.Left, target: targetLens.Left });
    return false;
  }
  
  if (errorLens.rightCyl && targetLens.rightCyl && errorLens.rightCyl !== targetLens.rightCyl) {
    console.log('❌ Right CYL mismatch:', { error: errorLens.rightCyl, target: targetLens.rightCyl });
    return false;
  }
  
  if (errorLens.leftCyl && targetLens.leftCyl && errorLens.leftCyl !== targetLens.leftCyl) {
    console.log('❌ Left CYL mismatch:', { error: errorLens.leftCyl, target: targetLens.leftCyl });
    return false;
  }
  
  if (errorLens.rightAxis && targetLens.rightAxis && errorLens.rightAxis !== targetLens.rightAxis) {
    console.log('❌ Right AXIS mismatch:', { error: errorLens.rightAxis, target: targetLens.rightAxis });
    return false;
  }
  
  if (errorLens.leftAxis && targetLens.leftAxis && errorLens.leftAxis !== targetLens.leftAxis) {
    console.log('❌ Left AXIS mismatch:', { error: errorLens.leftAxis, target: targetLens.leftAxis });
    return false;
  }

  // Check bifocal type match
  if (errorLens.bifocalType && targetLens.bifocalType && errorLens.bifocalType !== targetLens.bifocalType) {
    console.log('❌ Bifocal type mismatch:', { 
      error: errorLens.bifocalType, 
      target: targetLens.bifocalType 
    });
    return false;
  }

  console.log('✅ Lens prescription matches!');
  return true;
}

// Category compatibility checker for flexible error deduction
function checkCategoryCompatibility(errorCategory: string, targetCategory: string): boolean {
  // If exact match, always compatible
  if (errorCategory === targetCategory) {
    return true;
  }

  // Define category groups that are compatible for error deduction
  const categoryGroups = {
    bb: ['bb 1.56', 'bb 1.61', 'bb 1.67'],
    bbpg: ['bbpg 1.56', 'bbpg 1.61'],
    photo: ['photo pink', 'photo blue', 'photo purple', 'photo brown'],
    fuse: ['bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse'],
    flattop: ['mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop'],
    basic: ['cr', 'mc', 'pg'],
    antiglare: ['anti flash', 'anti glare']
  };

  // Check if both categories belong to the same group
  for (const [groupName, categories] of Object.entries(categoryGroups)) {
    if (categories.includes(errorCategory) && categories.includes(targetCategory)) {
      console.log(`✅ Categories compatible within ${groupName} group`);
      return true;
    }
  }

  // Special case: factory error category can match with any category
  if (errorCategory === 'factory error') {
    console.log('✅ Factory error category - compatible with any category');
    return true;
  }

  return false;
}

// Analyze why matching failed and provide suggestions
function analyzeMatchingFailure(errorLens: EnhancedLensData, availableLenses: EnhancedLensData[]): { 
  reason: string; 
  suggestion: string; 
  stats: any 
} {
  const stats = {
    totalLenses: availableLenses.length,
    sameStore: 0,
    correctType: 0,
    hasQuantity: 0,
    categoryMatch: 0,
    prescriptionMatch: 0
  };

  const targetType = errorLens.bifocalType ? 'Bifocal' : 'Single Vision';
  
  for (const lens of availableLenses) {
    // Count lenses in same store
    if (lens.store === errorLens.store) {
      stats.sameStore++;
      
      // Count correct type
      if (lens.type === targetType && lens.type !== 'Error' && lens.type !== 'SMS' && lens.type !== 'Yangon Order') {
        stats.correctType++;
        
        // Count lenses with quantity
        if (lens.qty > 0) {
          stats.hasQuantity++;
          
          // Count category matches
          if (checkCategoryCompatibility(errorLens.category, lens.category)) {
            stats.categoryMatch++;
            
            // Count prescription matches (simplified check)
            if (checkBasicPrescriptionMatch(errorLens, lens)) {
              stats.prescriptionMatch++;
            }
          }
        }
      }
    }
  }

  // Determine the main reason for failure and suggestion
  let reason = 'Unknown';
  let suggestion = 'Please check inventory.';

  if (stats.sameStore === 0) {
    reason = 'No lenses in same store';
    suggestion = `No lenses found in ${errorLens.store} store.`;
  } else if (stats.correctType === 0) {
    reason = 'No lenses of correct type';
    suggestion = `No ${targetType} lenses found in ${errorLens.store} store.`;
  } else if (stats.hasQuantity === 0) {
    reason = 'No lenses with available quantity';
    suggestion = `Found ${stats.correctType} ${targetType} lenses but all have 0 quantity.`;
  } else if (stats.categoryMatch === 0) {
    reason = 'No category matches';
    suggestion = `Found lenses but none match category "${errorLens.category}".`;
  } else if (stats.prescriptionMatch === 0) {
    reason = 'No prescription matches';
    suggestion = 'Found lenses with matching category but different prescription.';
  }

  return { reason, suggestion, stats };
}

// Fallback matching with relaxed criteria when exact matches aren't found
function findFallbackMatchingLenses(
  errorLens: EnhancedLensData,
  availableLenses: EnhancedLensData[]
): EnhancedLensData[] {
  console.log('🔄 Attempting fallback matching with relaxed criteria');

  // Determine target lens types
  let targetTypes: LensType[] = ['Single Vision'];
  if (errorLens.bifocalType) {
    targetTypes = ['Bifocal'];
  }

  // Filter with more relaxed criteria
  const fallbackCandidates = availableLenses.filter(lens => {
    // Basic filters (same as before)
    if (lens.type === 'Error' || lens.type === 'SMS' || lens.type === 'Yangon Order') {
      return false;
    }
    if (!targetTypes.includes(lens.type)) {
      return false;
    }
    if (lens.qty <= 0) {
      return false;
    }
    if (lens.store !== errorLens.store) {
      return false;
    }

    // Relaxed category matching - allow compatible categories
    if (!checkCategoryCompatibility(errorLens.category, lens.category)) {
      return false;
    }

    // Relaxed prescription matching - only check essential parameters
    return checkRelaxedPrescriptionMatch(errorLens, lens);
  });

  console.log(`📋 Found ${fallbackCandidates.length} fallback candidates`);
  
  // Sort by priority: exact category match first, then by quantity
  return fallbackCandidates.sort((a, b) => {
    // Prioritize exact category matches
    const aExactCategory = a.category === errorLens.category ? 1 : 0;
    const bExactCategory = b.category === errorLens.category ? 1 : 0;
    
    if (aExactCategory !== bExactCategory) {
      return bExactCategory - aExactCategory;
    }
    
    // Then sort by quantity (highest first)
    return (b.qty || 0) - (a.qty || 0);
  });
}

// Relaxed prescription matching for fallback
function checkRelaxedPrescriptionMatch(errorLens: EnhancedLensData, targetLens: EnhancedLensData): boolean {
  // For single vision, only check SPH (most important parameter)
  if (!errorLens.bifocalType) {
    if (errorLens.sph && targetLens.sph && errorLens.sph !== targetLens.sph) {
      return false;
    }
    return true;
  }

  // For bifocal lenses, check bifocal type and SPH
  if (errorLens.bifocalType && targetLens.bifocalType) {
    if (errorLens.bifocalType !== targetLens.bifocalType) {
      return false;
    }
    
    // For Flattop, check at least one eye matches
    if (errorLens.bifocalType === 'Flattop') {
      const rightMatch = !errorLens.Right || !targetLens.Right || errorLens.Right === targetLens.Right;
      const leftMatch = !errorLens.Left || !targetLens.Left || errorLens.Left === targetLens.Left;
      return rightMatch || leftMatch; // At least one eye should match
    }
    
    // For Fuse/Multifocal, check SPH
    if (errorLens.sph && targetLens.sph && errorLens.sph !== targetLens.sph) {
      return false;
    }
  }

  return true;
}

// Basic prescription matching for analysis
function checkBasicPrescriptionMatch(errorLens: EnhancedLensData, targetLens: EnhancedLensData): boolean {
  // Check SPH
  if (errorLens.sph && targetLens.sph && errorLens.sph !== targetLens.sph) return false;
  
  // Check bifocal type for bifocal lenses
  if (errorLens.bifocalType && targetLens.bifocalType && errorLens.bifocalType !== targetLens.bifocalType) return false;
  
  return true;
}

// Enhanced quantity validation for error deduction
export function validateErrorDeductionQuantity(
  errorLens: EnhancedLensData,
  targetLens: EnhancedLensData
): { isValid: boolean; message?: string } {
  if (errorLens.bifocalType === 'Flattop') {
    // For Flattop bifocal, check individual eye quantities
    const hasEnoughRight = !errorLens.rightQty || (targetLens.rightQty || 0) >= errorLens.rightQty;
    const hasEnoughLeft = !errorLens.leftQty || (targetLens.leftQty || 0) >= errorLens.leftQty;
    
    if (!hasEnoughRight) {
      return {
        isValid: false,
        message: `Insufficient right eye quantity. Available: ${targetLens.rightQty || 0}, Required: ${errorLens.rightQty || 0}`
      };
    }
    
    if (!hasEnoughLeft) {
      return {
        isValid: false,
        message: `Insufficient left eye quantity. Available: ${targetLens.leftQty || 0}, Required: ${errorLens.leftQty || 0}`
      };
    }
    
    return { isValid: true };
  } else {
    // For single vision or non-Flattop bifocal, check total quantity
    const hasEnoughTotal = (targetLens.qty || 0) >= (errorLens.qty || 0);
    
    if (!hasEnoughTotal) {
      return {
        isValid: false,
        message: `Insufficient total quantity. Available: ${targetLens.qty || 0}, Required: ${errorLens.qty || 0}`
      };
    }
    
    return { isValid: true };
  }
}

export function matchingLensProperties(sourceLens: any, targetLens: any): boolean {
  // Check SPH match
  if (sourceLens.sph && targetLens.sph && sourceLens.sph !== targetLens.sph) {
    return false;
  }
  
  // Check CYL match
  if (sourceLens.cyl && targetLens.cyl && sourceLens.cyl !== targetLens.cyl) {
    return false;
  }
  
  // Check AXIS match
  if (sourceLens.axis && targetLens.axis && sourceLens.axis !== targetLens.axis) {
    return false;
  }
  
  // Check Addition match for bifocal lenses
  if (sourceLens.addition && targetLens.addition && sourceLens.addition !== targetLens.addition) {
    return false;
  }
  
  // For Flattop bifocal lenses, check individual eye prescriptions
  if (sourceLens.Right && targetLens.Right && sourceLens.Right !== targetLens.Right) {
    return false;
  }
  
  if (sourceLens.Left && targetLens.Left && sourceLens.Left !== targetLens.Left) {
    return false;
  }
  
  if (sourceLens.rightCyl && targetLens.rightCyl && sourceLens.rightCyl !== targetLens.rightCyl) {
    return false;
  }
  
  if (sourceLens.leftCyl && targetLens.leftCyl && sourceLens.leftCyl !== targetLens.leftCyl) {
    return false;
  }
  
  if (sourceLens.rightAxis && targetLens.rightAxis && sourceLens.rightAxis !== targetLens.rightAxis) {
    return false;
  }
  
  if (sourceLens.leftAxis && targetLens.leftAxis && sourceLens.leftAxis !== targetLens.leftAxis) {
    return false;
  }
  
  return true;
}

// Number generation
export function generateVocNumber(store: Store): string {
  const storePrefix = store.charAt(0).toUpperCase();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${storePrefix}${year}${month}${day}-${random}`;
}

export function generateTransferNumber(fromStore: Store, toStore: Store): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `T${fromStore.charAt(0).toUpperCase()}${toStore.charAt(0).toUpperCase()}${year}${month}${day}-${random}`;
}

// Quantity calculations
export function calculateQuantities(lens: EnhancedLensData) {
  return {
    totalQty: lens.originalQty || lens.qty,
    soldQty: (lens.originalQty || lens.qty) - lens.qty,
    remainingQty: lens.qty
  };
}

export function calculateInventoryQuantities(item: InventoryItem) {
  return {
    totalQty: item.totalQty,
    soldQty: item.soldQty,
    remainingQty: item.totalQty - item.soldQty
  };
}

// CRITICAL: Enhanced lens inventory update function for VOC sales with proper sold quantity tracking
export async function updateLensInventoryForVOCSale(vocItems: VocItem[]): Promise<void> {
  console.log('🚀 Starting lens inventory update for VOC sale:', vocItems.length, 'items');
  
  for (const item of vocItems) {
    if (item.type !== 'Lens' || item.isFOC) continue;

    try {
      const matchingCriteria = {
        name: item.name,
        category: item.category,
        type: item.type || 'Single Vision',
        store: item.store,
        // ... other criteria
      };

      const matchingLens = await findMatchingLens(matchingCriteria);
      if (!matchingLens) continue;

      const lensRef = doc(db, 'lenses', matchingLens.id);
      
      // Calculate quantities to deduct
      const soldQuantity = calculateSoldQuantity(item); // quantity - errorQuantity
      const errorQuantity = item.errorQuantity || 0;

      if (item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
        // Handle bifocal lenses
        const rightSoldQty = (item.details.rightQty || 0) - (item.details.rightErrorQty || 0);
        const leftSoldQty = (item.details.leftQty || 0) - (item.details.leftErrorQty || 0);
        const rightErrorQty = item.details.rightErrorQty || 0;
        const leftErrorQty = item.details.leftErrorQty || 0;

        await updateDoc(lensRef, {
          rightQty: increment(-(rightSoldQty + rightErrorQty)),
          leftQty: increment(-(leftSoldQty + leftErrorQty)),
          qty: increment(-soldQuantity - errorQuantity),
          rightSoldQty: increment(rightSoldQty),
          leftSoldQty: increment(leftSoldQty),
          rightErrorQty: increment(rightErrorQty),
          leftErrorQty: increment(leftErrorQty),
          soldQty: increment(soldQuantity),
          errorQty: increment(errorQuantity),
          lastUpdated: serverTimestamp()
        });
      } else {
        // Handle regular lenses
        await updateDoc(lensRef, {
          qty: increment(-soldQuantity - errorQuantity),
          soldQty: increment(soldQuantity),
          errorQty: increment(errorQuantity),
          lastUpdated: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`Error updating lens inventory for ${item.name}:`, error);
    }
  }
}

// Import the enhanced findMatchingLens function
import { findMatchingLens } from './InventoryUtlis';

// CRITICAL: Enhanced lens inventory return function for VOC deletion with proper sold quantity tracking
export async function returnLensInventoryFromVOC(vocItems: VocItem[]): Promise<{
  success: boolean;
  errors: string[];
  successCount: number;
}> {
  console.log('🔄 Starting lens inventory return for VOC deletion:', vocItems.length, 'items');
  
  const errors: string[] = [];
  let successCount = 0;
  
  for (const item of vocItems) {
    // Only process lens items that are not FOC
    if (item.type !== 'Lens' || item.isFOC) {
      console.log(`⏭️ Skipping ${item.type} item or FOC item:`, item.name);
      successCount++; // Count as success since it's intentionally skipped
      continue;
    }

    try {
      console.log(`🔍 Processing lens return: ${item.name} (${item.quantity} pieces)`);
      
      // ENHANCED: Use comprehensive matching criteria for returns too
      const matchingCriteria = {
        name: item.name,
        category: item.category,
        type: item.type || 'Single Vision',
        store: item.store,
        sph: item.details?.sph,
        cyl: item.details?.cyl,
        axis: item.details?.axis,
        addition: item.details?.addition,
        Right: item.details?.Right,
        Left: item.details?.Left,
        rightCyl: item.details?.rightCyl,
        leftCyl: item.details?.leftCyl,
        rightAxis: item.details?.rightAxis,
        leftAxis: item.details?.leftAxis,
      };

      const matchingLens = await findMatchingLens(matchingCriteria);
      
      if (!matchingLens) {
        console.warn(`⚠️ No matching lens found for return: ${item.name}`);
        errors.push(`No matching lens found for return: ${item.name}`);
        continue;
      }

      const lensRef = doc(db, 'lenses', matchingLens.id);

      console.log(`📋 Found lens: ${item.name}`);
      console.log(`📊 Current quantities - Remaining: ${matchingLens.qty}, Sold: ${matchingLens.soldQty || 0}`);

      // Check if this is a bifocal lens with left/right quantities
      if (item.details?.rightQty !== undefined && item.details?.leftQty !== undefined) {
        // Handle Flattop bifocal lens with individual eye quantities
        const rightQtyToReturn = item.details.rightQty || 0;
        const leftQtyToReturn = item.details.leftQty || 0;
        const totalQtyToReturn = rightQtyToReturn + leftQtyToReturn;

        console.log(`👁️ Bifocal lens return - Right: ${rightQtyToReturn}, Left: ${leftQtyToReturn}, Total: ${totalQtyToReturn}`);

        // CRITICAL FIX: Return bifocal lens quantities using increment (positive values to add back)
        await updateDoc(lensRef, {
          rightQty: increment(rightQtyToReturn),
          leftQty: increment(leftQtyToReturn),
          qty: increment(totalQtyToReturn),
          rightSoldQty: increment(-rightQtyToReturn),
          leftSoldQty: increment(-leftQtyToReturn),
          soldQty: increment(-totalQtyToReturn),
          lastUpdated: serverTimestamp(),
        });

        console.log(`✅ Returned bifocal lens ${item.name}:`);
        console.log(`   - Increased rightQty by ${rightQtyToReturn}`);
        console.log(`   - Increased leftQty by ${leftQtyToReturn}`);
        console.log(`   - Increased total qty by ${totalQtyToReturn}`);
        console.log(`   - Decreased soldQty by ${totalQtyToReturn}`);

      } else {
        // Handle regular lens (single vision, fuse, multifocal)
        const qtyToReturn = item.quantity;

        console.log(`👁️ Regular lens return - Quantity: ${qtyToReturn}`);

        // CRITICAL FIX: Return regular lens quantities using increment (positive values to add back)
        await updateDoc(lensRef, {
          qty: increment(qtyToReturn),
          soldQty: increment(-qtyToReturn),
          lastUpdated: serverTimestamp(),
        });

        console.log(`✅ Returned regular lens ${item.name}:`);
        console.log(`   - Increased qty by ${qtyToReturn}`);
        console.log(`   - Decreased soldQty by ${qtyToReturn}`);
      }
      
      successCount++;

    } catch (error) {
      console.error(`❌ Error returning lens inventory for ${item.name}:`, error);
      errors.push(`Failed to return inventory for ${item.name}: ${error.message}`);
    }
  }
  
  console.log('✅ Successfully returned all lens inventory quantities from VOC deletion');
  
  return {
    success: errors.length === 0,
    errors,
    successCount
  };
}

export const formatPairQuantity = (quantity: number): string => {
  if (quantity === 1) {
    return '1 pair';
  }
  return `${quantity} pairs`;
};


// (Removed duplicate declarations of roundToHalf, validateHalfIncrement, and formatPairQuantity)

// UPDATED: ENHANCED ERROR LENS DEDUCTION SYSTEM - AUTOMATIC INVENTORY MATCHING FROM REMAINING QUANTITIES
export async function findMatchingLensForError(errorLens: any): Promise<any | null> {
  try {
    console.log('🔍 Finding matching lens for error deduction from remaining inventory:', errorLens.code, 'Type:', errorLens.type, 'Category:', errorLens.category);
    
    // Determine the target lens type to search for based on error lens properties
    let targetType = 'Single Vision';
    
    if (errorLens.bifocalType) {
      targetType = 'Bifocal';
    }

    console.log(`🎯 Searching for ${targetType} lenses in store: ${errorLens.store || 'win'}`);

    // Query for matching lenses - search by type and store first
    const lensQuery = query(
      collection(db, 'lenses'),
      where('store', '==', errorLens.store || 'win'),
      where('type', '==', targetType)
    );

    const querySnapshot = await getDocs(lensQuery);
    const availableLenses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📋 Found ${availableLenses.length} potential matching lenses of type ${targetType}`);

    // Find the best matching lens based on prescription and remaining quantity
    const matchingLens = availableLenses.find(lens => {
      // Skip if no remaining quantity available
      if (lens.qty <= 0) {
        console.log(`⏭️ Skipping lens ${lens.code} - no remaining quantity (${lens.qty})`);
        return false;
      }

      // Check prescription properties match
      if (!matchLensPrescription(errorLens, lens)) {
        return false;
      }

      // For bifocal lenses, check if there's enough remaining quantity for left/right
      if (errorLens.bifocalType) {
        // Check bifocal type match
        if (lens.bifocalType !== errorLens.bifocalType) {
          return false;
        }

        // For Flattop bifocal, check individual eye remaining quantities
        if (errorLens.bifocalType === 'Flattop') {
          const hasEnoughRight = !errorLens.rightQty || (lens.rightQty >= errorLens.rightQty);
          const hasEnoughLeft = !errorLens.leftQty || (lens.leftQty >= errorLens.leftQty);
          const hasEnough = hasEnoughRight && hasEnoughLeft;
          
          if (!hasEnough) {
            console.log(`⏭️ Skipping lens ${lens.code} - insufficient remaining quantity for Flattop bifocal. Available: R:${lens.rightQty}, L:${lens.leftQty}. Required: R:${errorLens.rightQty}, L:${errorLens.leftQty}`);
          }
          
          return hasEnough;
        } else {
          // For Fuse/Multifocal, check total remaining quantity
          const hasEnough = lens.qty >= errorLens.qty;
          
          if (!hasEnough) {
            console.log(`⏭️ Skipping lens ${lens.code} - insufficient remaining quantity. Available: ${lens.qty}, Required: ${errorLens.qty}`);
          }
          
          return hasEnough;
        }
      } else {
        // For single vision errors, check total remaining quantity
        const hasEnough = lens.qty >= errorLens.qty;
        
        if (!hasEnough) {
          console.log(`⏭️ Skipping lens ${lens.code} - insufficient remaining quantity. Available: ${lens.qty}, Required: ${errorLens.qty}`);
        }
        
        return hasEnough;
      }
    });

    if (matchingLens) {
      console.log('✅ Found matching lens with sufficient remaining quantity:', matchingLens.code, 'with remaining qty:', matchingLens.qty);
      console.log('📊 Prescription match:', {
        sph: `${errorLens.sph} → ${matchingLens.sph}`,
        cyl: `${errorLens.cyl} → ${matchingLens.cyl}`,
        axis: `${errorLens.axis} → ${matchingLens.axis}`,
        addition: `${errorLens.addition} → ${matchingLens.addition}`
      });
    } else {
      console.log('❌ No matching lens found for error deduction from remaining inventory');
      console.log('🔍 Search criteria:', {
        store: errorLens.store,
        targetType,
        errorQty: errorLens.qty,
        errorRightQty: errorLens.rightQty,
        errorLeftQty: errorLens.leftQty,
        prescription: {
          sph: errorLens.sph,
          cyl: errorLens.cyl,
          axis: errorLens.axis,
          addition: errorLens.addition
        }
      });
    }

    return matchingLens || null;
  } catch (error) {
    console.error('❌ Error finding matching lens for error deduction:', error);
    return null;
  }
}


export const calculateStats = (transactions: any[]) => {
  const stats = {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    dailyCash: 0,
    monthlyCash: 0,
    dailyKapy: 0,
    monthlyKapy: 0,
    monthlyStats: {} as { [key: string]: { income: number; expenses: number; balance: number } },
  };

  // Group transactions by month for monthly stats
  const monthlyGroups: { [key: string]: any[] } = {};

  transactions.forEach(transaction => {
    const amount = transaction.amount || 0;
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = [];
    }
    monthlyGroups[monthKey].push(transaction);
    
    if (transaction.type === 'income') {
      stats.totalIncome += amount;
    } else {
      stats.totalExpenses += amount;
    }

    // Calculate category-specific balances
    const multiplier = transaction.type === 'income' ? 1 : -1;
    const adjustedAmount = amount * multiplier;

    switch (transaction.category) {
      case 'daily-cash':
        stats.dailyCash += adjustedAmount;
        break;
      case 'monthly-cash':
        stats.monthlyCash += adjustedAmount;
        break;
      case 'daily-kapy':
        stats.dailyKapy += adjustedAmount;
        break;
      case 'monthly-kapy':
        stats.monthlyKapy += adjustedAmount;
        break;
    }
  });

  // Calculate monthly stats
  Object.keys(monthlyGroups).forEach(monthKey => {
    const monthTransactions = monthlyGroups[monthKey];
    const monthStats = {
      income: 0,
      expenses: 0,
      balance: 0,
    };

    monthTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        monthStats.income += transaction.amount;
      } else {
        monthStats.expenses += transaction.amount;
      }
    });

    monthStats.balance = monthStats.income - monthStats.expenses;
    stats.monthlyStats[monthKey] = monthStats;
  });

  stats.netBalance = stats.totalIncome - stats.totalExpenses;

  return stats;
};

export const getMonthName = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

export const exportTransactionsToCSV = (transactions: any[]): void => {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Mode', 'Reference', 'Tags', 'Notes'];
  
  const csvContent = [
    headers.join(','),
    ...transactions.map(transaction => [
      transaction.date,
      transaction.type,
      transaction.category,
      `"${transaction.description}"`,
      transaction.amount,
      transaction.paymentMode,
      transaction.reference || '',
      `"${(transaction.tags || []).join(', ')}"`,
      `"${transaction.notes || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
// Debug function to help troubleshoot lens matching
export function debugLensMatching(vocItemName: string, availableLenses: any[]) {
  console.log(`🔍 DEBUG: Searching for lens "${vocItemName}"`);
  console.log('📋 Available lenses in database:');
  
  availableLenses.forEach((lens, index) => {
    const similarity = calculateStringSimilarity(vocItemName, lens.name || lens.code);
    console.log(`${index + 1}. ${lens.name || lens.code} (${lens.category}) - Similarity: ${similarity}%`);
  });
  
  
  // Find best matches
  const bestMatches = availableLenses
    .map(lens => ({
      ...lens,
      similarity: calculateStringSimilarity(vocItemName, lens.name || lens.code)
    }))
    .filter(lens => lens.similarity > 50)
    .sort((a, b) => b.similarity - a.similarity);
    
  if (bestMatches.length > 0) {
    console.log('🎯 Best matches found:');
    bestMatches.slice(0, 5).forEach((lens, index) => {
      console.log(`${index + 1}. ${lens.name || lens.code} - ${lens.similarity}% match`);
    });
  } else {
    console.log('❌ No good matches found');
  }
}

function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
  const norm1 = normalize(str1);
  const norm2 = normalize(str2);
  
  if (norm1 === norm2) return 100;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 80;
  
  // Levenshtein distance for more sophisticated matching
  const matrix = [];
  for (let i = 0; i <= norm2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= norm1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= norm2.length; i++) {
    for (let j = 1; j <= norm1.length; j++) {
      if (norm2.charAt(i - 1) === norm1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(norm1.length, norm2.length);
  const distance = matrix[norm2.length][norm1.length];
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

// UPDATED: Function to deduct error quantity from matching lens REMAINING inventory
export async function deductQuantityFromMatchingLens(errorLens: any): Promise<boolean> {
  try {
    console.log('🚀 Starting error lens REMAINING inventory deduction for:', errorLens.code);
    
    const matchingLens = await findMatchingLensForError(errorLens);
    
    if (!matchingLens) {
      console.warn('⚠️ No matching lens found for error deduction from remaining inventory');
      return false;
    }

    const lensRef = doc(db, 'lenses', matchingLens.id);
    
    if (errorLens.bifocalType && errorLens.bifocalType === 'Flattop') {
      // Handle Flattop bifocal error deduction from remaining quantities
      const rightQtyToDeduct = errorLens.rightQty || 0;
      const leftQtyToDeduct = errorLens.leftQty || 0;
      const totalQtyToDeduct = rightQtyToDeduct + leftQtyToDeduct;
      
      // CRITICAL FIX: Use increment for atomic updates
      await updateDoc(lensRef, {
        rightQty: increment(-rightQtyToDeduct),
        leftQty: increment(-leftQtyToDeduct),
        qty: increment(-totalQtyToDeduct),
        rightSoldQty: increment(rightQtyToDeduct),
        leftSoldQty: increment(leftQtyToDeduct),
        soldQty: increment(totalQtyToDeduct),
        rightErrorQty: increment(rightQtyToDeduct),
        leftErrorQty: increment(leftQtyToDeduct),
        errorQty: increment(totalQtyToDeduct),
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ DEDUCTED Flattop bifocal error quantities from REMAINING inventory - Right: ${rightQtyToDeduct}, Left: ${leftQtyToDeduct} from lens ${matchingLens.code}`);
    } else {
      // Handle single vision or non-Flattop bifocal error deduction from remaining quantity
      const qtyToDeduct = errorLens.qty;
      
      // CRITICAL FIX: Use increment for atomic updates
      await updateDoc(lensRef, {
        qty: increment(-qtyToDeduct),
        soldQty: increment(qtyToDeduct),
        errorQty: increment(qtyToDeduct),
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ DEDUCTED ${qtyToDeduct} error pieces from REMAINING inventory of lens ${matchingLens.code}`);
    }
    
    // Log the error deduction for tracking - filter out undefined values
    const prescriptionData: any = {};
    if (errorLens.sph !== undefined) prescriptionData.sph = errorLens.sph;
    if (errorLens.cyl !== undefined) prescriptionData.cyl = errorLens.cyl;
    if (errorLens.axis !== undefined) prescriptionData.axis = errorLens.axis;
    if (errorLens.addition !== undefined) prescriptionData.addition = errorLens.addition;
    if (errorLens.Right !== undefined) prescriptionData.Right = errorLens.Right;
    if (errorLens.Left !== undefined) prescriptionData.Left = errorLens.Left;
    if (errorLens.rightCyl !== undefined) prescriptionData.rightCyl = errorLens.rightCyl;
    if (errorLens.leftCyl !== undefined) prescriptionData.leftCyl = errorLens.leftCyl;
    if (errorLens.rightAxis !== undefined) prescriptionData.rightAxis = errorLens.rightAxis;
    if (errorLens.leftAxis !== undefined) prescriptionData.leftAxis = errorLens.leftAxis;

    await addDoc(collection(db, 'errorDeductions'), {
      errorLensId: errorLens.id || 'new-error-lens',
      errorLensCode: errorLens.code || 'unknown',
      matchingLensId: matchingLens.id,
      matchingLensCode: matchingLens.code,
      deductedQty: errorLens.qty || 0,
      deductedRightQty: errorLens.rightQty || 0,
      deductedLeftQty: errorLens.leftQty || 0,
      errorReason: errorLens.errorReason || 'unknown',
      errorCategory: 'factory error',
      originalCategory: matchingLens.category,
      store: errorLens.store || 'win',
      deductionType: 'remaining_inventory', // Track that this was deducted from remaining inventory
      prescription: prescriptionData,
      createdAt: serverTimestamp(),
    });
    
    console.log('📝 Error deduction from REMAINING inventory logged successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deducting quantity from matching lens remaining inventory:', error);
    return false;
  }
}

// NEW: Enhanced SMS lens matching function - finds matching lens for SMS deduction
export async function findMatchingLensForSMS(smsLens: any): Promise<any | null> {
  try {
    console.log('🔍 Finding matching lens for SMS deduction:', smsLens.code, 'Type:', smsLens.type, 'Category:', smsLens.category);
    
    // Determine the target lens type to search for
    let targetType = 'Single Vision';
    if (smsLens.smsBifocalType) {
      targetType = 'Bifocal';
    }

    console.log(`🎯 Searching for ${targetType} lenses in store: ${smsLens.store || 'win'}`);

    // Query for matching lenses - search by type and store first
    const lensQuery = query(
      collection(db, 'lenses'),
      where('store', '==', smsLens.store || 'win'),
      where('type', '==', targetType)
    );

    const querySnapshot = await getDocs(lensQuery);
    const availableLenses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📋 Found ${availableLenses.length} potential matching lenses of type ${targetType} for SMS`);

    // Find the best matching lens based on prescription and remaining quantity
    const matchingLens = availableLenses.find(lens => {
      // Skip if no remaining quantity available
      if (lens.qty <= 0) {
        console.log(`⏭️ Skipping lens ${lens.code} - no remaining quantity (${lens.qty})`);
        return false;
      }

      // Check category match (exact)
      if (lens.category !== smsLens.category) {
        console.log(`⏭️ Skipping lens ${lens.code} - category mismatch. Available: ${lens.category}, Required: ${smsLens.category}`);
        return false;
      }

      // Check prescription properties match
      if (!matchLensPrescription(smsLens, lens)) {
        return false;
      }

      // For SMS bifocal lenses, check if there's enough quantity for left/right
      if (smsLens.smsBifocalType) {
        // Check bifocal type match
        if (lens.bifocalType !== smsLens.smsBifocalType) {
          console.log(`⏭️ Skipping lens ${lens.code} - bifocal type mismatch. Available: ${lens.bifocalType}, Required: ${smsLens.smsBifocalType}`);
          return false;
        }

        // For Flattop bifocal, check individual eye quantities
        if (smsLens.smsBifocalType === 'Flattop') {
          const hasEnoughRight = !smsLens.rightQty || (lens.rightQty >= smsLens.rightQty);
          const hasEnoughLeft = !smsLens.leftQty || (lens.leftQty >= smsLens.leftQty);
          const hasEnough = hasEnoughRight && hasEnoughLeft;
          
          if (!hasEnough) {
            console.log(`⏭️ Skipping lens ${lens.code} - insufficient remaining quantity for SMS Flattop bifocal. Available: R:${lens.rightQty}, L:${lens.leftQty}. Required: R:${smsLens.rightQty}, L:${smsLens.leftQty}`);
          }
          
          return hasEnough;
        } else {
          // For Fuse/Multifocal, check total quantity
          const hasEnough = lens.qty >= smsLens.qty;
          
          if (!hasEnough) {
            console.log(`⏭️ Skipping lens ${lens.code} - insufficient remaining quantity for SMS. Available: ${lens.qty}, Required: ${smsLens.qty}`);
          }
          
          return hasEnough;
        }
      } else {
        // For single vision SMS, check total quantity
        const hasEnough = lens.qty >= smsLens.qty;
        
        if (!hasEnough) {
          console.log(`⏭️ Skipping lens ${lens.code} - insufficient remaining quantity for SMS. Available: ${lens.qty}, Required: ${smsLens.qty}`);
        }
        
        return hasEnough;
      }
    });

    if (matchingLens) {
      console.log('✅ Found matching lens for SMS deduction:', matchingLens.code, 'with remaining qty:', matchingLens.qty);
      console.log('📊 SMS Prescription match:', {
        sph: `${smsLens.sph} → ${matchingLens.sph}`,
        cyl: `${smsLens.cyl} → ${matchingLens.cyl}`,
        axis: `${smsLens.axis} → ${matchingLens.axis}`,
        addition: `${smsLens.addition} → ${matchingLens.addition}`,
        category: `${smsLens.category} → ${matchingLens.category}`
      });
    } else {
      console.log('❌ No matching lens found for SMS deduction');
      console.log('🔍 SMS Search criteria:', {
        store: smsLens.store,
        targetType,
        smsQty: smsLens.qty,
        smsRightQty: smsLens.rightQty,
        smsLeftQty: smsLens.leftQty,
        category: smsLens.category,
        prescription: {
          sph: smsLens.sph,
          cyl: smsLens.cyl,
          axis: smsLens.axis,
          addition: smsLens.addition
        }
      });
    }

    return matchingLens || null;
  } catch (error) {
    console.error('❌ Error finding matching lens for SMS deduction:', error);
    return null;
  }
}

// NEW: Function to deduct SMS quantity from matching lens inventory
export async function deductQuantityFromMatchingLensForSMS(smsLens: any): Promise<boolean> {
  try {
    console.log('🚀 Starting SMS lens inventory deduction for:', smsLens.code);
    
    const matchingLens = await findMatchingLensForSMS(smsLens);
    
    if (!matchingLens) {
      console.warn('⚠️ No matching lens found for SMS deduction');
      return false;
    }

    const lensRef = doc(db, 'lenses', matchingLens.id);
    
    if (smsLens.smsBifocalType && smsLens.smsBifocalType === 'Flattop') {
      // Handle Flattop bifocal SMS deduction
      const rightQtyToDeduct = smsLens.rightQty || 0;
      const leftQtyToDeduct = smsLens.leftQty || 0;
      const totalQtyToDeduct = rightQtyToDeduct + leftQtyToDeduct;
      
      // CRITICAL FIX: Use increment for atomic updates
      await updateDoc(lensRef, {
        rightQty: increment(-rightQtyToDeduct),
        leftQty: increment(-leftQtyToDeduct),
        qty: increment(-totalQtyToDeduct),
        rightSoldQty: increment(rightQtyToDeduct),
        leftSoldQty: increment(leftQtyToDeduct),
        soldQty: increment(totalQtyToDeduct),
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ DEDUCTED SMS Flattop bifocal quantities from inventory - Right: ${rightQtyToDeduct}, Left: ${leftQtyToDeduct} from lens ${matchingLens.code}`);
    } else {
      // Handle single vision or non-Flattop bifocal SMS deduction
      const qtyToDeduct = smsLens.qty;
      
      // CRITICAL FIX: Use increment for atomic updates
      await updateDoc(lensRef, {
        qty: increment(-qtyToDeduct),
        soldQty: increment(qtyToDeduct),
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ DEDUCTED ${qtyToDeduct} SMS pieces from inventory of lens ${matchingLens.code}`);
    }
    
    // Log the SMS deduction for tracking
    await addDoc(collection(db, 'smsDeductions'), {
      smsLensId: smsLens.id || 'new-sms-lens',
      smsLensCode: smsLens.code,
      matchingLensId: matchingLens.id,
      matchingLensCode: matchingLens.code,
      deductedQty: smsLens.qty,
      deductedRightQty: smsLens.rightQty || 0,
      deductedLeftQty: smsLens.leftQty || 0,
      smsType: smsLens.smsBifocalType ? `SMS ${smsLens.smsBifocalType}` : 'SMS Single Vision',
      category: smsLens.category,
      store: smsLens.store,
      prescription: {
        sph: smsLens.sph,
        cyl: smsLens.cyl,
        axis: smsLens.axis,
        addition: smsLens.addition,
        Right: smsLens.Right,
        Left: smsLens.Left,
        rightCyl: smsLens.rightCyl,
        leftCyl: smsLens.leftCyl,
        rightAxis: smsLens.rightAxis,
        leftAxis: smsLens.leftAxis
      },
      deductionType: 'sms_inventory', // Track that this was SMS deduction
      createdAt: serverTimestamp(),
    });
    
    console.log('📝 SMS deduction from inventory logged successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deducting quantity from matching lens for SMS:', error);
    return false;
  }
}

// Contact Lens functions
export function validateContactLensData(data: any): ContactLensFormData {
  const category = (data.category === 'မျက်ကပ်အကြည်' || 
                   data.category === 'Pretty and Shinning' || 
                   data.category === 'F.l' || 
                   data.category === 'Big Eye Black' || 
                   data.category === 'Ms plane' || 
                   data.category === 'Ms ပါဝါ color' ||
                   data.category === 'Original' || 
                   data.category === 'Premium') 
    ? data.category 
    : 'မျက်ကပ်အကြည်';

  return {
    id: data.id || '',
    code: data.code || '',
    name: data.name || '',
    category,
    power: data.power || '',
    qty: typeof data.qty === 'number' ? data.qty : 0,
    price: typeof data.price === 'number' ? data.price : 0,
    soldQty: typeof data.soldQty === 'number' ? data.soldQty : 0,
    originalQty: typeof data.originalQty === 'number' 
      ? data.originalQty 
      : (typeof data.qty === 'number' ? data.qty : 0),
    store: data.store || ''
  };
}

// Export functions
export function exportToExcel(data: any[], filename: string, totals?: {
  totalAmount: number;
  kpayTotal: number;
  yuanTotal: number;
  depositTotal: number;
}): void {
  exportVocToExcel(data, filename, totals);
}

export function exportToGoogleSheets(vocs: any[], filename: string, totals?: {
  totalAmount: number;
  kpayTotal: number;
  yuanTotal: number;
  depositTotal: number;
}): void {
  exportVocToGoogleSheets(vocs, filename, totals);
}

// Data cleaning and validation
export function cleanDataForFirebase(data: any): any {
  const cleaned: any = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      if (value === null && typeof value === 'object') {
        cleaned[key] = '';
      } else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
}

// Item history tracking
export async function trackItemHistory({
  itemId,
  itemType,
  itemName,
  itemCode,
  action,
  changes,
  store,
  staffEmail,
  totalQty,
  transferId,
  fromStore,
  toStore,
}: Omit<ItemHistory, 'id' | 'createdAt'>) {
  try {
    await addDoc(collection(db, 'itemHistory'), {
      itemId,
      itemType,
      itemName,
      itemCode,
      action,
      changes,
      store,
      staffEmail,
      totalQty,
      transferId,
      fromStore,
      toStore,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking item history:', error);
  }
}

export function formatItemChanges(oldItem: any, newItem: any): { field: string; oldValue: string; newValue: string }[] {
  const changes: { field: string; oldValue: string; newValue: string }[] = [];
  
  Object.keys(newItem).forEach(key => {
    if (['id', 'lastUpdated'].includes(key)) {
      return;
    }
    
    const oldValue = oldItem[key];
    const newValue = newItem[key];
    
    if (oldValue !== newValue && oldValue !== undefined && newValue !== undefined) {
      changes.push({
        field: key,
        oldValue: String(oldValue),
        newValue: String(newValue)
      });
    }
  });
  
  return changes;
}

// Transfer utility functions
export function getTransferStatusColor(status: TransferStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'approved':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

export function getUrgencyColor(urgency: TransferUrgency): string {
  switch (urgency) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 3 * 1024 * 1024; // 3MB

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload a JPG, PNG, or WebP image' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 3MB' };
  }

  return { valid: true };
}

export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'jpg';
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${timestamp}-${randomString}-${cleanName}`;
};// FILEPATH: c:/Users/USER/Downloads/project-bolt-sb1-4j6heswu (2)/project/src/lib/utils.ts


// FILEPATH: c:/Users/USER/Downloads/project-bolt-sb1-4j6heswu (2)/project/src/lib/utils.ts

export async function deductErrorQuantityFromMatchingLens(errorLens: any): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔍 Starting error quantity deduction for:', errorLens.code);
    
    const lensQuery = query(
      collection(db, 'lenses'),
      where('store', '==', errorLens.store || 'win'),
    );
    const querySnapshot = await getDocs(lensQuery);
    const lenses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`📋 Found ${lenses.length} total lenses in store`);

    // Find matching lens based on error lens type and prescription
    const matchingLens = lenses.find(lens => {
      // Skip error lenses, SMS lenses, and Yangon Order lenses
      if (lens.type === 'Error' || lens.type === 'SMS' || lens.type === 'Yangon Order') {
        return false;
      }

      // Must have remaining quantity to deduct from
      if (lens.qty <= 0) {
        return false;
      }

      // Don't match with the same lens (different ID)
      if (lens.id === errorLens.id) {
        return false;
      }

      // Determine target lens type based on error lens
      let targetType = 'Single Vision';
      if (errorLens.bifocalType) {
        targetType = 'Bifocal';
      }

      // Check if lens type matches
      if (lens.type !== targetType) {
        return false;
      }

      // For Single Vision errors
      if (!errorLens.bifocalType) {
        console.log('🔍 Checking Single Vision match:', {
          errorSph: errorLens.sph,
          lensSph: lens.sph,
          errorCyl: errorLens.cyl,
          lensCyl: lens.cyl,
          errorAxis: errorLens.axis,
          lensAxis: lens.axis
        });

        return (
          lens.sph === errorLens.sph &&
          lens.cyl === errorLens.cyl &&
          lens.axis === errorLens.axis
        );
      }

      // For Bifocal errors
      if (errorLens.bifocalType && lens.bifocalType) {
        // Check bifocal type match
        if (lens.bifocalType !== errorLens.bifocalType) {
          return false;
        }

        // For Fuse bifocal
        if (errorLens.bifocalType === 'Fuse') {
          console.log('🔍 Checking Fuse bifocal match:', {
            errorSph: errorLens.sph,
            lensSph: lens.sph,
            errorAddition: errorLens.addition,
            lensAddition: lens.addition
          });

          return (
            lens.sph === errorLens.sph &&
            lens.addition === errorLens.addition
          );
        }

        // For Flattop bifocal
        if (errorLens.bifocalType === 'Flattop') {
          console.log('🔍 Checking Flattop bifocal match:', {
            errorRight: errorLens.Right,
            lensRight: lens.Right,
            errorLeft: errorLens.Left,
            lensLeft: lens.Left,
            errorRightCyl: errorLens.rightCyl,
            lensRightCyl: lens.rightCyl,
            errorLeftCyl: errorLens.leftCyl,
            lensLeftCyl: lens.leftCyl,
            errorRightAxis: errorLens.rightAxis,
            lensRightAxis: lens.rightAxis,
            errorLeftAxis: errorLens.leftAxis,
            lensLeftAxis: lens.leftAxis,
            errorAddition: errorLens.addition,
            lensAddition: lens.addition
          });

          return (
            lens.Right === errorLens.Right &&
            lens.Left === errorLens.Left &&
            lens.rightCyl === errorLens.rightCyl &&
            lens.leftCyl === errorLens.leftCyl &&
            lens.rightAxis === errorLens.rightAxis &&
            lens.leftAxis === errorLens.leftAxis &&
            lens.addition === errorLens.addition
          );
        }

        // For Multifocal bifocal
        if (errorLens.bifocalType === 'Multifocal') {
          console.log('🔍 Checking Multifocal bifocal match:', {
            errorSph: errorLens.sph,
            lensSph: lens.sph,
            errorAddition: errorLens.addition,
            lensAddition: lens.addition
          });

          return (
            lens.sph === errorLens.sph &&
            lens.addition === errorLens.addition
          );
        }
      }

      return false;
    });

    if (!matchingLens) {
      console.log('❌ No matching lens found for error quantity increment');
      return {
        success: false,
        message: 'No matching lens found to increment error quantity'
      };
    }

    console.log('✅ Found matching lens:', matchingLens.code);

    // Calculate error quantity to add
    let errorQtyToAdd = 0;
    let updateData: any = {};

    if (errorLens.bifocalType === 'Flattop') {
      // For Flattop bifocal, increment right and left error quantities separately
      const rightErrorQty = errorLens.rightQty || 0;
      const leftErrorQty = errorLens.leftQty || 0;
      
      if (rightErrorQty > 0) {
        updateData.rightErrorQty = (matchingLens.rightErrorQty || 0) + rightErrorQty;
        errorQtyToAdd += rightErrorQty;
      }
      
      if (leftErrorQty > 0) {
        updateData.leftErrorQty = (matchingLens.leftErrorQty || 0) + leftErrorQty;
        errorQtyToAdd += leftErrorQty;
      }
      
      updateData.errorQty = (matchingLens.errorQty || 0) + errorQtyToAdd;
    } else {
      // For Single Vision and other bifocal types
      errorQtyToAdd = errorLens.qty || 1;
      updateData.errorQty = (matchingLens.errorQty || 0) + errorQtyToAdd;
    }

    updateData.lastUpdated = serverTimestamp();

    // Update the matching lens
    await updateDoc(doc(db, 'lenses', matchingLens.id), updateData);

    console.log(`✅ Error quantity incremented for lens ${matchingLens.code}: +${errorQtyToAdd}`);

    return {
      success: true,
      message: `Successfully incremented error quantity by ${errorQtyToAdd} for lens ${matchingLens.code}`
    };

  } catch (error) {
    console.error('❌ Error incrementing error quantity:', error);
    return {
      success: false,
      message: 'Failed to increment error quantity due to system error'
    };
  }
}
