import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/providers/auth-provider';
import {
  PushNotificationService,
  NotificationSettingsMap,
} from '@/services/push-notification-service';
import { NotificationSettings } from '@/types/notifications';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsMap = {
  [NotificationSettings.PUSH_NOTIFICATIONS]: true,
  [NotificationSettings.FRIEND_ACTIVITY]: true,
  [NotificationSettings.ENTRY_REMINDER]: false,
  [NotificationSettings.FRIEND_REQUESTS]: true,
};

interface UseNotificationSettingsResult {
  settings: NotificationSettingsMap;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  toggleSetting: (id: NotificationSettings) => void;
}

export function useNotificationSettings(): UseNotificationSettingsResult {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['notification-settings', user?.id],
    [user?.id],
  );

  const {
    data,
    isLoading,
    error,
  } = useQuery<NotificationSettingsMap>({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return DEFAULT_NOTIFICATION_SETTINGS;

      const stored = await PushNotificationService.getNotificationSettings(user.id);
      return stored ?? DEFAULT_NOTIFICATION_SETTINGS;
    },
  });

  const { mutate: saveSettings, isPending: isSaving, error: mutationError } = useMutation({
    mutationFn: async (next: NotificationSettingsMap) => {
      if (!user?.id) return;
      await PushNotificationService.saveNotificationSettings(user.id, next);
      return next;
    },
    onMutate: async (next: NotificationSettingsMap) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationSettingsMap>(queryKey);

      queryClient.setQueryData<NotificationSettingsMap>(queryKey, next);

      return { previous };
    },
    onError: (_err, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData<NotificationSettingsMap>(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const currentSettings: NotificationSettingsMap = data ?? DEFAULT_NOTIFICATION_SETTINGS;

  const toggleSetting = (id: NotificationSettings) => {
    if (!user?.id) return;

    const isPushToggle = id === NotificationSettings.PUSH_NOTIFICATIONS;
    const pushCurrentlyEnabled = currentSettings[NotificationSettings.PUSH_NOTIFICATIONS];

    if (isPushToggle) {
      const nextPushEnabled = !pushCurrentlyEnabled;

      if (!nextPushEnabled) {
        // Turning off push disables all notifications
        saveSettings({
          [NotificationSettings.PUSH_NOTIFICATIONS]: false,
          [NotificationSettings.FRIEND_ACTIVITY]: false,
          [NotificationSettings.ENTRY_REMINDER]: false,
          [NotificationSettings.FRIEND_REQUESTS]: false,
        });
        return;
      }

      // Turning ON push: ensure OS-level permission is granted first.
      void (async () => {
        // If we can't support push tokens on this device/platform, keep disabled.
        if (!Device.isDevice || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
          saveSettings({
            [NotificationSettings.PUSH_NOTIFICATIONS]: false,
            [NotificationSettings.FRIEND_ACTIVITY]: false,
            [NotificationSettings.ENTRY_REMINDER]: false,
            [NotificationSettings.FRIEND_REQUESTS]: false,
          });
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        // Persist initial preferences row if missing (grant => all true, deny => all false).
        const created = await PushNotificationService.initializeNotificationSettingsFromPermission(
          user.id,
          finalStatus === 'granted',
        );

        if (finalStatus !== 'granted') {
          // Denied: keep everything off and persist.
          saveSettings({
            [NotificationSettings.PUSH_NOTIFICATIONS]: false,
            [NotificationSettings.FRIEND_ACTIVITY]: false,
            [NotificationSettings.ENTRY_REMINDER]: false,
            [NotificationSettings.FRIEND_REQUESTS]: false,
          });
          return;
        }

        // Granted: if this is the first time, default everything to true; otherwise keep other prefs as-is.
        if (created) {
          saveSettings({
            [NotificationSettings.PUSH_NOTIFICATIONS]: true,
            [NotificationSettings.FRIEND_ACTIVITY]: true,
            [NotificationSettings.ENTRY_REMINDER]: true,
            [NotificationSettings.FRIEND_REQUESTS]: true,
          });
          return;
        }

        saveSettings({
          ...currentSettings,
          [NotificationSettings.PUSH_NOTIFICATIONS]: true,
        });
      })();

      return;
    }

    // For other settings, only allow toggle if push is enabled
    if (!pushCurrentlyEnabled) {
      return;
    }

    saveSettings({
      ...currentSettings,
      [id]: !currentSettings[id],
    });
  };

  return {
    settings: currentSettings,
    isLoading,
    isSaving,
    error: (error as Error | null) ?? (mutationError as Error | null) ?? null,
    toggleSetting,
  };
}


