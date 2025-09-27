import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES, STORAGE_BUCKETS, UPLOAD_PATHS } from '@/constants/supabase';
import { Database } from '@/types/database';
import { MediaCapture } from '@/types/media';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getContentType, getFileExtension, isBase64File, isLocalFile } from '@/lib/utils';
import { RenderedMediaCanvasItem } from '@/types/capture';

type Entry = Database['public']['Tables']['entries']['Row'];
type EntryInsert = Database['public']['Tables']['entries']['Insert'];

interface ShareResult {
  success: boolean;
  message: string;
  sharedWith?: string[];
  entry?: Entry;
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
  }) => Promise<ShareResult>;
  uploadMedia: (file: File | string, userId: string, fileName: string, contentType: string) => Promise<string | null>;
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

  // Update the saveEntry function to handle native files properly
  const saveEntry = useCallback(async (entryData: {
    capture: MediaCapture;
    textContent: string;
    musicTag?: string;
    locationTag?: string;
    isPrivate: boolean;
    isEveryone: boolean;
    selectedFriends: string[];
    attachments: RenderedMediaCanvasItem[];
  }): Promise<ShareResult> => {
    setIsLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Prepare entry data
      let finalContentUrl = entryData.capture.uri;

      // If it's a local file, upload to Supabase storage first
      try {
        // Generate filename based on media type
        const timestamp = Date.now();
        const fileExtension = getFileExtension(entryData.capture.type);
        const fileName = `${entryData.capture.type}_${timestamp}.${fileExtension}`;

        const contentType = getContentType(entryData.capture.type);
        
        // Upload to Supabase storage - pass the URI directly for native platforms
        const uploadedUrl = await uploadMedia(entryData.capture.uri, user.id, fileName, contentType);
        
        if (!uploadedUrl) {
          throw new Error('Failed to upload media to storage');
        }
        
        finalContentUrl = uploadedUrl;
      } catch (uploadError) {
        console.error('Media upload error:', uploadError);
        throw new Error('Failed to upload media. Please try again.');
      }

      const sharedWith = entryData.isPrivate ? [user.id] : [user.id, ...entryData.selectedFriends];

      const newEntry: EntryInsert = {
        user_id: user.id,
        type: entryData.capture.type as 'photo' | 'video' | 'audio',
        shared_with: sharedWith,
        content_url: finalContentUrl,
        text_content: entryData.textContent || null,
        music_tag: entryData.musicTag || null,
        location_tag: entryData.locationTag || null,
        is_private: entryData.isPrivate,
        shared_with_everyone: entryData.isEveryone,
        attachments: entryData.attachments,
        metadata: entryData.capture.metadata ? JSON.parse(JSON.stringify(entryData.capture.metadata)) : null,
      };

      // Insert entry
      const { data: entry, error: entryError } = await supabase
        .from(TABLES.ENTRIES)
        .upsert(newEntry as never)
        .select()
        .single();

      if (entryError) {
        throw new Error(`Failed to save entry: ${entryError.message}`);
      }

      // Generate success message
      let message = 'Shared Entry';

      return {
        success: true,
        message,
        sharedWith,
        entry,
      };

    } catch (error) {
      console.error('Save entry error:', error);
      return {
        success: false,
        message: 'Failed to share',
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