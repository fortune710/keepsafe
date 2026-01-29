import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  badge?: number;
}

export interface ScheduleNotificationOptions {
  content: NotificationContent;
  trigger: Notifications.NotificationTriggerInput;
  identifier?: string;
}

/**
 * Service for managing local notifications using expo-notifications.
 * Handles sending immediate notifications, scheduling future notifications,
 * and canceling scheduled notifications.
 */
export class LocalNotificationService {
  /**
   * Configure notification behavior when app is in foreground.
   * Should be called during app initialization.
   */
  static async configureNotificationHandler(): Promise<void> {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: false
        }),
      });
      logger.info('Notification handler configured');
    } catch (error) {
      logger.error('Error configuring notification handler:', error);
    }
  }

  /**
   * Request notification permissions from the user.
   * 
   * @returns Promise resolving to true if permissions granted, false otherwise
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      
      if (granted) {
        logger.info('Notification permissions granted');
      } else {
        logger.warn('Notification permissions denied');
      }
      
      return granted;
    } catch (error) {
      logger.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Configure Android notification channel.
   * Should be called during app initialization on Android.
   */
  static async configureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      logger.info('Android notification channel configured');
    } catch (error) {
      logger.error('Error configuring Android notification channel:', error);
    }
  }

  /**
   * Send an immediate local notification.
   * 
   * @param content - Notification content (title, body, data, etc.)
   * @param identifier - Optional unique identifier for the notification
   * @returns Promise resolving to the notification identifier, or null if failed
   */
  static async sendNotification(
    content: NotificationContent,
    identifier?: string
  ): Promise<string | null> {
    try {
      // Ensure permissions are granted
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        logger.warn('Cannot send notification: permissions not granted');
        return null;
      }

      // Configure Android channel if needed
      if (Platform.OS === 'android') {
        await this.configureAndroidChannel();
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data || {},
          sound: content.sound !== false,
          badge: content.badge,
        },
        trigger: null, // null trigger = immediate notification
        identifier,
      });

      logger.debug('Notification sent:', { identifier: notificationId, content });
      return notificationId;
    } catch (error) {
      logger.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Schedule a notification for a future time.
   * 
   * @param options - Notification options including content and trigger
   * @returns Promise resolving to the notification identifier, or null if failed
   */
  static async scheduleNotification(
    options: ScheduleNotificationOptions
  ): Promise<string | null> {
    try {
      // Ensure permissions are granted
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        logger.warn('Cannot schedule notification: permissions not granted');
        return null;
      }

      // Configure Android channel if needed
      if (Platform.OS === 'android') {
        await this.configureAndroidChannel();
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.content.title,
          body: options.content.body,
          data: options.content.data || {},
          sound: options.content.sound !== false,
          badge: options.content.badge,
        },
        trigger: options.trigger,
        identifier: options.identifier,
      });

      logger.debug('Notification scheduled:', { 
        identifier: notificationId, 
        trigger: options.trigger,
        content: options.content 
      });
      return notificationId;
    } catch (error) {
      logger.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a specific scheduled notification by identifier.
   * 
   * @param identifier - The notification identifier to cancel
   * @returns Promise resolving to true if canceled, false otherwise
   */
  static async cancelScheduledNotification(identifier: string): Promise<boolean> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      logger.debug('Scheduled notification canceled:', { identifier });
      return true;
    } catch (error) {
      logger.error('Error canceling scheduled notification:', error);
      return false;
    }
  }

  /**
   * Cancel all scheduled notifications.
   * 
   * @returns Promise resolving to true if successful, false otherwise
   */
  static async cancelAllScheduledNotifications(): Promise<boolean> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.info('All scheduled notifications canceled');
      return true;
    } catch (error) {
      logger.error('Error canceling all scheduled notifications:', error);
      return false;
    }
  }

  /**
   * Get all scheduled notifications.
   * 
   * @returns Promise resolving to array of scheduled notifications
   */
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      logger.debug('Retrieved scheduled notifications:', { count: notifications.length });
      return notifications;
    } catch (error) {
      logger.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Get a specific scheduled notification by identifier.
   * 
   * @param identifier - The notification identifier
   * @returns Promise resolving to the notification or null if not found
   */
  static async getScheduledNotification(
    identifier: string
  ): Promise<Notifications.NotificationRequest | null> {
    try {
      const notifications = await this.getAllScheduledNotifications();
      const notification = notifications.find(n => n.identifier === identifier);
      return notification || null;
    } catch (error) {
      logger.error('Error getting scheduled notification:', error);
      return null;
    }
  }
}
