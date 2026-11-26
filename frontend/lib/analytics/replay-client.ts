import { analyticsIsEnabled, posthog } from '@/constants/posthog';
import { isEnabled, stopRecording } from '@posthog/react-native-plugin';
import { ReplayController } from './replay';

// Keep off until both native platforms have passed replay privacy checks.
export const replayEnabled = analyticsIsEnabled && process.env.EXPO_PUBLIC_POSTHOG_REPLAY_VERIFIED === 'true';
export const replayController = new ReplayController({
  startSessionRecording: () => posthog.startSessionRecording(),
  stopSessionRecording: async () => {
    // The JS SDK can swallow a native stop failure. Retry through the bridge and
    // keep private content hidden if the recorder is still active or cannot be checked.
    await posthog.stopSessionRecording();
    await stopRecording();
    if (await isEnabled()) throw new Error('Session recording did not stop');
  },
}, replayEnabled);
