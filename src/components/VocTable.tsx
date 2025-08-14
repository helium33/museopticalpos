// import React from 'react';
// import { VOC } from '../types/voc';
// import { Button } from './ui/Button';
// import { RotateCcw, Trash2 } from 'lucide-react';
// import { calculateSoldQuantity, calculateErrorQuantity } from '../lib/InventoryCalculation';

// interface Props {
//   vocs: VOC[];
//   onReturn: (id: string) => void;
//   onDelete: (id: string) => void;
// }

// type ItemTypeGroup = 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens'

// const itemTypes: ItemTypeGroup[] = ['Lens', 'Frame', 'Accessories', 'Contact Lens']

// const VocTable: React.FC<Props> = ({ vocs, onReturn, onDelete }) => {
//   // Helper function to display quantity with proper decimal formatting
//   const displayQuantity = (qty: number): string => {
//     if (qty === 0) return '0';
//     // Show decimal if it's not a whole number
//     return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
//   };

//   // Test function to verify 0.5 quantities display correctly
//   React.useEffect(() => {
//     console.log('Testing quantity display:');
//     console.log('0.5 displays as:', displayQuantity(0.5));
//     console.log('1 displays as:', displayQuantity(1));
//     console.log('1.5 displays as:', displayQuantity(1.5));
//     console.log('0 displays as:', displayQuantity(0));
//   }, []);

//   function sumQtyByType(items: VOC['items'], type: ItemTypeGroup) {
//     return items.reduce(
//       (acc, item) => {
//         if (item.itemType === type || item.type === type) {
//           acc.soldQty += calculateSoldQuantity(item);
//           acc.errorQty += calculateErrorQuantity(item);
//         }
//         return acc
//       },
//       { soldQty: 0, errorQty: 0 }
//     )
//   }

//   return (
//     <table className="min-w-full border border-gray-300 dark:border-gray-700">
//       <thead className="bg-gray-100 dark:bg-gray-800">
//         <tr>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">VOC#</th>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">Customer</th>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">Lens (Sold / Error)</th>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">Frame (Sold / Error)</th>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">Accessories (Sold / Error)</th>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">Contact Lens (Sold / Error)</th>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">Amount</th>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">Status</th>
//           <th className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 text-left">Actions</th>
//         </tr>
//       </thead>
//       <tbody>
//         {vocs.map(v => {
//           const lensQty = sumQtyByType(v.items, 'Lens')
//           const frameQty = sumQtyByType(v.items, 'Frame')
//           const accQty = sumQtyByType(v.items, 'Accessories')
//           const contactLensQty = sumQtyByType(v.items, 'Contact Lens')
//           const hasErrors = v.items.some(item => calculateErrorQuantity(item) > 0);

//           return (
//             <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
//                 {v.vocNumber}
//                 {hasErrors && (
//                   <span className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded">
//                     Error
//                   </span>
//                 )}
//               </td>
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
//                 <div className="font-medium">{v.customerName}</div>
//                 <div className="text-sm text-gray-600 dark:text-gray-400">{v.customerPhone}</div>
//               </td>
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
//                 <div className="space-y-1">
//                   <div className="text-green-600 dark:text-green-400 font-medium text-sm">
//                     Sold: {displayQuantity(lensQty.soldQty)} pairs
//                   </div>
//                   <div className="text-red-600 dark:text-red-400 font-medium text-sm">
//                     Error: {displayQuantity(lensQty.errorQty)} pairs
//                   </div>
//                 </div>
//               </td>
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
//                 <div className="space-y-1">
//                   <div className="text-green-600 dark:text-green-400 font-medium text-sm">
//                     Sold: {displayQuantity(frameQty.soldQty)} pcs
//                   </div>
//                   <div className="text-red-600 dark:text-red-400 font-medium text-sm">
//                     Error: {displayQuantity(frameQty.errorQty)} pcs
//                   </div>
//                 </div>
//               </td>
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
//                 <div className="space-y-1">
//                   <div className="text-green-600 dark:text-green-400 font-medium text-sm">
//                     Sold: {displayQuantity(accQty.soldQty)} pcs
//                   </div>
//                   <div className="text-red-600 dark:text-red-400 font-medium text-sm">
//                     Error: {displayQuantity(accQty.errorQty)} pcs
//                   </div>
//                 </div>
//               </td>
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
//                 <div className="space-y-1">
//                   <div className="text-green-600 dark:text-green-400 font-medium text-sm">
//                     Sold: {displayQuantity(contactLensQty.soldQty)} pcs
//                   </div>
//                   <div className="text-red-600 dark:text-red-400 font-medium text-sm">
//                     Error: {displayQuantity(contactLensQty.errorQty)} pcs
//                   </div>
//                 </div>
//               </td>
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
//                 <div className="font-medium">{v.totalAmount.toLocaleString()} MMK</div>
//                 {hasErrors && v.originalAmount && v.originalAmount > v.totalAmount && (
//                   <div className="text-xs text-gray-500 dark:text-gray-400">
//                     Orig: {v.originalAmount.toLocaleString()} MMK<br />
//                     Error Discount: -{(v.originalAmount - v.totalAmount).toLocaleString()} MMK
//                   </div>
//                 )}
//               </td>
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 capitalize">
//                 {v.status}
//               </td>
//               <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700 space-x-2">
//                 {v.status === 'active' && (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() => onReturn(v.id!)}
//                     leftIcon={<RotateCcw size={14} />}
//                   >
//                     Return to Inv
//                   </Button>
//                 )}
//                 <Button
//                   variant="danger"
//                   size="sm"
//                   onClick={() => onDelete(v.id!)}
//                   leftIcon={<Trash2 size={14} />}
//                 >
//                   Delete
//                 </Button>
//               </td>
//             </tr>
//           )
//         })}
//       </tbody>
//     </table>
//   )
// };

// export { VocTable };
// export default VocTable;