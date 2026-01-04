import { PostHog } from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

if (!apiKey || !host) {
  if (__DEV__) {
    console.warn('PostHog environment variables not configured. Analytics will be disabled.');
  }
}

export const posthog = apiKey && host 
  ? new PostHog(apiKey, { host })
  : {
      // Provide a no-op mock for when PostHog is not configured
      capture: () => {},
      identify: () => {},
      reset: () => {},
      screen: () => {},
      group: () => {},
      alias: () => {},
      reloadFeatureFlags: () => {},
      isFeatureEnabled: () => false,
      getFeatureFlag: () => null,
      getFeatureFlagPayload: () => null,
    } as unknown as PostHog;