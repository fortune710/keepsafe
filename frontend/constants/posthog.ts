import { PostHog } from 'posthog-react-native';
import { Platform } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

// Disable PostHog entirely on web to avoid platform-specific issues
const isWeb = Platform.OS === 'web';
const shouldEnablePosthog = !!apiKey && !!host && !isWeb;

if (!shouldEnablePosthog && __DEV__) {
  console.warn(
    'PostHog analytics disabled. Reason: ' +
      (!apiKey || !host
        ? 'missing EXPO_PUBLIC_POSTHOG_API_KEY or EXPO_PUBLIC_POSTHOG_HOST.'
        : 'running on web (PostHog React Native disabled for web).'),
  );
}

export const posthog = shouldEnablePosthog
  ? new PostHog(apiKey as string, { host })
  : {
      // Provide a no-op mock for when PostHog is not configured or running on web
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