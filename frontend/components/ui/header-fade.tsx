import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/lib/constants';

/** Fades scrolling content as it passes beneath a fixed header. */
export function HeaderFade({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[Colors.background, 'rgba(248, 252, 255, 0)']}
      style={[styles.fade, style]}
    />
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    zIndex: 9,
  },
});
