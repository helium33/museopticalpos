// import React from 'react';
// import { AlertTriangle, X } from 'lucide-react';
// import { ERROR_CATEGORIES, ErrorCategory } from '../../type/Vocerror';

// interface ErrorCategorySelectorProps {
//   itemType: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
//   selectedCategory?: string;
//   errorQuantity?: number;
//   errorDescription?: string;
//   onCategoryChange: (category: string) => void;
//   onQuantityChange: (quantity: number) => void;
//   onDescriptionChange: (description: string) => void;
//   onRemoveError: () => void;
//   maxQuantity: number;
// }

// export const ErrorCategorySelector: React.FC<ErrorCategorySelectorProps> = ({
//   itemType,
//   selectedCategory,import React from 'react';
// import { AlertTriangle, X } from 'lucide-react';
// import { ERROR_CATEGORIES, ErrorCategory } from '../../type/Vocerror';

// interface ErrorCategorySelectorProps {
//   itemType: 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
//   selectedCategory?: string;
//   errorQuantity?: number;
//   errorDescription?: string;
//   onCategoryChange: (category: string) => void;
//   onQuantityChange: (quantity: number) => void;
//   onDescriptionChange: (description: string) => void;
//   onRemoveError: () => void;
//   maxQuantity: number;
// }

// export const ErrorCategorySelector: React.FC<ErrorCategorySelectorProps> = ({
//   itemType,
//   selectedCategory,
//   errorQuantity = 0,
//   errorDescription = '',
//   onCategoryChange,
//   onQuantityChange,
//   onDescriptionChange,
//   onRemoveError,
//   maxQuantity
// }) => {
//   const categories = ERROR_CATEGORIES[itemType] || [];

//   return (
//     <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-3">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <AlertTriangle className="text-red-600" size={20} />
//           <h4 className="font-semibold text-red-800">Error Details</h4>
//         </div>
//         <button
//           onClick={onRemoveError}
//           className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"
//           title="Remove Error"
//         >
//           <X size={16} />
//         </button>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//         {/* Error Category */}
//         <div>
//           <label className="block text-sm font-medium text-red-700 mb-1">
//             Error Category *
//           </label>
//           <select
//             value={selectedCategory || ''}
//             onChange={(e) => onCategoryChange(e.target.value)}
//             className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
//             required
//           >
//             <option value="">Select Error Category</option>
//             {categories.map((category) => (
//               <option key={category} value={category}>
//                 {category}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Error Quantity */}
//         <div>
//           <label className="block text-sm font-medium text-red-700 mb-1">
//             Error Quantity *
//           </label>
//           <input
//             type="number"
//             min="1"
//             max={maxQuantity}
//             value={errorQuantity}
//             onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
//             className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//             placeholder="Enter error quantity"
//             required
//           />
//           <p className="text-xs text-red-600 mt-1">
//             Max: {maxQuantity} {itemType === 'Lens' ? 'pairs' : 'items'}
//           </p>
//         </div>
//       </div>

//       {/* Error Description */}
//       <div>
//         <label className="block text-sm font-medium text-red-700 mb-1">
//           Error Description (Optional)
//         </label>
//         <textarea
//           value={errorDescription}
//           onChange={(e) => onDescriptionChange(e.target.value)}
//           className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//           rows={2}
//           placeholder="Describe the error in detail..."
//         />
//       </div>

//       {/* Myanmar Translation for Common Categories */}
//       {selectedCategory && (
//         <div className="bg-red-100 p-2 rounded border border-red-300">
//           <p className="text-xs text-red-700">
//             <span className="font-semibold">Myanmar:</span> {getMyanmarTranslation(selectedCategory)}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// };

// // Helper function to get Myanmar translations
// function getMyanmarTranslation(category: string): string {
//   const translations: Record<string, string> = {
//     'Form Error': 'ဖောင်အမှား',
//     'KKT Error': 'KKT အမှား',
//     'KCMA Error': 'KCMA အမှား', 
//     'KMMT Error': 'KMMT အမှား',
//     'Eye Test Error': 'မျက်စိစစ်ဆေးမှုအမှား',
//     'Fitting Error': 'တပ်ဆင်မှုအမှား',
//     'Factory Error': 'စက်ရုံအမှား',
//     'မှန်မှားထုတ် (Wrong Lens Production)': 'မှန်မှားထုတ်',
//     'Prescription Error': 'ဆေးညွှန်းအမှား',
//     'Power Mismatch': 'ပါဝါမကိုက်ညီမှု',
//     'Coating Defect': 'အပေါ်ယံလွှာအမှား',
//     'Scratch/Damage': 'ကုတ်ရာ/ပျက်စီးမှု',
//     'Size Issue': 'အရွယ်အစားပြဿနာ',
//     'Color Mismatch': 'အရောင်မကိုက်ညီမှု',
//     'Damage/Defect': 'ပျက်စီးမှု/ချို့ယွင်းမှု',
//     'Wrong Model': 'မော်ဒယ်မှား',
//     'Fitting Issue': 'တပ်ဆင်မှုပြဿနာ',
//     'Customer Change Mind': 'ဖောက်သည်စိတ်ပြောင်းမှု',
//     'Other': 'အခြား'
//   };
  
//   return translations[category] || category;
// }

// export default ErrorCategorySelector;
//   errorQuantity = 0,
//   errorDescription = '',
//   onCategoryChange,
//   onQuantityChange,
//   onDescriptionChange,
//   onRemoveError,
//   maxQuantity
// }) => {
//   const categories = ERROR_CATEGORIES[itemType] || [];

//   return (
//     <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-3">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <AlertTriangle className="text-red-600" size={20} />
//           <h4 className="font-semibold text-red-800">Error Details</h4>
//         </div>
//         <button
//           onClick={onRemoveError}
//           className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"
//           title="Remove Error"
//         >
//           <X size={16} />
//         </button>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//         {/* Error Category */}
//         <div>
//           <label className="block text-sm font-medium text-red-700 mb-1">
//             Error Category *
//           </label>
//           <select
//             value={selectedCategory || ''}
//             onChange={(e) => onCategoryChange(e.target.value)}
//             className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
//             required
//           >
//             <option value="">Select Error Category</option>
//             {categories.map((category) => (
//               <option key={category} value={category}>
//                 {category}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Error Quantity */}
//         <div>
//           <label className="block text-sm font-medium text-red-700 mb-1">
//             Error Quantity *
//           </label>
//           <input
//             type="number"
//             min="1"
//             max={maxQuantity}
//             value={errorQuantity}
//             onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
//             className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//             placeholder="Enter error quantity"
//             required
//           />
//           <p className="text-xs text-red-600 mt-1">
//             Max: {maxQuantity} {itemType === 'Lens' ? 'pairs' : 'items'}
//           </p>
//         </div>
//       </div>

//       {/* Error Description */}
//       <div>
//         <label className="block text-sm font-medium text-red-700 mb-1">
//           Error Description (Optional)
//         </label>
//         <textarea
//           value={errorDescription}
//           onChange={(e) => onDescriptionChange(e.target.value)}
//           className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
//           rows={2}
//           placeholder="Describe the error in detail..."
//         />
//       </div>

//       {/* Myanmar Translation for Common Categories */}
//       {selectedCategory && (
//         <div className="bg-red-100 p-2 rounded border border-red-300">
//           <p className="text-xs text-red-700">
//             <span className="font-semibold">Myanmar:</span> {getMyanmarTranslation(selectedCategory)}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// };

// // Helper function to get Myanmar translations
// function getMyanmarTranslation(category: string): string {
//   const translations: Record<string, string> = {
//     'Form Error': 'ဖောင်အမှား',
//     'KKT Error': 'KKT အမှား',
//     'KCMA Error': 'KCMA အမှား', 
//     'KMMT Error': 'KMMT အမှား',
//     'Eye Test Error': 'မျက်စိစစ်ဆေးမှုအမှား',
//     'Fitting Error': 'တပ်ဆင်မှုအမှား',
//     'Factory Error': 'စက်ရုံအမှား',
//     'မှန်မှားထုတ် (Wrong Lens Production)': 'မှန်မှားထုတ်',
//     'Prescription Error': 'ဆေးညွှန်းအမှား',
//     'Power Mismatch': 'ပါဝါမကိုက်ညီမှု',
//     'Coating Defect': 'အပေါ်ယံလွှာအမှား',
//     'Scratch/Damage': 'ကုတ်ရာ/ပျက်စီးမှု',
//     'Size Issue': 'အရွယ်အစားပြဿနာ',
//     'Color Mismatch': 'အရောင်မကိုက်ညီမှု',
//     'Damage/Defect': 'ပျက်စီးမှု/ချို့ယွင်းမှု',
//     'Wrong Model': 'မော်ဒယ်မှား',
//     'Fitting Issue': 'တပ်ဆင်မှုပြဿနာ',
//     'Customer Change Mind': 'ဖောက်သည်စိတ်ပြောင်းမှု',
//     'Other': 'အခြား'
//   };
  
//   return translations[category] || category;
// }

// export default ErrorCategorySelector;