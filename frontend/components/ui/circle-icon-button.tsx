import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { scale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';

interface CircleIconButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

// Matches components/back-button.tsx's circular treatment exactly (flat Colors.card
// background + hairline border) so header icon actions look consistent with the
// back button used across the app (e.g. the Edit Profile screen).
export function CircleIconButton({
  children,
  onPress,
  size = 36,
  style,
  accessibilityLabel,
  accessibilityHint,
}: CircleIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        { width: scale(size), height: scale(size), borderRadius: scale(size / 2) },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
