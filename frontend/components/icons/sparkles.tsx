import React from 'react';
import { SvgXml } from 'react-native-svg';

interface SparklesIconProps {
  color?: string;
  size?: number;
}

// A single pinched 4-point twinkle, distinct from lucide's sparkles glyph
// (which pairs one star with three small corner accent ticks). Fill-only,
// matching the other solid icons in this folder.
const SPARKLES_SVG = `
<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2C13 9 15 11 22 12C15 13 13 15 12 22C11 15 9 13 2 12C9 11 11 9 12 2Z" fill="{{COLOR}}"/>
</svg>
`;

export function SparklesIcon({ color = '#000000', size = 24 }: SparklesIconProps) {
  const xml = SPARKLES_SVG.replaceAll('{{COLOR}}', color);
  return <SvgXml xml={xml} width={size} height={size} />;
}
