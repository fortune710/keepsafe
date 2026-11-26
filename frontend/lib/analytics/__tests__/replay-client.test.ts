jest.mock('@/constants/posthog', () => ({
  analyticsIsEnabled: true,
  posthog: {
    startSessionRecording: jest.fn(),
    stopSessionRecording: jest.fn(async () => {}),
  },
}));

jest.mock('@posthog/react-native-plugin', () => ({
  stopRecording: jest.fn(async () => {}),
  isEnabled: jest.fn(async () => false),
}));

describe('native replay stop verification', () => {
  const previousFlag = process.env.EXPO_PUBLIC_POSTHOG_REPLAY_VERIFIED;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_POSTHOG_REPLAY_VERIFIED = 'true';
  });

  afterAll(() => {
    if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_REPLAY_VERIFIED;
    else process.env.EXPO_PUBLIC_POSTHOG_REPLAY_VERIFIED = previousFlag;
  });

  it('allows private content after the native recorder reports inactive', async () => {
    const plugin = require('@posthog/react-native-plugin') as typeof import('@posthog/react-native-plugin');
    const { replayController } = require('../replay-client') as typeof import('../replay-client');
    await replayController.setScreen('/settings/about', true);
    await replayController.stopBeforePrivateView();
    expect(plugin.stopRecording).toHaveBeenCalled();
    expect(replayController.isPrivateContentSafe()).toBe(true);
  });

  it('leaves private content hidden if the native recorder remains active', async () => {
    const plugin = require('@posthog/react-native-plugin') as typeof import('@posthog/react-native-plugin');
    jest.mocked(plugin.isEnabled).mockResolvedValueOnce(true);
    const { replayController } = require('../replay-client') as typeof import('../replay-client');
    await replayController.setScreen('/settings/about', true);
    await expect(replayController.stopBeforePrivateView()).rejects.toThrow('Session recording did not stop');
    expect(replayController.isPrivateContentSafe()).toBe(false);
  });

  it('fails closed when the native status check fails', async () => {
    const plugin = require('@posthog/react-native-plugin') as typeof import('@posthog/react-native-plugin');
    jest.mocked(plugin.isEnabled).mockRejectedValueOnce(new Error('bridge unavailable'));
    const { replayController } = require('../replay-client') as typeof import('../replay-client');
    await replayController.setScreen('/settings/about', true);
    await expect(replayController.stopBeforePrivateView()).rejects.toThrow('bridge unavailable');
    expect(replayController.isPrivateContentSafe()).toBe(false);
  });

  it('does not invoke the native recorder when analytics is disabled', async () => {
    jest.doMock('@/constants/posthog', () => ({ analyticsIsEnabled: false, posthog: {} }));
    const plugin = require('@posthog/react-native-plugin') as typeof import('@posthog/react-native-plugin');
    const { replayController, replayEnabled } = require('../replay-client') as typeof import('../replay-client');
    await replayController.setScreen('/settings/about', true);
    await replayController.stopBeforePrivateView();
    expect(replayEnabled).toBe(false);
    expect(plugin.stopRecording).not.toHaveBeenCalled();
    expect(plugin.isEnabled).not.toHaveBeenCalled();
  });
});
