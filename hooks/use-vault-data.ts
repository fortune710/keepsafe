import React from 'react';
import { useState, useCallback } from 'react';
import { VaultEntry } from '@/components/vault-entry-card';

interface UseVaultDataResult {
  currentDate: string;
  entries: VaultEntry[];
  isLoading: boolean;
  error: string | null;
  loadEntriesForDate: (date: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
}

// Mock data for demonstration
const mockEntriesByDay: { [key: string]: VaultEntry[] } = {
  'January 15, 2025': [
    {
      id: '1',
      type: 'photo',
      content: 'https://images.pexels.com/photos/1022655/pexels-photo-1022655.jpeg?auto=compress&cs=tinysrgb&w=400',
      text: 'Beautiful sunset from my balcony today. Feeling grateful for these quiet moments.',
      music: 'Weightless - Marconi Union',
      date: new Date('2025-01-15'),
      isPrivate: false,
    },
    {
      id: '2',
      type: 'audio',
      content: 'audio_note_1',
      text: 'Quick thought about my day...',
      location: 'Central Park, NYC',
      date: new Date('2025-01-15'),
      isPrivate: true,
    },
  ],
  'January 14, 2025': [
    {
      id: '3',
      type: 'photo',
      content: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=400',
      text: 'Coffee and morning pages. Starting the day with intention.',
      date: new Date('2025-01-14'),
      isPrivate: false,
    },
  ],
  'January 13, 2025': [
    {
      id: '4',
      type: 'photo',
      content: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=400',
      text: 'Peaceful morning walk through the neighborhood.',
      location: 'Downtown',
      date: new Date('2025-01-13'),
      isPrivate: false,
    },
  ],
};

export function useVaultData(): UseVaultDataResult {
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });
  
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntriesForDate = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, this would be an API call
      const dateEntries = mockEntriesByDay[date] || [];
      
      setCurrentDate(date);
      setEntries(dateEntries);
    } catch (err) {
      setError('Failed to load entries');
      console.error('Error loading entries:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshEntries = useCallback(async () => {
    await loadEntriesForDate(currentDate);
  }, [currentDate, loadEntriesForDate]);

  // Load initial data
  React.useEffect(() => {
    loadEntriesForDate(currentDate);
  }, []);

  return {
    currentDate,
    entries,
    isLoading,
    error,
    loadEntriesForDate,
    refreshEntries,
  };
}