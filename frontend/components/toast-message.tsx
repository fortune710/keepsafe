import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { SlideInDown, SlideOutUp, runOnJS } from 'react-native-reanimated';

interface ToastMessageProps {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
  onHide?: () => void;
}

export default function ToastMessage({ message, type, visible, onHide }: ToastMessageProps) {
  if (!visible) return null;

  return (
    <Animated.View 
      entering={SlideInDown.duration(300).springify().damping(20).stiffness(90)} 
      exiting={SlideOutUp.duration(200).withCallback(() => {
        if (onHide) {
          runOnJS(onHide)();
        }
      })}
      style={styles.outerContainer}
    >
      <View style={[
        styles.toastContainer,
        type === 'success' ? styles.successContainer : styles.errorContainer
      ]}>
        <Text style={[
          styles.message,
          type === 'success' ? styles.successText : styles.errorText
        ]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  toastContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 320,
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