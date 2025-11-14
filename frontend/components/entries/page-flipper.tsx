import React, { useCallback, useImperativeHandle, forwardRef, useState, useEffect, useMemo } from 'react';
import { Dimensions, ViewStyle, View, Text } from 'react-native';
import {
  useSharedValue,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  useDerivedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  Canvas,
  Path,
  Skia,
  LinearGradient,
  vec,
  Group,
  Rect,
  Shadow,
  Text as SkiaText,
  useFont,
} from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PageFlipperProps<T = any> {
  data: T[];
  renderPage: (item: T, index: number, isCurrentPage: boolean) => React.ReactNode;
  style?: ViewStyle;
  pageStyle?: ViewStyle;
  orientation?: 'portrait' | 'landscape';
  onFlipped?: (index: number, item: T) => void;
  onFlippedEnd?: (index: number, item: T) => void;
  flipOnTouch?: boolean;
  loopForever?: boolean;
  autoFlipTimerTime?: number;
  autoFlip?: boolean;
  clickToFlip?: boolean;
  flipDirection?: 'left' | 'right';
  maxAngle?: number;
  perspective?: number;
  animationTime?: number;
  currentPage?: number;
  showPageIndicator?: boolean;
  pageIndicatorStyle?: ViewStyle;
  enableInteraction?: boolean;
  flipThreshold?: number;
  springConfig?: {
    damping: number;
    stiffness: number;
    mass: number;
  };
}

export interface PageFlipperRef {
  flipToNext: () => void;
  flipToPrevious: () => void;
  flipToPage: (page: number) => void;
  getCurrentPage: () => number;
  getCurrentItem: () => any | null;
  stopAutoFlip: () => void;
  startAutoFlip: () => void;
}

const PageFlipper = React.memo(forwardRef<PageFlipperRef, PageFlipperProps>(({
  data = [],
  renderPage,
  style,
  pageStyle,
  orientation = 'portrait',
  onFlipped,
  onFlippedEnd,
  flipOnTouch = true,
  loopForever = false,
  autoFlipTimerTime = 3000,
  autoFlip = false,
  clickToFlip = true,
  flipDirection = 'right',
  maxAngle = 45,
  perspective = 150,
  animationTime = 600,
  currentPage = 0,
  showPageIndicator = false,
  pageIndicatorStyle,
  enableInteraction = true,
  flipThreshold = 0.3,
  springConfig = {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
}, ref) => {
  const totalPages = data.length;
  
  // Safety check for empty data
  if (totalPages === 0) {
    return (
      <GestureHandlerRootView style={[{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, style]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>No pages to display</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  // Clamp initial page to valid range
  const initialPage = Math.max(0, Math.min(currentPage, totalPages - 1));
  
  // State for current page index
  const [currentPageState, setCurrentPageState] = useState(initialPage);
  
  // Reanimated shared values for Skia integration
  const flipProgress = useSharedValue(0);
  const isFlipping = useSharedValue(false);
  const canInteract = useSharedValue(enableInteraction);
  
  // Auto flip timer
  const autoFlipTimer = React.useRef<number | null>(null);
  const isAutoFlipActive = useSharedValue(autoFlip);
  
  const canvasWidth = (style?.width as number) || SCREEN_WIDTH;
  const canvasHeight = (style?.height as number) || SCREEN_HEIGHT;
  
  // Load font for SkiaText
  const font = useFont(null, 16);

  // Update state when shared value changes
  const updateCurrentPageState = useCallback((newIndex: number) => {
    setCurrentPageState(newIndex);
  }, []);

  // Safe page access
  const getCurrentItem = useCallback(() => {
    return currentPageState >= 0 && currentPageState < totalPages ? data[currentPageState] : null;
  }, [data, totalPages, currentPageState]);

  // Reanimated-based animation functions
  const flipToNext = useCallback(() => {
    if (isFlipping.value || totalPages === 0) return;
    
    const nextIndex = loopForever 
      ? (currentPageState + 1) % totalPages
      : Math.min(currentPageState + 1, totalPages - 1);
    
    if (nextIndex !== currentPageState) {
      isFlipping.value = true;
      canInteract.value = false;
      
      flipProgress.value = withTiming(1, { duration: animationTime }, (finished) => {
        if (finished) {
          updateCurrentPageState(nextIndex);
          flipProgress.value = 0;
          isFlipping.value = false;
          canInteract.value = enableInteraction;
          
          if (onFlipped && data[nextIndex]) {
            onFlipped(nextIndex, data[nextIndex]);
          }
          if (onFlippedEnd && data[nextIndex]) {
            onFlippedEnd(nextIndex, data[nextIndex]);
          }
        }
      });
    }
  }, [totalPages, loopForever, animationTime, onFlipped, onFlippedEnd, data, enableInteraction, updateCurrentPageState, currentPageState]);

  const flipToPrevious = useCallback(() => {
    if (isFlipping.value || totalPages === 0) return;
    
    const prevIndex = loopForever
      ? (currentPageState - 1 + totalPages) % totalPages
      : Math.max(currentPageState - 1, 0);
    
    if (prevIndex !== currentPageState) {
      isFlipping.value = true;
      canInteract.value = false;
      
      flipProgress.value = withTiming(-1, { duration: animationTime }, (finished) => {
        if (finished) {
          updateCurrentPageState(prevIndex);
          flipProgress.value = 0;
          isFlipping.value = false;
          canInteract.value = enableInteraction;
          
          if (onFlipped && data[prevIndex]) {
            onFlipped(prevIndex, data[prevIndex]);
          }
          if (onFlippedEnd && data[prevIndex]) {
            onFlippedEnd(prevIndex, data[prevIndex]);
          }
        }
      });
    }
  }, [totalPages, loopForever, animationTime, onFlipped, onFlippedEnd, data, enableInteraction, updateCurrentPageState, currentPageState]);

  const flipToPage = useCallback((pageIndex: number) => {
    if (isFlipping.value || totalPages === 0) return;
    if (pageIndex < 0 || pageIndex >= totalPages || pageIndex === currentPageState) return;
    
    isFlipping.value = true;
    canInteract.value = false;
    const direction = pageIndex > currentPageState ? 1 : -1;
    
    flipProgress.value = withTiming(direction, { duration: animationTime }, (finished) => {
      if (finished) {
        updateCurrentPageState(pageIndex);
        flipProgress.value = 0;
        isFlipping.value = false;
        canInteract.value = enableInteraction;
        
        if (onFlipped && data[pageIndex]) {
          onFlipped(pageIndex, data[pageIndex]);
        }
        if (onFlippedEnd && data[pageIndex]) {
          onFlippedEnd(pageIndex, data[pageIndex]);
        }
      }
    });
  }, [totalPages, animationTime, onFlipped, onFlippedEnd, data, enableInteraction, updateCurrentPageState, currentPageState]);

  // Auto flip management
  const startAutoFlip = useCallback(() => {
    if (autoFlipTimer.current) {
      clearInterval(autoFlipTimer.current);
    }
    
    if (autoFlipTimerTime > 0 && totalPages > 1) {
      autoFlipTimer.current = setInterval(() => {
        if (isAutoFlipActive.value && !isFlipping.value) {
          runOnJS(flipToNext)();
        }
      }, autoFlipTimerTime);
    }
  }, [autoFlipTimerTime, totalPages, flipToNext]);

  const stopAutoFlip = useCallback(() => {
    isAutoFlipActive.value = false;
    if (autoFlipTimer.current) {
      clearInterval(autoFlipTimer.current);
      autoFlipTimer.current = null;
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    flipToNext: () => runOnJS(flipToNext)(),
    flipToPrevious: () => runOnJS(flipToPrevious)(),
    flipToPage: (page: number) => runOnJS(flipToPage)(page),
    getCurrentPage: () => currentPageState,
    getCurrentItem,
    stopAutoFlip,
    startAutoFlip: () => {
      isAutoFlipActive.value = true;
      startAutoFlip();
    },
  }));

  // Auto flip setup
  useEffect(() => {
    if (autoFlip) {
      isAutoFlipActive.value = true;
      startAutoFlip();
    }

    return () => {
      stopAutoFlip();
    };
  }, [autoFlip, startAutoFlip, stopAutoFlip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoFlipTimer.current) {
        clearInterval(autoFlipTimer.current);
      }
    };
  }, []);

  // Optimized gesture handling with better responsiveness
  const panGesture = useMemo(() => Gesture.Pan()
    .enabled(flipOnTouch && canInteract.value)
    .onStart(() => {
      if (!flipOnTouch || !canInteract.value) return;
      isAutoFlipActive.value = false;
    })
    .onUpdate((event) => {
      if (!flipOnTouch || isFlipping.value || !canInteract.value) return;
      
      // Smooth progress calculation with better sensitivity
      const sensitivity = 0.6;
      const progress = Math.max(-1, Math.min(1, event.translationX / (canvasWidth * sensitivity)));
      flipProgress.value = progress;
    })
    .onEnd((event) => {
      if (!flipOnTouch || !canInteract.value) return;
      
      const threshold = canvasWidth * flipThreshold;
      const velocity = Math.abs(event.velocityX);
      const translation = event.translationX;
      
      // Enhanced threshold logic for better UX
      const shouldFlip = Math.abs(translation) > threshold || velocity > 300;
      
      if (shouldFlip) {
        if (translation > 0) {
          flipToPrevious();
        } else if (translation < 0) {
          flipToNext();
        }
      } else {
        // Smooth return to original position
        flipProgress.value = withSpring(0, {
          damping: springConfig.damping,
          stiffness: springConfig.stiffness,
          mass: springConfig.mass,
        });
      }
      
      if (autoFlip) {
        isAutoFlipActive.value = true;
      }
    }), [flipOnTouch, canInteract, isFlipping, canvasWidth, flipThreshold, springConfig, autoFlip, flipToPrevious, flipToNext]);

  const tapGesture = useMemo(() => Gesture.Tap()
    .enabled(clickToFlip && enableInteraction && canInteract.value)
    .onEnd((event) => {
      if (!clickToFlip || !enableInteraction || isFlipping.value || !canInteract.value) return;
      
      const { x } = event;
      if (x < canvasWidth / 2) {
        flipToPrevious();
      } else {
        flipToNext();
      }
    }), [clickToFlip, enableInteraction, canInteract, isFlipping, canvasWidth, flipToPrevious, flipToNext]);

  // Combine gestures with proper memoization
  const composedGesture = useMemo(() => 
    Gesture.Simultaneous(panGesture, tapGesture), 
    [panGesture, tapGesture]
  );

  // Skia-based page flip path calculation with realistic curl using useDerivedValue
  const pageFlipPath = useDerivedValue(() => {
    const progress = flipProgress.value;
    const path = Skia.Path.Make();
    
    if (Math.abs(progress) < 0.01) {
      // No flip - return straight rectangle
      path.addRect(Skia.XYWHRect(0, 0, canvasWidth, canvasHeight));
      return path;
    }
    
    // Calculate realistic page curl effect
    const absProgress = Math.abs(progress);
    const direction = progress > 0 ? 1 : -1;
    
    // Curl parameters for realistic effect
    const curlX = canvasWidth * (1 - absProgress * 0.8);
    const curlY = canvasHeight * 0.5;
    const controlX = canvasWidth * (0.3 + absProgress * 0.4 * direction);
    const controlY = canvasHeight * (0.2 + absProgress * 0.1);
    
    // Create curved path for page flip with multiple control points for realism
    path.moveTo(0, 0);
    path.lineTo(curlX, 0);
    
    // Top curve
    path.quadTo(
      controlX, 
      controlY, 
      curlX, 
      curlY * 0.4
    );
    
    // Middle curve
    path.quadTo(
      controlX + direction * canvasWidth * 0.1, 
      curlY, 
      curlX, 
      curlY
    );
    
    // Bottom curve
    path.quadTo(
      controlX, 
      canvasHeight - controlY, 
      curlX, 
      canvasHeight * 0.6
    );
    
    path.lineTo(curlX, canvasHeight);
    path.lineTo(0, canvasHeight);
    path.close();
    
    return path;
  }, [flipProgress, canvasWidth, canvasHeight]);

  // Shadow gradient for realistic effect using useDerivedValue
  const shadowGradient = useDerivedValue(() => {
    const progress = Math.abs(flipProgress.value);
    return {
      start: vec(0, 0),
      end: vec(canvasWidth, 0),
      colors: ['rgba(0,0,0,0)', `rgba(0,0,0,${0.3 * progress})`]
    };
  });

  // Memoized page content to prevent unnecessary re-renders
  const currentData = useMemo(() => data[currentPageState] || null, [data, currentPageState]);
  
  const getNextIndex = useMemo(() => {
    return loopForever 
      ? (currentPageState + 1) % totalPages
      : currentPageState + 1;
  }, [loopForever, currentPageState, totalPages]);
  
  const getPrevIndex = useMemo(() => {
    return loopForever
      ? (currentPageState - 1 + totalPages) % totalPages
      : currentPageState - 1;
  }, [loopForever, currentPageState, totalPages]);

  const nextData = useMemo(() => {
    const nextIndex = getNextIndex;
    return nextIndex >= 0 && nextIndex < totalPages ? data[nextIndex] : null;
  }, [data, getNextIndex, totalPages]);
  
  const prevData = useMemo(() => {
    const prevIndex = getPrevIndex;
    return prevIndex >= 0 && prevIndex < totalPages ? data[prevIndex] : null;
  }, [data, getPrevIndex, totalPages]);

  // Memoized page content rendering
  const pageContent = useMemo(() => {
    if (!currentData || !renderPage) {
      return (
        <View style={{
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#f0f0f0',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text>Page {currentPageState + 1}</Text>
        </View>
      );
    }

    try {
      return (
        <View style={{
          width: canvasWidth,
          height: canvasHeight,
        }}>
          {renderPage(currentData, currentPageState, true)}
        </View>
      );
    } catch (error) {
      console.warn('PageFlipper: Error rendering page', currentPageState, error);
      return (
        <View style={{
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#fff',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text>Error loading page {currentPageState + 1}</Text>
        </View>
      );
    }
  }, [currentData, currentPageState, renderPage, canvasWidth, canvasHeight]);

  // Simple animated styles for page flip effect
  const animatedPageStyle = useAnimatedStyle(() => {
    const progress = flipProgress.value;
    const rotation = progress * 45; // Max 45 degrees rotation
    const scale = 1 - Math.abs(progress) * 0.1; // Slight scale down during flip
    
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotation}deg` },
        { scale: scale },
      ],
    };
  });

  // Memoized Skia Canvas component for page flip effects only
  const SkiaPageFlipper = useMemo(() => {
    return (
      <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
        {/* Page flip shadow effect */}
        <Path path={pageFlipPath} color="rgba(0,0,0,0.1)">
          <Shadow 
            dx={Math.abs(flipProgress.value) * 5} 
            dy={Math.abs(flipProgress.value) * 3} 
            blur={10} 
            color="rgba(0,0,0,0.2)" 
          />
        </Path>
      </Canvas>
    );
  }, [canvasWidth, canvasHeight, pageFlipPath, flipProgress]);

  return (
    <GestureHandlerRootView style={[{ width: canvasWidth, height: canvasHeight }, style]}>
      <GestureDetector gesture={composedGesture}>
        <View style={{ width: canvasWidth, height: canvasHeight, overflow: 'hidden' }}>
          {/* Render the actual page content with flip animation */}
          <Animated.View style={[
            { 
              width: canvasWidth, 
              height: canvasHeight,
            },
            animatedPageStyle
          ]}>
            {pageContent}
          </Animated.View>
          
          {/* Skia overlay for additional shadow effects */}
          <View style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
            pointerEvents: 'none',
          }}>
            {SkiaPageFlipper}
          </View>
          
          {/* Page Indicator */}
          {showPageIndicator && totalPages > 1 && (
            <View style={[{
              position: 'absolute',
              bottom: 20,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }, pageIndicatorStyle]}>
              {data.map((_, index) => (
                <View
                  key={`indicator-${index}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === currentPageState ? '#007AFF' : 'rgba(0,0,0,0.3)',
                    marginHorizontal: 4,
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}));

PageFlipper.displayName = 'PageFlipper';

export default PageFlipper;