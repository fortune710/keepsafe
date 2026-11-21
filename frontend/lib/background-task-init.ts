import { startForegroundQueueProcessor } from '@/services/background-task-manager';
import '@/services/place-visit-service';
import { LocalNotificationService } from '@/services/local-notification-service';

/**
 * Initialize background tasks for the app
 * This should be called during app startup
 */
export async function initializeBackgroundTasks(): Promise<void> {
  try {
    await LocalNotificationService.configureNotificationHandler();
    await LocalNotificationService.configureAndroidChannel();
    // Kick off the foreground processing queue on app start
    await startForegroundQueueProcessor();
    console.log('Foreground queue initialized');
  } catch (error) {
    console.error('Failed to initialize background tasks:', error);
  }
}
