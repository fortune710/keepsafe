import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DiaryEntriesScreen from '../entries';

const mockPush = jest.fn();
const mockToast = jest.fn();
let mockParams: Record<string, unknown> = {};
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }), useLocalSearchParams: () => mockParams }));
jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ user: { id: 'user-1' }, profile: { id: 'user-1' } }) }));
jest.mock('@/hooks/use-user-entries', () => ({ useUserEntries: () => ({ entries: [], entriesByDate: {}, isLoading: false, unseenEntryIds: new Set() }) }));
jest.mock('@/hooks/use-diaries', () => ({ useDiaries: () => ({ diaries: [], updateDiary: jest.fn(), isUpdating: false }) }));
jest.mock('@/hooks/use-popup-params', () => ({ usePopupParams: () => ({ isPopupVisible: false }) }));
jest.mock('@/hooks/use-responsive', () => ({ useResponsive: () => ({}) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock('@/hooks/use-friends', () => ({ useFriends: () => ({ friends: [] }) }));
jest.mock('@/hooks/use-reported-entries', () => ({ useReportedEntries: () => ({ reportedPostIds: [] }) }));
jest.mock('@tanstack/react-query', () => ({ useMutation: () => ({ mutate: jest.fn() }) }));
jest.mock('@/components/entry-reactions-popup', () => () => null);
jest.mock('@/components/entry-comments-popup', () => () => null);
jest.mock('@/components/entries/vault-entry-card', () => () => null);
jest.mock('@/components/entries/entry-page', () => ({ EntryPage: () => null }));
jest.mock('@/components/date-container', () => ({ DateContainer: () => null }));
jest.mock('@/components/capture/music/audio-preview-popover', () => () => null);
jest.mock('@/components/new-entries-indicator', () => () => null);
jest.mock('@/components/vault/friend-filter-popover', () => () => null);
jest.mock('@/components/vault/empty-friend-vault', () => () => null);
jest.mock('@/components/vault/diary-opening-transition', () => ({ DiaryOpeningTransition: () => null }));
jest.mock('@/components/vault/edit-diary-sheet', () => ({ EditDiarySheet: () => null }));
jest.mock('@/services/device-storage', () => ({ deviceStorage: {} }));
jest.mock('@/constants/posthog', () => ({ posthog: { capture: jest.fn() } }));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

beforeEach(() => { mockPush.mockClear(); mockToast.mockClear(); mockParams = { diaryId: 'diary-123', title: 'Summer' }; });
test.each(['diary-123', ['diary-123']])('start capturing passes diary ID %p to capture', (diaryId) => {
  mockParams.diaryId = diaryId;
  const screen = render(<DiaryEntriesScreen />);
  expect(screen.getByText('No entries in Summer')).toBeTruthy();
  fireEvent.press(screen.getByText('Start Capturing'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/capture', params: { diary_id: 'diary-123' } });
});
test.each([undefined, '', '  '])('start capturing with diary ID %p shows an error instead of navigating', (diaryId) => {
  mockParams = { title: 'My Diary', diaryId };
  const screen = render(<DiaryEntriesScreen />);
  fireEvent.press(screen.getByText('Start Capturing'));
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockToast).toHaveBeenCalledWith('An error occurred while setting things up.', 'error');
});
