// Accent colors a diary's icon can be assigned - deliberately excludes the brand
// primary (#8B5CF6) so a diary's color reads as its own identity, not the app chrome.
export const DIARY_COLOR_PALETTE = [
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

export function pickRandomDiaryColor(): string {
  return DIARY_COLOR_PALETTE[Math.floor(Math.random() * DIARY_COLOR_PALETTE.length)];
}

/**
 * Shades a hex color toward white (positive percent) or black (negative percent),
 * used to build a subtle gradient for a diary cover from its single persisted accent color.
 */
export function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}
