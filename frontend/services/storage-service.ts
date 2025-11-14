import { MediaEntry } from '@/types/media';

export class StorageService {
  private static readonly STORAGE_KEY = 'keepsafe_entries';

  static async saveEntry(entry: MediaEntry): Promise<void> {
    try {
      const existingEntries = await this.getAllEntries();
      const updatedEntries = [...existingEntries, entry];
      
      // In a real app, this would save to a backend or secure local storage
      console.log('Saving entry to storage:', entry.id);
      
      // For now, we'll use a simple in-memory storage simulation
      // In production, you'd use AsyncStorage, SQLite, or a backend API
    } catch (error) {
      console.error('Failed to save entry:', error);
      throw new Error('Failed to save entry');
    }
  }

  static async getAllEntries(): Promise<MediaEntry[]> {
    try {
      // In a real app, this would fetch from storage/backend
      console.log('Fetching all entries from storage');
      return [];
    } catch (error) {
      console.error('Failed to fetch entries:', error);
      return [];
    }
  }

  static async getEntriesByDate(date: Date): Promise<MediaEntry[]> {
    try {
      const allEntries = await this.getAllEntries();
      const targetDate = date.toISOString().split('T')[0];
      
      return allEntries.filter(entry => 
        entry.createdAt.toISOString().split('T')[0] === targetDate
      );
    } catch (error) {
      console.error('Failed to fetch entries by date:', error);
      return [];
    }
  }

  static async deleteEntry(entryId: string): Promise<void> {
    try {
      console.log('Deleting entry:', entryId);
      // Implementation would remove from storage/backend
    } catch (error) {
      console.error('Failed to delete entry:', error);
      throw new Error('Failed to delete entry');
    }
  }

  static async updateEntry(entryId: string, updates: Partial<MediaEntry>): Promise<void> {
    try {
      console.log('Updating entry:', entryId, updates);
      // Implementation would update in storage/backend
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw new Error('Failed to update entry');
    }
  }

  static groupEntriesByDate(entries: MediaEntry[]): Record<string, MediaEntry[]> {
    return entries.reduce((groups, entry) => {
      const dateKey = entry.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(entry);
      return groups;
    }, {} as Record<string, MediaEntry[]>);
  }
}