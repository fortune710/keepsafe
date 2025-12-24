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
      // Load fresh data from storage to avoid stale closures
      const currentData = await StreakService.loadStreakData(userId);
      const updatedData = await StreakService.updateStreak(userId, entryDate, currentData);
      setStreakData(updatedData);
    } catch (error) {
      console.error('Failed to update streak:', error);
    }
  }, [userId]);

  const checkAndUpdateStreak = useCallback(async () => {
    if (!userId) return;

    try {
      // Load fresh data from storage to avoid stale closures
      const currentData = await StreakService.loadStreakData(userId);
      const updatedData = await StreakService.checkAndUpdateStreak(userId, currentData);
      setStreakData(updatedData);
    } catch (error) {
      console.error('Failed to check and update streak:', error);
    }
  }, [userId]);

  const resetStreak = useCallback(async () => {
    if (!userId) return;

    try {
      // Load fresh data from storage to avoid stale closures
      const currentData = await StreakService.loadStreakData(userId);
      const resetData = await StreakService.resetStreak(userId, currentData);
      setStreakData(resetData);
    } catch (error) {
      console.error('Failed to reset streak:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  // Check and update streak when component mounts and data is loaded
  // Only run once when data is first loaded, not on every streakData change
  useEffect(() => {
    if (!isLoading && userId) {
      checkAndUpdateStreak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, userId]); // Only depend on isLoading and userId to avoid infinite loops

  return {
    currentStreak: streakData.currentStreak,
    maxStreak: streakData.maxStreak,
    isLoading,
    updateStreak,
    resetStreak,
    checkAndUpdateStreak,
  };
}