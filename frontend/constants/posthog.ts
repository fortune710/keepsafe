import { PostHog } from 'posthog-react-native';
import { Platform } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

if (!apiKey || !host) { 
  if (__DEV__) {
    console.warn('PostHog environment variables not configured. Analytics will be disabled.');
  }
}

// No-op mock for PostHog
const noOpPostHog = {
  capture: (_event: string, _properties?: object) => Promise.resolve(),
  identify: (_distinctId: string, _properties?: object) => Promise.resolve(),
  reset: () => Promise.resolve(),
  screen: (_screenName: string, _properties?: object) => Promise.resolve(),
  group: (_groupType: string, _groupKey: string, _properties?: object) => Promise.resolve(),
  alias: (_alias: string) => Promise.resolve(),
  reloadFeatureFlags: () => {},
  isFeatureEnabled: () => false,
  getFeatureFlag: () => null,
  getFeatureFlagPayload: () => null,
} as unknown as PostHog;

// Only initialize PostHog if:
// 1. API key and host are configured
// 2. Not on web platform (posthog-react-native doesn't work on web/SSR)
// Skip PostHog on web entirely to avoid SSR errors during development
const shouldInitializePostHog = 
  apiKey && 
  host && 
  Platform.OS !== 'web';

export const posthog = shouldInitializePostHog
  ? new PostHog(apiKey, { host })
  : noOpPostHog;