import React from 'react';
import { SvgXml } from 'react-native-svg';

interface DiaryAiIconProps {
  color?: string;
  size?: number;
}

// Sourced from assets/icons/diary-ai.svg, with the `currentColor` fill swapped for the
// `color` prop (react-native-svg has no CSS cascade to resolve currentColor against).
const DIARY_AI_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="{{COLOR}}" d="M14.25 7.25c.966 0 1.75.784 1.75 1.75v5.25A1.75 1.75 0 0 1 14.25 16H9a1.75 1.75 0 0 1-1.75-1.75v-.5a.75.75 0 0 1 1.5 0v.5c0 .138.112.25.25.25h5.25a.25.25 0 0 0 .25-.25V9a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5zM7.436 5.4a.599.599 0 0 1 1.128 0l.438 1.233a.6.6 0 0 0 .365.365l1.234.438a.599.599 0 0 1 0 1.128l-1.234.438a.6.6 0 0 0-.365.365l-.438 1.234a.599.599 0 0 1-1.128 0l-.438-1.234a.6.6 0 0 0-.365-.365l-1.234-.438a.599.599 0 0 1 0-1.128l1.234-.438a.6.6 0 0 0 .365-.365l.438-1.234ZM7 0c.966 0 1.75.784 1.75 1.75v.5a.75.75 0 0 1-1.5 0v-.5A.25.25 0 0 0 7 1.5H1.75a.25.25 0 0 0-.25.25V7c0 .138.112.25.25.25h.5a.75.75 0 0 1 0 1.5h-.5A1.75 1.75 0 0 1 0 7V1.75C0 .784.784 0 1.75 0z"/></svg>
`;

export function DiaryAiIcon({ color = '#000000', size = 24 }: DiaryAiIconProps) {
  const xml = DIARY_AI_SVG.replaceAll('{{COLOR}}', color);
  return <SvgXml xml={xml} width={size} height={size} />;
}
