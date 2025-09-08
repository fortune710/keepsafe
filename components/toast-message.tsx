import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';

interface ToastMessageProps {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

export default function ToastMessage({ message, type, visible }: ToastMessageProps) {
  if (!visible) return null;

  return (
    <Animated.View 
      entering={SlideInDown.duration(300).springify().damping(20).stiffness(90)} 
      exiting={SlideOutUp.duration(200)}
      style={[
        styles.container,
        type === 'success' ? styles.successContainer : styles.errorContainer
      ]}
    >
      <Text style={[
        styles.message,
        type === 'success' ? styles.successText : styles.errorText
      ]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    maxWidth: 320,
    alignSelf: 'center',
  },
  successContainer: {
    backgroundColor: '#10B981',
  },
  errorContainer: {
    backgroundColor: '#EF4444',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  successText: {
    color: 'white',
  },
  errorText: {
    color: 'white',
  },
});