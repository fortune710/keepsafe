import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

const mockStop = jest.fn<Promise<void>, []>();
const mockBeginOverlay = jest.fn<Promise<void>, []>();
const mockEndOverlay = jest.fn<void, []>();
let mockSafe = true;
const mockListeners = new Set<() => void>();
jest.mock('@/lib/analytics/replay-client', () => ({ replayEnabled: true, replayController: { stopBeforePrivateView: () => mockStop(), beginPrivateOverlay: () => mockBeginOverlay(), endPrivateOverlay: () => mockEndOverlay(), subscribe: (listener: () => void) => { mockListeners.add(listener); return () => mockListeners.delete(listener); }, isPrivateContentSafe: () => mockSafe } }));
jest.mock('posthog-react-native', () => ({ PostHogMaskView: require('react-native').View }));
import { ReplayScreenShield } from '@/components/replay-screen-shield';

describe('replay screen shield', () => {
  beforeEach(() => { mockSafe = true; mockStop.mockReset(); mockBeginOverlay.mockReset(); mockEndOverlay.mockReset(); });
  it('keeps private content hidden until recording has stopped', async () => {
    let finish!: () => void;
    mockStop.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<ReplayScreenShield allow={false}><Text>Private content</Text></ReplayScreenShield>);
    expect(screen.queryByText('Private content')).toBeNull();
    await act(async () => { finish(); });
    expect(screen.getByText('Private content')).toBeTruthy();
  });
  it('keeps private content hidden if the recorder cannot stop', async () => {
    mockStop.mockRejectedValueOnce(new Error('native stop failed'));
    render(<ReplayScreenShield allow={false}><Text>Private content</Text></ReplayScreenShield>);
    await act(async () => {});
    expect(screen.queryByText('Private content')).toBeNull();
  });

  it('holds an overlay lease until the private overlay unmounts', async () => {
    mockBeginOverlay.mockResolvedValueOnce();
    const view = render(<ReplayScreenShield allow={false} overlay><Text>Private overlay</Text></ReplayScreenShield>);
    expect(mockBeginOverlay).toHaveBeenCalledTimes(1);
    await act(async () => {});
    expect(screen.getByText('Private overlay')).toBeTruthy();
    view.unmount();
    expect(mockEndOverlay).toHaveBeenCalledTimes(1);
  });

  it('hides retained private content when recording starts and restores it after stopping', async () => {
    mockStop.mockResolvedValueOnce();
    render(<ReplayScreenShield allow={false}><Text>Private content</Text></ReplayScreenShield>);
    await act(async () => {});
    expect(screen.getByText('Private content')).toBeVisible();
    act(() => { mockSafe = false; mockListeners.forEach((listener) => listener()); });
    expect(screen.getByText('Private content', { includeHiddenElements: true })).not.toBeVisible();
    act(() => { mockSafe = true; mockListeners.forEach((listener) => listener()); });
    expect(screen.getByText('Private content')).toBeVisible();
  });

  it('allows a failed private overlay to be dismissed without showing its content', async () => {
    const dismiss = jest.fn();
    mockBeginOverlay.mockRejectedValueOnce(new Error('native stop failed'));
    render(<ReplayScreenShield allow={false} overlay onDismiss={dismiss}><Text>Private overlay</Text></ReplayScreenShield>);
    await act(async () => {});
    expect(screen.queryByText('Private overlay')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

});
