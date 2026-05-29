import React from 'react';
import Svg, { Rect } from 'react-native-svg';

type GridIconProps = {
  size?: number;
  color?: string;
  mutedColor?: string;
};

function GridCell({
  x,
  y,
  color,
  width,
  height,
}: {
  x: number;
  y: number;
  color: string;
  width: number;
  height: number;
}) {
  return <Rect x={x} y={y} width={width} height={height} rx={2.5} fill={color} />;
}

export function MonthlyDumpGrid2x2Icon({
  size = 22,
  color = '#F8FAFC',
  mutedColor = 'rgba(248,250,252,0.28)',
}: GridIconProps) {
  const cellSize = 6;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <GridCell x={5} y={5} color={color} width={cellSize} height={cellSize} />
      <GridCell x={13} y={5} color={color} width={cellSize} height={cellSize} />
      <GridCell x={5} y={13} color={color} width={cellSize} height={cellSize} />
      <GridCell x={13} y={13} color={color} width={cellSize} height={cellSize} />
    </Svg>
  );
}

export function MonthlyDumpGrid2x3Icon({
  size = 22,
  color = '#F8FAFC',
  mutedColor = 'rgba(248,250,252,0.28)',
}: GridIconProps) {
  const cellWidth = 6;
  const cellHeight = 4.5;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <GridCell x={5} y={4.5} color={color} width={cellWidth} height={cellHeight} />
      <GridCell x={13} y={4.5} color={color} width={cellWidth} height={cellHeight} />
      <GridCell x={5} y={10.75} color={color} width={cellWidth} height={cellHeight} />
      <GridCell x={13} y={10.75} color={color} width={cellWidth} height={cellHeight} />
      <GridCell x={5} y={17} color={color} width={cellWidth} height={cellHeight} />
      <GridCell x={13} y={17} color={color} width={cellWidth} height={cellHeight} />
    </Svg>
  );
}
