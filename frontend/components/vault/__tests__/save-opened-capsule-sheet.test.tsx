import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SaveOpenedCapsuleSheet } from '../save-opened-capsule-sheet';
import { TimeCapsuleService } from '@/services/time-capsule-service';

jest.mock('@/components/ui/bottom-sheet', () => ({ BottomSheet: ({ visible, children }: any) => visible ? children : null }));
jest.mock('@/components/vault/diary-cover-card', () => ({ DiaryCoverVisual: () => null }));
jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/use-diaries', () => ({ useDiaries: () => ({ diaries: [{ id: 'user-1', name: 'My Diary' }, { id: 'diary-2', name: 'Summer' }], isLoading: false }) }));
jest.mock('@/hooks/use-friends', () => ({ useFriends: () => ({ friends: [{ friend_profile: { id: 'friend-1', full_name: 'Ava' } }, { friend_profile: { id: 'friend-2', full_name: 'Noah' } }] }) }));
jest.mock('@/services/time-capsule-service', () => ({ TimeCapsuleService: { saveOpenedCapsule: jest.fn() } }));
jest.mock('@/services/device-storage', () => ({ deviceStorage: { getDiaryEntries: jest.fn().mockResolvedValue([]), setDiaryEntries: jest.fn(), updateEntry: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

const capsule = { id: 'capsule-1', entry: { id: 'entry-1', diary_id: 'user-1' } } as any;
const save = TimeCapsuleService.saveOpenedCapsule as jest.Mock;
function setup() {
  const close = jest.fn();
  const screen = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><SaveOpenedCapsuleSheet capsule={capsule} onClose={close} /></QueryClientProvider>);
  return { screen, close };
}
beforeEach(() => { jest.clearAllMocks(); save.mockResolvedValue({ id: 'entry-1', diary_id: 'diary-2' }); });

test('selects a diary and multiple friends, then saves the same capsule', async () => {
  const { screen, close } = setup();
  fireEvent.press(screen.getByText('Summer'));
  fireEvent.press(screen.getByText('Next'));
  fireEvent.press(screen.getByText('Ava'));
  fireEvent.press(screen.getByText('Noah'));
  fireEvent.press(screen.getByText('Save to diary'));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ capsuleId: 'capsule-1', diaryId: 'diary-2', sharing: 'friends', friendIds: ['friend-1', 'friend-2'] }));
  await waitFor(() => expect(close).toHaveBeenCalled());
});

test('private clears selected friends and is saved without recipients', async () => {
  const { screen } = setup();
  fireEvent.press(screen.getByText('Next'));
  fireEvent.press(screen.getByText('Ava'));
  fireEvent.press(screen.getByText('Private'));
  fireEvent.press(screen.getByText('Save to diary'));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ capsuleId: 'capsule-1', diaryId: 'user-1', sharing: 'private', friendIds: [] }));
});
