import React from 'react';
import { VOC, VocItem } from '../../type/voc';
import { VOCTable } from './VocTable';
import { createTestVocItems } from '../../lib/vocQuantityUtils';

// Test component to demonstrate 0.5 quantities working
const VOCTestData: React.FC = () => {
  // Create test VOC data with 0.5 quantities using utility function
  const testItems = createTestVocItems();
  
  const testVOCs: VOC[] = [
    {
      id: 'test-voc-1',
      vocNumber: 'VOC-TEST-001',
      customerName: 'Test Customer',
      customerPhone: '09123456789',
      date: new Date().toISOString(),
      store: 'yangon',
      paymentMethod: 'cash',
      items: testItems.slice(0, 3), // First 3 items (0.5 sold, 0.5 error each)
      totalAmount: 90000,
      originalAmount: 90000,
      status: 'active'
    },
    {
      id: 'test-voc-2',
      vocNumber: 'VOC-TEST-002',
      customerName: 'Test Customer 2',
      customerPhone: '09987654321',
      date: new Date().toISOString(),
      store: 'yangon',
      paymentMethod: 'cash',
      items: testItems.slice(3, 5), // Last 2 items (perfect lens + defective frame)
      totalAmount: 50000,
      originalAmount: 80000,
      status: 'active'
    }
  ];

  const handleReturn = (id: string) => {
    console.log('Return VOC:', id);
    alert(`Returning VOC ${id} to inventory - both sold (0.5) and error (0.5) quantities will be returned`);
  };

  const handleDelete = (id: string) => {
    console.log('Delete VOC:', id);
    alert(`Deleting VOC ${id}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">VOC Test Data - 0.5 Quantities Demo</h2>
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200">Test Scenarios:</h3>
        <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 mt-2">
          <li><strong>VOC-TEST-001:</strong> Mixed quantities - Each item has 0.5 sold + 0.5 error</li>
          <li><strong>VOC-TEST-002:</strong> Edge cases - Perfect lens (1 sold, 0 error) + Defective frame (0 sold, 1 error)</li>
          <li>Both sold and error quantities should be clearly displayed</li>
          <li>Click "Return to Inv" to test inventory return functionality</li>
        </ul>
      </div>
      <VOCTable vocs={testVOCs} onReturn={handleReturn} onDelete={handleDelete} />
    </div>
  );
};

export default VOCTestData;