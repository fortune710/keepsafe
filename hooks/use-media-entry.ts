import { useState, useCallback } from 'react';
import { MediaEntry, MediaCapture, Friend, ShareResult } from '@/types/media';

interface UseMediaEntryResult {
  entry: Partial<MediaEntry>;
  updateText: (text: string) => void;
  updateMusic: (music: string) => void;
  updateLocation: (location: string) => void;
  updateSharing: (sharing: Partial<MediaEntry['sharing']>) => void;
  toggleFriend: (friendId: string) => void;
  setPrivate: (isPrivate: boolean) => void;
  setEveryone: (isEveryone: boolean) => void;
  saveEntry: () => Promise<ShareResult>;
  resetEntry: () => void;
  initializeEntry: (capture: MediaCapture) => void;
  getWordCount: () => number;
  canSave: () => boolean;
}

export function useMediaEntry(): UseMediaEntryResult {
  const [entry, setEntry] = useState<Partial<MediaEntry>>({
    content: { text: '', wordCount: 0 },
    tags: {},
    sharing: {
      isPrivate: false,
      isEveryone: false,
      selectedFriends: [],
    },
  });

  const generateId = useCallback(() => {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const countWords = useCallback((text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, []);

  const updateText = useCallback((text: string) => {
    const wordCount = countWords(text);
    if (wordCount <= 256) {
      setEntry(prev => ({
        ...prev,
        content: { text, wordCount },
        updatedAt: new Date(),
      }));
    }
  }, [countWords]);

  const updateMusic = useCallback((music: string) => {
    setEntry(prev => ({
      ...prev,
      tags: { ...prev.tags, music },
      updatedAt: new Date(),
    }));
  }, []);

  const updateLocation = useCallback((location: string) => {
    setEntry(prev => ({
      ...prev,
      tags: { ...prev.tags, location },
      updatedAt: new Date(),
    }));
  }, []);

  const updateSharing = useCallback((sharing: Partial<MediaEntry['sharing']>) => {
    setEntry(prev => ({
      ...prev,
      sharing: { ...prev.sharing, ...sharing },
      updatedAt: new Date(),
    }));
  }, []);

  const toggleFriend = useCallback((friendId: string) => {
    setEntry(prev => {
      const currentFriends = prev.sharing?.selectedFriends || [];
      const isSelected = currentFriends.includes(friendId);
      
      return {
        ...prev,
        sharing: {
          ...prev.sharing,
          selectedFriends: isSelected
            ? currentFriends.filter(id => id !== friendId)
            : [...currentFriends, friendId],
          isPrivate: false,
          isEveryone: false,
        },
        updatedAt: new Date(),
      };
    });
  }, []);

  const setPrivate = useCallback((isPrivate: boolean) => {
    setEntry(prev => ({
      ...prev,
      sharing: {
        ...prev.sharing,
        isPrivate,
        isEveryone: false,
        selectedFriends: isPrivate ? [] : prev.sharing?.selectedFriends || [],
      },
      updatedAt: new Date(),
    }));
  }, []);

  const setEveryone = useCallback((isEveryone: boolean) => {
    setEntry(prev => ({
      ...prev,
      sharing: {
        ...prev.sharing,
        isEveryone,
        isPrivate: false,
        selectedFriends: isEveryone ? [] : prev.sharing?.selectedFriends || [],
      },
      updatedAt: new Date(),
    }));
  }, []);

  const saveEntry = useCallback(async (): Promise<ShareResult> => {
    if (!entry.capture) {
      return { success: false, message: 'No media captured' };
    }

    const completeEntry: MediaEntry = {
      id: entry.id || generateId(),
      capture: entry.capture,
      content: entry.content || { text: '', wordCount: 0 },
      tags: entry.tags || {},
      sharing: entry.sharing || {
        isPrivate: false,
        isEveryone: false,
        selectedFriends: [],
      },
      createdAt: entry.createdAt || new Date(),
      updatedAt: new Date(),
    };

    try {
      // Here you would save to your backend/storage
      console.log('Saving entry:', completeEntry);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const shareText = completeEntry.sharing.isPrivate
        ? 'Your entry has been saved privately.'
        : completeEntry.sharing.isEveryone
        ? 'Your entry has been shared with everyone.'
        : completeEntry.sharing.selectedFriends.length > 0
        ? `Your entry has been shared with ${completeEntry.sharing.selectedFriends.length} friend${completeEntry.sharing.selectedFriends.length > 1 ? 's' : ''}.`
        : 'Your entry has been saved but not shared with anyone.';

      return {
        success: true,
        message: shareText,
        entryId: completeEntry.id,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to save entry. Please try again.',
      };
    }
  }, [entry, generateId]);

  const resetEntry = useCallback(() => {
    setEntry({
      content: { text: '', wordCount: 0 },
      tags: {},
      sharing: {
        isPrivate: false,
        isEveryone: false,
        selectedFriends: [],
      },
    });
  }, []);

  const initializeEntry = useCallback((capture: MediaCapture) => {
    setEntry({
      id: generateId(),
      capture,
      content: { text: '', wordCount: 0 },
      tags: {},
      sharing: {
        isPrivate: false,
        isEveryone: false,
        selectedFriends: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [generateId]);

  const getWordCount = useCallback(() => {
    return entry.content?.wordCount || 0;
  }, [entry.content?.wordCount]);

  const canSave = useCallback(() => {
    return !!entry.capture;
  }, [entry.capture]);

  return {
    entry,
    updateText,
    updateMusic,
    updateLocation,
    updateSharing,
    toggleFriend,
    setPrivate,
    setEveryone,
    saveEntry,
    resetEntry,
    initializeEntry,
    getWordCount,
    canSave,
  };
}