export interface TransferRequest {
  id?: string;
  itemType: 'frames' | 'accessories' | 'contactLenses';
  itemId: string;
  itemCode: string;
  // Side code of the requested model ('' when the item has none). Missing on requests
  // made before side codes were recorded, which are matched by code and name alone.
  itemSideCode?: string;
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
  transferredQuantity?: number;
  notes?: string;
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