import { deviceStorage } from '@/services/device-storage';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Build a per-user key for device storage so multi-account usage on the same device
 * doesn't leak prompt state across users.
 */
function key(userId: string, suffix: string): string {
  return `phone_prompt_${suffix}_${userId}`;
}

/**
 * Get the current phone-number prompt suppression state.
 */
export async function getPhonePromptState(userId: string): Promise<{
  nextPromptAtMs: number | null;
  skipCount: number;
  dontAskAgain: boolean;
}> {
  const [nextPromptAtMs, skipCount, dontAskAgain] = await Promise.all([
    deviceStorage.getItem<number>(key(userId, 'next_at')),
    deviceStorage.getItem<number>(key(userId, 'skip_count')),
    deviceStorage.getItem<boolean>(key(userId, 'dont_ask')),
  ]);

  return {
    nextPromptAtMs: nextPromptAtMs ?? null,
    skipCount: skipCount ?? 0,
    dontAskAgain: dontAskAgain ?? false,
  };
}

/**
 * Record a user cancellation/skip of the phone-number prompt.
 *
 * This sets a "next prompt" timestamp 7 days in the future and increments the skip count.
 */
export async function recordPhonePromptSkip(userId: string): Promise<{
  nextPromptAtMs: number;
  skipCount: number;
}> {
  const state = await getPhonePromptState(userId);
  const nextPromptAtMs = Date.now() + SEVEN_DAYS_MS;
  const nextSkipCount = state.skipCount + 1;

  await Promise.all([
    deviceStorage.setItem(key(userId, 'next_at'), nextPromptAtMs),
    deviceStorage.setItem(key(userId, 'skip_count'), nextSkipCount),
  ]);

  return { nextPromptAtMs, skipCount: nextSkipCount };
}

/**
 * Permanently disable the phone-number prompt for a user on this device.
 */
export async function setPhonePromptDontAskAgain(userId: string): Promise<void> {
  await deviceStorage.setItem(key(userId, 'dont_ask'), true);
}

/**
 * Clear local prompt state after a successful phone number verification.
 */
export async function clearPhonePromptState(userId: string): Promise<void> {
  await Promise.all([
    deviceStorage.removeItem(key(userId, 'next_at')),
    deviceStorage.removeItem(key(userId, 'skip_count')),
    deviceStorage.removeItem(key(userId, 'dont_ask')),
  ]);
}

