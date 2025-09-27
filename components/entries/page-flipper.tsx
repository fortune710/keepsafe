import React, { useCallback, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { Dimensions, ViewStyle, View, Text } from 'react-native';
import {
  useSharedValue,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

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

const PageFlipper = forwardRef<PageFlipperRef, PageFlipperProps>(({
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
  
  // State for current page index (using regular state instead of shared value for page data)
  const [currentPageState, setCurrentPageState] = useState(initialPage);
  
  // Animated values
  const translateX = useSharedValue(0);
  const currentPageIndex = useSharedValue(initialPage);
  const isFlipping = useSharedValue(false);
  const canInteract = useSharedValue(enableInteraction);
  
  // Auto flip timer
  const autoFlipTimer = React.useRef<number | null>(null);
  const isAutoFlipActive = useSharedValue(autoFlip);
  
  const canvasWidth = (style?.width as number) || SCREEN_WIDTH;
  const canvasHeight = (style?.height as number) || SCREEN_HEIGHT;

  // Update state when shared value changes
  const updateCurrentPageState = useCallback((newIndex: number) => {
    setCurrentPageState(newIndex);
  }, []);

  // Safe page access
  const getCurrentItem = useCallback(() => {
    return currentPageState >= 0 && currentPageState < totalPages ? data[currentPageState] : null;
  }, [data, totalPages, currentPageState]);

  // Animation functions with safety checks
  const flipToNext = useCallback(() => {
    'worklet';
    if (isFlipping.value || totalPages === 0) return;
    
    const current = currentPageIndex.value;
    const nextIndex = loopForever 
      ? (current + 1) % totalPages
      : Math.min(current + 1, totalPages - 1);
    
    if (nextIndex !== current) {
      isFlipping.value = true;
      canInteract.value = false;
      
      translateX.value = withTiming(
        flipDirection === 'right' ? -canvasWidth : canvasWidth,
        { duration: animationTime },
        (finished) => {
          if (finished) {
            currentPageIndex.value = nextIndex;
            runOnJS(updateCurrentPageState)(nextIndex);
            translateX.value = 0;
            isFlipping.value = false;
            canInteract.value = enableInteraction;
            
            if (onFlipped && data[nextIndex]) {
              runOnJS(onFlipped)(nextIndex, data[nextIndex]);
            }
            if (onFlippedEnd && data[nextIndex]) {
              runOnJS(onFlippedEnd)(nextIndex, data[nextIndex]);
            }
          }
        }
      );
    }
  }, [totalPages, loopForever, canvasWidth, animationTime, flipDirection, onFlipped, onFlippedEnd, data, enableInteraction, updateCurrentPageState]);

  const flipToPrevious = useCallback(() => {
    'worklet';
    if (isFlipping.value || totalPages === 0) return;
    
    const current = currentPageIndex.value;
    const prevIndex = loopForever
      ? (current - 1 + totalPages) % totalPages
      : Math.max(current - 1, 0);
    
    if (prevIndex !== current) {
      isFlipping.value = true;
      canInteract.value = false;
      
      translateX.value = withTiming(
        flipDirection === 'right' ? canvasWidth : -canvasWidth,
        { duration: animationTime },
        (finished) => {
          if (finished) {
            currentPageIndex.value = prevIndex;
            runOnJS(updateCurrentPageState)(prevIndex);
            translateX.value = 0;
            isFlipping.value = false;
            canInteract.value = enableInteraction;
            
            if (onFlipped && data[prevIndex]) {
              runOnJS(onFlipped)(prevIndex, data[prevIndex]);
            }
            if (onFlippedEnd && data[prevIndex]) {
              runOnJS(onFlippedEnd)(prevIndex, data[prevIndex]);
            }
          }
        }
      );
    }
  }, [totalPages, loopForever, canvasWidth, animationTime, flipDirection, onFlipped, onFlippedEnd, data, enableInteraction, updateCurrentPageState]);

  const flipToPage = useCallback((pageIndex: number) => {
    'worklet';
    if (isFlipping.value || totalPages === 0) return;
    if (pageIndex < 0 || pageIndex >= totalPages || pageIndex === currentPageIndex.value) return;
    
    isFlipping.value = true;
    canInteract.value = false;
    const direction = pageIndex > currentPageIndex.value ? -1 : 1;
    
    translateX.value = withTiming(
      direction * canvasWidth,
      { duration: animationTime },
      (finished) => {
        if (finished) {
          currentPageIndex.value = pageIndex;
          runOnJS(updateCurrentPageState)(pageIndex);
          translateX.value = 0;
          isFlipping.value = false;
          canInteract.value = enableInteraction;
          
          if (onFlipped && data[pageIndex]) {
            runOnJS(onFlipped)(pageIndex, data[pageIndex]);
          }
          if (onFlippedEnd && data[pageIndex]) {
            runOnJS(onFlippedEnd)(pageIndex, data[pageIndex]);
          }
        }
      }
    );
  }, [totalPages, canvasWidth, animationTime, onFlipped, onFlippedEnd, data, enableInteraction, updateCurrentPageState]);

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

  // Create gesture using the new Gesture API
  const panGesture = Gesture.Pan()
    .enabled(flipOnTouch)
    .onStart(() => {
      'worklet';
      if (!flipOnTouch) return;
      isAutoFlipActive.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      if (!flipOnTouch || isFlipping.value) return;
      translateX.value = event.translationX;
      canInteract.value = false;
    })
    .onEnd((event) => {
      'worklet';
      if (!flipOnTouch) return;
      
      const threshold = canvasWidth * flipThreshold;
      const velocity = Math.abs(event.velocityX);
      const translation = event.translationX;
      
      if (Math.abs(translation) > threshold || velocity > 500) {
        if (translation > 0) {
          flipToPrevious();
        } else if (translation < 0) {
          flipToNext();
        }
      } else {
        translateX.value = withSpring(0, springConfig, () => {
          'worklet';
          canInteract.value = enableInteraction;
        });
      }
      
      if (autoFlip) {
        isAutoFlipActive.value = true;
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(clickToFlip && enableInteraction)
    .onEnd((event) => {
      'worklet';
      if (!clickToFlip || !enableInteraction || isFlipping.value) return;
      
      const { x } = event;
      if (x < canvasWidth / 2) {
        flipToPrevious();
      } else {
        flipToNext();
      }
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  // Animated styles for pages with 3D transform
  const currentPageStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-canvasWidth, 0, canvasWidth],
      [maxAngle, 0, -maxAngle],
      Extrapolate.CLAMP
    );
    
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, canvasWidth * 0.3],
      [1, 0.95],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { perspective: perspective * 10 },
        { rotateY: `${rotation}deg` },
        { scale: scale },
      ],
      zIndex: canInteract.value ? 10 : 1,
    };
  });

  const nextPageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + canvasWidth },
    ],
    zIndex: 0,
    opacity: 0.8,
  }));

  const prevPageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - canvasWidth },
    ],
    zIndex: 0,
    opacity: 0.8,
  }));

  // Shadow overlay for 3D effect
  const shadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      Math.abs(translateX.value),
      [0, canvasWidth * 0.5],
      [0, 0.3],
      Extrapolate.CLAMP
    );

    return {
      opacity: shadowOpacity,
    };
  });

  // Render safe page component
  const renderSafePage = useCallback((pageData: any | null, index: number, isCurrentPage: boolean) => {
    if (!pageData || !renderPage) {
      return (
        <View style={[{
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#f0f0f0',
          justifyContent: 'center',
          alignItems: 'center',
        }, pageStyle]}>
          <View style={{
            padding: 20,
            backgroundColor: '#ddd',
            borderRadius: 8,
          }}>
            <Text>Page {index + 1}</Text>
          </View>
        </View>
      );
    }

    try {
      return (
        <View style={[{
          width: canvasWidth,
          height: canvasHeight,
        }, pageStyle]}>
          {renderPage(pageData, index, isCurrentPage)}
        </View>
      );
    } catch (error) {
      console.warn('PageFlipper: Error rendering page', index, error);
      return (
        <View style={[{
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: '#fff',
          justifyContent: 'center',
          alignItems: 'center',
        }, pageStyle]}>
          <Text>Error loading page {index + 1}</Text>
        </View>
      );
    }
  }, [renderPage, canvasWidth, canvasHeight, pageStyle]);

  // Get adjacent pages safely using regular state
  const currentData = data[currentPageState] || null;
  
  const getNextIndex = () => {
    return loopForever 
      ? (currentPageState + 1) % totalPages
      : currentPageState + 1;
  };
  
  const getPrevIndex = () => {
    return loopForever
      ? (currentPageState - 1 + totalPages) % totalPages
      : currentPageState - 1;
  };

  const nextIndex = getNextIndex();
  const prevIndex = getPrevIndex();
  
  const nextData = nextIndex >= 0 && nextIndex < totalPages ? data[nextIndex] : null;
  const prevData = prevIndex >= 0 && prevIndex < totalPages ? data[prevIndex] : null;

  return (
    <GestureHandlerRootView style={[{ width: canvasWidth, height: canvasHeight }, style]}>
      <GestureDetector gesture={composedGesture}>
        <View style={[{ width: canvasWidth, height: canvasHeight, overflow: 'hidden' }]}>
          {/* Shadow overlay for 3D effect */}
          <Animated.View 
            style={[{
              position: 'absolute',
              width: canvasWidth,
              height: canvasHeight,
              backgroundColor: 'rgba(0,0,0,0.1)',
              zIndex: 5,
            }, shadowStyle]} 
          />

          {/* Previous Page */}
          {prevData && (
            <Animated.View style={[{ position: 'absolute' }, prevPageStyle]}>
              {renderSafePage(prevData, prevIndex, false)}
            </Animated.View>
          )}

          {/* Current Page */}
          <Animated.View style={[{ position: 'absolute' }, currentPageStyle]}>
            {renderSafePage(currentData, currentPageState, true)}
          </Animated.View>

          {/* Next Page */}
          {nextData && (
            <Animated.View style={[{ position: 'absolute' }, nextPageStyle]}>
              {renderSafePage(nextData, nextIndex, false)}
            </Animated.View>
          )}

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
});

PageFlipper.displayName = 'PageFlipper';

export default PageFlipper;