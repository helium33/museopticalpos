import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction, TransactionStats } from '../types/transaction';

const COLLECTION_NAME = 'transactions';

export class TransactionService {
  // Add new transaction
  static async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...transaction,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // Update transaction
  static async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  // Delete transaction
  static async deleteTransaction(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Get transactions by location
  static async getTransactionsByLocation(location: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('location', '==', location),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  // Get all transactions
  static async getAllTransactions(): Promise<Transaction[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting all transactions:', error);
      throw error;
    }
  }

  // Real-time listener for transactions
  static subscribeToTransactions(
    location: string | null,
    callback: (transactions: Transaction[]) => void
  ): () => void {
    const q = location 
      ? query(
          collection(db, COLLECTION_NAME),
          where('location', '==', location),
          orderBy('createdAt', 'desc')
        )
      : query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (querySnapshot) => {
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      callback(transactions);
    });
  }

  // Calculate statistics
  static calculateStats(transactions: Transaction[]): TransactionStats {
    return transactions.reduce((stats, transaction) => {
      switch (transaction.type) {
        case 'cash':
          stats.totalCash += transaction.amount;
          break;
        case 'yuan-to-mmk':
          stats.totalYuanToMmk += transaction.amount;
          break;
        case 'deposit':
          stats.totalDeposits += transaction.amount;
          break;
      }

      if (transaction.status === 'pending') {
        stats.pendingTransactions++;
      } else if (transaction.status === 'completed') {
        stats.completedTransactions++;
      }

      return stats;
    }, {
      totalCash: 0,
      totalYuanToMmk: 0,
      totalDeposits: 0,
      pendingTransactions: 0,
      completedTransactions: 0
    });
  }
}