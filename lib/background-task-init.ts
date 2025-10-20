import { startForegroundQueueProcessor } from '@/services/background-task-manager';

/**
 * Initialize background tasks for the app
 * This should be called during app startup
 */
export async function initializeBackgroundTasks(): Promise<void> {
  try {
    // Kick off the foreground processing queue on app start
    await startForegroundQueueProcessor();
    console.log('Foreground queue initialized');
  } catch (error) {
    console.error('Failed to initialize background tasks:', error);
  }
}
