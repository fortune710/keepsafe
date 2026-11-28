import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TimeCapsuleList } from '../time-capsule-list';
import { useTimeCapsules } from '@/hooks/use-time-capsules';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/use-time-capsules', () => ({ useTimeCapsules: jest.fn() }));
jest.mock('@/components/vault/save-opened-capsule-sheet', () => ({ SaveOpenedCapsuleSheet: () => { const { Text } = require('react-native'); return <Text>Save opened capsule</Text>; } }));
jest.mock('@/hooks/use-countdown', () => ({ useCountdown: () => ({ formatted: '23h 59m' }) }));
jest.mock('@/components/ui/bottom-sheet', () => ({ BottomSheet: ({ visible, children }: any) => visible ? children : null }));
jest.mock('@shopify/flash-list', () => {
  const { Fragment, createElement } = require('react');
  return { FlashList: ({ data, renderItem }: any) => data.map((item: any) => createElement(Fragment, { key: item.key }, renderItem({ item }))) };
});
jest.mock('@/components/entries/vault-entry-card', () => {
  const { Pressable, Text } = require('react-native');
  return ({ mediaPlaceholder, onPress, accessibilityLabel }: any) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {mediaPlaceholder ?? <Text>Visible media</Text>}
    </Pressable>
  );
});
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

const capsule = {
  id: 'capsule-1', entry_id: 'entry-1', status: 'locked', reveal_type: 'date',
  unlock_at: '2030-01-02T12:00:00Z', condition_label: null, release_available_at: null,
  entry: { id: 'entry-1', content_url: 'https://example.test/secret.jpg' },
};
const requestRelease = jest.fn().mockResolvedValue({ success: true });
const cancelRelease = jest.fn().mockResolvedValue({ success: true });

beforeEach(() => {
  jest.clearAllMocks();
  (useTimeCapsules as jest.Mock).mockReturnValue({ capsules: [capsule], lockedCapsules: [capsule], pendingCapsules: [], unlockedCapsules: [], isLoading: false, requestRelease, cancelRelease });
});

test('a locked card hides media and opens its release details', async () => {
  const screen = render(<TimeCapsuleList />);
  expect(screen.queryByText('Visible media')).toBeNull();
  expect(screen.getByText('Locked')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('View locked time capsule'));
  expect(screen.getByText('Release date')).toBeTruthy();
  expect(screen.getByText('Early release takes 24 hours after you request it.')).toBeTruthy();
  fireEvent.press(screen.getByText('Release early'));
  await waitFor(() => expect(requestRelease).toHaveBeenCalledWith('capsule-1'));
});

test('a pending condition capsule shows its condition and countdown', () => {
  const pending = { ...capsule, status: 'pending_release', reveal_type: 'condition', condition_label: 'A milestone', release_available_at: '2030-01-01T12:00:00Z' };
  (useTimeCapsules as jest.Mock).mockReturnValue({ capsules: [pending], lockedCapsules: [], pendingCapsules: [pending], unlockedCapsules: [], isLoading: false, requestRelease, cancelRelease });
  const screen = render(<TimeCapsuleList />);
  fireEvent.press(screen.getByLabelText('View locked time capsule'));
  expect(screen.getByText('A milestone')).toBeTruthy();
  expect(screen.getByText('23h 59m remaining until release.')).toBeTruthy();
  expect(screen.getByText('Cancel release')).toBeTruthy();
});

test('a locked capsule remains accessible when its entry join is hidden', () => {
  const hidden = { ...capsule, entry: null };
  (useTimeCapsules as jest.Mock).mockReturnValue({ capsules: [hidden], lockedCapsules: [hidden], pendingCapsules: [], unlockedCapsules: [], isLoading: false, requestRelease, cancelRelease });
  const screen = render(<TimeCapsuleList />);
  fireEvent.press(screen.getByLabelText('View locked time capsule'));
  expect(screen.getByText('Release date')).toBeTruthy();
});

test('opened capsules expand above locked capsules and open the save sheet', () => {
  const unlocked = { ...capsule, status: 'unlocked' };
  (useTimeCapsules as jest.Mock).mockReturnValue({ capsules: [unlocked], lockedCapsules: [], pendingCapsules: [], unlockedCapsules: [unlocked], isLoading: false, requestRelease, cancelRelease });
  const screen = render(<TimeCapsuleList />);
  expect(screen.queryByText('Visible media')).toBeNull();
  fireEvent.press(screen.getByLabelText('Opened'));
  expect(screen.getByText('Visible media')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Open time capsule entry'));
  expect(screen.getByText('Save opened capsule')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Opened'));
  expect(screen.queryByText('Visible media')).toBeNull();
});
