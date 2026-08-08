import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';

function openNotification(response: Notifications.NotificationResponse | null): void {
  const pageUrl = response?.notification.request.content.data?.page_url;
  if (typeof pageUrl !== 'string' || !pageUrl.startsWith('/')) return;
  router.push(pageUrl as any);
}

/** Handles notification navigation for foreground, background, and cold-start taps. */
export function useNotificationNavigation(): void {
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response);
    });

    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) {
      openNotification(initialResponse);
      Notifications.clearLastNotificationResponse();
    }

    return () => subscription.remove();
  }, [navigationState?.key]);
}
