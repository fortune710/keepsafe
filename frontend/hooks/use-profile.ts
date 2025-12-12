import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { TABLES } from '@/constants/supabase';
import { generateInviteCode } from '@/lib/utils';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

interface UseProfileResult {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<ProfileUpdate>) => Promise<{ error: Error | null }>;
  refreshProfile: (userId: string) => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const profileData = {
              id: userData.user.id,
              email: userData.user.email!,
              full_name: null,
              username: null,
              avatar_url: null,
              bio: null,
              invite_code: await generateInviteCode(),
            };

            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert(profileData as never)
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              setError('Failed to create profile');
              return;
            }

            setProfile(newProfile);
            return;
          }
        }
        
        console.error('Error fetching profile:', error);
        setError('Failed to fetch profile');
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to fetch profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<ProfileUpdate>) => {
    if (!profile) {
      return { error: new Error('No profile loaded') };
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update(updates as never)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        return { error: new Error(error.message) };
      }

      setProfile(data);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [profile]);

  const refreshProfile = useCallback(async (userId: string) => {
    await fetchProfile(userId);
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    refreshProfile,
  };
}