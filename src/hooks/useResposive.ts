import { useState, useEffect } from 'react';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isTabletPortrait: boolean;
  isTabletLandscape: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isTabletPortrait: false,
    isTabletLandscape: false,
    isDesktop: false,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1280,
        isTabletPortrait: width >= 768 && width < 1024,
        isTabletLandscape: width >= 1024 && width < 1280,
        isDesktop: width >= 1280,
        width,
        height,
      });
    };

    // Initial update
    updateState();

    // Listen for resize events
    window.addEventListener('resize', updateState);
    
    // Listen for orientation changes on mobile devices
    window.addEventListener('orientationchange', () => {
      // Delay to ensure dimensions are updated after orientation change
      setTimeout(updateState, 100);
    });

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
};