import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { DiaryStyleId } from '@/lib/diary-styles';
import { shadeColor } from '@/lib/diary-colors';

interface DiaryCoverStyleProps {
  color: string;
  styleId: DiaryStyleId;
}

const GOLD = '#F3DBB2';
const CREAM = '#F9EBD4';
const surface = StyleSheet.absoluteFill;

/** Scalable cover artwork shared by the diary grid, editor and opening transition. */
export function DiaryCoverStyle({ color, styleId }: DiaryCoverStyleProps) {
  if (styleId === 'none') {
    return (
      <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
        <Path d="M25 8 H91 Q91 12 95 12 V148 Q91 148 91 152 H25 Q25 148 21 148 V12 Q25 12 25 8 Z" fill="none" stroke={GOLD} strokeOpacity="0.8" strokeWidth="0.65" />
      </Svg>
    );
  }

  if (styleId === 'celestial') {
    return (
      <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
        <G fill="none" stroke={GOLD} strokeOpacity="0.8" strokeWidth="0.5">
          <Path d="M28 35 Q58 5 89 35 M28 127 Q58 155 89 127" strokeDasharray="1 2" />
          <Path d="M33 108 L41 91 L54 85 L65 68 L78 58" />
        </G>
        <G fill={GOLD}>
          <Circle cx="33" cy="108" r="1.2" /><Circle cx="41" cy="91" r="1.1" /><Circle cx="54" cy="85" r="1.4" /><Circle cx="65" cy="68" r="1.1" /><Circle cx="78" cy="58" r="1.3" />
          <Circle cx="58" cy="36" r="4" /><Circle cx="31" cy="70" r="0.8" /><Circle cx="83" cy="99" r="0.8" /><Circle cx="44" cy="52" r="0.6" /><Circle cx="72" cy="115" r="0.7" />
          <Path d="M41 32 a4 4 0 1 0 0 8 a3 3 0 1 1 0 -8 M75 32 a4 4 0 1 1 0 8 a3 3 0 1 0 0 -8 M27 34 a3 3 0 1 0 0 6 a2.5 2.5 0 1 1 0 -6 M89 34 a3 3 0 1 1 0 6 a2.5 2.5 0 1 0 0 -6" />
          <Path d="M58 10 l1 4 4 1 -4 1 -1 4 -1 -4 -4 -1 4 -1 Z M58 140 l1 4 4 1 -4 1 -1 4 -1 -4 -4 -1 4 -1 Z M29 83 l.6 2.5 2.5 .6 -2.5 .6 -.6 2.5 -.6 -2.5 -2.5 -.6 2.5 -.6 Z" />
        </G>
      </Svg>
    );
  }

  if (styleId === 'terrazzo') {
    return (
      <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
        <G fill={CREAM} fillOpacity="0.8">
          <Path d="M23 6 l9 3 2 7 -6 4 -7 -5 Z M60 3 l5 -3 5 5 -2 5 -6 -1 Z M78 35 l11 -5 7 6 -2 10 -9 2 -6 -6 Z M23 63 l9 -5 6 5 -2 8 -10 4 -5 -5 Z M57 90 l10 -4 8 7 -3 10 -8 3 -8 -6 Z M78 131 l11 -5 6 7 -3 10 -10 3 -6 -7 Z M30 139 l8 -4 7 5 -3 9 -8 2 -6 -5 Z" />
        </G>
        <G fill={shadeColor(color, -48)} fillOpacity="0.65">
          <Path d="M48 22 l8 -6 8 3 3 10 -9 6 -9 -5 Z M27 39 l5 -3 6 4 -1 6 -7 3 -5 -5 Z M65 56 l6 -4 8 3 1 8 -6 5 -9 -3 Z M37 106 l10 -5 7 7 -2 9 -9 4 -8 -6 Z M82 100 l5 -3 6 3 -1 6 -6 3 -5 -3 Z M55 133 l5 -4 5 3 -1 6 -5 2 -5 -3 Z" />
        </G>
        <G fill={GOLD} fillOpacity="0.75"><Circle cx="47" cy="9" r="1.8" /><Circle cx="86" cy="17" r="2.3" /><Circle cx="50" cy="51" r="2" /><Circle cx="87" cy="76" r="1.8" /><Circle cx="27" cy="88" r="2.4" /><Circle cx="66" cy="119" r="1.6" /><Circle cx="49" cy="153" r="2" /></G>
      </Svg>
    );
  }

  if (styleId === 'wavy-lines') {
    return (
      <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
        {Array.from({ length: 25 }, (_, index) => {
          const y = -25 + index * 8;
          return <Path key={index} d={`M15 ${y} C35 ${y - 20} 42 ${y + 17} 61 ${y + 1} S88 ${y - 10} 105 ${y + 3}`} fill="none" stroke={GOLD} strokeOpacity="0.72" strokeWidth="0.55" />;
        })}
      </Svg>
    );
  }

  if (styleId === 'ribbon') {
    return (
      <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
        <Path d="M16 70 L100 15 V39 L40 80 L100 121 V145 L16 89 Z" fill={CREAM} fillOpacity="0.48" />
        <Path d="M16 70 L100 15 M16 89 L100 145 M40 80 L100 39 M40 80 L100 121" fill="none" stroke={GOLD} strokeOpacity="0.85" strokeWidth="0.7" />
      </Svg>
    );
  }

  if (styleId === 'polka-dots') {
    return (
      <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
        <G fill={CREAM} fillOpacity="0.88">
          <Circle cx="38" cy="0" r="13" /><Circle cx="100" cy="45" r="13" /><Circle cx="17" cy="103" r="11" /><Circle cx="76" cy="160" r="14" />
          <Circle cx="81" cy="12" r="2" /><Circle cx="60" cy="40" r="2" /><Circle cx="30" cy="60" r="1.8" /><Circle cx="72" cy="80" r="2" /><Circle cx="46" cy="107" r="1.8" /><Circle cx="89" cy="122" r="2" /><Circle cx="27" cy="145" r="1.8" />
        </G>
      </Svg>
    );
  }

  if (styleId === 'checkers') {
    return (
      <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
        <Rect x="16" y="0" width="84" height="160" fill={CREAM} fillOpacity="0.75" />
        {Array.from({ length: 8 }, (_, row) => Array.from({ length: 4 }, (_, column) => {
          if ((row + column) % 2 !== 0) return null;
          const x = 16 + column * 21;
          const y = row * 20;
          const shift = row % 2 === 0 ? 3 : -3;
          return <Path key={`${row}-${column}`} d={`M${x} ${y} Q${x + 10.5} ${y + shift} ${x + 21} ${y} L${x + 21} ${y + 20} Q${x + 10.5} ${y + 20 + shift} ${x} ${y + 20} Z`} fill={shadeColor(color, -35)} fillOpacity="0.85" />;
        }))}
      </Svg>
    );
  }

  if (styleId === 'botanical') {
    return (
      <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
        <G fill="none" stroke={GOLD} strokeOpacity="0.82" strokeWidth="0.65" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 58 Q50 29 87 5 M32 46 Q29 28 21 19 Q23 36 32 46 M42 37 Q42 20 35 12 Q34 27 42 37 M52 29 Q59 14 69 10 Q65 23 52 29 M65 20 Q74 7 85 5 M35 44 Q46 45 53 38 Q43 36 35 44 M20 133 Q46 110 81 69 M31 123 Q28 106 20 99 Q21 114 31 123 M43 111 Q43 94 35 86 Q34 101 43 111 M55 98 Q66 98 73 87 Q62 89 55 98 M66 85 Q65 70 58 63 Q57 77 66 85 M77 73 Q87 68 91 57 Q81 61 77 73 M47 151 Q65 132 93 114 M59 140 Q57 130 52 125 Q52 135 59 140 M70 132 Q80 134 86 126 Q77 125 70 132" />
          <Path d="M24 22 l8 24 M37 15 l5 22 M66 12 L52 29 M23 102 l8 21 M37 90 l6 21 M70 89 L55 98 M60 66 l6 19 M89 59 L77 73 M54 127 l5 13 M83 127 l-13 5" strokeWidth="0.35" />
          <Circle cx="77" cy="44" r="2" /><Circle cx="83" cy="39" r="1.5" /><Path d="M70 53 Q75 45 83 39" />
        </G>
      </Svg>
    );
  }

  return (
    <Svg pointerEvents="none" style={surface} viewBox="0 0 100 160" preserveAspectRatio="none">
      <Circle cx="43" cy="31" r="12" fill={GOLD} fillOpacity="0.7" />
      <G transform="rotate(8 72 38)">
        <Rect x="55" y="14" width="36" height="43" fill={CREAM} />
        <Rect x="58" y="17" width="30" height="37" fill={shadeColor(color, -32)} />
        <Path d="M58 48 L67 35 L73 42 L79 30 L88 44 V54 H58 Z" fill={CREAM} fillOpacity="0.7" />
        <Circle cx="80" cy="25" r="3" fill={GOLD} />
      </G>
      <G transform="rotate(-8 39 105)">
        <Rect x="22" y="84" width="36" height="42" fill={CREAM} />
        <Rect x="25" y="87" width="30" height="36" fill={shadeColor(color, -28)} />
        <Path d="M25 112 L33 101 L40 108 L46 97 L55 108 V123 H25 Z" fill={GOLD} fillOpacity="0.8" />
      </G>
      <G fill="none" stroke={CREAM} strokeWidth="0.65" strokeOpacity="0.9">
        <Circle cx="36" cy="60" r="13" /><Path d="M23 60 H49 M36 47 V73 M27 51 Q36 56 45 51 M27 69 Q36 64 45 69 M36 47 Q25 60 36 73 M36 47 Q47 60 36 73" />
        <Circle cx="76" cy="108" r="11" /><Path d="M76 99 L78 106 L85 108 L78 110 L76 117 L74 110 L67 108 L74 106 Z M64 75 Q70 72 76 75 T88 75 M64 79 Q70 76 76 79 T88 79 M64 83 Q70 80 76 83 T88 83" />
        <Path d="M51 147 Q61 132 75 131 T97 140 M54 151 Q66 139 77 140 T96 148" />
      </G>
    </Svg>
  );
}
