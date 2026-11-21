import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Flower2, Heart, Leaf, Smile, Sparkles, Star } from 'lucide-react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { scale } from 'react-native-size-matters';
import { DiaryStyleId } from '@/lib/diary-styles';
import { shadeColor } from '@/lib/diary-colors';

interface DiaryCoverStyleProps {
  color: string;
  styleId: DiaryStyleId;
}

const DOT_POSITIONS = [
  ['24%', '12%'], ['52%', '8%'], ['78%', '18%'],
  ['33%', '35%'], ['66%', '42%'], ['86%', '56%'],
  ['22%', '68%'], ['52%', '76%'], ['78%', '88%'],
] as const;

/** Code-rendered diary decoration shared by grid, editor, and opening transition. */
export function DiaryCoverStyle({ color, styleId }: DiaryCoverStyleProps) {
  if (styleId === 'none') return null;

  if (styleId === 'celestial') {
    return (
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 160">
        <Path
          d="M71 18c-13 5-17 21-8 31 5 6 13 8 20 5-5 8-15 13-25 10-14-4-22-19-17-33 4-11 18-18 30-13Z"
          fill="rgba(255,255,255,0.68)"
        />
        <Circle cx="29" cy="34" r="3.5" fill="rgba(255,255,255,0.72)" />
        <Circle cx="71" cy="93" r="2.6" fill="rgba(255,255,255,0.58)" />
        <Circle cx="33" cy="118" r="2.3" fill="rgba(255,255,255,0.7)" />
        <G stroke="rgba(255,255,255,0.54)" strokeWidth="1.2">
          <Line x1="24" y1="83" x2="43" y2="70" />
          <Line x1="43" y1="70" x2="57" y2="88" />
          <Line x1="57" y1="88" x2="77" y2="76" />
          <Line x1="25" y1="130" x2="45" y2="139" />
          <Line x1="45" y1="139" x2="68" y2="125" />
        </G>
        <G fill="rgba(255,255,255,0.82)">
          <Circle cx="24" cy="83" r="2" /><Circle cx="43" cy="70" r="2" />
          <Circle cx="57" cy="88" r="2" /><Circle cx="77" cy="76" r="2" />
          <Circle cx="25" cy="130" r="1.8" /><Circle cx="45" cy="139" r="1.8" />
          <Circle cx="68" cy="125" r="1.8" />
        </G>
        <Path d="M20 53h10M25 48v10M75 112h12M81 106v12" stroke="rgba(255,255,255,0.64)" strokeWidth="1.4" strokeLinecap="round" />
      </Svg>
    );
  }

  if (styleId === 'terrazzo') {
    return (
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 160">
        <Polygon points="18,15 34,10 39,25 25,31" fill="rgba(255,255,255,0.28)" />
        <Path d="M66 8c15 4 20 16 12 25-8 8-23 4-25-7-2-8 4-15 13-18Z" fill="rgba(0,0,0,0.1)" />
        <Polygon points="13,57 27,46 40,56 32,73 17,72" fill="rgba(255,255,255,0.2)" />
        <Path d="M68 56c10-4 20 2 19 12-1 9-13 15-22 8-7-5-5-16 3-20Z" fill="rgba(255,255,255,0.34)" />
        <Polygon points="37,89 53,81 64,95 54,110 37,105" fill="rgba(0,0,0,0.09)" />
        <Path d="M14 112c8-9 23-7 27 4 4 12-7 23-20 18-10-4-14-14-7-22Z" fill="rgba(255,255,255,0.3)" />
        <Polygon points="67,120 87,115 91,134 73,144 61,133" fill="rgba(255,255,255,0.18)" />
        <Circle cx="48" cy="44" r="4" fill="rgba(255,255,255,0.42)" />
        <Circle cx="83" cy="94" r="3" fill="rgba(0,0,0,0.12)" />
      </Svg>
    );
  }

  if (styleId === 'wavy-lines') {
    return (
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 160">
        {[18, 35, 52, 69, 86, 103, 120, 137].map((y, index) => (
          <Path
            key={y}
            d={`M-12 ${y} C13 ${y - 18}, 30 ${y + 18}, 54 ${y} S93 ${y - 17}, 114 ${y + 1}`}
            fill="none"
            opacity={index % 2 === 0 ? 0.62 : 0.36}
            stroke="white"
            strokeWidth={index % 3 === 0 ? 2 : 1.2}
          />
        ))}
      </Svg>
    );
  }

  if (styleId === 'ribbon') {
    return (
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 160">
        <Rect x="47" y="0" width="6" height="160" fill="rgba(255,255,255,0.19)" />
        <Path d="M49 72C38 55 19 51 16 64c-3 12 15 20 34 12Z" fill="rgba(255,255,255,0.7)" />
        <Path d="M51 72c11-17 30-21 33-8 3 12-15 20-34 12Z" fill="rgba(255,255,255,0.58)" />
        <Path d="M47 76 32 113l17-8 8 15 1-43Z" fill="rgba(255,255,255,0.48)" />
        <Path d="m54 76 14 37-16-8-8 15-1-43Z" fill="rgba(255,255,255,0.38)" />
        <Circle cx="50" cy="73" r="8" fill="rgba(255,255,255,0.9)" />
        <Circle cx="50" cy="73" r="4" fill="rgba(0,0,0,0.08)" />
      </Svg>
    );
  }

  if (styleId === 'polka-dots') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {DOT_POSITIONS.map(([left, top]) => (
          <View key={`${left}-${top}`} style={[styles.dot, { left, top }]} />
        ))}
      </View>
    );
  }

  if (styleId === 'checkers') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 24 }, (_, index) => {
          const row = Math.floor(index / 4);
          const column = index % 4;
          if ((row + column) % 2 !== 0) return null;
          return (
            <View
              key={index}
              style={[
                styles.checker,
                { left: `${column * 25}%`, top: `${row * (100 / 6)}%` },
              ]}
            />
          );
        })}
      </View>
    );
  }

  if (styleId === 'botanical') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Flower2 color="rgba(255,255,255,0.72)" size={scale(30)} strokeWidth={1.6} style={styles.flowerTop} />
        <Leaf color="rgba(255,255,255,0.62)" size={scale(36)} strokeWidth={1.5} style={styles.leafMiddle} />
        <Flower2 color="rgba(255,255,255,0.5)" size={scale(24)} strokeWidth={1.5} style={styles.flowerBottom} />
        <View style={styles.botanicalStem} />
      </View>
    );
  }

  const ink = shadeColor(color, -38);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.sticker, styles.heartSticker]}><Heart color={ink} fill={ink} size={scale(14)} /></View>
      <View style={[styles.sticker, styles.starSticker]}><Star color={ink} size={scale(15)} strokeWidth={2.2} /></View>
      <View style={[styles.sticker, styles.smileSticker]}><Smile color={ink} size={scale(16)} strokeWidth={2.1} /></View>
      <Sparkles color="rgba(255,255,255,0.78)" size={scale(22)} style={styles.sparkleSticker} />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: scale(5),
    height: scale(9),
    position: 'absolute',
    width: scale(9),
  },
  checker: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    height: `${100 / 6}%`,
    position: 'absolute',
    width: '25%',
  },
  botanicalStem: {
    backgroundColor: 'rgba(255,255,255,0.34)',
    bottom: '8%',
    left: '51%',
    position: 'absolute',
    top: '20%',
    transform: [{ rotate: '-14deg' }],
    width: 1.5,
  },
  flowerTop: { position: 'absolute', right: '12%', top: '12%' },
  leafMiddle: { left: '23%', position: 'absolute', top: '43%', transform: [{ rotate: '-22deg' }] },
  flowerBottom: { bottom: '12%', position: 'absolute', right: '20%' },
  sticker: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: scale(16),
    height: scale(29),
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    width: scale(29),
  },
  heartSticker: { left: '23%', top: '17%', transform: [{ rotate: '-9deg' }] },
  starSticker: { right: '14%', top: '38%', transform: [{ rotate: '11deg' }] },
  smileSticker: { bottom: '14%', left: '36%', transform: [{ rotate: '7deg' }] },
  sparkleSticker: { bottom: '22%', position: 'absolute', right: '13%' },
});
