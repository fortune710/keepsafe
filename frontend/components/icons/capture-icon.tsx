import React from 'react';
import { SvgXml } from 'react-native-svg';

interface CaptureIconProps {
  color?: string;
  size?: number;
}

// Sourced from assets/icons/capture.svg, with the hardcoded fill color
// swapped for the `color` prop so it can be tinted per active/inactive state.
const CAPTURE_SVG = `
<svg fill="{{COLOR}}" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3,9A1,1,0,0,0,4,8V5A1,1,0,0,1,5,4H8A1,1,0,0,0,8,2H5A3,3,0,0,0,2,5V8A1,1,0,0,0,3,9ZM8,20H5a1,1,0,0,1-1-1V16a1,1,0,0,0-2,0v3a3,3,0,0,0,3,3H8a1,1,0,0,0,0-2ZM12,8a4,4,0,1,0,4,4A4,4,0,0,0,12,8Zm0,6a2,2,0,1,1,2-2A2,2,0,0,1,12,14ZM19,2H16a1,1,0,0,0,0,2h3a1,1,0,0,1,1,1V8a1,1,0,0,0,2,0V5A3,3,0,0,0,19,2Zm2,13a1,1,0,0,0-1,1v3a1,1,0,0,1-1,1H16a1,1,0,0,0,0,2h3a3,3,0,0,0,3-3V16A1,1,0,0,0,21,15Z"/></svg>
`;

export function CaptureIcon({
  color = '#000000',
  size = 24,
}: CaptureIconProps) {
  const xml = CAPTURE_SVG.replaceAll('{{COLOR}}', color);
  return <SvgXml xml={xml} width={size} height={size} />;
}
