import { format, differenceInDays, startOfDay } from 'date-fns';
import { deviceStorage } from './device-storage';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

/**
 * Streak Service - Manages user daily entry streaks
 * 
 * How it works:
 * - lastEntryDate: The date (yyyy-MM-dd) of the last entry created
 * - lastAccessTime: The timestamp of when the app was last accessed (for streak expiry checks)
 * - currentStreak: Number of consecutive days with at least one entry
 * - maxStreak: Highest streak ever achieved
 * 
 * Streak Logic:
 * 1. First entry ever → streak = 1
 * 2. Entry on same day → streak unchanged (multiple entries per day don't count)
 * 3. Entry next day (daysDiff = 1) → streak increments AND lastEntryDate updates
 * 4. Entry after gap (daysDiff > 1) → streak resets to 1
 * 
 * Key: lastEntryDate updates each consecutive day, so the next day's calculation
 * will also be daysDiff = 1, allowing the streak to keep growing.
 */

export interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastEntryDate: string | null; // Format: 'yyyy-MM-dd' - date of last entry
  lastAccessTime: string | null; // ISO string - when app was last opened (for expiry)
}

export class StreakService {
  // Load streak data from storage
  static async loadStreakData(userId: string): Promise<StreakData> {
    try {
      const cached = await deviceStorage.getItem<StreakData>(`streak_${userId}`);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.error('Failed to load streak data:', error);
    }

    // Fallback to Supabase (single row per user) for cross-device sync of streak data
    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('current_streak, max_streak, last_entry_date, last_access_time')
        .eq('user_id', userId)
        .maybeSingle<{
          current_streak: number | null;
          max_streak: number | null;
          last_entry_date: string | null;
          last_access_time: string | null;
        }>();

      if (error) {
        console.error('Error fetching streak data from Supabase:', error);
      } else if (data) {
        const fromRemote: StreakData = {
          currentStreak: data.current_streak ?? 0,
          maxStreak: data.max_streak ?? 0,
          lastEntryDate: data.last_entry_date,
          lastAccessTime: data.last_access_time,
        };

        // Cache remotely-loaded data locally (best-effort)
        try {
          await deviceStorage.setItem(`streak_${userId}`, fromRemote);
        } catch (cacheError) {
          console.error('Failed to cache remote streak data locally:', cacheError);
        }

        return fromRemote;
      }
    } catch (error) {
      console.error('Error in Supabase streak fallback:', error);
    }

    // Return default streak data
    return {
      currentStreak: 0,
      maxStreak: 0,
      lastEntryDate: null,
      lastAccessTime: null,
    };
  }

  // Save streak data to storage
  static async saveStreakData(userId: string, data: StreakData): Promise<void> {
    // 1. Save to local storage (best-effort cache; don't throw)
    try {
      await deviceStorage.setItem(`streak_${userId}`, data);
      console.log('Saved streak data:', data);
    } catch (error) {
      console.error('Failed to save streak data:', error);
    }

    // 2. Sync streak stats to Supabase (best-effort; do not block core app flows)
    try {
      const { error } = await supabase
        .from('user_streaks')
        .upsert({
          user_id: userId,
          current_streak: data.currentStreak,
          max_streak: data.maxStreak,
          last_entry_date: data.lastEntryDate,
          last_access_time: data.lastAccessTime,
        } as never, { onConflict: 'user_id' } as never);

      if (error) {
        console.error('Error saving streak data to Supabase:', error);
      }
    } catch (error) {
      console.error('Error in saveStreakData Supabase sync:', error);
    }
  }

  /**
   * Update streak when a new entry is created
   * 
   * This is called whenever a user creates a new entry (photo/video/audio).
   * It calculates the day difference between today and the last entry date:
   * 
   * - daysDiff = 0: Same day entry → no streak change, just update access time
   * - daysDiff = 1: Next consecutive day → increment streak AND update lastEntryDate
   *   (This allows the streak to continue growing day by day)
   * - daysDiff > 1: Gap in entries → reset streak to 1, update lastEntryDate
   * 
   * @param userId - The user's ID
   * @param entryDate - The date of the new entry
   * @param currentStreakData - Current streak state from storage
   * @returns Updated streak data
   */
  static async updateStreak(userId: string, entryDate: Date, currentStreakData: StreakData): Promise<StreakData> {
    const now = new Date();
    const todayStr = format(startOfDay(entryDate), 'yyyy-MM-dd');
    
    console.log('Updating streak - Today:', todayStr, 'Last entry:', currentStreakData.lastEntryDate);
    
    let newStreakData = { ...currentStreakData };

    // First entry ever - start the streak!
    if (!newStreakData.lastEntryDate) {
      newStreakData.currentStreak = 1;
      newStreakData.maxStreak = 1;
      newStreakData.lastEntryDate = todayStr;
      newStreakData.lastAccessTime = now.toISOString();
      console.log('First entry ever - streak set to 1');
    } else {
      // Calculate how many days between last entry and this entry
      const lastEntryDate = startOfDay(new Date(newStreakData.lastEntryDate + 'T00:00:00'));
      const entryDateDay = startOfDay(entryDate);
      const daysDiff = differenceInDays(entryDateDay, lastEntryDate);
      
      console.log('Days difference:', daysDiff);
      
      if (daysDiff === 0) {
        // Same day - don't change streak, just update access time
        // (Multiple entries per day don't increase the streak)
        newStreakData.lastAccessTime = now.toISOString();
        console.log('Same day entry - no streak change');
      } else if (daysDiff === 1) {
        // Next consecutive day - increment streak!
        // IMPORTANT: We update lastEntryDate here, so tomorrow will also be daysDiff = 1
        // This is how the streak keeps growing day after day
        newStreakData.currentStreak += 1;
        newStreakData.maxStreak = Math.max(newStreakData.maxStreak, newStreakData.currentStreak);
        newStreakData.lastEntryDate = todayStr; // ← Critical: update the date for next time
        newStreakData.lastAccessTime = now.toISOString();
        console.log('Consecutive day - streak increased to', newStreakData.currentStreak);
      } else {
        // Gap in streak (missed a day or more) - reset to 1
        newStreakData.currentStreak = 1;
        newStreakData.maxStreak = Math.max(newStreakData.maxStreak, 1);
        newStreakData.lastEntryDate = todayStr;
        newStreakData.lastAccessTime = now.toISOString();
        console.log('Gap detected - streak reset to 1');
      }
    }

    // Save the updated streak data
    await this.saveStreakData(userId, newStreakData);
    return newStreakData;
  }

  /**
   * Check and update streak when app is accessed (to reset if needed)
   * 
   * This is called when the user opens the app to check if their streak should be reset.
   * If more than 1 day has passed since the last entry (meaning they skipped a day),
   * the streak is reset to 0.
   * 
   * Note: This uses lastEntryDate, not lastAccessTime. The streak is based on creating
   * entries, not just opening the app.
   * 
   * @param userId - The user's ID
   * @param currentStreakData - Current streak state from storage
   * @returns Updated streak data
   */
  static async checkAndUpdateStreak(userId: string, currentStreakData: StreakData): Promise<StreakData> {
    const now = new Date();
    
    // If no last entry date, nothing to check
    if (!currentStreakData.lastEntryDate) {
      const updatedData: StreakData = {
        ...currentStreakData,
        lastAccessTime: now.toISOString(),
      };
      await this.saveStreakData(userId, updatedData);
      return updatedData;
    }

    const lastEntryDate = startOfDay(new Date(currentStreakData.lastEntryDate + 'T00:00:00'));
    const today = startOfDay(now);
    const daysSinceLastEntry = differenceInDays(today, lastEntryDate);
    
    // If more than 1 day has passed since last entry, reset streak
    if (daysSinceLastEntry > 1) {
      const resetData: StreakData = {
        ...currentStreakData,
        currentStreak: 0,
        lastAccessTime: now.toISOString(),
      };
      await this.saveStreakData(userId, resetData);
      logger.info(`Streak reset - no entry for ${daysSinceLastEntry} days`);
      return resetData;
    }

    // Streak is still valid - just update last access time
    const updatedData: StreakData = {
      ...currentStreakData,
      lastAccessTime: now.toISOString(),
    };
    await this.saveStreakData(userId, updatedData);
    return updatedData;
  }

  // Reset streak to 0 (keep max streak)
  static async resetStreak(userId: string, currentStreakData: StreakData): Promise<StreakData> {
    const resetData: StreakData = {
      currentStreak: 0,
      maxStreak: currentStreakData.maxStreak,
      lastEntryDate: null,
      lastAccessTime: null,
    };
    
    await this.saveStreakData(userId, resetData);
    return resetData;
  }
}
