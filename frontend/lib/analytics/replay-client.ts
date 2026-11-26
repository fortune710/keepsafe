import { posthog } from '@/constants/posthog';
import { ReplayController } from './replay';

// Keep off until both native platforms have passed replay privacy checks.
export const replayEnabled = process.env.EXPO_PUBLIC_POSTHOG_REPLAY_VERIFIED === 'true';
export const replayController = new ReplayController(posthog, replayEnabled);
