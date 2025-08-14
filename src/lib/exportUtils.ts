import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatCurrency, formatYuan, VocItem } from './utils';

// Professional color scheme - Navy and Gold
const COLORS = {
  navy: 'FF1B365D',      // Navy blue
  gold: 'FFD4AF37',      // Gold
  lightGold: 'FFFAF0E6', // Light gold background
  white: 'FFFFFFFF',     // White
  lightGray: 'FFF5F5F5', // Light gray
  darkGray: 'FF404040',  // Dark gray text
  green: 'FF228B22',     // Success green
  red: 'FFDC143C',       // Alert red
  blue: 'FF4169E1'       // Royal blue
};

// Enhanced Excel export with professional styling and proper deposit handling
export function exportVocToExcel(data: any[], filename: string, totals?: {
  totalAmount: number;
  kpayTotal: number;
  yuanTotal: number;
  depositTotal: number;
  remainingBalance?: number;
  cashTotal?: number;
}): void {
  try {
    const wb = XLSX.utils.book_new();
    
    // Calculate separate Yuan and MMK totals with proper deposit handling
    let totalYuanAmount = 0;
    let totalMMKAmount = 0;
    let totalKPayAmount = 0;
    let totalCashAmount = 0;
    let totalDepositAmount = 0;
    let totalRemainingBalance = 0;
    
    // Prepare data with enhanced formatting
    const formattedData = data.map((voc, index) => {
      const itemsByType = voc.items?.reduce((acc: any, item: VocItem) => {
        if (!acc[item.type]) {
          acc[item.type] = [];
        }
        acc[item.type].push(item);
        return acc;
      }, {}) || {};

      const formatItemsForExcel = (items: VocItem[], type: string) => {
        if (!items || items.length === 0) return '-';
        
        return items.map((item: VocItem) => {
          let details = '';
          
          if (type === 'Lens' && item.details) {
            const category = item.category?.toLowerCase() || '';
            const isBifocal = category.includes('fuse') || category.includes('flattop') || category.includes('bifocal');
            
            if (isBifocal) {
              const rightQty = item.details.rightQty ?? null;
              const leftQty = item.details.leftQty ?? null;
              const rightShow = rightQty && rightQty > 0 ? rightQty : '-';
              const leftShow = leftQty && leftQty > 0 ? leftQty : '-';
              details = ` (R: ${rightShow}, L: ${leftShow}) [${item.category}]`;
            } else {
              details = ` (${item.quantity} pairs)`;
            }
            
            const prescription = `SPH: ${item.details.sph || '-'}, CYL: ${item.details.cyl || '-'}, AXIS: ${item.details.axis || '-'}`;
            const itemDiscountText = item.itemDiscount && item.itemDiscount > 0 ? ` [Item Discount: -${item.itemDiscount} MMK]` : '';
            return `${item.name}${details}${item.isFOC ? ' [FOC]' : ''}${itemDiscountText}\n${prescription}`;
          } else if (type === 'Frame' && item.details?.color) {
            const itemDiscountText = item.itemDiscount && item.itemDiscount > 0 ? ` [Item Discount: -${item.itemDiscount} MMK]` : '';
            return `${item.name} (${item.quantity}x)${item.isFOC ? ' [FOC]' : ''}${itemDiscountText} - Color: ${item.details.color}`;
          } else if (type === 'Contact Lens' && item.details?.power) {
            const itemDiscountText = item.itemDiscount && item.itemDiscount > 0 ? ` [Item Discount: -${item.itemDiscount} MMK]` : '';
            return `${item.name} (${item.quantity}x)${item.isFOC ? ' [FOC]' : ''}${itemDiscountText} - Power: ${item.details.power}`;
          } else {
            const itemDiscountText = item.itemDiscount && item.itemDiscount > 0 ? ` [Item Discount: -${item.itemDiscount} MMK]` : '';
            return `${item.name} (${item.quantity}x)${item.isFOC ? ' [FOC]' : ''}${itemDiscountText}`;
          }
        }).join('\n');
      };

      const discountAmount = voc.discount || 0;
      const totalItemDiscounts = voc.totalItemDiscounts || 0;
      const finalTotal = Math.max((voc.totalAmount || 0) - discountAmount, 0);

      // UPDATED: Calculate totals with proper deposit handling
      if (voc.paymentType === 'Deposit') {
        const depositAmount = voc.depositAmount || 0;
        const balance = voc.balance || 0;
        
        totalDepositAmount += depositAmount;
        totalRemainingBalance += balance;
        
        // Add deposit to appropriate payment method total
        if (voc.paymentMethod === 'Cash') {
          totalCashAmount += depositAmount;
        } else if (voc.paymentMethod === 'KPay') {
          totalKPayAmount += depositAmount;
        } else if (voc.paymentMethod === 'Yuan') {
          totalYuanAmount += voc.yuanAmount || 0;
          totalMMKAmount += voc.mmkAmount || 0;
        } else if (voc.paymentMethod === 'Cash+KPay') {
          totalCashAmount += voc.cashAmount || 0;
          totalKPayAmount += voc.kpayAmount || 0;
        } else if (voc.paymentMethod === 'Cash+Yuan') {
          totalCashAmount += voc.cashAmount || 0;
          totalYuanAmount += voc.yuanAmount || 0;
        } else if (voc.paymentMethod === 'Yuan+KPay') {
          totalYuanAmount += voc.yuanAmount || 0;
          totalKPayAmount += voc.kpayAmount || 0;
        }
      } else {
        // Full payment handling
        if (voc.paymentMethod === 'Cash') {
          totalCashAmount += finalTotal;
          totalMMKAmount += finalTotal;
        } else if (voc.paymentMethod === 'KPay') {
          totalKPayAmount += finalTotal;
          totalMMKAmount += finalTotal;
        } else if (voc.paymentMethod === 'Yuan') {
          totalYuanAmount += voc.yuanAmount || 0;
          totalMMKAmount += voc.mmkAmount || 0;
        } else if (voc.paymentMethod === 'Cash+KPay') {
          totalCashAmount += voc.cashAmount || 0;
          totalKPayAmount += voc.kpayAmount || 0;
          totalMMKAmount += finalTotal;
        } else if (voc.paymentMethod === 'Cash+Yuan') {
          totalCashAmount += voc.cashAmount || 0;
          totalYuanAmount += voc.yuanAmount || 0;
          totalMMKAmount += voc.cashAmount || 0;
          totalMMKAmount += voc.mmkAmount || 0;
        } else if (voc.paymentMethod === 'Yuan+KPay') {
          totalYuanAmount += voc.yuanAmount || 0;
          totalKPayAmount += voc.kpayAmount || 0;
          totalMMKAmount += voc.kpayAmount || 0;
          totalMMKAmount += voc.mmkAmount || 0;
        }
      }

      return {
        'No.': index + 1,
        'VOC Number': voc.vocNumber || '',
        'Customer Name': voc.customerName || '',
        'Date': voc.createdAt ? format(voc.createdAt, 'yyyy-MM-dd') : '',
        'Time': voc.createdAt ? format(voc.createdAt, 'HH:mm') : '',
        'Lens Details': formatItemsForExcel(itemsByType['Lens'] || [], 'Lens'),
        'Frame Details': formatItemsForExcel(itemsByType['Frame'] || [], 'Frame'),
        'Accessories': formatItemsForExcel(itemsByType['Accessories'] || [], 'Accessories'),
        'Contact Lens': formatItemsForExcel(itemsByType['Contact Lens'] || [], 'Contact Lens'),
        'Payment Type': voc.paymentType || '',
        'Payment Method': voc.paymentMethod || '',
        'Yuan Amount': voc.paymentMethod?.includes('Yuan') ? (voc.yuanAmount || 0) : 0,
        'Yuan Rate': voc.paymentMethod?.includes('Yuan') ? (voc.yuanRate || 300) : '',
        'MMK Amount': voc.mmkAmount || 0,
        'Cash Amount': voc.cashAmount || 0,
        'KPay Amount': voc.kpayAmount || 0,
        'Deposit Amount': voc.depositAmount || 0,
        'Remaining Balance': voc.balance || 0,
        'Item Discounts': totalItemDiscounts || 0,
        'Overall Discount': voc.discount || 0,
        'Total Amount': finalTotal,
        'Notes': voc.notes || '',
        'Refund': voc.refund ? `${voc.refund.amount} - ${voc.refund.reason}` : ''
      };
    });

    // UPDATED: Add summary rows with separate deposit and remaining balance tracking
    formattedData.push(
      {}, // Empty row for spacing
      {
        'No.': '',
        'VOC Number': '📊 PERIOD SUMMARY',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '💰 Cash Total (MMK)',
        'Yuan Amount': 0,
        'Yuan Rate': '',
        'MMK Amount': 0,
        'Cash Amount': 0,
        'KPay Amount': 0,
        'Deposit Amount': 0,
        'Remaining Balance': 0,
        'Item Discounts': 0,
        'Overall Discount': 0,
        'Total Amount': totalCashAmount,
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '📱 KPay Total (MMK)',
        'Yuan Amount': 0,
        'Yuan Rate': '',
        'MMK Amount': 0,
        'Cash Amount': 0,
        'KPay Amount': 0,
        'Deposit Amount': 0,
        'Remaining Balance': 0,
        'Item Discounts': 0,
        'Overall Discount': 0,
        'Total Amount': totalKPayAmount,
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '💴 Yuan Total (Yuan Currency)',
        'Yuan Amount': totalYuanAmount,
        'Yuan Rate': '',
        'MMK Amount': 0,
        'Cash Amount': 0,
        'KPay Amount': 0,
        'Deposit Amount': 0,
        'Remaining Balance': 0,
        'Item Discounts': 0,
        'Overall Discount': 0,
        'Total Amount': 0,
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '🏦 Deposits Collected (MMK)',
        'Yuan Amount': 0,
        'Yuan Rate': '',
        'MMK Amount': 0,
        'Cash Amount': 0,
        'KPay Amount': 0,
        'Deposit Amount': totalDepositAmount,
        'Remaining Balance': 0,
        'Item Discounts': 0,
        'Overall Discount': 0,
        'Total Amount': 0,
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '⏳ Remaining Balance (MMK)',
        'Yuan Amount': 0,
        'Yuan Rate': '',
        'MMK Amount': 0,
        'Cash Amount': 0,
        'KPay Amount': 0,
        'Deposit Amount': 0,
        'Remaining Balance': totalRemainingBalance,
        'Item Discounts': 0,
        'Overall Discount': 0,
        'Total Amount': 0,
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '🎯 GRAND TOTAL',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': `MMK: ${totalMMKAmount.toLocaleString()} | Yuan: ${totalYuanAmount.toFixed(2)} | Deposits: ${totalDepositAmount.toLocaleString()} | Balance: ${totalRemainingBalance.toLocaleString()}`,
        'Yuan Amount': totalYuanAmount,
        'Yuan Rate': '',
        'MMK Amount': 0,
        'Cash Amount': 0,
        'KPay Amount': 0,
        'Deposit Amount': totalDepositAmount,
        'Remaining Balance': totalRemainingBalance,
        'Item Discounts': 0,
        'Overall Discount': 0,
        'Total Amount': totalMMKAmount,
        'Notes': '',
        'Refund': ''
      }
    );

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);

    // Enhanced column widths for better readability
    const colWidths = [
      { wch: 6 },   // No.
      { wch: 18 },  // VOC Number
      { wch: 25 },  // Customer Name
      { wch: 12 },  // Date
      { wch: 8 },   // Time
      { wch: 45 },  // Lens Details
      { wch: 35 },  // Frame Details
      { wch: 25 },  // Accessories
      { wch: 25 },  // Contact Lens
      { wch: 12 },  // Payment Type
      { wch: 20 },  // Payment Method
      { wch: 12 },  // Yuan Amount
      { wch: 10 },  // Yuan Rate
      { wch: 12 },  // MMK Amount
      { wch: 12 },  // Cash Amount
      { wch: 12 },  // KPay Amount
      { wch: 15 },  // Deposit Amount
      { wch: 15 },  // Remaining Balance
      { wch: 15 },  // Item Discounts
      { wch: 12 },  // Overall Discount
      { wch: 15 },  // Total Amount
      { wch: 30 },  // Notes
      { wch: 25 }   // Refund
    ];
    
    ws['!cols'] = colWidths;

    // Apply professional styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Style header row (row 1)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: COLORS.navy } },
        font: { 
          color: { rgb: COLORS.white }, 
          bold: true, 
          sz: 12,
          name: 'Calibri'
        },
        alignment: { 
          horizontal: 'center', 
          vertical: 'center',
          wrapText: true
        },
        border: {
          top: { style: 'thin', color: { rgb: COLORS.gold } },
          bottom: { style: 'thin', color: { rgb: COLORS.gold } },
          left: { style: 'thin', color: { rgb: COLORS.gold } },
          right: { style: 'thin', color: { rgb: COLORS.gold } }
        }
      };
    }

    // Style data rows with alternating colors
    for (let row = 1; row <= range.e.r; row++) {
      const isEvenRow = row % 2 === 0;
      const isSummaryRow = formattedData[row - 1]?.['VOC Number']?.includes('SUMMARY') || 
                          formattedData[row - 1]?.['VOC Number']?.includes('TOTAL');
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;

        let fillColor = isEvenRow ? COLORS.lightGold : COLORS.white;
        let fontColor = COLORS.darkGray;
        let isBold = false;

        // Special styling for summary rows
        if (isSummaryRow) {
          fillColor = COLORS.gold;
          fontColor = COLORS.navy;
          isBold = true;
        }

        ws[cellAddress].s = {
          fill: { fgColor: { rgb: fillColor } },
          font: { 
            color: { rgb: fontColor }, 
            bold: isBold,
            sz: 10,
            name: 'Calibri'
          },
          alignment: { 
            horizontal: col === 0 ? 'center' : 'left', 
            vertical: 'center',
            wrapText: true
          },
          border: {
            top: { style: 'thin', color: { rgb: COLORS.lightGray } },
            bottom: { style: 'thin', color: { rgb: COLORS.lightGray } },
            left: { style: 'thin', color: { rgb: COLORS.lightGray } },
            right: { style: 'thin', color: { rgb: COLORS.lightGray } }
          }
        };

        // Special formatting for currency columns
        const currencyColumns = ['MMK Amount', 'Cash Amount', 'KPay Amount', 'Deposit Amount', 'Remaining Balance', 'Item Discounts', 'Overall Discount', 'Total Amount'];
        const yuanColumns = ['Yuan Amount'];
        const header = formattedData[0] ? Object.keys(formattedData[0])[col] : '';
        
        if (currencyColumns.includes(header) && typeof ws[cellAddress].v === 'number') {
          ws[cellAddress].z = '#,##0';
          ws[cellAddress].s.alignment.horizontal = 'right';
        }
        
        if (yuanColumns.includes(header) && typeof ws[cellAddress].v === 'number') {
          ws[cellAddress].z = '#,##0.00';
          ws[cellAddress].s.alignment.horizontal = 'right';
        }
      }
    }

    // Set row heights for better readability
    ws['!rows'] = [];
    for (let i = 0; i <= range.e.r; i++) {
      ws['!rows'][i] = { hpt: i === 0 ? 25 : 20 }; // Header row taller
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'VOC Report');

    // Add metadata sheet
    const metaData = [
      ['Report Generated', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
      ['Total Records', data.length],
      ['Export Type', 'VOC Management Report'],
      ['', ''],
      ['Currency Summary', ''],
      ['Total MMK Amount', totalMMKAmount.toLocaleString()],
      ['Total Yuan Amount', totalYuanAmount.toFixed(2) + ' Yuan'],
      ['Total Deposits Collected', totalDepositAmount.toLocaleString() + ' MMK'],
      ['Total Remaining Balance', totalRemainingBalance.toLocaleString() + ' MMK'],
      ['', ''],
      ['Legend', ''],
      ['FOC', 'Free of Charge'],
      ['VOC', 'Voucher of Collection'],
      ['MMK', 'Myanmar Kyat'],
      ['CNY', 'Chinese Yuan'],
      ['Item Discounts', 'Individual item-level discounts'],
      ['Overall Discount', 'VOC-level discount applied to total'],
      ['Deposits', 'Amount paid as deposit for partial payments'],
      ['Remaining Balance', 'Amount still owed by customer']
    ];

    const metaWs = XLSX.utils.aoa_to_sheet(metaData);
    metaWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
    
    // Style metadata sheet
    const metaRange = XLSX.utils.decode_range(metaWs['!ref'] || 'A1');
    for (let row = 0; row <= metaRange.e.r; row++) {
      for (let col = 0; col <= metaRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!metaWs[cellAddress]) continue;
        
        metaWs[cellAddress].s = {
          font: { name: 'Calibri', sz: 10 },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
        
        if (col === 0) {
          metaWs[cellAddress].s.font.bold = true;
          metaWs[cellAddress].s.fill = { fgColor: { rgb: COLORS.lightGold } };
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, metaWs, 'Report Info');

    // Write file with enhanced filename
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
    
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel. Please try again.');
  }
}

// Enhanced Google Sheets export with better CSV formatting and proper deposit handling
export function exportVocToGoogleSheets(data: any[], filename: string, totals?: {
  totalAmount: number;
  kpayTotal: number;
  yuanTotal: number;
  depositTotal: number;
  remainingBalance?: number;
  cashTotal?: number;
}): void {
  try {
    // Calculate separate Yuan and MMK totals with proper deposit handling
    let totalYuanAmount = 0;
    let totalMMKAmount = 0;
    let totalKPayAmount = 0;
    let totalCashAmount = 0;
    let totalDepositAmount = 0;
    let totalRemainingBalance = 0;
    
    // Format data for CSV with enhanced structure
    const formattedData = data.map((voc, index) => {
      const lensItems = voc.items?.filter((item: VocItem) => item.type === 'Lens') || [];
      const frameItems = voc.items?.filter((item: VocItem) => item.type === 'Frame') || [];
      const accessoryItems = voc.items?.filter((item: VocItem) => item.type === 'Accessories') || [];
      const contactLensItems = voc.items?.filter((item: VocItem) => item.type === 'Contact Lens') || [];
      
      const formatLensItems = () => {
        if (!lensItems.length) return '';
        return lensItems.map((item: VocItem) => {
          const category = item.category?.toLowerCase() || '';
          const isBifocal = category.includes('fuse') || category.includes('flattop') || category.includes('bifocal');
          
          let quantityDisplay = '';
          if (isBifocal) {
            const rightQty = item.details?.rightQty ?? null;
            const leftQty = item.details?.leftQty ?? null;
            const rightShow = rightQty && rightQty > 0 ? rightQty : '-';
            const leftShow = leftQty && leftQty > 0 ? leftQty : '-';
            quantityDisplay = ` (R: ${rightShow} L: ${leftShow}) [${item.category}]`;
          } else {
            quantityDisplay = ` (${item.quantity} pairs)`;
          }
          
          const details = item.details 
            ? ` | SPH: ${item.details.sph || '-'} CYL: ${item.details.cyl || '-'} AXIS: ${item.details.axis || '-'}`
            : '';
          
          const itemDiscountText = item.itemDiscount && item.itemDiscount > 0 ? ` [Item Discount: -${formatCurrency(item.itemDiscount)}]` : '';
          
          return `${item.name}${quantityDisplay}${item.isFOC ? ' [FOC]' : ''}${itemDiscountText}${details}`;
        }).join(' | ');
      };
      
      const formatFrameItems = () => {
        if (!frameItems.length) return '';
        return frameItems.map((item: VocItem) => {
          const colorDetail = item.details?.color ? ` (${item.details.color})` : '';
          const itemDiscountText = item.itemDiscount && item.itemDiscount > 0 ? ` [Item Discount: -${formatCurrency(item.itemDiscount)}]` : '';
          return `${item.name} x${item.quantity}${colorDetail}${item.isFOC ? ' [FOC]' : ''}${itemDiscountText}`;
        }).join(' | ');
      };
      
      const formatAccessoryItems = () => {
        if (!accessoryItems.length) return '';
        return accessoryItems.map((item: VocItem) => {
          const itemDiscountText = item.itemDiscount && item.itemDiscount > 0 ? ` [Item Discount: -${formatCurrency(item.itemDiscount)}]` : '';
          return `${item.name} x${item.quantity}${item.isFOC ? ' [FOC]' : ''}${itemDiscountText}`;
        }).join(' | ');
      };
      
      const formatContactLensItems = () => {
        if (!contactLensItems.length) return '';
        return contactLensItems.map((item: VocItem) => {
          const powerDetail = item.details?.power ? ` (${item.details.power})` : '';
          const itemDiscountText = item.itemDiscount && item.itemDiscount > 0 ? ` [Item Discount: -${formatCurrency(item.itemDiscount)}]` : '';
          return `${item.name} x${item.quantity}${powerDetail}${item.isFOC ? ' [FOC]' : ''}${itemDiscountText}`;
        }).join(' | ');
      };

      const discountAmount = voc.discount || 0;
      const totalItemDiscounts = voc.totalItemDiscounts || 0;
      const finalTotal = Math.max((voc.totalAmount || 0) - discountAmount, 0);

      // UPDATED: Calculate totals with proper deposit handling
      if (voc.paymentType === 'Deposit') {
        const depositAmount = voc.depositAmount || 0;
        const balance = voc.balance || 0;
        
        totalDepositAmount += depositAmount;
        totalRemainingBalance += balance;
        
        // Add deposit to appropriate payment method total
        if (voc.paymentMethod === 'Cash') {
          totalCashAmount += depositAmount;
        } else if (voc.paymentMethod === 'KPay') {
          totalKPayAmount += depositAmount;
        } else if (voc.paymentMethod === 'Yuan') {
          totalYuanAmount += voc.yuanAmount || 0;
          totalMMKAmount += voc.mmkAmount || 0;
        } else if (voc.paymentMethod === 'Cash+KPay') {
          totalCashAmount += voc.cashAmount || 0;
          totalKPayAmount += voc.kpayAmount || 0;
        } else if (voc.paymentMethod === 'Cash+Yuan') {
          totalCashAmount += voc.cashAmount || 0;
          totalYuanAmount += voc.yuanAmount || 0;
        } else if (voc.paymentMethod === 'Yuan+KPay') {
          totalYuanAmount += voc.yuanAmount || 0;
          totalKPayAmount += voc.kpayAmount || 0;
        }
      } else {
        // Full payment handling
        if (voc.paymentMethod === 'Cash') {
          totalCashAmount += finalTotal;
          totalMMKAmount += finalTotal;
        } else if (voc.paymentMethod === 'KPay') {
          totalKPayAmount += finalTotal;
          totalMMKAmount += finalTotal;
        } else if (voc.paymentMethod === 'Yuan') {
          totalYuanAmount += voc.yuanAmount || 0;
          totalMMKAmount += voc.mmkAmount || 0;
        } else if (voc.paymentMethod === 'Cash+KPay') {
          totalCashAmount += voc.cashAmount || 0;
          totalKPayAmount += voc.kpayAmount || 0;
          totalMMKAmount += finalTotal;
        } else if (voc.paymentMethod === 'Cash+Yuan') {
          totalCashAmount += voc.cashAmount || 0;
          totalYuanAmount += voc.yuanAmount || 0;
          totalMMKAmount += voc.cashAmount || 0;
          totalMMKAmount += voc.mmkAmount || 0;
        } else if (voc.paymentMethod === 'Yuan+KPay') {
          totalYuanAmount += voc.yuanAmount || 0;
          totalKPayAmount += voc.kpayAmount || 0;
          totalMMKAmount += voc.kpayAmount || 0;
          totalMMKAmount += voc.mmkAmount || 0;
        }
      }

      return {
        'No.': index + 1,
        'VOC Number': voc.vocNumber || '',
        'Customer Name': voc.customerName || '',
        'Date': voc.createdAt ? format(voc.createdAt, 'yyyy-MM-dd') : '',
        'Time': voc.createdAt ? format(voc.createdAt, 'HH:mm') : '',
        'Lens Details': formatLensItems(),
        'Frame Details': formatFrameItems(),
        'Accessories': formatAccessoryItems(),
        'Contact Lens': formatContactLensItems(),
        'Payment Type': voc.paymentType || '',
        'Payment Method': voc.paymentMethod || '',
        'Yuan Amount': voc.paymentMethod?.includes('Yuan') ? `${(voc.yuanAmount || 0).toFixed(2)} Yuan` : '',
        'Yuan Rate': voc.paymentMethod?.includes('Yuan') ? (voc.yuanRate || 300) : '',
        'MMK Amount': voc.mmkAmount ? formatCurrency(voc.mmkAmount) : '',
        'Cash Amount': voc.cashAmount ? formatCurrency(voc.cashAmount) : '',
        'KPay Amount': voc.kpayAmount ? formatCurrency(voc.kpayAmount) : '',
        'Deposit Amount': voc.depositAmount ? formatCurrency(voc.depositAmount) : '',
        'Remaining Balance': voc.balance ? formatCurrency(voc.balance) : '',
        'Item Discounts': totalItemDiscounts ? formatCurrency(totalItemDiscounts) : '',
        'Overall Discount': voc.discount ? formatCurrency(voc.discount) : '',
        'Total Amount': formatCurrency(finalTotal),
        'Notes': voc.notes || '',
        'Refund': voc.refund ? `${formatCurrency(voc.refund.amount)} - ${voc.refund.reason}` : ''
      };
    });

    // UPDATED: Add summary rows with separate deposit and remaining balance tracking
    const summaryRows = [
      {}, // Empty row
      {
        'No.': '',
        'VOC Number': '📊 PERIOD SUMMARY',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '💰 Cash Total (MMK)',
        'Yuan Amount': '',
        'Yuan Rate': '',
        'MMK Amount': '',
        'Cash Amount': '',
        'KPay Amount': '',
        'Deposit Amount': '',
        'Remaining Balance': '',
        'Item Discounts': '',
        'Overall Discount': '',
        'Total Amount': formatCurrency(totalCashAmount),
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '📱 KPay Total (MMK)',
        'Yuan Amount': '',
        'Yuan Rate': '',
        'MMK Amount': '',
        'Cash Amount': '',
        'KPay Amount': '',
        'Deposit Amount': '',
        'Remaining Balance': '',
        'Item Discounts': '',
        'Overall Discount': '',
        'Total Amount': formatCurrency(totalKPayAmount),
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '💴 Yuan Total (Yuan Currency)',
        'Yuan Amount': `${totalYuanAmount.toFixed(2)} Yuan`,
        'Yuan Rate': '',
        'MMK Amount': '',
        'Cash Amount': '',
        'KPay Amount': '',
        'Deposit Amount': '',
        'Remaining Balance': '',
        'Item Discounts': '',
        'Overall Discount': '',
        'Total Amount': '',
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '🏦 Deposits Collected (MMK)',
        'Yuan Amount': '',
        'Yuan Rate': '',
        'MMK Amount': '',
        'Cash Amount': '',
        'KPay Amount': '',
        'Deposit Amount': formatCurrency(totalDepositAmount),
        'Remaining Balance': '',
        'Item Discounts': '',
        'Overall Discount': '',
        'Total Amount': '',
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': '⏳ Remaining Balance (MMK)',
        'Yuan Amount': '',
        'Yuan Rate': '',
        'MMK Amount': '',
        'Cash Amount': '',
        'KPay Amount': '',
        'Deposit Amount': '',
        'Remaining Balance': formatCurrency(totalRemainingBalance),
        'Item Discounts': '',
        'Overall Discount': '',
        'Total Amount': '',
        'Notes': '',
        'Refund': ''
      },
      {
        'No.': '',
        'VOC Number': '🎯 GRAND TOTAL',
        'Customer Name': '',
        'Date': '',
        'Time': '',
        'Lens Details': '',
        'Frame Details': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': `MMK: ${formatCurrency(totalMMKAmount)} | Yuan: ${totalYuanAmount.toFixed(2)} | Deposits: ${formatCurrency(totalDepositAmount)} | Balance: ${formatCurrency(totalRemainingBalance)}`,
        'Yuan Amount': `${totalYuanAmount.toFixed(2)} Yuan`,
        'Yuan Rate': '',
        'MMK Amount': '',
        'Cash Amount': '',
        'KPay Amount': '',
        'Deposit Amount': formatCurrency(totalDepositAmount),
        'Remaining Balance': formatCurrency(totalRemainingBalance),
        'Item Discounts': '',
        'Overall Discount': '',
        'Total Amount': formatCurrency(totalMMKAmount),
        'Notes': '',
        'Refund': ''
      }
    ];

    formattedData.push(...summaryRows);

    // Convert to CSV with proper formatting
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    link.download = `${filename}_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Open Google Sheets in new tab
    setTimeout(() => {
      window.open('https://docs.google.com/spreadsheets/create', '_blank');
    }, 1000);
    
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    throw new Error('Failed to export to Google Sheets. Please try again.');
  }
}

// Enhanced Deposits export function
export function exportDepositsToExcel(deposits: any[], filename: string): void {
  try {
    const wb = XLSX.utils.book_new();
    
    const formattedData = deposits.map((deposit, index) => ({
      'No.': index + 1,
      'VOC Number': deposit.vocNumber,
      'Customer Name': deposit.customerName,
      'Deposit Date': format(deposit.date, 'yyyy-MM-dd'),
      'Payment Date': deposit.paymentDate ? format(deposit.paymentDate, 'yyyy-MM-dd') : 'Pending',
      'Deposit Amount': deposit.depositAmount,
      'Total Amount': deposit.totalAmount,
      'Remaining Amount': deposit.remainingAmount,
      'Payment Method': deposit.paymentMethod,
      'Status': deposit.status === 'paid' ? 'ပေးချေပြီး' : 'ပေးချေရန်ကျန်'
    }));

    // Add summary
    const totalDeposits = deposits.reduce((sum, d) => sum + d.depositAmount, 0);
    const totalRemaining = deposits.reduce((sum, d) => sum + d.remainingAmount, 0);
    const paidCount = deposits.filter(d => d.status === 'paid').length;
    const pendingCount = deposits.filter(d => d.status === 'pending').length;

    formattedData.push(
      {},
      {
        'No.': '',
        'VOC Number': '📊 DEPOSITS SUMMARY',
        'Customer Name': '',
        'Deposit Date': '',
        'Payment Date': '',
        'Deposit Amount': '',
        'Total Amount': '',
        'Remaining Amount': '',
        'Payment Method': '',
        'Status': ''
      },
      {
        'No.': '',
        'VOC Number': 'Total Deposits Collected',
        'Customer Name': '',
        'Deposit Date': '',
        'Payment Date': '',
        'Deposit Amount': totalDeposits,
        'Total Amount': '',
        'Remaining Amount': '',
        'Payment Method': '',
        'Status': ''
      },
      {
        'No.': '',
        'VOC Number': 'Total Remaining',
        'Customer Name': '',
        'Deposit Date': '',
        'Payment Date': '',
        'Deposit Amount': '',
        'Total Amount': '',
        'Remaining Amount': totalRemaining,
        'Payment Method': '',
        'Status': ''
      },
      {
        'No.': '',
        'VOC Number': 'Paid Deposits',
        'Customer Name': '',
        'Deposit Date': '',
        'Payment Date': '',
        'Deposit Amount': '',
        'Total Amount': '',
        'Remaining Amount': '',
        'Payment Method': '',
        'Status': `${paidCount} deposits`
      },
      {
        'No.': '',
        'VOC Number': 'Pending Deposits',
        'Customer Name': '',
        'Deposit Date': '',
        'Payment Date': '',
        'Deposit Amount': '',
        'Total Amount': '',
        'Remaining Amount': '',
        'Payment Method': '',
        'Status': `${pendingCount} deposits`
      }
    );

    const ws = XLSX.utils.json_to_sheet(formattedData);

    // Column widths
    ws['!cols'] = [
      { wch: 6 },   // No.
      { wch: 18 },  // VOC Number
      { wch: 25 },  // Customer Name
      { wch: 15 },  // Deposit Date
      { wch: 15 },  // Payment Date
      { wch: 15 },  // Deposit Amount
      { wch: 15 },  // Total Amount
      { wch: 15 },  // Remaining Amount
      { wch: 15 },  // Payment Method
      { wch: 20 }   // Status
    ];

    // Apply styling similar to VOC export
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Header styling
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: COLORS.navy } },
        font: { 
          color: { rgb: COLORS.white }, 
          bold: true, 
          sz: 12,
          name: 'Calibri'
        },
        alignment: { 
          horizontal: 'center', 
          vertical: 'center',
          wrapText: true
        },
        border: {
          top: { style: 'thin', color: { rgb: COLORS.gold } },
          bottom: { style: 'thin', color: { rgb: COLORS.gold } },
          left: { style: 'thin', color: { rgb: COLORS.gold } },
          right: { style: 'thin', color: { rgb: COLORS.gold } }
        }
      };
    }

    // Data row styling
    for (let row = 1; row <= range.e.r; row++) {
      const isEvenRow = row % 2 === 0;
      const isSummaryRow = formattedData[row - 1]?.['VOC Number']?.includes('SUMMARY') || 
                          formattedData[row - 1]?.['VOC Number']?.includes('Total') ||
                          formattedData[row - 1]?.['VOC Number']?.includes('Paid') ||
                          formattedData[row - 1]?.['VOC Number']?.includes('Pending');
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;

        let fillColor = isEvenRow ? COLORS.lightGold : COLORS.white;
        let fontColor = COLORS.darkGray;
        let isBold = false;

        if (isSummaryRow) {
          fillColor = COLORS.gold;
          fontColor = COLORS.navy;
          isBold = true;
        }

        ws[cellAddress].s = {
          fill: { fgColor: { rgb: fillColor } },
          font: { 
            color: { rgb: fontColor }, 
            bold: isBold,
            sz: 10,
            name: 'Calibri'
          },
          alignment: { 
            horizontal: col === 0 ? 'center' : 'left', 
            vertical: 'center'
          },
          border: {
            top: { style: 'thin', color: { rgb: COLORS.lightGray } },
            bottom: { style: 'thin', color: { rgb: COLORS.lightGray } },
            left: { style: 'thin', color: { rgb: COLORS.lightGray } },
            right: { style: 'thin', color: { rgb: COLORS.lightGray } }
          }
        };

        // Currency formatting
        const currencyColumns = ['Deposit Amount', 'Total Amount', 'Remaining Amount'];
        const header = Object.keys(formattedData[0] || {})[col];
        
        if (currencyColumns.includes(header) && typeof ws[cellAddress].v === 'number') {
          ws[cellAddress].z = '#,##0';
          ws[cellAddress].s.alignment.horizontal = 'right';
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Deposits Report');

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
    
  } catch (error) {
    console.error('Error exporting deposits to Excel:', error);
    throw new Error('Failed to export deposits to Excel. Please try again.');
  }
}

export function exportDepositsToGoogleSheets(deposits: any[], filename: string): void {
  try {
    const formattedData = deposits.map((deposit, index) => ({
      'No.': index + 1,
      'VOC Number': deposit.vocNumber,
      'Customer Name': deposit.customerName,
      'Deposit Date': format(deposit.date, 'yyyy-MM-dd'),
      'Payment Date': deposit.paymentDate ? format(deposit.paymentDate, 'yyyy-MM-dd') : 'Pending',
      'Deposit Amount': formatCurrency(deposit.depositAmount),
      'Total Amount': formatCurrency(deposit.totalAmount),
      'Remaining Amount': formatCurrency(deposit.remainingAmount),
      'Payment Method': deposit.paymentMethod,
      'Status': deposit.status === 'paid' ? 'ပေးချေပြီး' : 'ပေးချေရန်ကျန်'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    link.download = `${filename}_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      window.open('https://docs.google.com/spreadsheets/create', '_blank');
    }, 1000);
    
  } catch (error) {
    console.error('Error exporting deposits to Google Sheets:', error);
    throw new Error('Failed to export deposits to Google Sheets. Please try again.');
  }
}