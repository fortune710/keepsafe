import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';

interface NewEntriesIndicatorProps {
  count: number;
  onPress: () => void;
  visible: boolean;
}

export default function NewEntriesIndicator({ count, onPress, visible }: NewEntriesIndicatorProps) {
  if (!visible || count === 0) return null;

  const countText = count === 1 ? '1 new entry' : `${count} new entries`;

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify().damping(20).stiffness(90)}
      exiting={SlideOutUp.duration(200).springify().damping(20).stiffness(90)}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.text}>{countText}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
