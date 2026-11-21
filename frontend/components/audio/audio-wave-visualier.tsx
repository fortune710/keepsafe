import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import { useEffect, useMemo } from 'react';

interface AudioWaveVisualierProps {
  isRecording: boolean;
  /** Normalized 0-1 microphone level (0 = silence). Bars stay flat below this. */
  meteringLevel?: number;
}

const BAR_COUNT = 20;
const SILENCE_THRESHOLD = 0.08;
const MIN_BAR_HEIGHT = 10;
const MAX_BAR_HEIGHT_GAIN = 130;

interface WaveBarProps {
  level: SharedValue<number>;
  variance: number;
}

function WaveBar({ level, variance }: WaveBarProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const height =
      MIN_BAR_HEIGHT + level.value * variance * MAX_BAR_HEIGHT_GAIN;
    return {
      height,
      backgroundColor: level.value > SILENCE_THRESHOLD ? '#8B5CF6' : '#CBD5E1',
    };
  });

  return <Animated.View style={[styles.waveBar, animatedStyle]} />;
}

export default function AudioWaveVisualier({
  isRecording,
  meteringLevel = 0,
}: AudioWaveVisualierProps) {
  const level = useSharedValue(0);

  // Fixed per-bar variation, generated once, so the wave has a natural shape
  // instead of re-randomizing on every render.
  const variances = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => 0.5 + Math.random() * 0.5),
    [],
  );

  useEffect(() => {
    const target = isRecording ? meteringLevel : 0;
    level.value = withTiming(target, {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
  }, [isRecording, meteringLevel, level]);

  return (
    <View style={styles.waveform}>
      {variances.map((variance, i) => (
        <WaveBar key={i} level={level} variance={variance} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 180,
    marginBottom: 16,
  },
  waveBar: {
    width: 6,
    marginHorizontal: 2.5,
    borderRadius: 3,
  },
});
