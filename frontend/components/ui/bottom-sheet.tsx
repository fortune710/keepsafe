import React, { useEffect, useState } from 'react';
import { Modal, View, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_GAP = verticalScale(8);

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | `${number}%`;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeight = '70%',
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

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

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

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
              {
                maxHeight,
                marginBottom: insets.bottom - (SHEET_GAP + 10),
              },
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
