import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';

export type CaptureUIMode = 'photo' | 'video' | 'audio';

const MODES: { key: CaptureUIMode; label: string }[] = [
  { key: 'video', label: 'VIDEO' },
  { key: 'photo', label: 'PHOTO' },
  { key: 'audio', label: 'AUDIO' },
];

const ITEM_WIDTH = scale(90);

interface CaptureModeSelectorProps {
  selectedMode: CaptureUIMode;
  onChange: (mode: CaptureUIMode) => void;
}

export function CaptureModeSelector({
  selectedMode,
  onChange,
}: CaptureModeSelectorProps) {
  const scrollRef = useRef<ScrollView>(null);
  // Measure the actual rendered width rather than assuming it matches the
  // device's window width, so the active item lands dead-center regardless
  // of any ancestor padding/maxWidth constraint.
  const [containerWidth, setContainerWidth] = useState(0);
  const sideInset = Math.max(0, (containerWidth - ITEM_WIDTH) / 2);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    scrollRef.current?.scrollTo({ x: index * ITEM_WIDTH, y: 0, animated });
  }, []);

  useEffect(() => {
    if (!containerWidth) return;
    const index = MODES.findIndex((mode) => mode.key === selectedMode);
    if (index >= 0) scrollToIndex(index, true);
  }, [selectedMode, containerWidth, scrollToIndex]);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const rawIndex = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
    const index = Math.max(0, Math.min(MODES.length - 1, rawIndex));
    const mode = MODES[index].key;
    if (mode !== selectedMode) {
      onChange(mode);
    } else {
      scrollToIndex(index, true);
    }
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      {containerWidth > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={ITEM_WIDTH}
          snapToAlignment="start"
          contentContainerStyle={{ paddingHorizontal: sideInset }}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
        >
          {MODES.map((mode) => {
            const isActive = mode.key === selectedMode;
            return (
              <TouchableOpacity
                key={mode.key}
                style={styles.item}
                onPress={() => onChange(mode.key)}
              >
                <Text style={[styles.label, isActive && styles.labelActive]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: verticalScale(36),
    justifyContent: 'center',
    marginBottom: verticalScale(4),
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: scale(13),
    fontFamily: 'Outfit-Medium',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  labelActive: {
    fontSize: scale(15),
    color: '#8B5CF6',
    fontFamily: 'Outfit-Bold',
  },
});
