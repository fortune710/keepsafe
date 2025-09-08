import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface StorageItem<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

class DeviceStorage {
  private isWeb = Platform.OS === 'web';

  // Generic storage methods
  async setItem<T>(key: string, value: T, expirationMinutes?: number): Promise<void> {
    const item: StorageItem<T> = {
      data: value,
      timestamp: Date.now(),
      expiresAt: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : undefined,
    };

    const serializedValue = JSON.stringify(item);

    if (this.isWeb) {
      localStorage.setItem(key, serializedValue);
    } else {
      await AsyncStorage.setItem(key, serializedValue);
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      let serializedValue: string | null;

      if (this.isWeb) {
        serializedValue = localStorage.getItem(key);
      } else {
        serializedValue = await AsyncStorage.getItem(key);
      }

      if (!serializedValue) {
        return null;
      }

      const item: StorageItem<T> = JSON.parse(serializedValue);

      // Check if item has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this.isWeb) {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }

  async clear(): Promise<void> {
    if (this.isWeb) {
      localStorage.clear();
    } else {
      await AsyncStorage.clear();
    }
  }

  async getAllKeys(): Promise<readonly string[]> {
    if (this.isWeb) {
      return Object.keys(localStorage);
    } else {
      return await AsyncStorage.getAllKeys();
    }
  }

  // Specific storage methods for app data
  async setFriends(userId: string, friends: any[]): Promise<void> {
    await this.setItem(`friends_${userId}`, friends, 60); // Cache for 1 hour
  }

  async getFriends(userId: string): Promise<any[] | null> {
    return await this.getItem<any[]>(`friends_${userId}`);
  }

  async setEntries(userId: string, entries: any[]): Promise<void> {
    await this.setItem(`entries_${userId}`, entries);
  }

  async getEntries(userId: string): Promise<any[] | null> {
    return await this.getItem<any[]>(`entries_${userId}`);
  }

  async addEntry(userId: string, entry: any): Promise<void> {
    const existingEntries = await this.getEntries(userId) || [];
    const updatedEntries = [entry, ...existingEntries];
    await this.setEntries(userId, updatedEntries);
  }

  async updateEntry(userId: string, entryId: string, updates: any): Promise<void> {
    const existingEntries = await this.getEntries(userId) || [];
    const updatedEntries = existingEntries.map(entry => 
      entry.id === entryId ? { ...entry, ...updates } : entry
    );
    await this.setEntries(userId, updatedEntries);
  }

  async removeEntry(userId: string, entryId: string): Promise<void> {
    const existingEntries = await this.getEntries(userId) || [];
    const updatedEntries = existingEntries.filter(entry => entry.id !== entryId);
    await this.setEntries(userId, updatedEntries);
  }
}

export const deviceStorage = new DeviceStorage();