import { isReplaySafeNavigatorScreen, isReplaySafeScreen, ReplayController } from '../replay';

describe('selective replay', () => {
  it('permits only reviewed screens', () => {
    expect(isReplaySafeScreen('/settings/about')).toBe(true);
    expect(isReplaySafeScreen('/capture')).toBe(false);
    expect(isReplaySafeScreen('/diary/entries')).toBe(false);
    expect(isReplaySafeScreen(null)).toBe(false);
  });

  it('shields private navigator screens during transitions', () => {
    expect(isReplaySafeNavigatorScreen('root', '(tabs)')).toBe(true);
    expect(isReplaySafeNavigatorScreen('root', 'search')).toBe(false);
    expect(isReplaySafeNavigatorScreen('tabs', 'capture')).toBe(false);
    expect(isReplaySafeNavigatorScreen('settings', 'profile')).toBe(false);
    expect(isReplaySafeNavigatorScreen('onboarding', 'auth')).toBe(false);
    expect(isReplaySafeNavigatorScreen('settings', 'storage')).toBe(true);
    expect(isReplaySafeNavigatorScreen('unknown', 'index')).toBe(false);
  });

  it('does nothing until replay has been verified', async () => {
    const client = { startSessionRecording: jest.fn(), stopSessionRecording: jest.fn() };
    await new ReplayController(client, false).setScreen('/settings/about', true);
    expect(client.startSessionRecording).not.toHaveBeenCalled();
    expect(client.stopSessionRecording).not.toHaveBeenCalled();
  });

  it('stops an in-flight start when the next screen is private', async () => {
    let finishStart!: () => void;
    const client = {
      startSessionRecording: jest.fn(() => new Promise<void>((resolve) => { finishStart = resolve; })),
      stopSessionRecording: jest.fn(async () => {}),
    };
    const replay = new ReplayController(client, true);
    const first = replay.setScreen('/settings/about', true);
    await Promise.resolve();
    await Promise.resolve();
    const second = replay.setScreen('/capture', true);
    finishStart();
    await Promise.all([first, second]);
    expect(client.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(client.stopSessionRecording).toHaveBeenCalled();
  });
  it('waits for native stop before allowing a private view to mount', async () => {
    let finishStop!: () => void;
    const client = {
      startSessionRecording: jest.fn(async () => {}),
      stopSessionRecording: jest.fn(() => new Promise<void>((resolve) => { finishStop = resolve; })),
    };
    const replay = new ReplayController(client, true);
    let ready = false;
    const stopping = replay.stopBeforePrivateView().then(() => { ready = true; });
    await Promise.resolve();
    await Promise.resolve();
    expect(ready).toBe(false);
    finishStop();
    await stopping;
    expect(ready).toBe(true);
  });

  it('rejects a private-view stop failure so the screen can remain hidden', async () => {
    const client = {
      startSessionRecording: jest.fn(async () => {}),
      stopSessionRecording: jest.fn(async () => { throw new Error('failed'); }),
    };
    await expect(new ReplayController(client, true).stopBeforePrivateView()).rejects.toThrow();
  });

  it('keeps retained private screens hidden while replay can record', async () => {
    let finishStop!: () => void;
    const client = {
      startSessionRecording: jest.fn(async () => {}),
      stopSessionRecording: jest.fn(() => new Promise<void>((resolve) => { finishStop = resolve; })),
    };
    const replay = new ReplayController(client, true);
    await replay.setScreen('/settings/about', true);
    expect(replay.isPrivateContentSafe()).toBe(false);
    const stopping = replay.setScreen('/capture', true);
    await Promise.resolve();
    await Promise.resolve();
    expect(replay.isPrivateContentSafe()).toBe(false);
    finishStop();
    await stopping;
    expect(replay.isPrivateContentSafe()).toBe(true);
  });

  it('resumes a reviewed screen only after all private overlays close', async () => {
    const client = { startSessionRecording: jest.fn(async () => {}), stopSessionRecording: jest.fn(async () => {}) };
    const replay = new ReplayController(client, true);
    await replay.setScreen('/settings/about', true);
    await replay.beginPrivateOverlay();
    await replay.beginPrivateOverlay();
    await replay.setScreen('/settings/legal', true);
    expect(client.startSessionRecording).toHaveBeenCalledTimes(1);
    replay.endPrivateOverlay();
    await Promise.resolve();
    expect(client.startSessionRecording).toHaveBeenCalledTimes(1);
    replay.endPrivateOverlay();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(client.startSessionRecording).toHaveBeenCalledTimes(2);
  });

  it('does not resume after an overlay closes over a private screen', async () => {
    const client = { startSessionRecording: jest.fn(async () => {}), stopSessionRecording: jest.fn(async () => {}) };
    const replay = new ReplayController(client, true);
    await replay.setScreen('/settings/about', true);
    await replay.beginPrivateOverlay();
    await replay.setScreen('/settings/profile', true);
    replay.endPrivateOverlay();
    await replay.setScreen('/settings/profile', true);
    expect(client.startSessionRecording).toHaveBeenCalledTimes(1);
  });

});
