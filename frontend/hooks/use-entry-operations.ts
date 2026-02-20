import { useState, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { TABLES, STORAGE_BUCKETS, UPLOAD_PATHS } from '@/constants/supabase';
import { Database } from '@/types/database';
import { MediaCapture } from '@/types/media';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getContentType, getFileExtension, isBase64File, isLocalFile } from '@/lib/utils';
import { RenderedMediaCanvasItem } from '@/types/capture';
import { scheduleEntryProcessing } from '@/services/background-task-manager';

type Entry = Database['public']['Tables']['entries']['Row'];
type EntryInsert = Database['public']['Tables']['entries']['Insert'];

interface ShareResult {
  success: boolean;
  message: string;
  sharedWith?: string[];
  entry?: Entry;
  tempId?: string;
}

interface UseEntryOperationsResult {
  isLoading: boolean;
  saveEntry: (entryData: {
    capture: MediaCapture;
    textContent: string;
    musicTag?: string;
    locationTag?: string;
    isPrivate: boolean;
    isEveryone: boolean;
    selectedFriends: string[];
    attachments: RenderedMediaCanvasItem[];
    tempId?: string;
  }) => Promise<ShareResult>;
  uploadMedia: (file: File | string, userId: string, fileName: string, contentType: string) => Promise<string | null>;
}

/**
 * Generates a deterministic idempotency key from entry parameters
 * Uses SHA-256 hash to ensure uniqueness based on entry content and configuration
 */
export async function generateIdempotencyKey(params: {
  captureUri: string;
  userId: string;
  selectedFriends: string[];
  isPrivate: boolean;
  isEveryone: boolean;
  attachments: RenderedMediaCanvasItem[];
  locationTag?: string;
  musicTag?: string;
  textContent: string;
}): Promise<string> {
  // Sort arrays for consistency
  const sortedFriends = [...params.selectedFriends].sort();
  
  // Sort attachments by ID for consistency
  const sortedAttachments = [...params.attachments].sort((a, b) => {
    const aId = a.id?.toString() || '';
    const bId = b.id?.toString() || '';
    return aId.localeCompare(bId);
  });

  // Create a deterministic string from all parameters
  const dataString = JSON.stringify({
    captureUri: params.captureUri,
    userId: params.userId,
    selectedFriends: sortedFriends,
    isPrivate: params.isPrivate,
    isEveryone: params.isEveryone,
    attachments: sortedAttachments,
    locationTag: params.locationTag || null,
    musicTag: params.musicTag || null,
    textContent: params.textContent || '',
  });

  // Generate SHA-256 hash
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dataString
  );

  return hash;
}

/**
 * Converts a URI/File to ArrayBuffer for upload
 * Works on both web and React Native
 */
const convertToArrayBuffer = async (source: string | File): Promise<ArrayBuffer> => {
  if (typeof source === 'string') {
    // URI string (React Native or web blob URL)
    const response = await fetch(source);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    return await response.arrayBuffer();
  } else {
    // File object (web)
    return await source.arrayBuffer();
  }
};

/**
 * Converts a URI/File to Blob for upload
 * Alternative method that may work better in some cases
 */
const convertToBlob = async (source: string | File, contentType?: string): Promise<Blob> => {
  if (typeof source === 'string') {
    // URI string
    const response = await fetch(source);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Override content type if provided
    if (contentType && blob.type !== contentType) {
      return new Blob([blob], { type: contentType });
    }
    
    return blob;
  } else {
    // File object (web)
    if (contentType && source.type !== contentType) {
      return new Blob([source], { type: contentType });
    }
    return source;
  }
};

export function useEntryOperations(): UseEntryOperationsResult {
  const [isLoading, setIsLoading] = useState(false);

  // Updated uploadMedia function to handle native files better
  const uploadMedia = useCallback(async (
    file: File | string, 
    userId: string, 
    fileName: string,
    contentType: string
  ): Promise<string | null> => {
    const filePath = UPLOAD_PATHS.MEDIA(userId, fileName);
    
    try {
      // Validate file if validation options are available
      let fileContentType = contentType;
        
      // Auto-detect content type for File objects
      if (typeof file !== 'string' && !fileContentType) {
        fileContentType = file.type;
      }
      
      // Convert file to uploadable format
      let uploadData: ArrayBuffer | Blob;
      
      try {
        // Try ArrayBuffer first (generally more reliable)
        uploadData = await convertToArrayBuffer(file);
      } catch (arrayBufferError) {
        console.warn('ArrayBuffer conversion failed, trying Blob:', arrayBufferError);
        // Fallback to Blob
        uploadData = await convertToBlob(file, fileContentType);
      }
    
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.MEDIA)
        .upload(filePath, uploadData, {
          cacheControl: '3600',
          upsert: false,
          contentType
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.MEDIA)
        .getPublicUrl(data.path);

      return publicUrl;
      
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  }, []);

  // Updated saveEntry function to use background processing
  const saveEntry = useCallback(async (entryData: {
    capture: MediaCapture;
    textContent: string;
    musicTag?: string;
    locationTag?: string;
    isPrivate: boolean;
    isEveryone: boolean;
    selectedFriends: string[];
    attachments: RenderedMediaCanvasItem[];
    tempId?: string;
  }): Promise<ShareResult> => {
    setIsLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Use provided tempId or generate a uuid to keep ids consistent across UI and processing
      const tempId = entryData.tempId || Crypto.randomUUID();

      // Generate idempotency key from all entry parameters
      // This prevents duplicate entries if save is called multiple times with same configuration
      const idempotencyKey = await generateIdempotencyKey({
        captureUri: entryData.capture.uri,
        userId: user.id,
        selectedFriends: entryData.selectedFriends,
        isPrivate: entryData.isPrivate,
        isEveryone: entryData.isEveryone,
        attachments: entryData.attachments,
        locationTag: entryData.locationTag,
        musicTag: entryData.musicTag,
        textContent: entryData.textContent,
      });

      // Prepare data for background processing
      const processingData = {
        entryId: tempId,
        userId: user.id,
        capture: entryData.capture,
        textContent: entryData.textContent,
        musicTag: entryData.musicTag,
        locationTag: entryData.locationTag,
        isPrivate: entryData.isPrivate,
        isEveryone: entryData.isEveryone,
        selectedFriends: entryData.selectedFriends,
        attachments: entryData.attachments,
        idempotencyKey,
      };

      // Schedule background processing
      await scheduleEntryProcessing(processingData);

      const sharedWith = entryData.isPrivate ? [user.id] : [user.id, ...entryData.selectedFriends];

      // Generate success message
      let message = 'Entry processing started';

      return {
        success: true,
        message,
        sharedWith,
        tempId,
      };

    } catch (error) {
      console.error('Save entry error:', error);
      return {
        success: false,
        message: 'Failed to start processing',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    saveEntry,
    uploadMedia,
  };
}