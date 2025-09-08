import { useState, useCallback, useEffect } from 'react';
import { deviceStorage } from '@/services/device-storage';

interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastEntryDate: string | null;
}

interface UseStreakTrackingResult {
  currentStreak: number;
  maxStreak: number;
  isLoading: boolean;
  updateStreak: (entryDate: Date) => Promise<void>;
  resetStreak: () => Promise<void>;
}

export function useStreakTracking(userId?: string): UseStreakTrackingResult {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    maxStreak: 0,
    lastEntryDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStreakData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const cached = await deviceStorage.getItem<StreakData>(`streak_${userId}`);
      if (cached) {
        setStreakData(cached);
      }
    } catch (error) {
      console.error('Failed to load streak data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const saveStreakData = useCallback(async (data: StreakData) => {
    if (!userId) return;

    try {
      await deviceStorage.setItem(`streak_${userId}`, data);
      setStreakData(data);
    } catch (error) {
      console.error('Failed to save streak data:', error);
    }
  }, [userId]);

  const updateStreak = useCallback(async (entryDate: Date) => {
    if (!userId) return;

    const today = new Date();
    const entryDateStr = entryDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let newStreakData = { ...streakData };

    if (!newStreakData.lastEntryDate) {
      // First entry ever
      newStreakData.currentStreak = 1;
      newStreakData.maxStreak = 1;
      newStreakData.lastEntryDate = entryDateStr;
    } else if (entryDateStr === todayStr) {
      // Entry for today
      if (newStreakData.lastEntryDate === yesterdayStr) {
        // Continuing streak
        newStreakData.currentStreak += 1;
        newStreakData.maxStreak = Math.max(newStreakData.maxStreak, newStreakData.currentStreak);
      } else if (newStreakData.lastEntryDate !== todayStr) {
        // New streak starting today
        newStreakData.currentStreak = 1;
      }
      newStreakData.lastEntryDate = entryDateStr;
    } else if (entryDateStr === yesterdayStr && newStreakData.lastEntryDate !== yesterdayStr) {
      // Entry for yesterday, continuing or starting streak
      const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      if (newStreakData.lastEntryDate === dayBeforeYesterday) {
        newStreakData.currentStreak += 1;
      } else {
        newStreakData.currentStreak = 1;
      }
      
      newStreakData.maxStreak = Math.max(newStreakData.maxStreak, newStreakData.currentStreak);
      newStreakData.lastEntryDate = entryDateStr;
    }

    await saveStreakData(newStreakData);
  }, [userId, streakData, saveStreakData]);

  const resetStreak = useCallback(async () => {
    const resetData: StreakData = {
      currentStreak: 0,
      maxStreak: streakData.maxStreak, // Keep max streak
      lastEntryDate: null,
    };
    await saveStreakData(resetData);
  }, [streakData.maxStreak, saveStreakData]);

  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  return {
    currentStreak: streakData.currentStreak,
    maxStreak: streakData.maxStreak,
    isLoading,
    updateStreak,
    resetStreak,
  };
}