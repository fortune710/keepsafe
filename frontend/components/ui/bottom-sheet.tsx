import React, { useEffect, useState } from 'react';
import { Modal, View, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedKeyboard,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_GAP = verticalScale(8);
// Extra breathing room between the sheet and the keyboard when it's open.
const KEYBOARD_GAP = verticalScale(12);

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number | `${number}%`;
  maxHeight?: number | `${number}%`;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  height,
  maxHeight = '70%',
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const [modalVisible, setModalVisible] = useState(false);

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
  const restingMarginBottom = insets.bottom - (SHEET_GAP + 10);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      backdropOpacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      });
      sheetTranslateY.value = withDelay(
        140,
        withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      sheetTranslateY.value = withTiming(
        SCREEN_HEIGHT,
        { duration: 200, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            backdropOpacity.value = withTiming(
              0,
              { duration: 200, easing: Easing.out(Easing.ease) },
              (finished2) => {
                if (finished2) runOnJS(setModalVisible)(false);
              },
            );
          }
        },
      );
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // `marginBottom` is a layout property - animating it directly off
  // `keyboard.height` (which changes every frame while the keyboard
  // animates) forces a Yoga relayout each frame and looks janky. Keep the
  // resting margin static and fold the keyboard's rise into `translateY`
  // instead, which is compositor-only and stays smooth.
  const sheetStyle = useAnimatedStyle(() => {
    const keyboardHeight = keyboard.height.value;
    const keyboardOffset =
      keyboardHeight > 0
        ? Math.max(0, keyboardHeight + KEYBOARD_GAP - restingMarginBottom)
        : 0;

    return {
      transform: [{ translateY: sheetTranslateY.value - keyboardOffset }],
    };
  });

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <View style={styles.sheetWrapper} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              { height, maxHeight, marginBottom: restingMarginBottom },
            ]}
          >
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    marginHorizontal: SHEET_GAP,
    backgroundColor: 'white',
    borderRadius: scale(28),
    paddingTop: verticalScale(12),
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: scale(36),
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: verticalScale(12),
  },
});
