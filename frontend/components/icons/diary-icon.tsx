import React from 'react';
import { SvgXml } from 'react-native-svg';

interface DiaryIconProps {
  color?: string;
  size?: number;
}

// Sourced from assets/icons/diary.svg, with the hardcoded fill color
// swapped for the `color` prop so it can be tinted per active/inactive state.
const DIARY_SVG = `
<svg fill="{{COLOR}}" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="M17,2H5A1,1,0,0,0,4,3V21a1,1,0,0,0,1,1H17a3,3,0,0,0,3-3V5A3,3,0,0,0,17,2ZM8,20H6V4H8Zm10-1a1,1,0,0,1-1,1H10V4h7a1,1,0,0,1,1,1Z"/></svg>
`;

export function DiaryIcon({ color = '#000000', size = 24 }: DiaryIconProps) {
  const xml = DIARY_SVG.replaceAll('{{COLOR}}', color);
  return <SvgXml xml={xml} width={size} height={size} />;
}
