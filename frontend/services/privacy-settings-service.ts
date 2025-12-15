import { supabase } from '@/lib/supabase';
import { deviceStorage } from '@/services/device-storage';
import { PrivacySettings } from '@/types/privacy';

export type PrivacySettingsMap = Record<PrivacySettings, boolean>;

const PRIVACY_SETTINGS_STORAGE_KEY = (userId: string) =>
  `privacy_settings_${userId}`;

export class PrivacySettingsService {
  /**
   * Load privacy settings for a user.
   * Priority:
   * 1) Local device storage
   * 2) Supabase `privacy_settings` table
   */
  static async getPrivacySettings(userId: string): Promise<PrivacySettingsMap | null> {
    try {
      // 1. Try local storage first
      const local = await deviceStorage.getItem<PrivacySettingsMap>(
        PRIVACY_SETTINGS_STORAGE_KEY(userId),
      );
      if (local) {
        return local;
      }

      // 2. Fallback to Supabase (single row per user)
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('auto_share, location_share')
        .eq('user_id', userId)
        .maybeSingle<{
          auto_share: boolean | null;
          location_share: boolean | null;
        }>();

      if (error) {
        console.error('Error fetching privacy settings from Supabase:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      const fromRemote: PrivacySettingsMap = {
        [PrivacySettings.AUTO_SHARE]: data.auto_share ?? false,
        [PrivacySettings.LOCATION_SHARE]: data.location_share ?? true,
      };

      // Cache remotely-loaded settings locally
      await deviceStorage.setItem(PRIVACY_SETTINGS_STORAGE_KEY(userId), fromRemote);

      return fromRemote;
    } catch (error) {
      console.error('Error in getPrivacySettings:', error);
      return null;
    }
  }

  /**
   * Save privacy settings for a user.
   * Writes to local storage first, then syncs to Supabase.
   */
  static async savePrivacySettings(
    userId: string,
    settings: PrivacySettingsMap,
  ): Promise<void> {
    // 1. Save to local storage (best-effort cache; don't throw)
    try {
      await deviceStorage.setItem(PRIVACY_SETTINGS_STORAGE_KEY(userId), settings);
    } catch (error) {
      console.error('Error caching privacy settings locally:', error);
      // Continue; remote save is the source of truth for mutations
    }

    // 2. Sync to Supabase (one row per user) - failures MUST throw
    const row = {
      user_id: userId,
      auto_share: settings[PrivacySettings.AUTO_SHARE],
      location_share: settings[PrivacySettings.LOCATION_SHARE],
    };

    const { error } = await supabase
      .from('privacy_settings')
      .upsert(row as never, { onConflict: 'user_id' } as never);

    if (error) {
      console.error('Error saving privacy settings to Supabase:', error);
      throw new Error(error.message || 'Failed to save privacy settings');
    }
  }
}


