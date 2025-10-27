import { differenceInHours, format, subDays } from 'date-fns';
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
      // Check if 24 hours have passed since last access
      const lastAccessTime = newStreakData.lastAccessTime ? new Date(newStreakData.lastAccessTime) : null;
      const hoursSinceLastAccess = lastAccessTime ? differenceInHours(now, lastAccessTime) : 24;
      
      if (hoursSinceLastAccess >= 24) {
        // Check if entry is for today or yesterday in user's timezone
        const yesterdayStr = format(subDays(currentTimeInUserTz, 1), 'yyyy-MM-dd');
        
        if (entryDateStr === currentDateStr) {
          // Entry for today
          if (newStreakData.lastEntryDate === yesterdayStr) {
            // Continuing streak from yesterday
            newStreakData.currentStreak += 1;
          } else if (newStreakData.lastEntryDate !== currentDateStr) {
            // New streak starting today
            newStreakData.currentStreak = 1;
          }
        } else if (entryDateStr === yesterdayStr) {
          // Entry for yesterday
          const dayBeforeYesterdayStr = format(subDays(currentTimeInUserTz, 2), 'yyyy-MM-dd');
          
          if (newStreakData.lastEntryDate === dayBeforeYesterdayStr) {
            // Continuing streak from day before yesterday
            newStreakData.currentStreak += 1;
          } else {
            // New streak starting yesterday
            newStreakData.currentStreak = 1;
          }
        } else {
          // Entry for a different day, reset streak
          newStreakData.currentStreak = 1;
        }
        
        // Update max streak
        newStreakData.maxStreak = Math.max(newStreakData.maxStreak, newStreakData.currentStreak);
        newStreakData.lastEntryDate = entryDateStr;
        newStreakData.lastAccessTime = now.toISOString();
      }
    }

    // Save the updated streak data
    await this.saveStreakData(userId, newStreakData);
    return newStreakData;
  }

  // Check and update streak when app is accessed
  static async checkAndUpdateStreak(userId: string, currentStreakData: StreakData): Promise<StreakData> {
    if (!currentStreakData.lastAccessTime) {
      return currentStreakData;
    }

    const userTimeZone = currentStreakData.userTimeZone || this.getUserTimeZone();
    const now = new Date();
    const lastAccessTime = new Date(currentStreakData.lastAccessTime);
    const hoursSinceLastAccess = differenceInHours(now, lastAccessTime);

    // If 24+ hours have passed since last access, we need to check if streak should be reset
    if (hoursSinceLastAccess >= 24) {
      const currentTimeInUserTz = new TZDate(now, userTimeZone);
      const lastAccessTimeInUserTz = new TZDate(lastAccessTime, userTimeZone);
      
      const currentDateStr = format(currentTimeInUserTz, 'yyyy-MM-dd');
      const lastAccessDateStr = format(lastAccessTimeInUserTz, 'yyyy-MM-dd');
      
      // If more than 1 day has passed in user's timezone, reset the streak
      if (currentDateStr !== lastAccessDateStr) {
        const daysDifference = Math.floor(hoursSinceLastAccess / 24);
        
        if (daysDifference > 1) {
          // More than 1 day gap, reset streak
          const resetData: StreakData = {
            ...currentStreakData,
            currentStreak: 0,
            lastAccessTime: now.toISOString(),
          };
          await this.saveStreakData(userId, resetData);
          return resetData;
        } else {
          // Exactly 1 day gap, update last access time
          const updatedData: StreakData = {
            ...currentStreakData,
            lastAccessTime: now.toISOString(),
          };
          await this.saveStreakData(userId, updatedData);
          return updatedData;
        }
      }
    }

    return currentStreakData;
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
