import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatCurrency, trackItemHistory } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Plus, Minus, Save, Eye, Edit3, Trash2 } from 'lucide-react';
import LensEditModal from '../../components/ui/LensEditModal';
import VocDeleteModal from '../../components/ui/VocDeleteModal';

interface LensDoc {
  totalQuantity: number;
  soldQuantity: number;
  errorQuantity: number;
  remainingQuantity: number;
}

const VocEditForm = ({ vocId, lensId }: { vocId: string; lensId: string }) => {
  const { currentUser } = useAuth();

  const [lensData, setLensData] = useState<LensDoc | null>(null);
  const [isLensModalOpen, setLensModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<{ soldQty: number; errorQty: number }>({
    defaultValues: { soldQty: 0, errorQty: 0 },
  });

  useEffect(() => {
    if (!lensId) return;
    const fetchLens = async () => {
      try {
        const lensRef = doc(db, 'lenses', lensId);
        const lensSnap = await getDoc(lensRef);
        if (lensSnap.exists()) {
          const data = lensSnap.data() as LensDoc;
          setLensData(data);
          reset({
            soldQty: 0,
            errorQty: 0,
          });
        }
      } catch (error) {
        toast.error('Failed to fetch lens data');
      }
    };
    fetchLens();
  }, [lensId, reset]);

  const onSubmit = async (data: { soldQty: number; errorQty: number }) => {
    if (!lensData) {
      toast.error('Lens data not loaded');
      return;
    }

    const { soldQty, errorQty } = data;

    if (errorQty > soldQty) {
      toast.error('Error quantity cannot be greater than sold quantity');
      return;
    }

    const netSold = soldQty - errorQty;
    const newSoldQty = lensData.soldQuantity + netSold;
    const newErrorQty = lensData.errorQuantity + errorQty;

    // Calculate new remaining quantity
    const newRemainingQty =
      lensData.totalQuantity - (newSoldQty + newErrorQty);

    if (newRemainingQty < 0) {
      toast.error('Remaining quantity cannot be negative');
      return;
    }

    try {
      const lensRef = doc(db, 'lenses', lensId);

      // Use updateDoc with increment to atomically update counts
      await updateDoc(lensRef, {
        soldQuantity: increment(netSold),
        errorQuantity: increment(errorQty),
        remainingQuantity: newRemainingQty,
        updatedAt: serverTimestamp(),
      });

      // Optionally track item history or other operations
      await trackItemHistory({
        lensId,
        action: 'voc_edit',
        userId: currentUser?.uid || '',
        soldQty: netSold,
        errorQty,
      });

      toast.success('VOC saved and lens inventory updated successfully');

      // Update local state to re-render new values
      setLensData((prev) =>
        prev
          ? {
              ...prev,
              soldQuantity: newSoldQty,
              errorQuantity: newErrorQty,
              remainingQuantity: newRemainingQty,
            }
          : null
      );

      // Reset form
      reset({ soldQty: 0, errorQty: 0 });
    } catch (err) {
      toast.error('Failed to update lens inventory');
    }
  };

  return (
    <div>
      <h3>VOC Edit Form</h3>

      {lensData && (
        <div>
          <p>
            <b>Lens Total Quantity:</b> {lensData.totalQuantity.toFixed(2)}
          </p>
          <p>
            <b>Sold Quantity:</b> {lensData.soldQuantity.toFixed(2)}
          </p>
          <p>
            <b>
              Error Quantity:{' '}
              <span
                style={{ color: 'red', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setLensModalOpen(true)}
                title="Click to view lens inventory details"
              >
                {lensData.errorQuantity.toFixed(2)}
              </span>
            </b>
          </p>
          <p>
            <b>Remaining Quantity:</b> {lensData.remainingQuantity.toFixed(2)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>
            Sold Quantity:
            <Input
              type="number"
              step={0.01}
              min={0}
              {...register('soldQty', { required: true, min: 0 })}
            />
          </label>
          {errors.soldQty && <p style={{ color: 'red' }}>Sold quantity is required and must be 0 or more</p>}
        </div>

        <div>
          <label>
            Error Quantity:
            <Input
              type="number"
              step={0.01}
              min={0}
              {...register('errorQty', { required: true, min: 0 })}
            />
          </label>
          {errors.errorQty && <p style={{ color: 'red' }}>Error quantity is required and must be 0 or more</p>}
        </div>

        <Button type="submit" icon={<Save size={16} />}>
          Save
        </Button>
      </form>

      {isLensModalOpen && lensData && (
        <LensEditModal
          lensId={lensId}
          initialData={lensData}
          onClose={() => setLensModalOpen(false)}
        />
      )}
    </div>
  );
};

export default VocEditForm;