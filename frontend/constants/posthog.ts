import { PostHog } from 'posthog-react-native';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeEvent } from '@/lib/analytics/privacy';
import { analyticsEnabled } from '@/lib/analytics/environment';
import { sanitizeDiagnosticLog } from '@/lib/analytics/diagnostics';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

// Avoid initializing the SDK at all in development, including development update channels.
const enabled = analyticsEnabled({
  dev: __DEV__, environment: process.env.EXPO_PUBLIC_NODE_ENV, channel: Updates.channel,
  platform: Platform.OS, apiKey, host,
});

const noOpPostHog = {
  capture: () => Promise.resolve(),
  captureException: () => {},
  captureLog: () => {},
  identify: () => Promise.resolve(),
  reset: () => Promise.resolve(),
  screen: () => Promise.resolve(),
  startSessionRecording: () => Promise.resolve(),
  stopSessionRecording: () => Promise.resolve(),
  group: () => Promise.resolve(),
  alias: () => Promise.resolve(),
  reloadFeatureFlags: () => {},
  onFeatureFlags: () => () => {},
  isFeatureEnabled: () => false,
  getFeatureFlag: () => null,
  getFeatureFlagPayload: () => null,
} as unknown as PostHog;

export const posthog = enabled
  ? new PostHog(apiKey!, {
      host,
      // Isolate the sanitized queue from any older, potentially sensitive queued events.
      customStorage: {
        getItem: (key) => AsyncStorage.getItem(`analytics-private-v1:${key}`),
        setItem: (key, value) => AsyncStorage.setItem(`analytics-private-v1:${key}`, value),
      },
      logs: {
        beforeSend: sanitizeDiagnosticLog,
      },
      before_send: (event) => {
        const sanitized = sanitizeEvent(event);
        if (!sanitized) return null;
        sanitized.properties = { ...sanitized.properties, platform: Platform.OS, os_version: String(Platform.Version) };
        return sanitized;
      },
      // Recording is started only for reviewed screens by ReplayController.
      enableSessionReplay: false,
      sessionReplayConfig: {
        maskAllTextInputs: true,
        maskAllImages: true,
        maskAllSandboxedViews: true,
        captureLog: false,
        captureNetworkTelemetry: false,
        captureTouches: false,
      },
      captureAppLifecycleEvents: false,
      capturePushNotificationOpened: false,
      capturePushNotificationSubscriptions: false,
      errorTracking: {
        autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: [], nativeCrashes: Platform.OS === 'ios' },
        exceptionSteps: { enabled: false },
      },
    })
  : noOpPostHog;
