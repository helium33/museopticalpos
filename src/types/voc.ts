export interface VOCItem {
  id: string;
  itemType: ItemType;
  description: string;
  soldQty: number;
  errorQty: number; // New field for error quantity
  unitPrice: number;
  originalPrice: number; // Store original price before error discount
  totalPrice: number;
  hasError: boolean; // Flag to indicate if item has errors
  errorReason?: string; // Optional error description
}

export interface VOC {
  id: string;
  vocNumber: string;
  customerName: string;
  customerPhone: string;
  store: Store;
  items: VOCItem[];
  totalAmount: number;
  originalAmount: number; // Original amount before error discounts
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  status: 'active' | 'returned' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  hasErrors: boolean; // Flag to indicate if VOC has any errors
  errorDiscount: number; // Total discount applied due to errors
}