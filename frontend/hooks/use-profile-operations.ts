import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES, STORAGE_BUCKETS, UPLOAD_PATHS } from '@/constants/supabase';
import { Database } from '@/types/database';
import { useAuthContext } from '@/providers/auth-provider';
import { convertToArrayBuffer, getContentType, getFileExtension } from '@/lib/utils';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileUpdateData {
  full_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  birthday?: string;
  phone_number?: string;
}

interface UseProfileOperationsResult {
  isLoading: boolean;
  updateProfile: (updates: ProfileUpdateData) => Promise<{ success: boolean; message: string }>;
  uploadAvatar: (file: string) => Promise<{ success: boolean; url?: string; message: string }>;
  checkUsernameAvailability: (username: string) => Promise<{ available: boolean; message: string }>;
}

export function useProfileOperations(): UseProfileOperationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const { user, updateProfile: updateAuthProfile } = useAuthContext();

  const uploadAvatar = async (
    file: string
  ): Promise<{ success: boolean; url?: string; message: string }> => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    setIsLoading(true);

    try {
      const fileExt = getFileExtension('photo');
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = UPLOAD_PATHS.AVATARS(user.id, fileName);
      const contentType = getContentType('photo');
      const uploadData = await convertToArrayBuffer(file);
      
      // Delete old avatar if exists
      const { data: existingFiles } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const deletePromises = existingFiles.map(file => 
          supabase.storage
            .from(STORAGE_BUCKETS.AVATARS)
            .remove([`${user.id}/${file.name}`])
        );
        await Promise.all(deletePromises);
      }

      // Upload new avatar
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(filePath, uploadData, {
          cacheControl: '3600',
          upsert: true,
          contentType
        });

      if (error) {
        throw new Error(error.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(data.path);

      return { success: true, url: publicUrl, message: 'Avatar updated successfully' };
    } catch (error) {
      console.error('Avatar upload error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to upload avatar' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const checkUsernameAvailability = useCallback(async (username: string): Promise<{ available: boolean; message: string }> => {
    if (!user) {
      return { available: false, message: 'User not authenticated' };
    }

    if (username.length < 3) {
      return { available: false, message: 'Username must be at least 3 characters' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { available: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(error.message);
      }

      const available = !data;
      return {
        available,
        message: available ? 'Username is available' : 'Username is already taken'
      };
    } catch (error) {
      console.error('Username check error:', error);
      return { available: false, message: 'Failed to check username availability' };
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: ProfileUpdateData): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    setIsLoading(true);

    try {
      // If username is being updated, check availability first
      if (updates.username) {
        const usernameCheck = await checkUsernameAvailability(updates.username);
        if (!usernameCheck.available) {
          return { success: false, message: usernameCheck.message };
        }
        updates.username = updates.username.toLowerCase();
      }

      // Update profile in database
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update(updates as never)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update local auth context
      await updateAuthProfile(updates);

      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Profile update error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update profile' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [user, updateAuthProfile, checkUsernameAvailability]);

  return {
    isLoading,
    updateProfile,
    uploadAvatar,
    checkUsernameAvailability,
  };
}