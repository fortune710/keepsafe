import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES, STORAGE_BUCKETS, UPLOAD_PATHS } from '@/constants/supabase';
import { Database } from '@/types/database';
import { MediaCapture } from '@/types/media';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getContentType, getFileExtension, isBase64File, isLocalFile } from '@/lib/utils';

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
  }) => Promise<ShareResult>;
  uploadMedia: (file: File | Blob | string, userId: string, fileName: string, contentType: string) => Promise<string | null>;
}

// Helper function to convert URI to ArrayBuffer for upload
const uriToArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return await response.arrayBuffer();
  } else {
    // For native platforms, read the file and convert to ArrayBuffer
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }
      
      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to ArrayBuffer
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      return byteArray.buffer; // Return ArrayBuffer instead of Blob
    } catch (error) {
      console.error('Error converting URI to ArrayBuffer:', error);
      throw new Error('Failed to process file for upload');
    }
  }
};

export function useEntryOperations(): UseEntryOperationsResult {
  const [isLoading, setIsLoading] = useState(false);

  // Updated uploadMedia function to handle native files better
  const uploadMedia = useCallback(async (
    file: File | Blob | string, 
    userId: string, 
    fileName: string,
    contentType: string
  ): Promise<string | null> => {
    try {
      const filePath = UPLOAD_PATHS.MEDIA(userId, fileName);
      
      let uploadData: File | Blob | ArrayBuffer;

      if (typeof file === 'string' && isBase64File(file)) {
        // Handle base64 data URL
        const [contentTypeInfo, base64Data] = file.split(';base64,');
        const detectedContentType = contentTypeInfo.split(':')[1];
        
        // Convert base64 to ArrayBuffer
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        uploadData = byteArray.buffer;
      } else if (Platform.OS === 'web') {
        // Web: use the file/blob directly
        uploadData = file as File | Blob;
      } else {
        // Native: convert file URI to ArrayBuffer
        uploadData = await uriToArrayBuffer(file as string);
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