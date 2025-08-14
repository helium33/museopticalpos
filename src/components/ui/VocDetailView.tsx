import React, { useState } from 'react';
import { AlertTriangle, Eye, Glasses, Contact, Package, DollarSign, Minus, CheckCircle, XCircle, Info, Copy, Check } from 'lucide-react';
import { formatCurrency, formatPairQuantity } from '../../lib/utils';

interface VocItem {
  type: string;
  id: string;
  name: string;
  quantity: number;
  price: number;
  selectedPriceLabel?: string;
  category: string;
  store: string;
  isBifocal: boolean;
  isSingleVision: boolean;
  isSMS: boolean;
  isSMSBifocal: boolean;
  isYangonOrder: boolean;
  yangonOrderName: string;
  itemDiscount: number;
  discountPercentage?: number; // Add percentage discount field
  hasError: boolean;
  isFOC: boolean;
  errorQuantity: number;
  soldQuantity?: number;
  customTotal?: number | null;
  errorSide?: 'left' | 'right' | 'both' | null;
  details?: {
    sph?: string | null;
    cyl?: string | null;
    axis?: string | null;
    addition?: string | null;
    color?: string | null;
    power?: string | null;
    yangonOrderName?: string | null;
    Right?: string | null;
    Left?: string | null;
    rightAxis?: string | null;
    leftAxis?: string | null;
    rightCyl?: string | null;
    leftCyl?: string | null;
  };
}

interface VocData {
  id: string;
  vocNumber: string;
  customerName: string;
  customerPhone: string;
  customerType: string;
  customerGender: string;
  customerAge: number;
  paymentType: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  depositAmount: number;
  paymentMethod: string;
  yuanAmount: number;
  cashAmount: number;
  kpayAmount: number;
  mmkAmount: number;
  discount: number;
  notes: string;
  salePerson: string;
  eyeTest: string;
  fitting: string;
  items: VocItem[];
  store: string;
  vocDate: string;
  vocTime: string;
  hasErrors: boolean;
  totalErrorQuantity: number;
  errorInfo?: {
    category: string;
    description: string;
    totalQuantity: number;
  };
  createdAt: any;
}

interface VocDetailViewProps {
  voc: VocData;
}

const VocDetailView: React.FC<VocDetailViewProps> = ({ voc }) => {
  const [notesCopied, setNotesCopied] = useState(false);

  // Function to copy notes to clipboard
  const copyNotesToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(voc.notes);
      setNotesCopied(true);
      setTimeout(() => setNotesCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy notes:', err);
    }
  };

  // Function to format notes with clickable links and highlighted keywords
  const formatNotesWithLinks = (text: string) => {
    // Regular expressions for different types of links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;

    // Important keywords to highlight
    const importantKeywords = [
      'urgent', 'important', 'asap', 'priority', 'critical', 'emergency',
      'follow-up', 'callback', 'reminder', 'note', 'warning', 'attention',
      'special', 'custom', 'rush', 'deadline', 'issue', 'problem'
    ];

    let formattedText = text;
    
    // Replace URLs
    formattedText = formattedText.replace(urlRegex, (url) => 
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline font-medium">${url}</a>`
    );
    
    // Replace emails
    formattedText = formattedText.replace(emailRegex, (email) => 
      `<a href="mailto:${email}" class="text-blue-600 dark:text-blue-400 hover:underline font-medium">${email}</a>`
    );
    
    // Replace phone numbers (basic detection)
    formattedText = formattedText.replace(phoneRegex, (phone) => 
      `<a href="tel:${phone.replace(/\s/g, '')}" class="text-blue-600 dark:text-blue-400 hover:underline font-medium">${phone}</a>`
    );

    // Highlight important keywords
    importantKeywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      formattedText = formattedText.replace(keywordRegex, (match) => 
        `<span class="bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-1 py-0.5 rounded text-sm font-semibold">${match}</span>`
      );
    });

    return formattedText;
  };

  // Helper function to get item type icon
  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'Lens': return <Eye className="h-4 w-4" />;
      case 'Frame': return <Glasses className="h-4 w-4" />;
      case 'Contact Lens': return <Contact className="h-4 w-4" />;
      case 'Accessories': return <Package className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  // Helper function to get error category display name
  const getErrorCategoryDisplayName = (errorCategory: string): string => {
    const categoryMap: Record<string, string> = {
      'form_error': '📝 Form Error (50% discount)',
      'kkt': '🔧 KKT Error',
      'kcma': '⚙️ KCMA Error',
      'kmmt': '🛠️ KMMT Error',
      'eye_test': '👁️ Eye Test Error',
      'fitting': '🔧 Fitting Error',
      'factory': '🏭 Factory Error',
      'wrong_delivery': '📦 Wrong Delivery',
      'wrong_lens_production': '🔍 Wrong Lens Production',
      'unknown': '❓ Unknown Error'
    };
    
    return categoryMap[errorCategory] || `❓ ${errorCategory}`;
  };

  // ENHANCED: Calculate item totals with comprehensive error handling
  const calculateItemTotals = (item: VocItem) => {
    const totalQuantity = item.quantity;
    const errorQuantity = item.errorQuantity || 0;
    const soldQuantity = Math.max(0, totalQuantity - errorQuantity);
    
    // Original price calculation (before errors)
    const originalAmount = totalQuantity * item.price;
    
    // CRITICAL: Error quantities are FREE - only sold quantities are charged
    let soldAmount = 0;
    if (item.isFOC) {
      soldAmount = 0; // FOC items are completely free
    } else if (item.customTotal !== null && item.customTotal !== undefined) {
      soldAmount = item.customTotal; // Custom total overrides calculation
    } else {
      soldAmount = soldQuantity * item.price; // Only charge for sold quantities
    }
    
    // Apply item discount to sold amount
    const itemDiscount = item.itemDiscount || 0;
    const finalAmount = Math.max(soldAmount - itemDiscount, 0);
    
    // Error amount (not charged to customer - this is the savings)
    const errorAmount = errorQuantity * item.price;
    
    // Error savings percentage
    const errorSavingsPercentage = originalAmount > 0 ? (errorAmount / originalAmount) * 100 : 0;
    
    return {
      originalAmount,
      soldAmount,
      errorAmount,
      itemDiscount,
      finalAmount,
      totalQuantity,
      soldQuantity,
      errorQuantity,
      errorSavingsPercentage
    };
  };

  // Calculate VOC totals with enhanced error tracking
  const vocTotals = voc.items.reduce((acc, item) => {
    const itemTotals = calculateItemTotals(item);
    return {
      originalAmount: acc.originalAmount + itemTotals.originalAmount,
      soldAmount: acc.soldAmount + itemTotals.soldAmount,
      errorAmount: acc.errorAmount + itemTotals.errorAmount,
      itemDiscounts: acc.itemDiscounts + itemTotals.itemDiscount,
      finalAmount: acc.finalAmount + itemTotals.finalAmount,
      totalErrorQuantity: acc.totalErrorQuantity + itemTotals.errorQuantity,
      totalSoldQuantity: acc.totalSoldQuantity + itemTotals.soldQuantity,
      totalOriginalQuantity: acc.totalOriginalQuantity + itemTotals.totalQuantity
    };
  }, {
    originalAmount: 0,
    soldAmount: 0,
    errorAmount: 0,
    itemDiscounts: 0,
    finalAmount: 0,
    totalErrorQuantity: 0,
    totalSoldQuantity: 0,
    totalOriginalQuantity: 0
  });

  // Calculate overall error savings percentage
  const overallErrorSavingsPercentage = vocTotals.originalAmount > 0 
    ? (vocTotals.errorAmount / vocTotals.originalAmount) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* VOC Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 rounded-3xl text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">VOC #{voc.vocNumber}</h1>
            <p className="text-blue-100">
              {voc.vocDate} at {voc.vocTime} • {voc.store.toUpperCase()} Store
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Total Amount</div>
            <div className="text-2xl font-bold">{formatCurrency(voc.totalAmount)}</div>
            {voc.hasErrors && (
              <div className="flex items-center gap-1 mt-2 bg-red-500/20 px-2 py-1 rounded-full">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Has Errors</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ENHANCED: Error Information with Savings Display */}
      {voc.hasErrors && voc.errorInfo && (
        <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-2xl p-6 border-2 border-red-200 dark:border-red-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-800 dark:text-red-200">Error Information</h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                {voc.totalErrorQuantity} error items detected • {overallErrorSavingsPercentage.toFixed(1)}% cost reduction
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error Category</h4>
              <p className="text-red-700 dark:text-red-300">
                {getErrorCategoryDisplayName(voc.errorInfo.category)}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error Quantities</h4>
              <div className="space-y-1">
                <p className="text-red-700 dark:text-red-300">
                  Total Error: {vocTotals.totalErrorQuantity} items
                </p>
                <p className="text-green-700 dark:text-green-300">
                  Charged: {vocTotals.totalSoldQuantity} items
                </p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Cost Impact</h4>
              <div className="space-y-1">
                <p className="text-red-700 dark:text-red-300">
                  Error Savings: {formatCurrency(vocTotals.errorAmount)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  ({overallErrorSavingsPercentage.toFixed(1)}% reduction)
                </p>
              </div>
            </div>
            
            {voc.errorInfo.description && (
              <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Description</h4>
                <p className="text-red-700 dark:text-red-300">{voc.errorInfo.description}</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                💡 Error quantities are FREE - Customer only pays for {vocTotals.totalSoldQuantity} working items out of {vocTotals.totalOriginalQuantity} total items ordered.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Customer Information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Name</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.customerName}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Phone</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.customerPhone}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Type</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.customerType}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Gender</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.customerGender}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Age</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.customerAge}</p>
          </div>
        </div>
      </div>

      {/* ENHANCED: Items with Detailed Error Quantity and Pricing Display */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {voc.items.length} items • {vocTotals.totalErrorQuantity > 0 && `${vocTotals.totalErrorQuantity} errors • ${vocTotals.totalSoldQuantity} charged`}
          </div>
        </div>
        
        <div className="space-y-4">
          {voc.items.map((item, index) => {
            const itemTotals = calculateItemTotals(item);
            
            return (
              <div 
                key={index}
                className={`border rounded-2xl p-4 transition-all duration-200 ${
                  item.hasError 
                    ? 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20' 
                    : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                }`}
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getItemTypeIcon(item.type)}
                      <h4 className="font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.store === 'win' ? 'bg-blue-100 text-blue-800' :
                        item.store === 'pwint' ? 'bg-green-100 text-green-800' :
                        item.store === 'yangon' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.store?.toUpperCase()}
                      </span>
                      {item.isFOC && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                          FOC
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.category} • Unit Price: {formatCurrency(item.price)}
                    </div>
                  </div>
                  
                  {/* Error Indicator */}
                  {item.hasError && (
                    <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-xs font-medium text-red-700 dark:text-red-300">
                        Has Error
                      </span>
                    </div>
                  )}
                </div>

                {/* ENHANCED: Quantity and Pricing Breakdown with Error Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  {/* Total Quantity */}
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Ordered</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatPairQuantity(itemTotals.totalQuantity)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Original Order
                    </div>
                  </div>

                  {/* Error Quantity */}
                  {itemTotals.errorQuantity > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700">
                      <div className="text-xs text-red-600 dark:text-red-400 mb-1">Error Quantity</div>
                      <div className="text-lg font-bold text-red-700 dark:text-red-300">
                        {formatPairQuantity(itemTotals.errorQuantity)}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        FREE (Not Charged)
                      </div>
                    </div>
                  )}

                  {/* Sold Quantity */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-xs text-green-600 dark:text-green-400 mb-1">Charged Quantity</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatPairQuantity(itemTotals.soldQuantity)}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Customer Pays For
                    </div>
                  </div>

                  {/* Error Savings */}
                  {itemTotals.errorQuantity > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700">
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Error Savings</div>
                      <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                        {formatCurrency(itemTotals.errorAmount)}
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        {itemTotals.errorSavingsPercentage.toFixed(1)}% off
                      </div>
                    </div>
                  )}

                  {/* Final Amount */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Final Amount</div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(itemTotals.finalAmount)}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      After All Discounts
                    </div>
                  </div>
                </div>

                {/* ENHANCED: Pricing Breakdown with Error Impact */}
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Pricing Breakdown</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Original Cost:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(itemTotals.originalAmount)}
                      </div>
                      <div className="text-gray-500">
                        ({itemTotals.totalQuantity} × {formatCurrency(item.price)})
                      </div>
                    </div>
                    
                    {itemTotals.errorAmount > 0 && (
                      <div>
                        <span className="text-red-600 dark:text-red-400">Error Deduction:</span>
                        <div className="font-medium text-red-700 dark:text-red-300">
                          -{formatCurrency(itemTotals.errorAmount)}
                        </div>
                        <div className="text-red-500">
                          ({itemTotals.errorQuantity} × {formatCurrency(item.price)})
                        </div>
                      </div>
                    )}
                    
                    {itemTotals.itemDiscount > 0 && (
                      <div>
                        <span className="text-orange-600 dark:text-orange-400">Item Discount:</span>
                        <div className="font-medium text-orange-700 dark:text-orange-300">
                          -{formatCurrency(itemTotals.itemDiscount)}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-green-600 dark:text-green-400">Customer Pays:</span>
                      <div className="font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(itemTotals.finalAmount)}
                      </div>
                      <div className="text-green-500">
                        ({itemTotals.soldQuantity} × {formatCurrency(item.price)})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Side Information for Bifocal */}
                {item.hasError && item.isBifocal && item.errorSide && (
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                        Bifocal Error: {item.errorSide === 'both' ? 'Both Eyes' : `${item.errorSide} Eye`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Item Details */}
                {item.details && Object.values(item.details).some(value => value) && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <h6 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Item Details</h6>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {item.details.sph && <div><span className="text-blue-600">SPH:</span> {item.details.sph}</div>}
                      {item.details.cyl && <div><span className="text-blue-600">CYL:</span> {item.details.cyl}</div>}
                      {item.details.axis && <div><span className="text-blue-600">AXIS:</span> {item.details.axis}°</div>}
                      {item.details.addition && <div><span className="text-blue-600">ADD:</span> {item.details.addition}</div>}
                      {item.details.color && <div><span className="text-blue-600">Color:</span> {item.details.color}</div>}
                      {item.details.power && <div><span className="text-blue-600">Power:</span> {item.details.power}</div>}
                      {item.details.Right && <div><span className="text-blue-600">Right:</span> {item.details.Right}</div>}
                      {item.details.Left && <div><span className="text-blue-600">Left:</span> {item.details.Left}</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ENHANCED: Items Summary with Error Impact */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Items Summary</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Original Cost:</span>
              <div className="font-bold text-gray-900 dark:text-white text-lg">
                {formatCurrency(vocTotals.originalAmount)}
              </div>
              <div className="text-xs text-gray-500">
                {vocTotals.totalOriginalQuantity} total items
              </div>
            </div>
            
            {vocTotals.errorAmount > 0 && (
              <div>
                <span className="text-red-600 dark:text-red-400">Error Savings:</span>
                <div className="font-bold text-red-700 dark:text-red-300 text-lg">
                  -{formatCurrency(vocTotals.errorAmount)}
                </div>
                <div className="text-xs text-red-500">
                  {vocTotals.totalErrorQuantity} error items (FREE)
                </div>
              </div>
            )}
            
            {vocTotals.itemDiscounts > 0 && (
              <div>
                <span className="text-orange-600 dark:text-orange-400">Item Discounts:</span>
                <div className="font-bold text-orange-700 dark:text-orange-300 text-lg">
                  -{formatCurrency(vocTotals.itemDiscounts)}
                </div>
              </div>
            )}
            
            <div>
              <span className="text-green-600 dark:text-green-400">Charged Amount:</span>
              <div className="font-bold text-green-700 dark:text-green-300 text-lg">
                {formatCurrency(vocTotals.finalAmount)}
              </div>
              <div className="text-xs text-green-500">
                {vocTotals.totalSoldQuantity} charged items
              </div>
            </div>

            {vocTotals.errorAmount > 0 && (
              <div>
                <span className="text-purple-600 dark:text-purple-400">Savings %:</span>
                <div className="font-bold text-purple-700 dark:text-purple-300 text-lg">
                  {overallErrorSavingsPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-purple-500">
                  Total cost reduction
                </div>
              </div>
            )}
          </div>
          
          {/* Error Impact Summary */}
          {vocTotals.errorAmount > 0 && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  💰 Customer saved {formatCurrency(vocTotals.errorAmount)} due to {vocTotals.totalErrorQuantity} error items being provided FREE of charge.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Payment Type</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.paymentType}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Payment Method</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.paymentMethod}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Overall Discount</label>
            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(voc.discount)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Total Amount</label>
            <p className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(voc.totalAmount)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Paid Amount</label>
            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(voc.paidAmount)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Balance</label>
            <p className={`font-medium ${voc.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(voc.balance)}
            </p>
          </div>
          
          {/* Payment Method Specific Amounts */}
          {voc.yuanAmount > 0 && (
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Yuan Amount</label>
              <p className="font-medium text-gray-900 dark:text-white">{voc.yuanAmount} Yuan</p>
            </div>
          )}
          {voc.cashAmount > 0 && (
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">Cash Amount</label>
              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(voc.cashAmount)}</p>
            </div>
          )}
          {voc.kpayAmount > 0 && (
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400">KPay Amount</label>
              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(voc.kpayAmount)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Staff Information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Staff Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Sale Person</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.salePerson}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Eye Test</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.eyeTest}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Fitting</label>
            <p className="font-medium text-gray-900 dark:text-white">{voc.fitting}</p>
          </div>
        </div>
      </div>

      {/* Enhanced Notes Section */}
      {voc.notes && voc.notes.trim() && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 border-2 border-amber-200 dark:border-amber-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Info className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-200">Notes & Comments</h3>
                <p className="text-sm text-amber-600 dark:text-amber-400">Additional information and remarks</p>
              </div>
            </div>
            
            <button
              onClick={copyNotesToClipboard}
              className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 rounded-lg transition-colors duration-200 text-amber-700 dark:text-amber-300"
              title="Copy notes to clipboard"
            >
              {notesCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="text-sm font-medium">Copy</span>
                </>
              )}
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div 
                className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-base"
                dangerouslySetInnerHTML={{ __html: formatNotesWithLinks(voc.notes) }}
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span>This information was provided during VOC creation</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-amber-600 dark:text-amber-400">
              <span>{voc.notes.length} characters</span>
              <span>•</span>
              <span>{voc.notes.trim().split(/\s+/).length} words</span>
              {voc.notes.split('\n').length > 1 && (
                <>
                  <span>•</span>
                  <span>{voc.notes.split('\n').length} lines</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show placeholder when no notes */}
      {(!voc.notes || !voc.notes.trim()) && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Info className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">No Notes Available</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">No additional notes or comments were added to this VOC.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocDetailView;