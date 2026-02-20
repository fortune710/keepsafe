import { supabase } from "@/lib/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { deviceStorage } from '@/services/device-storage';
import { NotificationSettings } from '@/types/notifications';
import { logger } from "@/lib/logger";
import { TABLES } from "@/constants/supabase";

export type NotificationSettingsMap = Record<NotificationSettings, boolean>;

const ALL_NOTIFICATIONS_ON: NotificationSettingsMap = {
  [NotificationSettings.PUSH_NOTIFICATIONS]: true,
  [NotificationSettings.FRIEND_ACTIVITY]: true,
  [NotificationSettings.ENTRY_REMINDER]: true,
  [NotificationSettings.FRIEND_REQUESTS]: true,
};

const ALL_NOTIFICATIONS_OFF: NotificationSettingsMap = {
  [NotificationSettings.PUSH_NOTIFICATIONS]: false,
  [NotificationSettings.FRIEND_ACTIVITY]: false,
  [NotificationSettings.ENTRY_REMINDER]: false,
  [NotificationSettings.FRIEND_REQUESTS]: false,
};

const NOTIFICATION_SETTINGS_STORAGE_KEY = (userId: string) =>
  `notification_settings_${userId}`;

/**
 * Gets a unique device identifier that works across Expo Go and standalone apps.
 * Uses platform-specific IDs when available, with fallbacks.
 */
async function getUniqueDeviceId(userId: string): Promise<string> {
  const DEVICE_UUID_KEY = `device_uuid_${userId}`;

  try {
    // 1. Try to get the existing stored ID first for stability across sessions
    const storedId = await deviceStorage.getItem<string>(DEVICE_UUID_KEY);
    if (storedId) {
      return storedId;
    }

    let deviceId: string | null = null;

    // 2. Try to get native platform ID
    if (Platform.OS === 'android') {
      deviceId = await Application.getAndroidId();
    } else if (Platform.OS === 'ios') {
      deviceId = await Application.getIosIdForVendorAsync();
    }

    // 3. Fallback to installationId (legacy Expo Go ID)
    if (!deviceId && (Constants as any).installationId) {
      deviceId = (Constants as any).installationId;
    }

    // 4. Generate a new UUID as a stable last resort
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
    }

    // Persist for future sessions to ensure restarts upsert rather than insert
    await deviceStorage.setItem(DEVICE_UUID_KEY, deviceId);
    return deviceId;
  } catch (error) {
    logger.error('Error getting unique device ID:', error);
    // Ultimate fallback is a new UUID to at least have a valid format, 
    // though stability might be compromised if storage is failing.
    return Crypto.randomUUID();
  }
}

export class PushNotificationService {
  private supabase: SupabaseClient = supabase;
  private currentToken: string | null = null;
  private userId: string | null = null;

  // Initialize push notifications
  async initialize(userId?: string): Promise<string | null> {
    try {
      this.userId = userId || null;

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permission for push notifications denied');
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
      });

      logger.debug('Push token:', this.currentToken);

      // Save token to Supabase
      if (this.userId && !this.currentToken) {
        this.currentToken = tokenData.data;
        //await this.savePushToken(this.currentToken, this.userId);
      }

      return this.currentToken;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return null;
    }
  }

  // Save push token to Supabase
  static async savePushToken(token: string, userId: string): Promise<void> {
    try {
      // Only persist tokens for native platforms we support
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        console.warn('Skipping push token save for unsupported platform:', Platform.OS);
        return;
      }

      const deviceId = await getUniqueDeviceId(userId);
      const platform: 'ios' | 'android' = Platform.OS;
      const environment: 'prod' | 'dev' = __DEV__ ? 'dev' : 'prod';

      const { error } = await supabase
        .from(TABLES.PUSH_TOKENS)
        .upsert({
          user_id: userId,
          token: token,
          platform: platform,
          device_id: deviceId,
          environment: environment,
          updated_at: new Date().toISOString(),
        } as never, {
          onConflict: 'user_id,device_id,environment'
        } as never);

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error in savePushToken:', error);
    }
  }

  // Remove push token (logout)
  async removePushToken(userId: string): Promise<void> {
    try {
      const deviceId = await getUniqueDeviceId(userId);
      const environment: 'prod' | 'dev' = __DEV__ ? 'dev' : 'prod';

      const { error } = await this.supabase
        .from(TABLES.PUSH_TOKENS)
        .delete()
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .eq('environment', environment);

      if (error) {
        console.error('Error removing push token:', error);
      } else {
        this.currentToken = null;
        console.log('Push token removed successfully');
      }
    } catch (error) {
      console.error('Error in removePushToken:', error);
    }
  }

  // Get current push token
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  // Update user ID and save token
  async updateUserId(newUserId: string): Promise<void> {
    this.userId = newUserId;
    if (this.currentToken) {
      //await this.savePushToken(this.currentToken, newUserId);
    }
  }

  /**
   * Load notification settings for a user.
   * Priority:
   * 1) Local device storage
   * 2) Supabase `notification_settings` table
   */
  static async getNotificationSettings(userId: string): Promise<NotificationSettingsMap | null> {
    try {
      // 1. Try local storage first
      const local = await deviceStorage.getItem<NotificationSettingsMap>(
        NOTIFICATION_SETTINGS_STORAGE_KEY(userId),
      );
      if (local) {
        return local;
      }

      // 2. Fallback to Supabase (single row per user)
      const { data, error } = await supabase
        .from('notification_settings')
        .select('friend_requests, push_notifications, entry_reminder, friend_activity')
        .eq('user_id', userId)
        .maybeSingle<{
          friend_requests: boolean | null;
          push_notifications: boolean | null;
          entry_reminder: boolean | null;
          friend_activity: boolean | null;
        }>();

      if (error) {
        console.error('Error fetching notification settings from Supabase:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      const fromRemote: NotificationSettingsMap = {
        [NotificationSettings.FRIEND_REQUESTS]: data.friend_requests ?? true,
        [NotificationSettings.PUSH_NOTIFICATIONS]: data.push_notifications ?? true,
        [NotificationSettings.ENTRY_REMINDER]: data.entry_reminder ?? false,
        [NotificationSettings.FRIEND_ACTIVITY]: data.friend_activity ?? true,
      };

      // Cache remotely-loaded settings locally
      await deviceStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY(userId), fromRemote);

      return fromRemote;
    } catch (error) {
      console.error('Error in getNotificationSettings:', error);
      return null;
    }
  }

  /**
   * Save notification settings for a user.
   * Writes to local storage first, then syncs to Supabase.
   */
  static async saveNotificationSettings(
    userId: string,
    settings: NotificationSettingsMap,
  ): Promise<void> {
    // 1. Save to local storage (best-effort cache; don't throw)
    try {
      await deviceStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY(userId), settings);
    } catch (error) {
      console.error('Error caching notification settings locally:', error);
      // Continue; remote save is the source of truth for mutations
    }

    // 2. Sync to Supabase (one row per user) - failures MUST throw
    const row = {
      user_id: userId,
      friend_requests: settings[NotificationSettings.FRIEND_REQUESTS],
      push_notifications: settings[NotificationSettings.PUSH_NOTIFICATIONS],
      entry_reminder: settings[NotificationSettings.ENTRY_REMINDER],
      friend_activity: settings[NotificationSettings.FRIEND_ACTIVITY],
    };

    const { error } = await supabase
      .from(TABLES.NOTIFICATION_SETTINGS)
      .upsert(row as never, { onConflict: 'user_id' } as never);

    if (error) {
      console.error('Error saving notification settings to Supabase:', error);
      throw new Error(error.message || 'Failed to save notification settings');
    }
  }

  /**
   * Backwards-compatible alias (matches older naming used in docs/issues).
   */
  static async saveNotificationsSettings(
    userId: string,
    settings: NotificationSettingsMap,
  ): Promise<void> {
    return await PushNotificationService.saveNotificationSettings(userId, settings);
  }

  /**
   * Create an initial `notification_settings` row the first time we learn the
   * device-level notification permission outcome for a user.
   *
   * - If granted: default all options to true
   * - If denied: default all options to false
   *
   * This is intentionally "create-if-missing" to avoid clobbering user prefs.
   */
  static async initializeNotificationSettingsFromPermission(
    userId: string,
    permissionGranted: boolean,
  ): Promise<boolean> {
    try {
      // Check remote row existence directly (local cache may exist without remote in older versions)
      const { data, error } = await supabase
        .from(TABLES.NOTIFICATION_SETTINGS)
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle<{ user_id: string }>();

      if (error) {
        console.error('Error checking notification settings row existence:', error);
        return false;
      }

      if (data?.user_id) {
        return false;
      }

      const defaults = permissionGranted ? ALL_NOTIFICATIONS_ON : ALL_NOTIFICATIONS_OFF;
      await PushNotificationService.saveNotificationSettings(userId, defaults);
      return true;
    } catch (error) {
      // Best-effort: never break permission flow due to settings persistence
      console.error('Error initializing notification settings from permission:', error);
      return false;
    }
  }
}