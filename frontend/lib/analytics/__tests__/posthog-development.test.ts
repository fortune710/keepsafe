jest.mock('posthog-react-native', () => ({ PostHog: jest.fn() }));
jest.mock('expo-updates', () => ({ channel: 'production' }));

describe('development analytics client', () => {
  it('does not construct or send through PostHog in a development build', () => {
    const previousKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    const previousHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;
    const previousEnvironment = process.env.EXPO_PUBLIC_NODE_ENV;
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY = 'test-key';
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://example.com';
    process.env.EXPO_PUBLIC_NODE_ENV = 'production';

    jest.isolateModules(() => {
      const { posthog } = require('../../../constants/posthog');
      posthog.capture('test_event', { text: 'private' });
      posthog.identify('test-user');
      posthog.screen('/capture');
      expect(require('posthog-react-native').PostHog).not.toHaveBeenCalled();
    });

    if (previousKey === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    else process.env.EXPO_PUBLIC_POSTHOG_API_KEY = previousKey;
    if (previousHost === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
    else process.env.EXPO_PUBLIC_POSTHOG_HOST = previousHost;
    if (previousEnvironment === undefined) delete process.env.EXPO_PUBLIC_NODE_ENV;
    else process.env.EXPO_PUBLIC_NODE_ENV = previousEnvironment;
  });
});
