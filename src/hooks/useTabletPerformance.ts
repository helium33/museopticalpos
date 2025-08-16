import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// 🚀 TABLET PERFORMANCE HOOKS - မြန်မာ Tablet အတွက် အထူး Performance Hooks

/**
 * Advanced Memory Monitor for Tablets
 * Tablet မှာ Memory usage ကို စောင့်ကြည့်မယ်
 */
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState({
    used: 0,
    total: 0,
    percentage: 0,
    isLowMemory: false
  });

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        const percentage = (used / total) * 100;
        
        setMemoryInfo({
          used: Math.round(used / 1024 / 1024), // MB
          total: Math.round(total / 1024 / 1024), // MB
          percentage: Math.round(percentage),
          isLowMemory: percentage > 80 // 80% ကျော်ရင် Low Memory
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

/**
 * Smart Debounce Hook for Tablet Performance
 * Tablet မှာ input lag မရှိအောင် intelligent debounce
 */
export const useSmartDebounce = <T>(value: T, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const memoryInfo = useMemoryMonitor();

  useEffect(() => {
    // Memory usage အပေါ်မှာ မူတည်ပြီး delay ကို adjust လုပ်မယ်
    let adjustedDelay = delay;
    if (memoryInfo.isLowMemory) {
      adjustedDelay = delay * 1.5; // Memory နည်းရင် delay တိုးမယ်
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, adjustedDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, memoryInfo.isLowMemory]);

  return debouncedValue;
};

/**
 * Virtual List Hook for Large Data Sets
 * အများကြီးရှိတဲ့ data တွေကို tablet မှာ မြန်မြန်ပြအောင်
 */
export const useVirtualList = <T>(
  items: T[],
  containerHeight: number,
  itemHeight: number = 60
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const memoryInfo = useMemoryMonitor();

  // Memory usage အပေါ်မှာ မူတည်ပြီး visible items ကို adjust လုပ်မယ်
  const visibleCount = useMemo(() => {
    const baseCount = Math.ceil(containerHeight / itemHeight) + 2;
    if (memoryInfo.isLowMemory) {
      return Math.max(5, Math.floor(baseCount * 0.7)); // Memory နည်းရင် items လျှော့မယ်
    }
    return baseCount;
  }, [containerHeight, itemHeight, memoryInfo.isLowMemory]);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount, items.length);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    startIndex,
    endIndex
  };
};

/**
 * Performance Monitor Hook
 * အက်ပ်ရဲ့ performance ကို real-time မှာ စောင့်ကြည့်မယ်
 */
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    fps: 60,
    renderTime: 0,
    isSlowDevice: false
  });

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let totalRenderTime = 0;

    const measurePerformance = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      frameCount++;
      totalRenderTime += deltaTime;

      // Every second, calculate FPS
      if (frameCount >= 60) {
        const avgRenderTime = totalRenderTime / frameCount;
        const fps = Math.round(1000 / avgRenderTime);
        
        setMetrics({
          fps,
          renderTime: Math.round(avgRenderTime),
          isSlowDevice: fps < 30 || avgRenderTime > 33 // 30 FPS ထက်နည်းရင် slow device
        });

        frameCount = 0;
        totalRenderTime = 0;
      }

      lastTime = currentTime;
      requestAnimationFrame(measurePerformance);
    };

    requestAnimationFrame(measurePerformance);
  }, []);

  return metrics;
};

/**
 * Smart Cache Hook with Memory Management
 * Memory ကို သုံးစွဲမှုကို ထိန်းချုပ်ပြီး smart cache လုပ်မယ်
 */
export const useSmartCache = <T>(key: string, initialValue?: T) => {
  const cacheRef = useRef(new Map<string, { value: T; timestamp: number }>());
  const memoryInfo = useMemoryMonitor();

  // Memory usage အပေါ်မှာ မူတည်ပြီး cache duration ကို adjust လုပ်မယ်
  const getCacheDuration = useCallback(() => {
    if (memoryInfo.isLowMemory) {
      return 30000; // 30 seconds for low memory
    }
    return 300000; // 5 minutes for normal memory
  }, [memoryInfo.isLowMemory]);

  const setValue = useCallback((newValue: T) => {
    const duration = getCacheDuration();
    cacheRef.current.set(key, {
      value: newValue,
      timestamp: Date.now()
    });

    // Memory နည်းရင် cache ကို အလိုအလျောက် သန့်ရှင်းမယ်
    if (memoryInfo.isLowMemory && cacheRef.current.size > 10) {
      const entries = Array.from(cacheRef.current.entries());
      const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 50% of entries
      const toRemove = sortedEntries.slice(0, Math.floor(sortedEntries.length / 2));
      toRemove.forEach(([cacheKey]) => {
        cacheRef.current.delete(cacheKey);
      });
    }
  }, [key, getCacheDuration, memoryInfo.isLowMemory]);

  const getValue = useCallback((): T | undefined => {
    const cached = cacheRef.current.get(key);
    if (!cached) return initialValue;

    const duration = getCacheDuration();
    if (Date.now() - cached.timestamp > duration) {
      cacheRef.current.delete(key);
      return initialValue;
    }

    return cached.value;
  }, [key, getCacheDuration, initialValue]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { setValue, getValue, clearCache };
};

/**
 * Tablet-Optimized Image Loading Hook
 * Tablet မှာ ပုံများကို မြန်မြန်ဖော်ပြအောင် optimize လုပ်မယ်
 */
export const useImageOptimization = () => {
  const memoryInfo = useMemoryMonitor();

  const optimizeImageUrl = useCallback((url: string, width?: number, height?: number) => {
    if (!url) return '';

    // Memory usage အပေါ်မှာ မူတည်ပြီး image quality ကို adjust လုပ်မယ်
    let quality = 90;
    if (memoryInfo.isLowMemory) {
      quality = 70;
    }

    // Tablet screen size အတွက် optimize လုပ်မယ်
    const maxWidth = width || (memoryInfo.isLowMemory ? 800 : 1200);
    const maxHeight = height || (memoryInfo.isLowMemory ? 600 : 800);

    // If it's a URL that supports query parameters, add optimization
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('w', maxWidth.toString());
      urlObj.searchParams.set('h', maxHeight.toString());
      urlObj.searchParams.set('q', quality.toString());
      return urlObj.toString();
    } catch {
      // If not a valid URL, return as is
      return url;
    }
  }, [memoryInfo.isLowMemory]);

  return { optimizeImageUrl };
};

/**
 * Battery-Aware Performance Hook
 * Battery level အပေါ်မှာ မူတည်ပြီး performance ကို adjust လုပ်မယ်
 */
export const useBatteryAwarePerformance = () => {
  const [batteryInfo, setBatteryInfo] = useState({
    level: 1,
    charging: true,
    isLowBattery: false
  });

  useEffect(() => {
    const updateBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          
          const updateInfo = () => {
            setBatteryInfo({
              level: battery.level,
              charging: battery.charging,
              isLowBattery: battery.level < 0.3 && !battery.charging
            });
          };

          updateInfo();
          
          battery.addEventListener('levelchange', updateInfo);
          battery.addEventListener('chargingchange', updateInfo);
          
          return () => {
            battery.removeEventListener('levelchange', updateInfo);
            battery.removeEventListener('chargingchange', updateInfo);
          };
        } catch (error) {
          console.log('Battery API not supported');
        }
      }
    };

    updateBatteryInfo();
  }, []);

  // Performance settings based on battery
  const getPerformanceSettings = useCallback(() => {
    if (batteryInfo.isLowBattery) {
      return {
        animationsEnabled: false,
        updateInterval: 2000, // Slower updates
        maxConcurrentRequests: 2,
        enableBackgroundSync: false
      };
    }

    return {
      animationsEnabled: true,
      updateInterval: 1000,
      maxConcurrentRequests: 5,
      enableBackgroundSync: true
    };
  }, [batteryInfo.isLowBattery]);

  return { batteryInfo, getPerformanceSettings };
};