import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/providers/auth-provider';
import {
  PushNotificationService,
  NotificationSettingsMap,
} from '@/services/push-notification-service';
import { NotificationSettings } from '@/types/notifications';

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

    let next: NotificationSettingsMap = { ...currentSettings };

    if (isPushToggle) {
      const nextPushEnabled = !pushCurrentlyEnabled;

      if (!nextPushEnabled) {
        // Turning off push disables all notifications
        next = {
          [NotificationSettings.PUSH_NOTIFICATIONS]: false,
          [NotificationSettings.FRIEND_ACTIVITY]: false,
          [NotificationSettings.ENTRY_REMINDER]: false,
          [NotificationSettings.FRIEND_REQUESTS]: false,
        };
      } else {
        // Turning on push only enables the push toggle, keep others as-is
        next = {
          ...currentSettings,
          [NotificationSettings.PUSH_NOTIFICATIONS]: true,
        };
      }
    } else {
      // For other settings, only allow toggle if push is enabled
      if (!pushCurrentlyEnabled) {
        return;
      }

      next = {
        ...currentSettings,
        [id]: !currentSettings[id],
      };
    }

    saveSettings(next);
  };

  return {
    settings: currentSettings,
    isLoading,
    isSaving,
    error: (error as Error | null) ?? (mutationError as Error | null) ?? null,
    toggleSetting,
  };
}


