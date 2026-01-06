import { useState, useEffect } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

/**
 * iOS Design Guidelines for Tablets:
 * - Minimum touch target: 44x44 points
 * - iPad Pro 11": 834x1194 points (portrait), 1194x834 (landscape)
 * - iPad Pro 12.9": 1024x1366 points (portrait), 1366x1024 (landscape)
 * - iPad Air: 820x1180 points (portrait), 1180x820 (landscape)
 * - iPad Mini: 744x1133 points (portrait), 1133x744 (landscape)
 * 
 * Tablet breakpoint: width >= 768 points (iPad Mini minimum width)
 */
const TABLET_BREAKPOINT = 768;
const LARGE_TABLET_BREAKPOINT = 1024; // iPad Pro 12.9" and larger

export interface ResponsiveValues {
  isTablet: boolean;
  isLargeTablet: boolean;
  isPhone: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  
  // Responsive scaling functions
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
  moderateScale: (size: number, factor?: number) => number;
  
  // Tablet-specific spacing
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  
  // Tablet-specific typography
  typography: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  
  // Minimum touch target size (iOS guideline: 44pt)
  minTouchTarget: number;
  
  // Content width constraints for tablets
  maxContentWidth: number;
  contentPadding: number;
}

/**
 * Hook to detect device type and provide responsive utilities
 * Follows iOS Human Interface Guidelines for tablet design
 */
export function useResponsive(): ResponsiveValues {
  const [dimensions, setDimensions] = useState<ScaledSize>(() => 
    Dimensions.get('window')
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isTablet = width >= TABLET_BREAKPOINT;
  const isLargeTablet = width >= LARGE_TABLET_BREAKPOINT;
  const isPhone = !isTablet;
  const orientation = width > height ? 'landscape' : 'portrait';

  // Enhanced scaling for tablets - less aggressive scaling on larger screens
  const responsiveScale = (size: number): number => {
    if (isTablet) {
      // On tablets, scale less aggressively to maintain readability
      return scale(size * 0.9);
    }
    return scale(size);
  };

  const responsiveVerticalScale = (size: number): number => {
    if (isTablet) {
      return verticalScale(size * 0.9);
    }
    return verticalScale(size);
  };

  const responsiveModerateScale = (size: number, factor: number = 0.3): number => {
    if (isTablet) {
      return moderateScale(size * 0.9, factor);
    }
    return moderateScale(size, factor);
  };

  // Tablet-specific spacing (larger spacing on tablets)
  const spacing = {
    xs: isTablet ? 8 : 4,
    sm: isTablet ? 12 : 8,
    md: isTablet ? 20 : 16,
    lg: isTablet ? 32 : 24,
    xl: isTablet ? 48 : 32,
    xxl: isTablet ? 64 : 48,
  };

  // Tablet-specific typography (slightly larger on tablets)
  const typography = {
    xs: isTablet ? 12 : 10,
    sm: isTablet ? 14 : 12,
    md: isTablet ? 16 : 14,
    lg: isTablet ? 20 : 18,
    xl: isTablet ? 24 : 20,
    xxl: isTablet ? 32 : 24,
  };

  // iOS minimum touch target: 44 points
  const minTouchTarget = 44;

  // Content width constraints for tablets (max width for readability)
  const maxContentWidth = isTablet 
    ? (isLargeTablet ? 1200 : 900) 
    : width;

  // Content padding (more padding on tablets)
  const contentPadding = isTablet ? 40 : 20;

  return {
    isTablet,
    isLargeTablet,
    isPhone,
    width,
    height,
    orientation,
    scale: responsiveScale,
    verticalScale: responsiveVerticalScale,
    moderateScale: responsiveModerateScale,
    spacing,
    typography,
    minTouchTarget,
    maxContentWidth,
    contentPadding,
  };
}

/**
 * Hook to get device-specific layout configuration
 */
export function useTabletLayout() {
  const responsive = useResponsive();
  
  return {
    // Column configuration for tablet layouts
    columns: responsive.isTablet 
      ? (responsive.isLargeTablet ? 3 : 2)
      : 1,
    
    // Grid spacing
    gridGap: responsive.isTablet ? responsive.spacing.lg : responsive.spacing.md,
    
    // Card width calculation
    getCardWidth: (columns: number = 1) => {
      if (!responsive.isTablet) {
        return responsive.width - (responsive.contentPadding * 2);
      }
      const gap = responsive.spacing.lg * (columns - 1);
      return (responsive.maxContentWidth - gap - (responsive.contentPadding * 2)) / columns;
    },
    
    // Container styles
    containerStyle: {
      maxWidth: responsive.maxContentWidth,
      width: '100%',
      alignSelf: 'center' as const,
      paddingHorizontal: responsive.contentPadding,
    },
    
    // Safe area handling
    safeAreaPadding: responsive.isTablet ? responsive.spacing.lg : responsive.spacing.md,
  };
}

