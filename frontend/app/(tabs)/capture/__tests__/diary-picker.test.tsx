import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DetailsScreen from '../details';
import { useDiaries } from '@/hooks/use-diaries';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({ captureId: 'capture-1', type: 'photo', uri: 'file://photo.jpg', diary_id: 'diary-2' }) }));
jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/use-diaries', () => ({ useDiaries: jest.fn() }));
const mockSaveEntry = jest.fn().mockResolvedValue({ success: false });
jest.mock('@/hooks/use-entry-operations', () => ({ useEntryOperations: () => ({ saveEntry: mockSaveEntry }) }));
jest.mock('@/providers/save-lock-provider', () => ({ useSaveLock: () => ({ isSaveLocked: false, lockSave: jest.fn() }) }));
jest.mock('@/hooks/use-friends', () => ({ useFriends: () => ({ friends: [] }) }));
jest.mock('@/hooks/use-user-entries', () => ({ useUserEntries: () => ({ addOptimisticEntry: jest.fn(), replaceOptimisticEntry: jest.fn() }) }));
jest.mock('@/hooks/use-time-capsules', () => ({ useTimeCapsules: () => ({ addOptimisticCapsule: jest.fn(), removeOptimisticCapsule: jest.fn() }) }));
jest.mock('@/hooks/use-privacy-settings', () => ({ usePrivacySettings: () => ({ settings: {} }) }));
jest.mock('@/hooks/use-device-location', () => ({ useDeviceLocation: () => ({ location: null }) }));
jest.mock('@/providers/capture-provider', () => ({ useCaptureContext: () => ({ setPendingLocationAttachment: jest.fn() }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/use-media-canvas', () => ({ useMediaCanvas: () => ({ items: [], viewShotRef: { current: null }, transformsRef: { current: {} } }) }));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({ playing: false }), VideoView: () => null }));
jest.mock('expo', () => ({ ...jest.requireActual('expo'), useEvent: () => ({ isPlaying: false }) }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-blur', () => ({ BlurView: () => null }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('@/components/ui/bottom-sheet', () => ({ BottomSheet: ({ visible, children }: any) => visible ? children : null }));
jest.mock('@/components/back-button', () => ({ BackButton: () => null }));
jest.mock('@/components/capture/media-canvas', () => () => null);
jest.mock('@/components/capture/editor-popover', () => () => null);
jest.mock('@/components/audio/audio-entry', () => () => null);
jest.mock('@/components/friends/entry-share-list', () => () => null);
jest.mock('@/components/capture/entry-attachment-list', () => () => null);
jest.mock('@/components/icons/diary-icon', () => ({ DiaryIcon: () => null }));
jest.mock('@/components/capture/future-date-picker', () => ({ FutureDatePicker: () => null }));
jest.mock('@/services/local-notification-service', () => ({ LocalNotificationService: {} }));
jest.mock('@/constants/posthog', () => ({ posthog: { capture: jest.fn() } }));

const diaries = [
  { id: 'user-1', name: 'My Diary', cover_color: '#4285F4', is_default: true },
  { id: 'diary-2', name: 'Summer', cover_color: '#FFA000', is_default: false },
];
beforeEach(() => (useDiaries as jest.Mock).mockReturnValue({ diaries, isLoading: false, error: null }));

test('the diary popover renders the diaries and highlights the selected diary', () => {
  const screen = render(<DetailsScreen />);
  fireEvent.press(screen.getByLabelText('Change diary, Summer'));
  expect(screen.getByText('My Diary')).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Summer' })).toBeTruthy();
  expect(screen.getAllByRole('radio')[0].props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole('radio', { name: 'Summer' }).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByText('My Diary'));
  expect(screen.getByRole('radio', { name: 'My Diary' }).props.accessibilityState.selected).toBe(true);
});

test('badge controls switch destinations and open separate sheets', () => {
  const screen = render(<DetailsScreen />);
  fireEvent.press(screen.getByLabelText('Change diary, Summer'));
  expect(screen.getByRole('radio', { name: 'Summer' })).toBeTruthy();
  expect(screen.queryByRole('switch', { name: 'Save as time capsule' })).toBeNull();
  fireEvent.press(screen.getByText('My Diary'));
  // Dismiss the diary sheet before using the destination switch.
  fireEvent.press(screen.getByLabelText('Close diary picker'));
  fireEvent.press(screen.getByLabelText('Switch to time capsule'));
  expect(screen.queryByLabelText('Change diary, My Diary')).toBeNull();
  fireEvent.press(screen.getByLabelText('Configure time capsule'));
  expect(screen.getByText('When should this memory be revealed?')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Close time capsule settings'));
  fireEvent.press(screen.getByLabelText('Switch to diary'));
  expect(screen.getByLabelText('Change diary, My Diary')).toBeTruthy();
});

test('switching away preserves capsule settings for a later switch back', () => {
  const screen = render(<DetailsScreen />);
  fireEvent.press(screen.getByLabelText('Switch to time capsule'));
  fireEvent.press(screen.getByLabelText('Configure time capsule'));
  fireEvent.press(screen.getByText('When a condition is met'));
  expect(screen.getByText('Choose a condition')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Close time capsule settings'));
  fireEvent.press(screen.getByLabelText('Switch to diary'));
  expect(screen.getByLabelText('Change diary, Summer')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Switch to time capsule'));
  fireEvent.press(screen.getByLabelText('Configure time capsule'));
  expect(screen.getByText('Choose a condition')).toBeTruthy();
});

test('the time capsule sheet shows the date stepper', () => {
  const screen = render(<DetailsScreen />);
  fireEvent.press(screen.getByLabelText('Switch to time capsule'));
  fireEvent.press(screen.getByLabelText('Configure time capsule'));
  expect(screen.getByText('When should this memory be revealed?')).toBeTruthy();
  fireEvent.press(screen.getByText('On a date'));
  expect(screen.getByText('Choose a date')).toBeTruthy();
});

test('the default diary uses the user ID regardless of its name', async () => {
  const defaultDiary = { ...diaries[0], name: 'Personal memories' };
  (useDiaries as jest.Mock).mockReturnValue({ diaries: [diaries[1], defaultDiary], isLoading: false, error: null });
  const screen = render(<DetailsScreen />);
  fireEvent.press(screen.getByLabelText('Change diary, Summer'));
  fireEvent.press(screen.getByText('Personal memories'));
  expect(screen.getByRole('radio', { name: 'Personal memories' }).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByText('Save Privately'));
  await waitFor(() => expect(mockSaveEntry).toHaveBeenCalledWith(expect.objectContaining({ diaryId: 'user-1' })));
});
