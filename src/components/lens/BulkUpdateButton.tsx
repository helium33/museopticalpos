import React, { useState } from 'react';
import { Database, Shield } from 'lucide-react';
import Button from '../ui/Button';
import BulkQuantityUpdateModal from './BulkQuantityUpdateModal';
import toast from 'react-hot-toast';

interface BulkUpdateResult {
  success: boolean;
  updatedCount: number;
  errors: string[];
  totalFound: number;
}

interface BulkUpdateButtonProps {
  onUpdateComplete?: () => void;
  userRole?: string;
  isAdmin?: boolean;
}

const BulkUpdateButton: React.FC<BulkUpdateButtonProps> = ({
  onUpdateComplete,
  userRole,
  isAdmin = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only allow admins and owners to perform bulk updates
  const canPerformBulkUpdate = isAdmin || userRole === 'owner';

  const handleUpdateComplete = (result: BulkUpdateResult) => {
    if (result.success && result.updatedCount > 0) {
      toast.success(
        `✅ Bulk update completed successfully! Updated ${result.updatedCount} lenses.`,
        { duration: 5000 }
      );
    } else if (result.errors.length > 0) {
      toast.error(
        `⚠️ Bulk update completed with errors. Updated ${result.updatedCount}/${result.totalFound} lenses.`,
        { duration: 5000 }
      );
      console.error('Bulk update errors:', result.errors);
    }

    if (onUpdateComplete) {
      onUpdateComplete();
    }
  };

  if (!canPerformBulkUpdate) {
    return (
      <div className="relative group">
        <Button
          variant="outline"
          size="sm"
          disabled
          className="flex items-center gap-2 opacity-50 cursor-not-allowed"
        >
          <Shield size={16} />
          <Database size={16} />
          Bulk Update
        </Button>
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
          Admin access required for bulk updates
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-600 dark:hover:bg-purple-900/20 transition-all duration-200 hover:scale-[0.98]"
        title="Bulk update lens quantities by category"
      >
        <Database size={16} />
        Bulk Update
      </Button>

      {isModalOpen && (
        <BulkQuantityUpdateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onComplete={handleUpdateComplete}
        />
      )}
    </>
  );
};

export default BulkUpdateButton;