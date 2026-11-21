import React, { useLayoutEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { shadeColor } from '@/lib/diary-colors';
import { normalizeDiaryStyle } from '@/lib/diary-styles';
import { DiaryCoverStyle } from '@/components/vault/diary-cover-style';

interface DiaryOpeningTransitionProps {
  color: string;
  diaryStyle?: string;
  source: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

/** Expands the tapped diary cover into the destination screen without a second route animation. */
export function DiaryOpeningTransition({ color, diaryStyle, source }: DiaryOpeningTransitionProps) {
  const [visible, setVisible] = useState(Boolean(source));
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  const sourceCenterX = source ? source.x + source.width / 2 : screenWidth / 2;
  const sourceCenterY = source ? source.y + source.height / 2 : screenHeight / 2;
  const targetTranslateX = screenWidth / 2 - sourceCenterX;
  const targetTranslateY = screenHeight / 2 - sourceCenterY;
  const targetScaleX = source ? screenWidth / source.width : 1;
  const targetScaleY = source ? screenHeight / source.height : 1;

  useLayoutEffect(() => {
    if (!source) return;

    if (reduceMotion) {
      setVisible(false);
      return;
    }

    progress.value = withTiming(
      1,
      { duration: 250, easing: Easing.bezier(0.16, 1, 0.3, 1) },
      (finished) => {
        if (finished) runOnJS(setVisible)(false);
      },
    );
  }, [progress, reduceMotion, source]);

  const animatedStyle = useAnimatedStyle(() => {
    const value = progress.value;
    return {
      borderRadius: interpolate(value, [0, 1], [4, 0], Extrapolation.CLAMP),
      opacity: interpolate(value, [0, 0.8, 1], [1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(value, [0, 1], [0, targetTranslateX], Extrapolation.CLAMP) },
        { translateY: interpolate(value, [0, 1], [0, targetTranslateY], Extrapolation.CLAMP) },
        { scaleX: interpolate(value, [0, 1], [1, targetScaleX], Extrapolation.CLAMP) },
        { scaleY: interpolate(value, [0, 1], [1, targetScaleY], Extrapolation.CLAMP) },
      ],
    };
  });

  const spineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
  }));

  if (!visible || !source) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.transition,
        {
          height: source.height,
          left: source.x,
          top: source.y,
          width: source.width,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={[shadeColor(color, 18), color, shadeColor(color, -20)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <DiaryCoverStyle color={color} styleId={normalizeDiaryStyle(diaryStyle)} />
      <Animated.View style={[styles.spine, spineStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  transition: {
    overflow: 'hidden',
    position: 'absolute',
    zIndex: 1000,
  },
  spine: {
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '16%',
  },
});
