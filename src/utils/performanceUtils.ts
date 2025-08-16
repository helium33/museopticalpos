import React, { useCallback, useMemo, useRef,Suspense } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Custom hook for debounced functions
 * @param callback Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) => {
  const debouncedFn = useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  );

  // Clean up on unmount
  const cleanupRef = useRef(debouncedFn);
  
  return useCallback((...args: Parameters<T>) => {
    return cleanupRef.current(...args);
  }, []) as T;
};

/**
 * Custom hook for throttled functions
 * @param callback Function to throttle
 * @param delay Delay in milliseconds
 * @returns Throttled function
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) => {
  const throttledFn = useMemo(
    () => throttle(callback, delay),
    [callback, delay]
  );

  return useCallback((...args: Parameters<T>) => {
    return throttledFn(...args);
  }, [throttledFn]) as T;
};

/**
 * Debounced search hook - optimized for search inputs
 * @param searchCallback Function to call with search term
 * @param delay Delay in milliseconds (default: 300ms)
 * @returns Debounced search function
 */
export const useDebouncedSearch = (
  searchCallback: (searchTerm: string) => void,
  delay = 300
) => {
  return useDebounce(searchCallback, delay);
};

/**
 * Debounced form validation hook
 * @param validationCallback Function to call for validation
 * @param delay Delay in milliseconds (default: 500ms)
 * @returns Debounced validation function
 */
export const useDebouncedValidation = (
  validationCallback: (value: any) => void,
  delay = 500
) => {
  return useDebounce(validationCallback, delay);
};

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();

  static start(label: string) {
    this.measurements.set(label, performance.now());
  }

  static end(label: string): number {
    const startTime = this.measurements.get(label);
    if (!startTime) {
      console.warn(`No start time found for measurement: ${label}`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`⚡ Performance [${label}]: ${duration.toFixed(2)}ms`);
    this.measurements.delete(label);
    
    return duration;
  }
}

/**
 * Default loading component
//  */
// const DefaultLoadingComponent: React.FC = () => (
//   <div className="flex items-center justify-center min-h-screen">
//     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
//   </div>
// );

/**
 * Lazy component loader with error boundary
//  * @param importFn Dynamic import function
//  * @param FallbackComponent Fallback component while loading
//  * @returns Lazy component
//  */
// export const createLazyComponent = <T extends React.ComponentType<any>>(
//   importFn: () => Promise<{ default: T }>,
//   FallbackComponent: React.ComponentType = DefaultLoadingComponent
// ) => {
//   const LazyComponent = React.lazy(importFn);
  
//   return React.memo((props: React.ComponentProps<T>) => (
//     <React.Suspense fallback={<FallbackComponent}>
//       <LazyComponent {...props} />
//     </React.Suspense>
//   ));
// };

/**
 * Memory cleanup utility for preventing memory leaks
 */
export const useMemoryCleanup = () => {
  const cleanupFunctions = useRef<Array<() => void>>([]);
  
  const addCleanup = useCallback((fn: () => void) => {
    cleanupFunctions.current.push(fn);
  }, []);
  
  const cleanup = useCallback(() => {
    cleanupFunctions.current.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    cleanupFunctions.current = [];
  }, []);
  
  // Auto cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  return { addCleanup, cleanup };
};

/**
 * Efficient list rendering hook for large datasets
 */
export const useVirtualizedList = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  buffer = 5
) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
    );
    
    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop, buffer]);
  
  const handleScroll = useThrottle((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, 16); // 60fps
  
  return {
    ...visibleItems,
    handleScroll
  };
};

/**
 * Image lazy loading hook
 */
export const useImageLazyLoad = () => {
  const [loadedImages, setLoadedImages] = React.useState<Set<string>>(new Set());
  
  const loadImage = useCallback((src: string): Promise<void> => {
    if (loadedImages.has(src)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, src]));
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }, [loadedImages]);
  
  return { loadedImages, loadImage };
};

/**
 * Network-aware loading
 */
export const useNetworkAwareLoading = () => {
  const [connectionType, setConnectionType] = React.useState<string>('unknown');
  
  React.useEffect(() => {
    const updateConnectionType = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };
    
    updateConnectionType();
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateConnectionType);
      
      return () => {
        (navigator as any).connection.removeEventListener('change', updateConnectionType);
      };
    }
  }, []);
  
  const shouldLoadHighQuality = useMemo(() => {
    return ['4g', 'unknown'].includes(connectionType);
  }, [connectionType]);
  
  const shouldPreload = useMemo(() => {
    return connectionType === '4g';
  }, [connectionType]);
  
  return {
    connectionType,
    shouldLoadHighQuality,
    shouldPreload
  };
};