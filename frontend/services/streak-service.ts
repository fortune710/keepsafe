import { differenceInHours, format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { deviceStorage } from './device-storage';
import { getDeviceTimezone } from '@/lib/utils';

export interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastEntryDate: string | null;
  lastAccessTime: string | null;
  userTimeZone: string;
}

export class StreakService {
  // Function to get user's timezone
  static getUserTimeZone(): string {
    return getDeviceTimezone();
  }

  // Load streak data from storage
  static async loadStreakData(userId: string): Promise<StreakData> {
    try {
      const cached = await deviceStorage.getItem<StreakData>(`streak_${userId}`);
      if (cached) {
        const userTimeZone = cached.userTimeZone || this.getUserTimeZone();

        // Check if lastEntryDate is more than 24 hours from lastAccessTime
        if (cached.lastEntryDate && cached.lastAccessTime) {
          const lastEntryDate = new Date(cached.lastEntryDate);
          const lastAccessTime = new Date(cached.lastAccessTime);

          const hoursDiff = differenceInHours(lastAccessTime, lastEntryDate);

          if (hoursDiff > 24) {
            // Streak has been lost, set currentStreak to 0 and update cache
            const updated = {
              ...cached,
              currentStreak: 0,
              userTimeZone,
            };
            await deviceStorage.setItem(`streak_${userId}`, updated);
            return updated;
          }
        }

        // Otherwise, hydrate as usual
        return {
          ...cached,
          userTimeZone,
          lastAccessTime: cached.lastAccessTime || null,
        };
      }
    } catch (error) {
      console.error('Failed to load streak data:', error);
    }

    // Return default streak data
    return {
      currentStreak: 0,
      maxStreak: 0,
      lastEntryDate: null,
      lastAccessTime: null,
      userTimeZone: this.getUserTimeZone(),
    };
  }

  // Save streak data to storage
  static async saveStreakData(userId: string, data: StreakData): Promise<void> {
    try {
      await deviceStorage.setItem(`streak_${userId}`, data);
    } catch (error) {
      console.error('Failed to save streak data:', error);
    }
  }

  // Update streak when a new entry is created
  static async updateStreak(userId: string, entryDate: Date, currentStreakData: StreakData): Promise<StreakData> {
    const userTimeZone = currentStreakData.userTimeZone || this.getUserTimeZone();
    const now = new Date();
    
    // Create TZDate instances in user's timezone
    const currentTimeInUserTz = new TZDate(now, userTimeZone);
    const entryTimeInUserTz = new TZDate(entryDate, userTimeZone);
    
    // Get date strings in user's timezone
    const currentDateStr = format(currentTimeInUserTz, 'yyyy-MM-dd');
    const entryDateStr = format(entryTimeInUserTz, 'yyyy-MM-dd');
    
    let newStreakData = { ...currentStreakData, userTimeZone };

    // Check if this is the first entry ever
    if (!newStreakData.lastEntryDate) {
      newStreakData.currentStreak = 1;
      newStreakData.maxStreak = 1;
      newStreakData.lastEntryDate = entryDateStr;
      newStreakData.lastAccessTime = now.toISOString();
    } else {
      // lastEntryDate is stored as 'yyyy-MM-dd' string in user's timezone
      const lastEntryDateStr = newStreakData.lastEntryDate;
      
      // Compare dates directly as strings (both are in same timezone format)
      if (entryDateStr === lastEntryDateStr) {
        // Same day entry - don't change streak, just update access time
        newStreakData.lastAccessTime = now.toISOString();
      } else {
        // Parse dates to calculate day difference
        const lastEntryDateObj = new Date(lastEntryDateStr + 'T00:00:00');
        const entryDateObj = new Date(entryDateStr + 'T00:00:00');
        const daysDiff = Math.floor((entryDateObj.getTime() - lastEntryDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day - continue streak
          newStreakData.currentStreak += 1;
          newStreakData.maxStreak = Math.max(newStreakData.maxStreak, newStreakData.currentStreak);
          newStreakData.lastEntryDate = entryDateStr;
          newStreakData.lastAccessTime = now.toISOString();
        } else if (daysDiff < 0) {
          // Entry is in the past but not consecutive - this shouldn't normally happen
          // but if it does, we'll treat it as a new streak starting from that date
          newStreakData.currentStreak = 1;
          newStreakData.maxStreak = Math.max(newStreakData.maxStreak, 1);
          newStreakData.lastEntryDate = entryDateStr;
          newStreakData.lastAccessTime = now.toISOString();
        } else {
          // Gap of more than 1 day - start new streak
          newStreakData.currentStreak = 1;
          newStreakData.maxStreak = Math.max(newStreakData.maxStreak, 1);
          newStreakData.lastEntryDate = entryDateStr;
          newStreakData.lastAccessTime = now.toISOString();
        }
      }
    }

    // Save the updated streak data
    await this.saveStreakData(userId, newStreakData);
    return newStreakData;
  }

  // Check and update streak when app is accessed
  static async checkAndUpdateStreak(userId: string, currentStreakData: StreakData): Promise<StreakData> {
    // If no last entry date, nothing to check
    if (!currentStreakData.lastEntryDate) {
      // Just update last access time
      const updatedData: StreakData = {
        ...currentStreakData,
        lastAccessTime: new Date().toISOString(),
      };
      await this.saveStreakData(userId, updatedData);
      return updatedData;
    }

    const userTimeZone = currentStreakData.userTimeZone || this.getUserTimeZone();
    const now = new Date();
    
    // Get current date in user's timezone
    const currentTimeInUserTz = new TZDate(now, userTimeZone);
    const currentDateStr = format(currentTimeInUserTz, 'yyyy-MM-dd');
    
    // lastEntryDate is stored as 'yyyy-MM-dd' string in user's timezone
    const lastEntryDateStr = currentStreakData.lastEntryDate;
    
    // Parse dates to calculate day difference
    const lastEntryDateObj = new Date(lastEntryDateStr + 'T00:00:00');
    const currentDateObj = new Date(currentDateStr + 'T00:00:00');
    const daysDiff = Math.floor((currentDateObj.getTime() - lastEntryDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    // If more than 1 day has passed since last entry, reset streak
    if (daysDiff > 1) {
      const resetData: StreakData = {
        ...currentStreakData,
        currentStreak: 0,
        lastAccessTime: now.toISOString(),
      };
      await this.saveStreakData(userId, resetData);
      return resetData;
    } else {
      // Update last access time (streak is still valid)
      const updatedData: StreakData = {
        ...currentStreakData,
        lastAccessTime: now.toISOString(),
      };
      await this.saveStreakData(userId, updatedData);
      return updatedData;
    }
  }

  // Reset streak to 0 (keep max streak)
  static async resetStreak(userId: string, currentStreakData: StreakData): Promise<StreakData> {
    const resetData: StreakData = {
      currentStreak: 0,
      maxStreak: currentStreakData.maxStreak, // Keep max streak
      lastEntryDate: null,
      lastAccessTime: null,
      userTimeZone: currentStreakData.userTimeZone || this.getUserTimeZone(),
    };
    
    await this.saveStreakData(userId, resetData);
    return resetData;
  }
}
