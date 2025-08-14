// Yangon Office Firebase Service
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  DocumentData,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadCompressedImage } from '../lib/firebase';
import toast from 'react-hot-toast';

// Yangon Office Types
export interface YangonFrame {
  id: string;
  store: 'yangon' | 'yangon-office';
  name: string;
  code: string;
  category: 'Eyeglasses' | 'Sunglasses' | 'Ready' | 'Ready BB' | 'Error';
  frameType: string;
  material: string;
  brand: string;
  qty: number;
  soldQty: number;
  transferInQty: number;
  transferOutQty: number;
  originalQty: number;
  totalQty: number;
  price: number;
  cost?: number;
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface YangonAccessory {
  id: string;
  store: 'yangon' | 'yangon-office';
  name: string;
  code: string;
  category: string;
  accessoryType: string;
  brand: string;
  qty: number;
  soldQty: number;
  transferInQty: number;
  transferOutQty: number;
  originalQty: number;
  totalQty: number;
  price: number;
  cost?: number;
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface YangonContactLens {
  id: string;
  store: 'yangon' | 'yangon-office';
  name: string;
  code: string;
  brand: string;
  type: string;
  power: string;
  qty: number;
  soldQty: number;
  transferInQty: number;
  transferOutQty: number;
  originalQty: number;
  totalQty: number;
  price: number;
  cost?: number;
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface YangonLens {
  id: string;
  store: 'yangon' | 'yangon-office';
  name: string;
  code: string;
  lensType: string;
  brand: string;
  power: string;
  qty: number;
  soldQty: number;
  transferInQty: number;
  transferOutQty: number;
  originalQty: number;
  totalQty: number;
  price: number;
  cost?: number;
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Generic CRUD operations for any Yangon collection
class YangonFirebaseService<T extends { id: string; store: 'yangon' | 'yangon-office' }> {
  constructor(private collectionName: string) {}

  // Get all items for specific store
  async getItems(
    store: 'yangon' | 'yangon-office',
    filters?: {
      category?: string;
      isActive?: boolean;
      search?: string;
    }
  ): Promise<T[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('store', '==', store),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as T[];

      // Apply client-side filters
      if (filters) {
        if (filters.category) {
          items = items.filter(item => 
            'category' in item && item.category === filters.category
          );
        }
        if (typeof filters.isActive === 'boolean') {
          items = items.filter(item => 
            'isActive' in item && item.isActive === filters.isActive
          );
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          items = items.filter(item => 
            ('name' in item && item.name.toLowerCase().includes(searchLower)) ||
            ('code' in item && item.code.toLowerCase().includes(searchLower)) ||
            ('brand' in item && item.brand?.toLowerCase().includes(searchLower))
          );
        }
      }

      return items;
    } catch (error) {
      console.error(`Error fetching ${this.collectionName}:`, error);
      throw new Error(`Failed to fetch ${this.collectionName}`);
    }
  }

  // Get single item by ID
  async getItem(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as T;
    } catch (error) {
      console.error(`Error fetching ${this.collectionName} item:`, error);
      throw new Error(`Failed to fetch ${this.collectionName} item`);
    }
  }

  // Add new item
  async addItem(
    store: 'yangon' | 'yangon-office',
    itemData: Omit<T, 'id' | 'store' | 'createdAt' | 'updatedAt'>,
    userEmail: string,
    image?: File
  ): Promise<string> {
    try {
      let imageUrl = '';
      if (image) {
        try {
          imageUrl = await uploadCompressedImage(image, `${this.collectionName}/${store}/${Date.now()}`);
        } catch (imageError) {
          console.warn('Image upload failed, continuing without image:', imageError);
        }
      }

      const newItem = {
        ...itemData,
        store,
        image: imageUrl,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userEmail
      };

      const docRef = await addDoc(collection(db, this.collectionName), newItem);
      
      console.log(`✅ ${this.collectionName} item added successfully:`, docRef.id);
      toast.success(`${this.collectionName} item added successfully`);
      
      return docRef.id;
    } catch (error) {
      console.error(`Error adding ${this.collectionName}:`, error);
      toast.error(`Failed to add ${this.collectionName} item`);
      throw error;
    }
  }

  // Update item
  async updateItem(
    id: string,
    updates: Partial<T>,
    userEmail: string,
    image?: File
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      
      // Check if document exists
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`${this.collectionName} item not found`);
      }

      let imageUrl = updates.image;
      if (image) {
        try {
          const existingData = docSnap.data();
          imageUrl = await uploadCompressedImage(
            image, 
            `${this.collectionName}/${existingData.store}/${Date.now()}`
          );
        } catch (imageError) {
          console.warn('Image upload failed, keeping existing image:', imageError);
        }
      }

      const updateData = {
        ...updates,
        image: imageUrl,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail
      };

      await updateDoc(docRef, updateData);
      
      console.log(`✅ ${this.collectionName} item updated successfully:`, id);
      toast.success(`${this.collectionName} item updated successfully`);
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      toast.error(`Failed to update ${this.collectionName} item`);
      throw error;
    }
  }

  // Delete item (soft delete - mark as inactive)
  async deleteItem(id: string, userEmail: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      
      await updateDoc(docRef, {
        isActive: false,
        deletedAt: serverTimestamp(),
        deletedBy: userEmail,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ ${this.collectionName} item deleted successfully:`, id);
      toast.success(`${this.collectionName} item deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      toast.error(`Failed to delete ${this.collectionName} item`);
      throw error;
    }
  }

  // Hard delete item (permanent removal)
  async hardDeleteItem(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      
      console.log(`✅ ${this.collectionName} item permanently deleted:`, id);
      toast.success(`${this.collectionName} item permanently deleted`);
    } catch (error) {
      console.error(`Error permanently deleting ${this.collectionName}:`, error);
      toast.error(`Failed to permanently delete ${this.collectionName} item`);
      throw error;
    }
  }

  // Update quantities (for sales, transfers, etc.)
  async updateQuantities(
    id: string,
    quantityUpdates: {
      soldQty?: number;
      transferInQty?: number;
      transferOutQty?: number;
      qty?: number;
    },
    userEmail: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`${this.collectionName} item not found`);
      }

      const currentData = docSnap.data();
      const updates: any = {
        ...quantityUpdates,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail
      };

      // Recalculate totalQty if needed
      if (quantityUpdates.qty !== undefined || 
          quantityUpdates.transferInQty !== undefined || 
          quantityUpdates.transferOutQty !== undefined) {
        const newQty = quantityUpdates.qty ?? currentData.qty ?? 0;
        const newTransferIn = quantityUpdates.transferInQty ?? currentData.transferInQty ?? 0;
        const newTransferOut = quantityUpdates.transferOutQty ?? currentData.transferOutQty ?? 0;
        const newSoldQty = quantityUpdates.soldQty ?? currentData.soldQty ?? 0;
        
        updates.totalQty = newQty + newTransferIn - newTransferOut - newSoldQty;
      }

      await updateDoc(docRef, updates);
      
      console.log(`✅ ${this.collectionName} quantities updated:`, id);
      toast.success('Quantities updated successfully');
    } catch (error) {
      console.error(`Error updating ${this.collectionName} quantities:`, error);
      toast.error('Failed to update quantities');
      throw error;
    }
  }

  // Batch operations
  async batchUpdate(updates: Array<{ id: string; data: Partial<T> }>, userEmail: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      updates.forEach(({ id, data }) => {
        const docRef = doc(db, this.collectionName, id);
        batch.update(docRef, {
          ...data,
          updatedAt: serverTimestamp(),
          updatedBy: userEmail
        });
      });
      
      await batch.commit();
      
      console.log(`✅ Batch update completed for ${updates.length} ${this.collectionName} items`);
      toast.success(`${updates.length} items updated successfully`);
    } catch (error) {
      console.error(`Error in batch update for ${this.collectionName}:`, error);
      toast.error('Failed to update items');
      throw error;
    }
  }
}

// Create service instances
export const yangonFramesService = new YangonFirebaseService<YangonFrame>('frames');
export const yangonAccessoriesService = new YangonFirebaseService<YangonAccessory>('accessories');
export const yangonContactLensesService = new YangonFirebaseService<YangonContactLens>('contactLenses');
export const yangonLensesService = new YangonFirebaseService<YangonLens>('lenses');

// Utility functions
export const yangonFirebaseUtils = {
  // Get all items across all collections for a specific store
  async getAllItems(store: 'yangon' | 'yangon-office') {
    try {
      const [frames, accessories, contactLenses, lenses] = await Promise.all([
        yangonFramesService.getItems(store),
        yangonAccessoriesService.getItems(store),
        yangonContactLensesService.getItems(store),
        yangonLensesService.getItems(store)
      ]);

      return {
        frames,
        accessories,
        contactLenses,
        lenses,
        total: frames.length + accessories.length + contactLenses.length + lenses.length
      };
    } catch (error) {
      console.error('Error fetching all items:', error);
      throw error;
    }
  },

  // Get inventory summary
  async getInventorySummary(store: 'yangon' | 'yangon-office') {
    try {
      const allItems = await this.getAllItems(store);
      
      const summary = {
        totalItems: allItems.total,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        categories: {
          frames: { count: allItems.frames.length, value: 0 },
          accessories: { count: allItems.accessories.length, value: 0 },
          contactLenses: { count: allItems.contactLenses.length, value: 0 },
          lenses: { count: allItems.lenses.length, value: 0 }
        }
      };

      // Calculate values and stock status
      [...allItems.frames, ...allItems.accessories, ...allItems.contactLenses, ...allItems.lenses]
        .forEach(item => {
          const itemValue = (item.totalQty || 0) * (item.price || 0);
          summary.totalValue += itemValue;
          
          if ((item.totalQty || 0) === 0) summary.outOfStockItems++;
          else if ((item.totalQty || 0) < 5) summary.lowStockItems++;
        });

      // Category values
      allItems.frames.forEach(item => {
        summary.categories.frames.value += (item.totalQty || 0) * (item.price || 0);
      });
      allItems.accessories.forEach(item => {
        summary.categories.accessories.value += (item.totalQty || 0) * (item.price || 0);
      });
      allItems.contactLenses.forEach(item => {
        summary.categories.contactLenses.value += (item.totalQty || 0) * (item.price || 0);
      });
      allItems.lenses.forEach(item => {
        summary.categories.lenses.value += (item.totalQty || 0) * (item.price || 0);
      });

      return summary;
    } catch (error) {
      console.error('Error calculating inventory summary:', error);
      throw error;
    }
  }
};

export default {
  frames: yangonFramesService,
  accessories: yangonAccessoriesService,
  contactLenses: yangonContactLensesService,
  lenses: yangonLensesService,
  utils: yangonFirebaseUtils
};