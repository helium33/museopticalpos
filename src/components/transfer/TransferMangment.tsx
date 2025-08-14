import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TransferRequest } from '../../types/transfer';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/useSidebarItem';
import Button from '../../components/ui/Button';
import FormModal from '../../components/modals/FormModal';
import TransferRequestForm from '../../components/transfer/TransferRequestForm';
import TransferRequestList from './TransferRequestList';
import toast from 'react-hot-toast';
import { Package, Plus, ArrowRightLeft, Inbox, Send, List, AlertCircle } from 'lucide-react';

interface TransferManagementProps {
  store: string;
}

const TransferManagement: React.FC<TransferManagementProps> = ({ store }) => {
  const { user } = useAuth();
  const { canManageFrames, canManageAccessories } = usePermissions();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'all'>('incoming');
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canRequestTransfer = canManageFrames || canManageAccessories;

  const handleSubmitTransferRequest = async (data: TransferRequest) => {
    setSubmitting(true);
    try {
      const transferDoc = await addDoc(collection(db, 'transfers'), {
        ...data,
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'transferHistory'), {
        transferId: transferDoc.id,
        action: 'created',
        performedBy: user?.email,
        performedAt: serverTimestamp(),
        newStatus: 'pending'
      });

      toast.success('Transfer request submitted successfully');
      setRequestFormOpen(false);
    } catch (error) {
      console.error('Error submitting transfer request:', error);
      toast.error('Failed to submit transfer request');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    {
      id: 'incoming' as const,
      label: 'Incoming Requests',
      icon: <Inbox className="h-4 w-4" />,
      description: 'Requests from other stores to transfer items from this store',
      count: 'pending-incoming'
    },
    {
      id: 'outgoing' as const,
      label: 'Outgoing Requests',
      icon: <Send className="h-4 w-4" />,
      description: 'Requests made by this store to get items from other stores',
      count: 'pending-outgoing'
    },
    {
      id: 'all' as const,
      label: 'All Transfers',
      icon: <List className="h-4 w-4" />,
      description: 'All transfer requests related to this store',
      count: 'all'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Transfer Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage item transfers between stores
            </p>
          </div>
        </div>

        {canRequestTransfer && (
          <Button
            variant="primary"
            onClick={() => setRequestFormOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Request Transfer
          </Button>
        )}
      </div>

      {/* Store Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <span className="font-medium">Current Store:</span> {store.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Transfer Process Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Transfer Process</h4>
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <p><strong>1. Request:</strong> Submit transfer request for items from other stores</p>
              <p><strong>2. Approval:</strong> Source store approves or rejects the request</p>
              <p><strong>3. Completion:</strong> Destination store marks transfer as completed</p>
              <p><strong>4. Quantity Update:</strong> System automatically updates quantities in both stores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Notice */}
      {!canRequestTransfer && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              You have read-only access to transfer data. Contact an administrator for transfer permissions.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Description */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </p>
      </div>

      {/* Transfer List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <TransferRequestList store={store} view={activeTab} />
      </div>

      {/* Transfer Request Form Modal */}
      <FormModal
        isOpen={requestFormOpen}
        onClose={() => setRequestFormOpen(false)}
        title="Request Item Transfer"
        size="lg"
      >
        <TransferRequestForm
          onSubmit={handleSubmitTransferRequest}
          onClose={() => setRequestFormOpen(false)}
          currentStore={store}
          isSubmitting={submitting}
        />
      </FormModal>
    </div>
  );
};

export default TransferManagement;