export interface TransferRequest {
  id?: string;
  itemType: 'frames' | 'accessories' | 'contactLenses';
  itemId: string;
  itemCode: string;
  itemName: string;
  fromStore: string;
  toStore: string;
  requestedQuantity: number;
  availableQuantity: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedBy: string;
  requestedAt: any;
  receiverName?: string;
  senderName?: string;
  approvedBy?: string;
  approvedAt?: any;
  rejectedBy?: string;
  rejectedAt?: any;
  rejectionReason?: string;
  completedBy?: string;
  completedAt?: any;
  customerInfo?: {
    name: string;
    phone?: string;
    orderNumber?: string;
  };
}

export interface TransferHistory {
  id?: string;
  transferId: string;
  action: 'created' | 'approved' | 'rejected' | 'completed';
  performedBy: string;
  performedAt: any;
  newStatus: string;
  reason?: string;
  details?: any;
}