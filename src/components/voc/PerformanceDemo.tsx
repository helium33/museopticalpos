import React, { useState, useEffect } from 'react';
import { Search, Zap, Image, Wifi } from 'lucide-react';
import {
  useDebouncedSearch,
  useDebouncedValidation,
  PerformanceMonitor,
  useMemoryCleanup,
  useVirtualizedList,
  useImageLazyLoad,
  useNetworkAwareLoading
} from '../utils/performance';

const PerformanceDemo: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [validationValue, setValidationValue] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [validationStatus, setValidationStatus] = useState<string>('');

  const { addCleanup } = useMemoryCleanup();
  const { loadedImages, loadImage } = useImageLazyLoad();
  const { connectionType, shouldLoadHighQuality } = useNetworkAwareLoading();

  // Simulated search function
  const performSearch = (term: string) => {
    PerformanceMonitor.start('search');
    
    // Simulate API call
    setTimeout(() => {
      const results = term 
        ? [`Result for "${term}" #1`, `Result for "${term}" #2`, `Result for "${term}" #3`]
        : [];
      
      setSearchResults(results);
      PerformanceMonitor.end('search');
    }, 100);
  };

  // Simulated validation function
  const validateInput = (value: string) => {
    PerformanceMonitor.start('validation');
    
    setTimeout(() => {
      const isValid = value.length >= 3 && /^[a-zA-Z\s]*$/.test(value);
      setValidationStatus(isValid ? '✅ Valid' : '❌ Invalid (min 3 chars, letters only)');
      PerformanceMonitor.end('validation');
    }, 50);
  };

  // Debounced functions
  const debouncedSearch = useDebouncedSearch(performSearch, 300);
  const debouncedValidation = useDebouncedValidation(validateInput, 500);

  // Large dataset for virtualization demo
  const largeDataset = Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`);
  
  const virtualizedList = useVirtualizedList(
    largeDataset,
    50, // item height
    300, // container height
    3 // buffer
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    if (validationValue) {
      debouncedValidation(validationValue);
    } else {
      setValidationStatus('');
    }
  }, [validationValue, debouncedValidation]);

  // Demo cleanup function
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Demo interval running');
    }, 5000);

    addCleanup(() => {
      clearInterval(interval);
      console.log('Demo cleanup executed');
    });

    return () => {
      clearInterval(interval);
    };
  }, [addCleanup]);

  const handleImageLoad = async (src: string) => {
    try {
      await loadImage(src);
      console.log(`Image loaded: ${src}`);
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Zap className="text-yellow-500" />
            Performance Utilities Demo
          </h1>
          <p className="text-gray-600 text-lg">
            Showcasing debounced search, validation, virtualization, and more
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Debounced Search */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Search className="text-blue-500" />
              Debounced Search
            </h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type to search... (300ms debounce)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="mt-4">
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Search Results:</p>
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-2 bg-blue-50 rounded border-l-4 border-blue-500"
                    >
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Debounced Validation */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Form Validation</h2>
            <input
              type="text"
              value={validationValue}
              onChange={(e) => setValidationValue(e.target.value)}
              placeholder="Enter text for validation... (500ms debounce)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {validationStatus && (
              <div className="mt-3 p-2 rounded bg-gray-50">
                <span className="text-sm">{validationStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Network Status */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Wifi className="text-green-500" />
            Network-Aware Loading
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Connection Type</p>
              <p className="text-lg font-semibold">{connectionType}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">High Quality Loading</p>
              <p className="text-lg font-semibold">
                {shouldLoadHighQuality ? '✅ Enabled' : '❌ Disabled'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Loaded Images</p>
              <p className="text-lg font-semibold">{loadedImages.size}</p>
            </div>
          </div>
          <button
            onClick={() => handleImageLoad('https://images.pexels.com/photos/147411/italy-mountains-dawn-daybreak-147411.jpeg')}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Load Demo Image
          </button>
        </div>

        {/* Virtualized List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Virtualized List (1000 items)</h2>
          <p className="text-gray-600 mb-4">
            Showing items {virtualizedList.startIndex + 1} - {virtualizedList.endIndex + 1}
          </p>
          <div
            className="border border-gray-300 rounded-lg overflow-auto"
            style={{ height: '300px' }}
            onScroll={virtualizedList.handleScroll}
          >
            <div style={{ height: virtualizedList.totalHeight, position: 'relative' }}>
              <div
                style={{
                  transform: `translateY(${virtualizedList.offsetY}px)`,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              >
                {virtualizedList.visibleItems.map((item, index) => (
                  <div
                    key={virtualizedList.startIndex + index}
                    className="h-12 flex items-center px-4 border-b border-gray-200 hover:bg-gray-50"
                    style={{ height: '50px' }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Monitor */}
        <div className="mt-8 bg-gray-800 text-green-400 rounded-xl p-4">
          <p className="text-sm font-mono">
            💡 Check browser console for performance measurements
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDemo;