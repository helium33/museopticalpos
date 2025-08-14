import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { Voc, VocItem } from '../../type/Voc'
import { calculateSoldQuantity, calculateErrorQuantity } from './InventoryCalculation'

/**
 * Creates a new VOC in Firestore with 50% discount on errorQty,
 * decrements inventory by soldQty+errorQty.
 */
export async function createVOC(voc: Omit<VOC, 'id' | 'originalAmount' | 'totalAmount' | 'errorDiscount' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
  // 1) Process items
  let originalAmount = 0
  let totalAmount = 0

  const processedItems: VocItem[] = voc.items.map(item => {
    // Calculate sold and error quantities using the calculation functions
    const soldQty = calculateSoldQuantity(item);
    const errorQty = calculateErrorQuantity(item);
    const originalUnitPrice = item.price;
    
    const discountedUnit = originalUnitPrice * 0.5
    const itemTotalOriginal = (soldQty + errorQty) * originalUnitPrice
    const itemTotalFinal = soldQty * originalUnitPrice + errorQty * discountedUnit

    originalAmount += itemTotalOriginal
    totalAmount += itemTotalFinal

    return {
      ...item,
      soldQty: soldQty, // Explicitly preserve sold quantity
      errorQty: errorQty, // Explicitly preserve error quantity
      price: errorQty > 0 ? discountedUnit : originalUnitPrice,
      customTotal: itemTotalFinal,
    }
  })

  const errorDiscount = originalAmount - totalAmount

  const newVOC: VOC = {
    ...voc,
    items: processedItems,
    originalAmount,
    totalAmount,
    errorDiscount,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // 2) Persist
  const ref = await addDoc(collection(db, 'vocs'), newVOC)

  // 3) Decrement inventory
  await Promise.all(
    processedItems.map(item => {
      const soldQty = calculateSoldQuantity(item);
      const errorQty = calculateErrorQuantity(item);
      const qtyToSub = soldQty + errorQty;
      if (qtyToSub <= 0) return Promise.resolve()
      const invRef = doc(db, 'inventory', item.id || '')
      return updateDoc(invRef, { quantity: increment(-qtyToSub), updatedAt: new Date() })
    })
  )

  return ref.id
}

/**
 * Returns a VOC's items back to inventory (sold+error), and marks VOC returned.
 */
export async function returnVOCToInventory(vocId: string): Promise<void> {
  const vocRef = doc(db, 'vocs', vocId)
  const snap = await getDoc(vocRef)
  if (!snap.exists()) throw new Error('VOC not found')

  const voc = snap.data() as VOC
  if (voc.status !== 'active') return // ပြန်ထည့်ပြီးသား VOC မလုပ်ဆောင်

  // Enhanced inventory quantity return - handle both sold and error quantities
  await Promise.all(
    voc.items.map(async (item) => {
      // Calculate sold and error quantities using the calculation functions
      const soldQty = calculateSoldQuantity(item);
      const errorQty = calculateErrorQuantity(item);
      const totalQtyToAdd = soldQty + errorQty;
      
      if (totalQtyToAdd <= 0) return Promise.resolve();
      
      const invRef = doc(db, 'inventory', item.id);
      
      // Return both sold and error quantities to inventory
      await updateDoc(invRef, { 
        quantity: increment(totalQtyToAdd), 
        updatedAt: new Date() 
      });
      
      console.log(`Returned to inventory - Item: ${item.description || item.name || item.id}, Sold: ${soldQty}, Error: ${errorQty}, Total: ${totalQtyToAdd}`);
    })
  )

  // VOC status ကို returned ပြောင်းခြင်း
  await updateDoc(vocRef, { status: 'returned', updatedAt: new Date() })
  
  console.log(`VOC ${voc.vocNumber} returned to inventory successfully`);
}