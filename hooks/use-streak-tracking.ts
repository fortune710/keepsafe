import { useState, useCallback, useEffect } from 'react';
import { StreakService, StreakData } from '@/services/streak-service';

interface UseStreakTrackingResult {
  currentStreak: number;
  maxStreak: number;
  isLoading: boolean;
  updateStreak: (entryDate: Date) => Promise<void>;
  resetStreak: () => Promise<void>;
  checkAndUpdateStreak: () => Promise<void>;
}

export function useStreakTracking(userId?: string): UseStreakTrackingResult {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    maxStreak: 0,
    lastEntryDate: null,
    lastAccessTime: null,
    userTimeZone: StreakService.getUserTimeZone(),
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStreakData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const data = await StreakService.loadStreakData(userId);
      setStreakData(data);
    } catch (error) {
      console.error('Failed to load streak data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updateStreak = useCallback(async (entryDate: Date) => {
    if (!userId) return;

    try {
      const updatedData = await StreakService.updateStreak(userId, entryDate, streakData);
      setStreakData(updatedData);
    } catch (error) {
      console.error('Failed to update streak:', error);
    }
  }, [userId, streakData]);

  const checkAndUpdateStreak = useCallback(async () => {
    if (!userId) return;

    try {
      const updatedData = await StreakService.checkAndUpdateStreak(userId, streakData);
      setStreakData(updatedData);
    } catch (error) {
      console.error('Failed to check and update streak:', error);
    }
  }, [userId, streakData]);

  const resetStreak = useCallback(async () => {
    if (!userId) return;

    try {
      const resetData = await StreakService.resetStreak(userId, streakData);
      setStreakData(resetData);
    } catch (error) {
      console.error('Failed to reset streak:', error);
    }
  }, [userId, streakData]);

  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  // Check and update streak when component mounts and data is loaded
  useEffect(() => {
    if (!isLoading && streakData.lastAccessTime) {
      checkAndUpdateStreak();
    }
  }, [isLoading, checkAndUpdateStreak, streakData.lastAccessTime]);

  return {
    currentStreak: streakData.currentStreak,
    maxStreak: streakData.maxStreak,
    isLoading,
    updateStreak,
    resetStreak,
    checkAndUpdateStreak,
  };
}