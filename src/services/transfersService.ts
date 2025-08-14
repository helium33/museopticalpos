import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export interface Transfer {
  id: string;
  transactionNo: string;
  store: 'Win' | 'Pwint' | 'Yangon';
  type: 'cash' | 'yuan_to_mmk' | 'remaining_deposit';
  amount: number;
  rate?: number;
  date: string;
  description?: string;
  createdAt: string;
  vocId?: string; // Link to VOC if transfer is related to a sale
}

export interface DailyTransferSummary {
  date: string;
  cash: number;
  yuan: number;
  yuanToMmk: number;
  remainingDeposit: number;
  totalTransactions: number;
  store: string;
}

class TransferService {
  private collectionName = 'transfers';

  // Add new transfer
  async addTransfer(transferData: Omit<Transfer, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...transferData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      toast.success('Transfer added successfully');
      return docRef.id;
    } catch (error) {
      console.error('Error adding transfer:', error);
      toast.error('Failed to add transfer');
      throw error;
    }
  }

  // Get transfers with filters
  async getTransfers(filters?: {
    store?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Transfer[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );

      if (filters?.store && filters.store !== 'all') {
        q = query(q, where('store', '==', filters.store));
      }

      if (filters?.type && filters.type !== 'all') {
        q = query(q, where('type', '==', filters.type));
      }

      const querySnapshot = await getDocs(q);
      const transfers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        date: doc.data().date || new Date().toISOString().split('T')[0]
      })) as Transfer[];

      // Filter by date range if provided
      if (filters?.startDate || filters?.endDate) {
        return transfers.filter(transfer => {
          const transferDate = new Date(transfer.date);
          const start = filters.startDate ? new Date(filters.startDate) : new Date('1900-01-01');
          const end = filters.endDate ? new Date(filters.endDate) : new Date('2100-12-31');
          return transferDate >= start && transferDate <= end;
        });
      }

      return transfers;
    } catch (error) {
      console.error('Error getting transfers:', error);
      toast.error('Failed to load transfers');
      return [];
    }
  }

  // Delete transfer
  async deleteTransfer(transferId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, transferId));
      toast.success('Transfer deleted successfully');
    } catch (error) {
      console.error('Error deleting transfer:', error);
      toast.error('Failed to delete transfer');
      throw error;
    }
  }

  // Get daily transfer summary for VOC dashboard
  async getDailyTransferSummary(
    startDate: string, 
    endDate: string, 
    store?: string
  ): Promise<DailyTransferSummary[]> {
    try {
      const transfers = await this.getTransfers({
        store,
        startDate,
        endDate
      });

      // Group transfers by date
      const dailySummary: { [key: string]: DailyTransferSummary } = {};

      transfers.forEach(transfer => {
        const date = transfer.date;
        
        if (!dailySummary[date]) {
          dailySummary[date] = {
            date,
            cash: 0,
            yuan: 0,
            yuanToMmk: 0,
            remainingDeposit: 0,
            totalTransactions: 0,
            store: transfer.store
          };
        }

        dailySummary[date].totalTransactions++;

        switch (transfer.type) {
          case 'cash':
            dailySummary[date].cash += transfer.amount;
            break;
          case 'yuan_to_mmk':
            dailySummary[date].yuan += transfer.amount;
            dailySummary[date].yuanToMmk += transfer.amount * (transfer.rate || 1);
            break;
          case 'remaining_deposit':
            dailySummary[date].remainingDeposit += transfer.amount;
            break;
        }
      });

      return Object.values(dailySummary).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error) {
      console.error('Error getting daily transfer summary:', error);
      return [];
    }
  }

  // Real-time listener for transfers
  subscribeToTransfers(
    callback: (transfers: Transfer[]) => void,
    filters?: {
      store?: string;
      type?: string;
    }
  ): () => void {
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );

      if (filters?.store && filters.store !== 'all') {
        q = query(q, where('store', '==', filters.store));
      }

      if (filters?.type && filters.type !== 'all') {
        q = query(q, where('type', '==', filters.type));
      }

      return onSnapshot(q, (querySnapshot) => {
        const transfers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          date: doc.data().date || new Date().toISOString().split('T')[0]
        })) as Transfer[];

        callback(transfers);
      });
    } catch (error) {
      console.error('Error subscribing to transfers:', error);
      return () => {};
    }
  }

  // Add transfer from VOC (when a sale is made)
  async addTransferFromVOC(vocData: {
    vocId: string;
    store: string;
    cashAmount?: number;
    depositAmount?: number;
    transactionNo: string;
  }): Promise<void> {
    try {
      const transfers = [];

      // Add cash transfer if cash payment
      if (vocData.cashAmount && vocData.cashAmount > 0) {
        transfers.push({
          transactionNo: `${vocData.transactionNo}-CASH`,
          store: vocData.store as 'Win' | 'Pwint' | 'Yangon',
          type: 'cash' as const,
          amount: vocData.cashAmount,
          date: new Date().toISOString().split('T')[0],
          description: `Cash from VOC ${vocData.vocId}`,
          vocId: vocData.vocId
        });
      }

      // Add remaining deposit transfer if applicable
      if (vocData.depositAmount && vocData.depositAmount > 0) {
        transfers.push({
          transactionNo: `${vocData.transactionNo}-DEPOSIT`,
          store: vocData.store as 'Win' | 'Pwint' | 'Yangon',
          type: 'remaining_deposit' as const,
          amount: vocData.depositAmount,
          date: new Date().toISOString().split('T')[0],
          description: `Remaining deposit from VOC ${vocData.vocId}`,
          vocId: vocData.vocId
        });
      }

      // Add all transfers
      for (const transfer of transfers) {
        await this.addTransfer(transfer);
      }
    } catch (error) {
      console.error('Error adding transfer from VOC:', error);
      throw error;
    }
  }
}

export const transferService = new TransferService();