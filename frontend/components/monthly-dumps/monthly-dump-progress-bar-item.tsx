import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';

interface MonthlyDumpProgressBarItemProps {
  index: number;
  currentIndex: number;
  progress: SharedValue<number>;
}

export default function MonthlyDumpProgressBarItem({
  index,
  currentIndex,
  progress,
}: MonthlyDumpProgressBarItemProps) {
  const barProgressStyle = useAnimatedStyle(() => {
    if (index < currentIndex) return { width: '100%' };
    if (index > currentIndex) return { width: '0%' };
    return { width: `${progress.value * 100}%` };
  });

  return (
    <View style={styles.progressBarBackground}>
      <Animated.View style={[styles.progressBarFill, barProgressStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressBarBackground: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
  },
});
