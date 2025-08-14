import { 
  collection, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  doc, 
  serverTimestamp,
  DocumentData,
  QuerySnapshot,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LensType } from '../lib/utils';

export interface BulkUpdateOptions {
  category?: string;
  type?: LensType;
  store?: string;
  updateType: 'set' | 'add' | 'multiply';
  newQuantity: number;
  updateOriginalQty: boolean;
  updateCurrentQty: boolean;
  dryRun?: boolean; // For testing without actually updating
}

export interface BulkUpdateResult {
  success: boolean;
  totalFound: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
  processedBatches: number;
  estimatedTime: number;
}

export interface LensUpdatePreview {
  id: string;
  code: string;
  currentQty: number;
  newQty: number;
  currentOriginalQty: number;
  newOriginalQty: number;
  category: string;
  type: string;
  store: string;
  price: number;
}

// Constants for performance optimization
const BATCH_SIZE = 450; // Firestore limit is 500, use 450 for safety
const QUERY_LIMIT = 1000; // Process in chunks to avoid memory issues

/**
 * Preview lenses that will be affected by bulk update
 */
export async function previewBulkUpdate(options: BulkUpdateOptions): Promise<LensUpdatePreview[]> {
  console.log('🔍 Starting bulk update preview with options:', options);
  
  try {
    // Build query constraints
    const queryConstraints = buildQueryConstraints(options);
    
    // Get all matching lenses
    const q = query(collection(db, 'lenses'), ...queryConstraints);
    const snapshot = await getDocs(q);
    
    const previews: LensUpdatePreview[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const currentQty = data.qty || 0;
      const currentOriginalQty = data.originalQty || 0;
      
      const newQty = calculateNewQuantity(currentQty, options.updateType, options.newQuantity);
      const newOriginalQty = calculateNewQuantity(currentOriginalQty, options.updateType, options.newQuantity);
      
      previews.push({
        id: doc.id,
        code: data.code || 'Unknown',
        currentQty,
        newQty,
        currentOriginalQty,
        newOriginalQty,
        category: data.category || '',
        type: data.type || '',
        store: data.store || '',
        price: data.price || 0
      });
    });
    
    console.log(`📊 Preview complete: ${previews.length} lenses found`);
    return previews;
    
  } catch (error) {
    console.error('❌ Error during bulk update preview:', error);
    throw error;
  }
}

/**
 * Perform bulk update operation with proper batching and error handling
 */
export async function performBulkUpdate(
  options: BulkUpdateOptions,
  onProgress?: (current: number, total: number) => void
): Promise<BulkUpdateResult> {
  const startTime = Date.now();
  
  console.log('🚀 Starting bulk update operation:', options);
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN MODE - No actual updates will be performed');
  }
  
  const result: BulkUpdateResult = {
    success: false,
    totalFound: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: [],
    processedBatches: 0,
    estimatedTime: 0
  };
  
  try {
    // Get all matching documents in chunks to avoid memory issues
    const allDocs = await getAllMatchingDocuments(options);
    result.totalFound = allDocs.length;
    
    if (allDocs.length === 0) {
      console.log('⚠️ No lenses found matching criteria');
      result.success = true;
      return result;
    }
    
    console.log(`📦 Processing ${allDocs.length} lenses in batches of ${BATCH_SIZE}`);
    
    // Process in batches
    let currentIndex = 0;
    while (currentIndex < allDocs.length) {
      const batchDocs = allDocs.slice(currentIndex, currentIndex + BATCH_SIZE);
      
      if (options.dryRun) {
        // Simulate processing for dry run
        console.log(`🧪 DRY RUN: Would process batch ${Math.floor(currentIndex/BATCH_SIZE) + 1} with ${batchDocs.length} documents`);
        result.updatedCount += batchDocs.length;
      } else {
        // Perform actual batch update
        const batchResult = await processBatch(batchDocs, options);
        result.updatedCount += batchResult.updatedCount;
        result.skippedCount += batchResult.skippedCount;
        result.errors.push(...batchResult.errors);
      }
      
      result.processedBatches++;
      currentIndex += BATCH_SIZE;
      
      // Update progress
      if (onProgress) {
        onProgress(Math.min(currentIndex, allDocs.length), allDocs.length);
      }
      
      console.log(`⏳ Processed batch ${result.processedBatches}: ${Math.min(currentIndex, allDocs.length)}/${allDocs.length} lenses`);
    }
    
    result.success = result.errors.length === 0;
    result.estimatedTime = Date.now() - startTime;
    
    console.log('✅ Bulk update completed:', {
      totalFound: result.totalFound,
      updated: result.updatedCount,
      skipped: result.skippedCount,
      errors: result.errors.length,
      timeMs: result.estimatedTime,
      dryRun: options.dryRun || false
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Bulk update failed:', error);
    result.errors.push(`Fatal error: ${error}`);
    result.estimatedTime = Date.now() - startTime;
    return result;
  }
}

/**
 * Get all matching documents in chunks to avoid memory issues
 */
async function getAllMatchingDocuments(options: BulkUpdateOptions): Promise<DocumentData[]> {
  const allDocs: DocumentData[] = [];
  let lastDoc: DocumentData | null = null;
  
  while (true) {
    const queryConstraints = buildQueryConstraints(options);
    queryConstraints.push(limit(QUERY_LIMIT));
    
    if (lastDoc) {
      queryConstraints.push(startAfter(lastDoc));
    }
    
    const q = query(collection(db, 'lenses'), ...queryConstraints);
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      break;
    }
    
    snapshot.forEach((doc) => {
      allDocs.push({ id: doc.id, ...doc.data() });
    });
    
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    // If we got less than the limit, we're done
    if (snapshot.size < QUERY_LIMIT) {
      break;
    }
  }
  
  return allDocs;
}

/**
 * Process a single batch of documents
 */
async function processBatch(
  batchDocs: DocumentData[], 
  options: BulkUpdateOptions
): Promise<{ updatedCount: number; skippedCount: number; errors: string[] }> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let updatedCount = 0;
  let skippedCount = 0;
  
  batchDocs.forEach((docData) => {
    try {
      const lensRef = doc(db, 'lenses', docData.id);
      
      const updateData: any = {
        updatedAt: serverTimestamp(),
        lastBulkUpdate: serverTimestamp(),
        bulkUpdateReason: `${options.updateType} ${options.newQuantity} for category ${options.category}`,
        bulkUpdateOptions: JSON.stringify(options)
      };
      
      // Update current quantity if requested
      if (options.updateCurrentQty) {
        const currentQty = docData.qty || 0;
        const newQty = calculateNewQuantity(currentQty, options.updateType, options.newQuantity);
        updateData.qty = Math.max(0, newQty); // Don't allow negative quantities
      }
      
      // Update original quantity if requested
      if (options.updateOriginalQty) {
        const currentOriginalQty = docData.originalQty || 0;
        const newOriginalQty = calculateNewQuantity(currentOriginalQty, options.updateType, options.newQuantity);
        updateData.originalQty = Math.max(0, newOriginalQty); // Don't allow negative quantities
      }
      
      batch.update(lensRef, updateData);
      updatedCount++;
      
    } catch (error) {
      errors.push(`Failed to prepare update for lens ${docData.code}: ${error}`);
      skippedCount++;
    }
  });
  
  // Commit the batch
  if (updatedCount > 0) {
    await batch.commit();
  }
  
  return { updatedCount, skippedCount, errors };
}

/**
 * Build query constraints based on options
 */
function buildQueryConstraints(options: BulkUpdateOptions) {
  const constraints = [];
  
  if (options.category) {
    constraints.push(where('category', '==', options.category));
  }
  
  if (options.type) {
    constraints.push(where('type', '==', options.type));
  }
  
  if (options.store && options.store !== 'both') {
    constraints.push(where('store', '==', options.store));
  }
  
  return constraints;
}

/**
 * Calculate new quantity based on update type
 */
function calculateNewQuantity(currentQty: number, updateType: string, newQuantity: number): number {
  switch (updateType) {
    case 'set':
      return newQuantity;
    case 'add':
      return currentQty + newQuantity;
    case 'multiply':
      return Math.round(currentQty * newQuantity * 2) / 2; // Round to 0.5 increments
    default:
      return currentQty;
  }
}

/**
 * Estimate processing time based on number of documents
 */
export function estimateProcessingTime(totalDocs: number): string {
  const docsPerSecond = 50; // Conservative estimate
  const estimatedSeconds = Math.ceil(totalDocs / docsPerSecond);
  
  if (estimatedSeconds < 60) {
    return `~${estimatedSeconds} seconds`;
  } else if (estimatedSeconds < 3600) {
    return `~${Math.ceil(estimatedSeconds / 60)} minutes`;
  } else {
    return `~${Math.ceil(estimatedSeconds / 3600)} hours`;
  }
}