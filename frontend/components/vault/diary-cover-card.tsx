import React, { forwardRef, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, verticalScale } from 'react-native-size-matters';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/lib/constants';
import { shadeColor } from '@/lib/diary-colors';
import { normalizeDiaryStyle } from '@/lib/diary-styles';
import { DiaryCoverStyle } from '@/components/vault/diary-cover-style';

interface DiaryCoverCardProps {
  diaryId: string;
  title: string;
  color: string;
  diaryStyle?: string;
  onPress: (source: { x: number; y: number; width: number; height: number } | null) => void;
  onLongPress: () => void;
}

type CoverSource = { x: number; y: number; width: number; height: number };

const FALLBACK_COLOR = '#F59E0B';

interface DiaryCoverVisualProps {
  color?: string;
  diaryStyle?: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** The shared hardcover visual used anywhere a diary cover is presented. */
export const DiaryCoverVisual = forwardRef<View, DiaryCoverVisualProps>(function DiaryCoverVisual(
  { color = FALLBACK_COLOR, diaryStyle = 'none', borderRadius = scale(4), style },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={[styles.coverShell, { borderRadius }, style]}>
      <LinearGradient
        colors={[shadeColor(color, 18), color, shadeColor(color, -20)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cover, { borderRadius }]}
      >
        <DiaryCoverStyle color={color} styleId={normalizeDiaryStyle(diaryStyle)} />
        <View style={styles.spine} />
      </LinearGradient>
    </View>
  );
});

/**
 * A diary's grid tile: a hardcover-book-style cover (portrait rectangle, spine accent,
 * gradient fill from the diary's persistent color) with the title below it, matching the
 * card-grid-with-label-underneath pattern from the reference screenshot.
 */
export function DiaryCoverCard({ diaryId, title, color = FALLBACK_COLOR, diaryStyle, onPress, onLongPress }: DiaryCoverCardProps) {
  const longPressHandled = useRef(false);
  const coverRef = useRef<View>(null);
  const measuredSource = useRef<CoverSource | null>(null);

  const measureCover = () => {
    measuredSource.current = null;
    coverRef.current?.measureInWindow((x, y, width, height) => {
      measuredSource.current = { x, y, width, height };
    });
  };

  const handlePress = () => {
    if (longPressHandled.current) {
      longPressHandled.current = false;
      return;
    }

    if (measuredSource.current) {
      onPress(measuredSource.current);
      return;
    }

    coverRef.current?.measureInWindow((x, y, width, height) => {
      onPress({ x, y, width, height });
    });
  };

  const handleLongPress = () => {
    longPressHandled.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onLongPress();
  };

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPressIn={measureCover}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={450}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Double tap to open, or press and hold to edit.`}
    >
      <DiaryCoverVisual ref={coverRef} color={color} diaryStyle={diaryStyle} />
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '31%',
  },
  coverShell: {
    width: '100%',
    aspectRatio: 0.63,
    borderRadius: scale(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '16%',
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  title: {
    marginTop: verticalScale(8),
    fontSize: scale(12),
    fontFamily: 'Figtree-SemiBold',
    color: Colors.text,
    textAlign: 'center',
  },
});
