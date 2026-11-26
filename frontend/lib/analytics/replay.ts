/** Replay is limited to screens that contain static, non-user content. */
const REPLAY_SAFE_SCREENS = new Set([
  '/onboarding/value-props', '/onboarding/sign-up-success',
  '/onboarding/forgot-password-success', '/settings/about', '/settings/legal',
  '/settings/storage',
]);

const SAFE_NAVIGATOR_SCREENS: Record<string, readonly string[]> = {
  root: ['onboarding', '(tabs)'],
  tabs: ['settings'],
  onboarding: ['value-props', 'sign-up-success', 'forgot-password-success'],
  settings: ['about', 'legal', 'storage'],
};

export function isReplaySafeNavigatorScreen(navigator: string, screen: string): boolean {
  return SAFE_NAVIGATOR_SCREENS[navigator]?.includes(screen) ?? false;
}

export function isReplaySafeScreen(screen: string | null): boolean {
  return screen !== null && REPLAY_SAFE_SCREENS.has(screen);
}

interface ReplayClient {
  startSessionRecording(): Promise<void>;
  stopSessionRecording(): Promise<void>;
}

/** Serializes replay changes so a slow start cannot outlive a later stop request. */
export class ReplayController {
  private pending = Promise.resolve();
  private generation = 0;
  private privateContentSafe = true;
  private listeners = new Set<() => void>();

  constructor(private client: ReplayClient, private enabled: boolean) {}

  isPrivateContentSafe = (): boolean => this.privateContentSafe;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setPrivateContentSafe(safe: boolean): void {
    if (safe === this.privateContentSafe) return;
    this.privateContentSafe = safe;
    this.listeners.forEach((listener) => listener());
  }

  /** Wait for pending starts and stop replay before mounting private content. */
  async stopBeforePrivateView(): Promise<void> {
    if (!this.enabled) return;
    const generation = ++this.generation;
    const stop = this.pending.catch(() => {}).then(() => this.client.stopSessionRecording());
    this.pending = stop.catch(() => {});
    await stop;
    if (generation === this.generation) this.setPrivateContentSafe(true);
  }

  setScreen(screen: string | null, active: boolean): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    const generation = ++this.generation;
    const shouldRecord = this.enabled && active && isReplaySafeScreen(screen);
    if (shouldRecord) this.setPrivateContentSafe(false);
    this.pending = this.pending.catch(() => {}).then(async () => {
      if (!shouldRecord || generation !== this.generation) {
        await this.client.stopSessionRecording();
        if (generation === this.generation) this.setPrivateContentSafe(true);
        return;
      }
      await this.client.startSessionRecording();
      if (generation !== this.generation) await this.client.stopSessionRecording();
    }).catch(() => {
      // A replay failure must not affect navigation or expose the error payload.
    });
    return this.pending;
  }
}
