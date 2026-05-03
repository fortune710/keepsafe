import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Sparkles, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/lib/constants';
import { scale } from 'react-native-size-matters';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

const circleWidths = 24;
const iconSize = circleWidths / 2 + 2;

interface MonthlyDumpBannerProps {
  month?: string;
  animationProgress?: SharedValue<number>;
}

export default function MonthlyDumpBanner({ month, animationProgress }: MonthlyDumpBannerProps) {
  const router = useRouter();

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, monthValue] = monthStr.split('-');
      const date = new Date(parseInt(year, 10), parseInt(monthValue, 10) - 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  const textAnimatedStyle = useAnimatedStyle(() => {
    if (!animationProgress) return { opacity: 1, maxWidth: 9999 };

    const opacity = interpolate(
      animationProgress.value,
      [0, 0.9, 1],
      [0, 0, 1],
      Extrapolation.CLAMP
    );

    const maxWidth = interpolate(
      animationProgress.value,
      [0, 0.88, 1],
      [0, 0, 9999],
      Extrapolation.CLAMP
    );

    return { opacity, maxWidth };
  });

  const sideButtonsAnimatedStyle = useAnimatedStyle(() => {
    if (!animationProgress) return { opacity: 1 };

    const opacity = interpolate(
      animationProgress.value,
      [0, 0.82, 1],
      [0, 0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  const touchableAnimatedStyle = useAnimatedStyle(() => {
    if (!animationProgress) return { width: '80%' };

    const widthPercent = interpolate(
      animationProgress.value,
      [0, 0.55, 1],
      [13, 13, 80],
      Extrapolation.CLAMP
    );

    return { width: `${widthPercent}%` as any };
  });

  const bannerShapeAnimatedStyle = useAnimatedStyle(() => {
    if (!animationProgress) {
      return { borderRadius: 24 };
    }

    const borderRadius = interpolate(
      animationProgress.value,
      [0, 0.55, 1],
      [38, 38, 24],
      Extrapolation.CLAMP
    );

    return { borderRadius };
  });

  const handlePress = () => {
    if (!month) return;
    router.push(`/monthly-dumps/${month}`);
  }

  return (
    <View style={styles.container} testID="monthly-dump-banner">
      <Animated.View style={touchableAnimatedStyle}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          style={styles.touchable}
          disabled={!month}
        >
          <Animated.View style={[styles.bannerShell, bannerShapeAnimatedStyle]}>
            <BlurView intensity={40} tint="dark" style={styles.blur}>
              <View style={styles.content}>
                <Animated.View style={[styles.iconContainer, sideButtonsAnimatedStyle]}>
                  <Sparkles size={iconSize} color="#C084FC" fill="#C084FC" />
                </Animated.View>
                <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                  <Text style={styles.title} numberOfLines={1}>Your {formatMonth(month || '')} dump is ready!</Text>
                </Animated.View>
                <Animated.View style={[styles.playButton, sideButtonsAnimatedStyle]}>
                  <Play size={iconSize} color="white" fill="white" />
                </Animated.View>
              </View>
            </BlurView>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
    width: '100%',
  },
  touchable: {
    width: '100%',
  },
  bannerShell: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
  },
  blur: {
    padding: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: scale(circleWidths),
    height: scale(circleWidths),
    borderRadius: scale(circleWidths / 2),
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: scale(12),
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
    marginBottom: 2,
  },
  playButton: {
    width: scale(circleWidths),
    height: scale(circleWidths),
    borderRadius: scale(circleWidths / 2),
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
