import React, { useState } from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import VocTable from '../components/VocTable';
import VocReturnModal from '../components/VocReturnModal';
import { useVocManagement } from '../hooks/useVocManagement';
import { VOC } from '../../types/voc';

const VocManagementPage: React.FC = () => {
  const {
    vocs,
    loading,
    error,
    returnVocToInventory,
    deleteVoc,
    getVocStatistics
  } = useVocManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedVoc, setSelectedVoc] = useState<VOC | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  // Filter VOCs based on search and status
  const filteredVocs = vocs.filter(voc => {
    const matchesSearch = 
      voc.vocNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voc.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voc.customerPhone && voc.customerPhone.includes(searchTerm));
    
    const matchesStatus = statusFilter === 'all' || voc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statistics = getVocStatistics();

  const handleReturnClick = (vocId: string) => {
    const voc = vocs.find(v => v.id === vocId);
    if (voc) {
      setSelectedVoc(voc);
      setShowReturnModal(true);
    }
  };

  const handleReturnConfirm = async (vocId: string) => {
    setReturnLoading(true);
    try {
      await returnVocToInventory(vocId);
      setShowReturnModal(false);
      setSelectedVoc(null);
      
      // Show success message
      alert('VOC successfully returned to inventory!');
    } catch (err) {
      alert('Failed to return VOC to inventory. Please try again.');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleDeleteClick = async (vocId: string) => {
    if (window.confirm('Are you sure you want to delete this VOC? This action cannot be undone.')) {
      try {
        await deleteVoc(vocId);
        alert('VOC deleted successfully!');
      } catch (err) {
        alert('Failed to delete VOC. Please try again.');
      }
    }
  };

  const handleExportData = () => {
    // Implementation for exporting VOC data
    const dataStr = JSON.stringify(filteredVocs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `voc_data_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            VOC Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your Vision Optical Center records with error tracking and inventory returns
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total VOCs</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {statistics.totalVocs}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active VOCs</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {statistics.activeVocs}
                </p>
              </div>
            </div>
          </div>
       <
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <Filter className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">VOCs with Errors</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {statistics.vocsWithErrors}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Download className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {statistics.totalRevenue.toLocaleString()} MMK
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by VOC number, customer name, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="returned">Returned</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={handleExportData}
                leftIcon={<Download size={16} />}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* VOC Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading VOCs...</p>
            </div>
          ) : filteredVocs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No VOCs found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <VocTable
                vocs={filteredVocs}
                onReturn={handleReturnClick}
                onDelete={handleDeleteClick}
              />
            </div>
          )}
        </div>

        {/* Return Modal */}
        <VocReturnModal
          voc={selectedVoc}
          isOpen={showReturnModal}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedVoc(null);
          }}
          onConfirm={handleReturnConfirm}
          loading={returnLoading}
        />
      </div>
    </div>
  );
};

export default VocManagementPage;