import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
import { DiaryCoverVisual } from '@/components/vault/diary-cover-card';
import { DIARY_STYLES, DiaryStyleId, DiaryStyleOption, normalizeDiaryStyle } from '@/lib/diary-styles';

interface DiaryStyleCarouselProps {
  color: string;
  value: DiaryStyleId;
  visible: boolean;
  onChange: (style: DiaryStyleId) => void;
}

interface CarouselItem extends DiaryStyleOption {
  rawIndex: number;
  key: string;
}

interface StyleSlideProps {
  color: string;
  index: number;
  item: CarouselItem;
  itemWidth: number;
  scrollX: SharedValue<number>;
}

const REPEAT_COUNT = 41;
const CENTER_REPEAT = Math.floor(REPEAT_COUNT / 2);
const CAROUSEL_ITEMS: CarouselItem[] = Array.from({ length: REPEAT_COUNT }, (_, repeat) =>
  DIARY_STYLES.map((style, styleIndex) => ({
    ...style,
    rawIndex: repeat * DIARY_STYLES.length + styleIndex,
    key: `${repeat}-${style.id}`,
  })),
).flat();

function normalizeIndex(index: number): number {
  return ((index % DIARY_STYLES.length) + DIARY_STYLES.length) % DIARY_STYLES.length;
}

function StyleSlide({ color, index, item, itemWidth, scrollX }: StyleSlideProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: interpolate(
        scrollX.value,
        [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth],
        [0.82, 1, 0.82],
        Extrapolation.CLAMP,
      ),
    }],
  }));

  return (
    <View style={[styles.slide, { width: itemWidth }]}>
      <Animated.View style={animatedStyle}>
        <DiaryCoverVisual
          color={color}
          diaryStyle={item.id}
          borderRadius={scale(8)}
          style={{ width: Math.min(scale(188), itemWidth * 0.56) }}
        />
      </Animated.View>
    </View>
  );
}

/** Infinite diary-style picker with swipe paging and scale-based cover handoff. */
export function DiaryStyleCarousel({ color, value, visible, onChange }: DiaryStyleCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const itemWidth = Math.min(windowWidth - scale(56), scale(360));
  const listRef = useRef<FlatList<CarouselItem>>(null);
  const rawIndexRef = useRef(CENTER_REPEAT * DIARY_STYLES.length);
  const valueRef = useRef(value);
  const scrollX = useSharedValue(rawIndexRef.current * itemWidth);
  valueRef.current = value;

  const selectedStyleName = useMemo(
    () => DIARY_STYLES.find((style) => style.id === value)?.name ?? DIARY_STYLES[0].name,
    [value],
  );

  const moveToRawIndex = useCallback((rawIndex: number, animated: boolean) => {
    rawIndexRef.current = rawIndex;
    listRef.current?.scrollToOffset({ offset: rawIndex * itemWidth, animated });
  }, [itemWidth]);

  useEffect(() => {
    if (!visible) return;

    const selectedIndex = DIARY_STYLES.findIndex((style) => style.id === normalizeDiaryStyle(valueRef.current));
    const rawIndex = CENTER_REPEAT * DIARY_STYLES.length + Math.max(0, selectedIndex);
    rawIndexRef.current = rawIndex;
    scrollX.value = rawIndex * itemWidth;
    requestAnimationFrame(() => moveToRawIndex(rawIndex, false));
  }, [itemWidth, moveToRawIndex, scrollX, visible]);

  const handleIndexChange = useCallback((rawIndex: number) => {
    rawIndexRef.current = rawIndex;
    onChange(DIARY_STYLES[normalizeIndex(rawIndex)].id);
  }, [onChange]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawIndex = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
    handleIndexChange(rawIndex);

    const edgeBuffer = DIARY_STYLES.length * 3;
    if (rawIndex >= edgeBuffer && rawIndex <= CAROUSEL_ITEMS.length - edgeBuffer) return;

    const centeredRawIndex = CENTER_REPEAT * DIARY_STYLES.length + normalizeIndex(rawIndex);
    requestAnimationFrame(() => moveToRawIndex(centeredRawIndex, false));
  }, [handleIndexChange, itemWidth, moveToRawIndex]);

  const moveBy = useCallback((direction: -1 | 1) => {
    const nextRawIndex = rawIndexRef.current + direction;
    handleIndexChange(nextRawIndex);
    moveToRawIndex(nextRawIndex, true);
  }, [handleIndexChange, moveToRawIndex]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const renderItem = useCallback(({ item, index }: { item: CarouselItem; index: number }) => (
    <StyleSlide color={color} index={index} item={item} itemWidth={itemWidth} scrollX={scrollX} />
  ), [color, itemWidth, scrollX]);

  return (
    <View style={styles.container}>
      <View style={[styles.carousel, { width: itemWidth }]}>
        <Animated.FlatList
          ref={listRef}
          horizontal
          data={CAROUSEL_ITEMS}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          getItemLayout={(_, index) => ({ index, length: itemWidth, offset: itemWidth * index })}
          initialScrollIndex={rawIndexRef.current}
          snapToInterval={itemWidth}
          decelerationRate="fast"
          disableIntervalMomentum
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
        />

        <Pressable
          accessibilityLabel="Previous diary style"
          hitSlop={10}
          onPress={() => moveBy(-1)}
          style={[styles.arrowButton, styles.arrowLeft]}
        >
          <ChevronLeft color="#475569" size={scale(22)} strokeWidth={2.4} />
        </Pressable>
        <Pressable
          accessibilityLabel="Next diary style"
          hitSlop={10}
          onPress={() => moveBy(1)}
          style={[styles.arrowButton, styles.arrowRight]}
        >
          <ChevronRight color="#475569" size={scale(22)} strokeWidth={2.4} />
        </Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.styleName}>{selectedStyleName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  carousel: { height: verticalScale(310), overflow: 'visible', position: 'relative' },
  slide: { alignItems: 'center', height: '100%', justifyContent: 'center' },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(241,245,249,0.96)',
    borderRadius: scale(22),
    height: scale(44),
    justifyContent: 'center',
    position: 'absolute',
    top: '43%',
    width: scale(44),
    zIndex: 2,
  },
  arrowLeft: { left: scale(-12) },
  arrowRight: { right: scale(-12) },
  styleName: {
    color: '#475569',
    fontFamily: 'Figtree-SemiBold',
    fontSize: scale(14),
    marginTop: verticalScale(2),
  },
});
