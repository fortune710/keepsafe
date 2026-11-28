import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { BlurView } from 'expo-blur';
import { scale } from 'react-native-size-matters';
import { CircleCheck, CircleX } from 'lucide-react-native';

interface ToastMessageProps {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
  title?: string;
}

export default function ToastMessage({ message, type, visible, title }: ToastMessageProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) return;
      Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 180, useNativeDriver: true }).start();
    }).catch(() => {
      if (mounted) progress.setValue(1);
    });
    return () => { mounted = false; progress.stopAnimation(); };
  }, [visible, progress]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.outerContainer, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.toastShadow}>
        <BlurView intensity={65} tint="light" style={styles.toastContainer}>
          <View style={[styles.toastContent, type === 'success' ? styles.successContainer : styles.errorContainer]}>
            {type === 'success' ? <CircleCheck color="#047857" size={22} /> : <CircleX color="#B91C1C" size={22} />}
            <View style={styles.textContainer}>
              <Text style={[styles.title, type === 'success' ? styles.successText : styles.errorText]}>
                {title || (type === 'success' ? 'Success' : 'Something went wrong')}
              </Text>
              <Text style={styles.description}>{message}</Text>
            </View>
          </View>
        </BlurView>
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
    paddingHorizontal: scale(16),
  },
  toastShadow: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  toastContent: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successContainer: {
    backgroundColor: 'rgba(236, 253, 245, 0.7)',
  },
  errorContainer: {
    backgroundColor: 'rgba(254, 242, 242, 0.7)',
  },
  textContainer: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Figtree-SemiBold'
  },
  description: { fontSize: 14, lineHeight: 20, marginTop: 3, fontFamily: 'Figtree-Regular', color: '#334155' },
  successText: {
    color: '#065F46',
  },
  errorText: {
    color: '#991B1B',
  },
});
