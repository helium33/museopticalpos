import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { completeTransfer, rejectTransfer } from '../../lib/transferInventory';
import { TransferRequest } from '../../type/transfer';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/useSidebarItem';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import toast from 'react-hot-toast';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Check, 
  X,
  ArrowRight,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react';

interface TransferRequestListProps {
  store: string;
  view: 'incoming' | 'outgoing' | 'all';
}

const TransferRequestList: React.FC<TransferRequestListProps> = ({ store, view }) => {
  const { user } = useAuth();
  const { canManageFrames, canManageAccessories } = usePermissions();
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let transferQuery;

    if (view === 'incoming') {
      transferQuery = query(
        collection(db, 'transfers'),
        where('fromStore', '==', store),
        orderBy('requestedAt', 'desc')
      );
    } else if (view === 'outgoing') {
      transferQuery = query(
        collection(db, 'transfers'),
        where('toStore', '==', store),
        orderBy('requestedAt', 'desc')
      );
    } else {
      transferQuery = query(
        collection(db, 'transfers'),
        orderBy('requestedAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(transferQuery, (snapshot) => {
      const transfersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestedAt: doc.data().requestedAt?.toDate() || new Date(),
        approvedAt: doc.data().approvedAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate()
      })) as TransferRequest[];

      const filteredTransfers = view === 'all' 
        ? transfersData.filter(t => t.fromStore === store || t.toStore === store)
        : transfersData;

      setTransfers(filteredTransfers);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching transfers:', error);
      toast.error('Failed to fetch transfer requests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [store, view]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
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
  };

  const getUrgencyColor = (urgency: string) => {
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
  };

  const canManageTransfer = (transfer: TransferRequest) => {
    switch (transfer.itemType) {
      case 'frames':
        return canManageFrames;
      case 'accessories':
        return canManageAccessories;
      case 'contactLenses':
        return canManageAccessories; // Using accessories permission for contact lenses
      default:
        return false;
    }
  };

  // Nothing has moved yet in either state, so both can still be confirmed or rejected.
  // 'approved' only exists on requests approved under the old two-step flow.
  // e.g. "RB5228 2012 · Side 92031 - RayBan 5228"
  const describeItem = (transfer: TransferRequest) => {
    const ids = [transfer.itemCode, transfer.itemSideCode && `Side ${transfer.itemSideCode}`].filter(Boolean).join(' · ');
    return ids ? `${ids} - ${transfer.itemName}` : transfer.itemName;
  };

  const isOpenTransfer = (transfer: TransferRequest) =>
    transfer.status === 'pending' || transfer.status === 'approved';

  // The store being taken from confirms - stock moves to the requesting store right away
  const handleConfirm = async (transfer: TransferRequest) => {
    if (!transfer.id || !canManageTransfer(transfer)) {
      toast.error('You do not have permission to manage this transfer');
      return;
    }

    const from = transfer.fromStore.toUpperCase();
    const to = transfer.toStore.toUpperCase();
    const proceed = window.confirm(
      `${describeItem(transfer)} × ${transfer.requestedQuantity}\n${from} → ${to}\n\n` +
      `Confirm နှိပ်လိုက်တာနဲ့ ${from} stock ကနေ နုတ်ပြီး ${to} stock ထဲ ချက်ချင်းဝင်သွားပါမယ်။`
    );
    if (!proceed) return;

    setActionLoading(transfer.id);
    try {
      await completeTransfer(transfer, user?.email || '');
      toast.success(`${transfer.requestedQuantity} × ${describeItem(transfer)} moved from ${from} to ${to}`);
      setDetailModalOpen(false);
    } catch (error) {
      console.error('Error confirming transfer:', error);
      toast.error(`Failed to confirm transfer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (transfer: TransferRequest) => {
    if (!transfer.id || !canManageTransfer(transfer)) {
      toast.error('You do not have permission to manage this transfer');
      return;
    }

    setActionLoading(transfer.id);
    try {
      await rejectTransfer(transfer, user?.email || '');
      toast.success('Transfer rejected');
      setDetailModalOpen(false);
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      toast.error(`Failed to reject transfer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Status in plain words, so a request nobody has confirmed doesn't read as finished
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'PENDING · Confirm စောင့်';
      case 'approved':
        return 'APPROVED · မရောက်သေး';
      case 'completed':
        return 'COMPLETED · ရောက်ပြီ';
      case 'rejected':
        return 'REJECTED';
      default:
        return status.toUpperCase();
    }
  };

  const columns = [
    {
      key: 'itemName',
      header: 'Item Name',
      sortable: true,
      render: (row: TransferRequest) => (
        <div className="max-w-xs">
          <div className="truncate font-medium text-blue-600 dark:text-blue-400" title={row.itemName}>
            {row.itemName}
          </div>
          {/* Item code, so models sharing a name can be told apart at a glance */}
          {row.itemCode && (
            <div className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.itemCode}</div>
          )}
        </div>
      )
    },
    {
      key: 'itemSideCode',
      header: 'Side Code',
      sortable: true,
      render: (row: TransferRequest) => row.itemSideCode ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-sm font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
          {row.itemSideCode}
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row: TransferRequest) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
          {getStatusIcon(row.status)}
          {getStatusLabel(row.status)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: TransferRequest) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedTransfer(row);
              setDetailModalOpen(true);
            }}
            className="p-1.5"
            title="View Details"
          >
            <Eye size={14} />
          </Button>

          {canManageTransfer(row) && row.fromStore === store && isOpenTransfer(row) && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleConfirm(row)}
                disabled={actionLoading === row.id}
                className="px-2 py-1.5 flex items-center gap-1"
                title="Confirm - the items move to the requesting store immediately"
              >
                {actionLoading === row.id ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Check size={14} />
                )}
                Confirm
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleReject(row)}
                disabled={actionLoading === row.id}
                className="p-1.5"
                title="Reject Transfer"
              >
                {actionLoading === row.id ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <X size={14} />
                )}
              </Button>
            </>
          )}

          {/* Approved under the old two-step flow but never received - let the requester finish it */}
          {canManageTransfer(row) && row.toStore === store && row.status === 'approved' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleConfirm(row)}
              disabled={actionLoading === row.id}
              className="px-2 py-1.5 flex items-center gap-1"
              title="Receive - move the items into this store"
            >
              {actionLoading === row.id ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                <CheckCircle size={14} />
              )}
              Receive
            </Button>
          )}
        </div>
      )
    },
    {
      key: 'itemCode',
      header: 'Item Code',
      sortable: true,
      render: (row: TransferRequest) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {row.itemCode}
        </div>
      )
    },
    {
      key: 'itemType',
      header: 'Type',
      sortable: true,
      render: (row: TransferRequest) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          {row.itemType === 'contactLenses' ? 'Contact Lens' : row.itemType.charAt(0).toUpperCase() + row.itemType.slice(1)}
        </span>
      )
    },
    {
      key: 'direction',
      header: 'Transfer Direction (လွှဲပြောင်းမှု)',
      render: (row: TransferRequest) => (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="text-center">
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                FROM: {row.fromStore.toUpperCase()}
              </div>
              <div className="text-xs text-gray-500 mt-1">ယူခံရတဲ့ဆိုင်</div>
            </div>
            <ArrowRight className="h-5 w-5 text-blue-500" />
            <div className="text-center">
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                TO: {row.toStore.toUpperCase()}
              </div>
              <div className="text-xs text-gray-500 mt-1">ယူတဲ့ဆိုင်</div>
            </div>
          </div>
          
          {/* Additional status indicator based on current store */}
          <div className="text-center">
            {row.fromStore === store && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                ⬆ ဒီဆိုင်ကပေးရမည်
              </span>
            )}
            {row.toStore === store && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                ⬇ ဒီဆိုင်ကိုဝင်မည်
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'requestedQuantity',
      header: 'Quantity',
      sortable: true,
      render: (row: TransferRequest) => (
        <div className="text-center">
          <span className="font-medium">{row.requestedQuantity}</span>
          <span className="text-gray-500 text-xs block">
            of {row.availableQuantity}
          </span>
          {row.transferredQuantity && (
            <span className="text-green-600 text-xs block">
              Transferred: {row.transferredQuantity}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'urgency',
      header: 'Urgency',
      sortable: true,
      render: (row: TransferRequest) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(row.urgency)}`}>
          {row.urgency.toUpperCase()}
        </span>
      )
    },
    {
      key: 'senderName',
      header: 'Sender (ပို့သူ)',
      render: (row: TransferRequest) => (
        <div className="text-center space-y-1">
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {row.senderName || 'Not specified'}
          </div>
          <div className="text-xs text-gray-500">
            {row.fromStore.toUpperCase()} Store
          </div>
        </div>
      )
    },
    {
      key: 'receiverName',
      header: 'Receiver (လက်ခံသူ)',
      render: (row: TransferRequest) => (
        <div className="text-center space-y-1">
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            {row.receiverName || 'Not specified'}
          </div>
          <div className="text-xs text-gray-500">
            {row.toStore.toUpperCase()} Store
          </div>
        </div>
      )
    },
    {
      key: 'requestedAt',
      header: 'Requested',
      sortable: true,
      render: (row: TransferRequest) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {row.requestedAt.toLocaleDateString()}
          <div className="text-xs">
            {row.requestedAt.toLocaleTimeString()}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          data={transfers}
          columns={columns}
          filterKey="itemCode"
          itemsPerPage={20}
          searchable={true}
        />
      )}

      {/* Transfer Detail Modal */}
      <FormModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Transfer Request Details"
      >
        {selectedTransfer && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedTransfer.itemCode} - {selectedTransfer.itemName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Transfer ID: {selectedTransfer.id}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTransfer.status)}`}>
                {getStatusIcon(selectedTransfer.status)}
                {getStatusLabel(selectedTransfer.status)}
              </span>
            </div>

            {/* Transfer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Transfer Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Side Code:</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                        {selectedTransfer.itemSideCode || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Item Type:</span>
                      <span className="font-medium">
                        {selectedTransfer.itemType === 'contactLenses' ? 'Contact Lens' : 
                         selectedTransfer.itemType.charAt(0).toUpperCase() + selectedTransfer.itemType.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">From Store:</span>
                      <span className="font-medium">{selectedTransfer.fromStore.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">To Store:</span>
                      <span className="font-medium">{selectedTransfer.toStore.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sender Name:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {selectedTransfer.senderName || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Receiver Name:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {selectedTransfer.receiverName || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Requested Qty:</span>
                      <span className="font-medium">{selectedTransfer.requestedQuantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Available Qty:</span>
                      <span className="font-medium">{selectedTransfer.availableQuantity}</span>
                    </div>
                    {selectedTransfer.transferredQuantity && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Transferred Qty:</span>
                        <span className="font-medium text-green-600">{selectedTransfer.transferredQuantity}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Urgency:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(selectedTransfer.urgency)}`}>
                        {selectedTransfer.urgency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Reason</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {selectedTransfer.reason}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">Requested</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedTransfer.requestedAt.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">by {selectedTransfer.requestedBy}</p>
                      </div>
                    </div>

                    {selectedTransfer.approvedAt && (
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="font-medium">Approved</p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {selectedTransfer.approvedAt.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">by {selectedTransfer.approvedBy}</p>
                        </div>
                      </div>
                    )}

                    {selectedTransfer.completedAt && (
                      <div className="flex items-center gap-3 text-sm">
                        <Package className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium">Completed</p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {selectedTransfer.completedAt.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">by {selectedTransfer.completedBy}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTransfer.customerInfo && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </h4>
                    <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="font-medium">{selectedTransfer.customerInfo.name}</span>
                      </div>
                      {selectedTransfer.customerInfo.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                          <span className="font-medium">{selectedTransfer.customerInfo.phone}</span>
                        </div>
                      )}
                      {selectedTransfer.customerInfo.orderNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Order:</span>
                          <span className="font-medium">{selectedTransfer.customerInfo.orderNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedTransfer.notes && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Additional Notes
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {selectedTransfer.notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {canManageTransfer(selectedTransfer) && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                {selectedTransfer.fromStore === store && isOpenTransfer(selectedTransfer) && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => handleReject(selectedTransfer)}
                      disabled={actionLoading === selectedTransfer.id}
                      className="flex items-center gap-2"
                    >
                      {actionLoading === selectedTransfer.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => handleConfirm(selectedTransfer)}
                      disabled={actionLoading === selectedTransfer.id}
                      className="flex items-center gap-2"
                    >
                      {actionLoading === selectedTransfer.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Confirm (ပစ္စည်းပို့မည်)
                    </Button>
                  </>
                )}

                {selectedTransfer.toStore === store && selectedTransfer.status === 'approved' && (
                  <Button
                    variant="primary"
                    onClick={() => handleConfirm(selectedTransfer)}
                    disabled={actionLoading === selectedTransfer.id}
                    className="flex items-center gap-2"
                  >
                    {actionLoading === selectedTransfer.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Receive (လက်ခံမည်)
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </FormModal>
    </div>
  );
};

export default TransferRequestList;