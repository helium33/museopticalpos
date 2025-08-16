// 🚀 Performance Optimizer Utility
// မြန်ဆန်သော လုပ်ဆောင်မှုများအတွက် အထူးဖန်တီးထားသော Library

import { writeBatch, collection, doc, updateDoc, serverTimestamp, runTransaction, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import toast from 'react-hot-toast';

// 🚀 Performance Constants - မြန်ဆန်မှုအတွက် သတ်မှတ်ချက်များ
export const PERFORMANCE_CONSTANTS = {
  CACHE_DURATION: 60000, // 1 minute cache
  BATCH_SIZE: 400, // Firestore batch limit buffer
  DEBOUNCE_DELAY: 300, // Search debounce
  MAX_DISPLAY_ITEMS: 100, // Virtual scrolling limit
  BACKGROUND_BATCH_SIZE: 50, // Background processing batch size
  MAX_CONCURRENT_OPERATIONS: 5, // Concurrent operation limit
};

// 🚀 Advanced Debounce Hook Implementation
export class PerformanceDebouncer {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  debounce<T extends (...args: any[]) => void>(
    key: string,
    func: T,
    delay: number = PERFORMANCE_CONSTANTS.DEBOUNCE_DELAY
  ): T {
    return ((...args: Parameters<T>) => {
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        func(...args);
        this.timeouts.delete(key);
      }, delay);

      this.timeouts.set(key, timeout);
    }) as T;
  }

  clear(key?: string) {
    if (key) {
      const timeout = this.timeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(key);
      }
    } else {
      // Clear all
      this.timeouts.forEach(timeout => clearTimeout(timeout));
      this.timeouts.clear();
    }
  }
}

// 🚀 Memory Efficient Cache System
export class MemoryOptimizedCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = PERFORMANCE_CONSTANTS.CACHE_DURATION) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key: string, value: T): void {
    // Remove expired items first
    this.cleanup();

    // If at max capacity, remove least used item
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access count for LRU
    item.accessCount++;
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed : 0
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastUsedCount = Infinity;

    this.cache.forEach((item, key) => {
      if (item.accessCount < leastUsedCount) {
        leastUsedCount = item.accessCount;
        leastUsedKey = key;
      }
    });

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }
}

// 🚀 Batch Operation Manager - အစုလိုက် လုပ်ဆောင်မှု စီမံခန့်ခွဲမှု
export class BatchOperationManager {
  private operationQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private onProgress?: (progress: number, message: string) => void;

  setProgressCallback(callback: (progress: number, message: string) => void) {
    this.onProgress = callback;
  }

  addOperation(operation: () => Promise<any>): void {
    this.operationQueue.push(operation);
  }

  async processBatch(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🚀 Batch Operation စတင်နေပါတယ် ${this.operationQueue.length} operations`);

    try {
      const total = this.operationQueue.length;
      const results = [];

      // Process operations in batches to prevent memory issues
      const batchSize = PERFORMANCE_CONSTANTS.BACKGROUND_BATCH_SIZE;
      
      for (let i = 0; i < this.operationQueue.length; i += batchSize) {
        const batch = this.operationQueue.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(this.operationQueue.length / batchSize);

        this.onProgress?.(
          Math.floor(((i + batch.length) / total) * 100),
          `Batch ${batchNumber}/${totalBatches} လုပ်နေပါတယ်... (${i + batch.length}/${total})`
        );

        // Execute batch operations concurrently with limit
        const batchPromises = batch.map(operation => operation());
        const batchResults = await Promise.allSettled(batchPromises);
        
        results.push(...batchResults);

        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Check for failed operations
      const failedOperations = results.filter(result => result.status === 'rejected');
      if (failedOperations.length > 0) {
        console.warn(`⚠️ ${failedOperations.length} operations failed out of ${total}`);
        failedOperations.forEach((failed, index) => {
          console.error(`Failed operation ${index}:`, failed.reason);
        });
      }

      this.onProgress?.(100, 'အားလုံးပြီးပါပြီ!');
      console.log(`✅ Batch Operation ပြီးပါပြီ - Success: ${total - failedOperations.length}/${total}`);

    } catch (error) {
      console.error('❌ Batch Operation Error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.operationQueue = [];
    }
  }

  clearQueue(): void {
    this.operationQueue = [];
    this.isProcessing = false;
  }

  getQueueSize(): number {
    return this.operationQueue.length;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

// 🚀 Firebase Optimized Operations - Firebase အတွက် အကောင်းဆုံး လုပ်ဆောင်မှုများ
export class FirebaseOptimizer {
  private static instance: FirebaseOptimizer;
  private batchManager = new BatchOperationManager();

  static getInstance(): FirebaseOptimizer {
    if (!FirebaseOptimizer.instance) {
      FirebaseOptimizer.instance = new FirebaseOptimizer();
    }
    return FirebaseOptimizer.instance;
  }

  setBatchProgressCallback(callback: (progress: number, message: string) => void) {
    this.batchManager.setProgressCallback(callback);
  }

  // 🚀 Optimized Bulk Update
  async bulkUpdate(
    collectionName: string, 
    updates: Array<{ id: string; data: any }>,
    showProgress = true
  ): Promise<void> {
    console.log(`🚀 Firebase Bulk Update စတင်နေပါတယ် - ${updates.length} items`);

    if (updates.length === 0) {
      throw new Error('No updates to process');
    }

    // Split into Firestore-compliant batches (500 operations max per batch)
    const batches: Array<Array<{ id: string; data: any }>> = [];
    const batchSize = PERFORMANCE_CONSTANTS.BATCH_SIZE;

    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize));
    }

    // Add batch operations to manager
    this.batchManager.clearQueue();

    batches.forEach((batch, batchIndex) => {
      this.batchManager.addOperation(async () => {
        const writeBatchOp = writeBatch(db);

        batch.forEach(({ id, data }) => {
          const docRef = doc(db, collectionName, id);
          writeBatchOp.update(docRef, {
            ...data,
            updatedAt: serverTimestamp()
          });
        });

        await writeBatchOp.commit();
        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed`);
      });
    });

    await this.batchManager.processBatch();
  }

  // 🚀 Optimized Single Update with Retry Logic
  async optimizedUpdate(
    collectionName: string,
    documentId: string,
    data: any,
    retries: number = 3
  ): Promise<void> {
    console.log(`🚀 Optimized Update: ${collectionName}/${documentId}`);

    const attempt = async (attemptsLeft: number): Promise<void> => {
      try {
        const docRef = doc(db, collectionName, documentId);
        
        // Use transaction for critical updates
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(docRef);
          
          if (!docSnap.exists()) {
            throw new Error('Document does not exist');
          }

          transaction.update(docRef, {
            ...data,
            updatedAt: serverTimestamp()
          });
        });

        console.log(`✅ Update successful: ${collectionName}/${documentId}`);
      } catch (error) {
        if (attemptsLeft > 0) {
          console.warn(`⚠️ Update failed, retrying... (${attemptsLeft} attempts left)`, error);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          await attempt(attemptsLeft - 1);
        } else {
          console.error(`❌ Update failed after all retries: ${collectionName}/${documentId}`, error);
          throw error;
        }
      }
    };

    await attempt(retries);
  }

  // 🚀 Atomic Multi-Document Update
  async atomicMultiUpdate(
    operations: Array<{
      collectionName: string;
      documentId: string;
      data: any;
      operation: 'update' | 'set' | 'delete';
    }>
  ): Promise<void> {
    console.log(`🚀 Atomic Multi Update: ${operations.length} operations`);

    await runTransaction(db, async (transaction) => {
      // First, read all documents
      const readPromises = operations
        .filter(op => op.operation !== 'set') // set operations don't need to read first
        .map(async ({ collectionName, documentId }) => {
          const docRef = doc(db, collectionName, documentId);
          const docSnap = await transaction.get(docRef);
          return { docRef, exists: docSnap.exists(), data: docSnap.data() };
        });

      const readResults = await Promise.all(readPromises);

      // Then, perform all writes
      operations.forEach(({ collectionName, documentId, data, operation }, index) => {
        const docRef = doc(db, collectionName, documentId);
        
        switch (operation) {
          case 'update':
            const readResult = readResults.find(result => result.docRef.path === docRef.path);
            if (!readResult?.exists) {
              throw new Error(`Document ${collectionName}/${documentId} does not exist for update`);
            }
            transaction.update(docRef, {
              ...data,
              updatedAt: serverTimestamp()
            });
            break;
          
          case 'set':
            transaction.set(docRef, {
              ...data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            break;
          
          case 'delete':
            transaction.delete(docRef);
            break;
        }
      });
    });

    console.log(`✅ Atomic Multi Update completed successfully`);
  }
}

// 🚀 Performance Monitor - လုပ်ဆောင်မှုကို စောင့်ကြည့်ခြင်း
export class PerformanceMonitor {
  private metrics: Map<string, { startTime: number; endTime?: number; duration?: number }> = new Map();
  private static instance: PerformanceMonitor;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(operation: string): void {
    this.metrics.set(operation, {
      startTime: performance.now()
    });
    console.log(`⏱️ Started: ${operation}`);
  }

  endTimer(operation: string): number {
    const metric = this.metrics.get(operation);
    if (!metric) {
      console.warn(`⚠️ No timer found for operation: ${operation}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    this.metrics.set(operation, {
      ...metric,
      endTime,
      duration
    });

    console.log(`✅ Completed: ${operation} in ${duration.toFixed(2)}ms`);
    return duration;
  }

  getMetric(operation: string): { startTime: number; endTime?: number; duration?: number } | undefined {
    return this.metrics.get(operation);
  }

  getAllMetrics(): { [key: string]: { startTime: number; endTime?: number; duration?: number } } {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  logSummary(): void {
    console.log('📊 Performance Summary:');
    this.metrics.forEach((metric, operation) => {
      if (metric.duration) {
        console.log(`  ${operation}: ${metric.duration.toFixed(2)}ms`);
      }
    });
  }
}

// 🚀 Memory Usage Monitor
export class MemoryMonitor {
  static getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    return null;
  }

  static logMemoryUsage(): void {
    const usage = MemoryMonitor.getMemoryUsage();
    if (usage) {
      console.log(`🧠 Memory: ${(usage.used / 1024 / 1024).toFixed(2)}MB / ${(usage.total / 1024 / 1024).toFixed(2)}MB (${usage.percentage.toFixed(1)}%)`);
    }
  }

  static isMemoryUsageHigh(threshold: number = 80): boolean {
    const usage = MemoryMonitor.getMemoryUsage();
    return usage ? usage.percentage > threshold : false;
  }
}

// Export singleton instances
export const performanceDebouncer = new PerformanceDebouncer();
export const firebaseOptimizer = FirebaseOptimizer.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();

// 🚀 Utility Functions
export const createOptimizedCache = <T>(maxSize?: number, ttl?: number) => {
  return new MemoryOptimizedCache<T>(maxSize, ttl);
};

export const createBatchManager = () => {
  return new BatchOperationManager();
};

// 🚀 React Hook for Performance Monitoring
export const usePerformanceMonitor = (operationName: string, enabled: boolean = true) => {
  const startOperation = () => {
    if (enabled) {
      performanceMonitor.startTimer(operationName);
    }
  };

  const endOperation = () => {
    if (enabled) {
      return performanceMonitor.endTimer(operationName);
    }
    return 0;
  };

  const getMetric = () => {
    return performanceMonitor.getMetric(operationName);
  };

  return { startOperation, endOperation, getMetric };
};

console.log('🚀 Performance Optimizer Library တင်ပြီးပါပြီ - မြန်ဆန်တဲ့ အက်ပ်ကို ရရှိနိုင်ပါပြီ!');