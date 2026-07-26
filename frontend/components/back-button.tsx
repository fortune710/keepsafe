import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { HeaderBackButton } from '@react-navigation/elements';
import { scale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';

interface BackButtonProps {
  onPress: () => void;
  color?: string;
}

// Uses react-navigation's native HeaderBackButton (correct per-platform press
// feedback - opacity on iOS, ripple on Android) with a custom icon, since the
// component's built-in icon reserves trailing space for a "Back" label that
// throws the chevron off-center once that label is hidden.
export function BackButton({ onPress, color = '#64748B' }: BackButtonProps) {
  return (
    <View style={styles.container}>
      <HeaderBackButton
        onPress={onPress}
        tintColor={color}
        displayMode="minimal"
        style={styles.button}
        backImage={({ tintColor }) => (
          <ChevronLeft color={tintColor ?? color} size={scale(22)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  button: {
    paddingHorizontal: 0,
    marginHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
