import { VOC, VOCItem } from '../types/voc';
import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, increment } from 'firebase/firestore';

export const createVOCWithErrorHandling = async (vocData: Partial<VOC>): Promise<string> => {
  try {
    // Process items and apply error discounts
    const processedItems = vocData.items?.map(item => {
      if (item.hasError && item.errorQty > 0) {
        // Apply 50% discount for error items
        const discountedPrice = item.originalPrice * 0.5;
        const totalPrice = (item.soldQty * item.originalPrice) + (item.errorQty * discountedPrice);
        
        return {
          ...item,
          unitPrice: discountedPrice,
          totalPrice: totalPrice
        };
      }
      return {
        ...item,
        originalPrice: item.unitPrice,
        totalPrice: item.soldQty * item.unitPrice
      };
    }) || [];

    // Calculate totals
    const originalAmount = processedItems.reduce((sum, item) => 
      sum + (item.soldQty + item.errorQty) * item.originalPrice, 0
    );
    
    const totalAmount = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const errorDiscount = originalAmount - totalAmount;
    const hasErrors = processedItems.some(item => item.hasError);

    const vocToCreate: Partial<VOC> = {
      ...vocData,
      items: processedItems,
      originalAmount,
      totalAmount,
      errorDiscount,
      hasErrors,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create VOC document
    const docRef = await addDoc(collection(db, 'vocs'), vocToCreate);
    
    // Update inventory (reduce sold and error quantities)
    await updateInventoryForVOC(processedItems, 'subtract');
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating VOC:', error);
    throw new Error('Failed to create VOC');
  }
};

const updateInventoryForVOC = async (items: VOCItem[], operation: 'add' | 'subtract') => {
  const multiplier = operation === 'add' ? 1 : -1;
  
  for (const item of items) {
    const totalQty = item.soldQty + item.errorQty;
    if (totalQty > 0) {
      const inventoryRef = doc(db, 'inventory', item.id);
      await updateDoc(inventoryRef, {
        quantity: increment(totalQty * multiplier),
        updatedAt: new Date()
      });
    }
  }
};