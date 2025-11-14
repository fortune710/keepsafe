import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  animationDuration?: number;
  backgroundColor?: string;
  highlightColor?: string;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animationDuration = 1000,
  backgroundColor = '#E1E9EE',
  highlightColor = '#F2F8FC',
}: SkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue, animationDuration]);

  const shimmerStyle = {
    backgroundColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [backgroundColor, highlightColor],
    }),
  };

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View style={[styles.shimmer, shimmerStyle]} />
    </View>
  );
}

// Preset skeleton components for common use cases
export function SkeletonText({ lines = 3, ...props }: SkeletonProps & { lines?: number }) {
  return (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={16}
          width={index === lines - 1 ? '75%' : '100%'}
          style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
          {...props}
        />
      ))}
    </View>
  );
}

export function SkeletonCard({ ...props }: SkeletonProps) {
  return (
    <View style={styles.cardContainer}>
      <Skeleton height={200} borderRadius={8} style={{ marginBottom: 12 }} {...props} />
      <SkeletonText lines={2} {...props} />
    </View>
  );
}

export function SkeletonAvatar({ size = 40, ...props }: SkeletonProps & { size?: number }) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      {...props}
    />
  );
}

export function SkeletonButton({ ...props }: SkeletonProps) {
  return (
    <Skeleton
      height={44}
      borderRadius={8}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#E1E9EE',
  },
  shimmer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
  },
  cardContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
  },
});

export default Skeleton;
