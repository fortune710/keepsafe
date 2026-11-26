import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';

const mockStop = jest.fn<Promise<void>, []>();
jest.mock('@/lib/analytics/replay-client', () => ({ replayEnabled: true, replayController: { stopBeforePrivateView: () => mockStop(), subscribe: () => () => {}, isPrivateContentSafe: () => true } }));
jest.mock('posthog-react-native', () => ({ PostHogMaskView: require('react-native').View }));
import { ReplayScreenShield } from '@/components/replay-screen-shield';

describe('replay screen shield', () => {
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

});
