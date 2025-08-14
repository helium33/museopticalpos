import React, { useState } from 'react';
import { Voc, VocItem } from '@/type/type';
import { Button } from '../ui/Button';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import VocReturnModal from '../../components/VocReturnModal';
import { useTranslation } from 'react-i18next';

interface Props {
  voc: Voc;
  item: VocItem;
}

export const VocReturn: React.FC<Props> = ({ voc, item }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  // Create a simplified VOC object with just the item that has an error
  const errorVoc = {
    ...voc,
    items: [item]
  };

  const handleConfirmReturn = (vocId: string) => {
    // This would typically call an API to update inventory
    console.log(`Returning item ${item.id} from VOC ${vocId} to inventory`);
    setIsModalOpen(false);
  };

  return (
    <>
      <Button 
        variant="warning" 
        size="sm"
        onClick={() => setIsModalOpen(true)}
        title={t('Return error item to inventory')}
      >
        <AlertTriangle className="h-4 w-4 mr-1" />
        {t('Error')}
      </Button>

      <VocReturnModal
        voc={errorVoc}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmReturn}
      />
    </>
  );
};

export default VocReturnModal; // Keep this for backward compatibility