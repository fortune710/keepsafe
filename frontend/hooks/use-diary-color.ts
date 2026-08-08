import { useEffect, useState } from 'react';
import { deviceStorage } from '@/services/device-storage';
import { pickRandomDiaryColor } from '@/lib/diary-colors';

const STORAGE_KEY_PREFIX = 'diary_color_';

/**
 * Assigns a diary a non-primary accent color the first time it's seen, then persists it
 * locally so it stays the same across sessions (a future multi-diary feature could instead
 * store this as a column on a `diaries` table - local storage is the simpler starting point
 * since there's no such table yet).
 */
export function useDiaryColor(diaryId: string): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `${STORAGE_KEY_PREFIX}${diaryId}`;

    (async () => {
      const existing = await deviceStorage.getItem<string>(key);
      if (cancelled) return;

      if (existing) {
        setColor(existing);
        return;
      }

      const assigned = pickRandomDiaryColor();
      await deviceStorage.setItem(key, assigned);
      if (!cancelled) setColor(assigned);
    })();

    return () => {
      cancelled = true;
    };
  }, [diaryId]);

  return color;
}
