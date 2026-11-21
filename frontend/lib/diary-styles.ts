export const DIARY_STYLE_IDS = [
  'none',
  'celestial',
  'terrazzo',
  'wavy-lines',
  'ribbon',
  'polka-dots',
  'checkers',
  'botanical',
  'stickers',
] as const;

export type DiaryStyleId = (typeof DIARY_STYLE_IDS)[number];

export interface DiaryStyleOption {
  id: DiaryStyleId;
  name: string;
}

export const DIARY_STYLES: readonly DiaryStyleOption[] = [
  { id: 'none', name: 'Plain' },
  { id: 'celestial', name: 'Celestial' },
  { id: 'terrazzo', name: 'Terrazzo' },
  { id: 'wavy-lines', name: 'Wavy lines' },
  { id: 'ribbon', name: 'Ribbon' },
  { id: 'polka-dots', name: 'Polka dots' },
  { id: 'checkers', name: 'Checkers' },
  { id: 'botanical', name: 'Botanical' },
  { id: 'stickers', name: 'Sticker collage' },
];

export function normalizeDiaryStyle(style?: string | null): DiaryStyleId {
  return DIARY_STYLE_IDS.includes(style as DiaryStyleId) ? style as DiaryStyleId : 'none';
}
