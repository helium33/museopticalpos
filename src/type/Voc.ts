export interface VocItem {
  id?: string;
  code?: string; // FIXED: Add code field for proper matching
  name: string;
  salePerson: string;  // e.g. "John"
  eyeTest: string;     // e.g. "Mia"
  fitting: string;
  type: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
  quantity: number;
  price: number;
  hasError?: boolean;
  errorQuantity?: number;
  errorQty?: number; // For backward compatibility
  soldQty?: number; // For explicit sold quantity tracking
  errorCategory?: string;
  errorDescription?: string;
  isFOC?: boolean;
  itemDiscount?: number;
  customTotal?: number;
  selectedPriceLabel?: string;
  category?: string;
  store?: string;
  staffEmail?: string;
  isBifocal?: boolean;
  isSingleVision?: boolean;
  isSMS?: boolean;
  isSMSBifocal?: boolean;
  isYangonOrder?: boolean;
  details?: {
    sph?: string;
    cyl?: string;
    axis?: string;
    addition?: string;
    color?: string;
    power?: string;
    rightQty?: number;
    leftQty?: number;
    Right?: string;
    Left?: string;
    rightCyl?: string;
    leftCyl?: string;
    rightAxis?: string;
    leftAxis?: string;
    rightErrorQty?: number;
    leftErrorQty?: number;
    yangonOrderName?: string;
  };
}

export interface VocData {
  id: string;
  vocNumber: string;
  customerName: string;
  customerAge?: number;
  customerPhone?: string;
  customerGender?: string;
  date: string;
  store: string;
  paymentMethod: string;
  salePerson?: string;
  eyeTest?: string;
  fitting?: string;
  items: VocItem[];
  discount?: number;
  deposit?: number;
  refundAmount?: number;
  notes?: string;
  isError?: boolean;
  errorStore?: string;
  errorCategory?: string;
  errorDescription?: string;
  totalAmount?: number;
  totalSoldQty?: number;
  totalErrorQty?: number;
  errorRate?: number;
  hasError?: boolean;
  status?: string;
}

export const ERROR_CATEGORIES = [
  'form_error',
  'kkt',
  'kcma',
  'kmmt',
  'eye_test',
  'fitting',
  'factory',
  'wrong_delivery',
  'wrong_lens_production',
] as const;

export type ErrorCategory = typeof ERROR_CATEGORIES[number];

// Enhanced error tracking interface
export interface ErrorTrackingData {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsByStore: Record<string, number>;
  errorRate: number;
  errorValue: number;
  soldValue: number;
  totalValue: number;
}

// Enhanced VOC summary interface
export interface VocSummary {
  totalVocs: number;
  totalSoldAmount: number;
  totalErrorAmount: number;
  totalAmount: number;
  totalSoldQuantity: number;
  totalErrorQuantity: number;
  errorRate: number;
  vocsWithErrors: number;
}

// Individual item tracking
export interface ItemErrorTracking {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  soldQuantity: number;
  errorQuantity: number;
  errorRate: number;
  errorCategory?: string;
  errorDescription?: string;
  soldValue: number;
  errorValue: number;
  totalValue: number;
}

// Store-wise error tracking
export interface StoreErrorSummary {
  store: string;
  totalVocs: number;
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  totalSoldValue: number;
  totalErrorValue: number;
  errorRate: number;
}