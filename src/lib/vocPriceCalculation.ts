export interface VocItemWithError {
  id?: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
  errorQuantity?: number;
  isFOC?: boolean;
  originalPrice?: number;
  discountedTotal?: number;
}

export const calculateItemPriceWithError = (item: VocItemWithError): VocItemWithError => {
  // Skip calculation for FOC items or items without errors
  if (item.isFOC || !item.errorQuantity || item.errorQuantity === 0) {
    return {
      ...item,
      originalPrice: item.price,
      discountedTotal: item.price * item.quantity
    };
  }

  const errorQty = item.errorQuantity;
  const soldQty = item.quantity - errorQty;
  
  // Calculate price breakdown
  const soldItemsPrice = soldQty * item.price; // 100% price for sold items
  const errorItemsPrice = errorQty * item.price * 0.5; // 50% price for error items
  const totalDiscountedPrice = soldItemsPrice + errorItemsPrice;
  
  console.log(`Price calculation for ${item.name}:`);
  console.log(`- Sold: ${soldQty} × ${item.price} = ${soldItemsPrice}`);
  console.log(`- Error: ${errorQty} × ${item.price} × 0.5 = ${errorItemsPrice}`);
  console.log(`- Total: ${totalDiscountedPrice}`);
  
  return {
    ...item,
    originalPrice: item.price,
    discountedTotal: totalDiscountedPrice
  };
};

export const calculateVocTotalWithErrors = (items: VocItemWithError[]): number => {
  return items.reduce((total, item) => {
    const calculatedItem = calculateItemPriceWithError(item);
    return total + (calculatedItem.discountedTotal || 0);
  }, 0);
};
