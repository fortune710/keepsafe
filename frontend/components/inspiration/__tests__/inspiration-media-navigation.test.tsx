import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { InspirationTimeline } from '../inspiration-timeline';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as FileSystem from 'expo-file-system/legacy';

const mockPush = jest.fn();
const mockToast = jest.fn();
const mockUnlockSave = jest.fn();
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]), router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('expo-media-library/legacy', () => ({ getAssetInfoAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'capture-id' }));
jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/providers/save-lock-provider', () => ({ useSaveLock: () => ({ unlockSave: mockUnlockSave }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock('@/lib/last-used-diary', () => ({ resolveCaptureDiaryId: jest.fn().mockResolvedValue('diary-1') }));
jest.mock('../preview-items', () => ({ getPreviewInspiration: () => [] }));
jest.mock('../place-visit-card', () => ({ PlaceVisitCard: () => null }));
jest.mock('lucide-react-native', () => ({ Camera: () => null, MapPin: () => null, UserPlus: () => null, Play: () => null }));

const props = { isLoading: false, error: null, placesError: null, onEnablePlaces: jest.fn(), isPlacesEnabled: false, isPlacesUpdating: false };
const date = new Date('2026-11-24T12:00:00Z');
const media = (type: 'photo' | 'video') => ({ id: 'media-asset-1', type: 'media' as const, occurredAt: date.toISOString(), uri: 'ph://asset-1', mediaType: type, durationMs: 12000 });
const timeline = (type: 'photo' | 'video') => <InspirationTimeline {...props} days={[{ key: 'today', date, items: [media(type)] }]} />;

beforeEach(() => {
  jest.clearAllMocks();
  (MediaLibrary.getAssetInfoAsync as jest.Mock).mockResolvedValue({ localUri: 'file:///media/file.mov' });
  (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: false });
});

test.each(['photo', 'video'] as const)('opens a valid %s in capture details', async (type) => {
  const screen = render(timeline(type));
  fireEvent.press(screen.getByRole('button', { name: new RegExp(`${type} memory`, 'i') }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
    pathname: '/capture/details',
    params: expect.objectContaining({ captureId: 'capture-id', type, uri: encodeURIComponent('file:///media/file.mov'), diary_id: 'diary-1', ...(type === 'video' ? { duration: '12' } : {}) }),
  })));
  expect(mockUnlockSave).toHaveBeenCalled();
});

test('shows an error toast and does not navigate when media cannot be opened', async () => {
  (MediaLibrary.getAssetInfoAsync as jest.Mock).mockRejectedValue(new Error('Unable to download asset'));
  const screen = render(timeline('photo'));
  fireEvent.press(screen.getByRole('button', { name: /photo memory/i }));
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error'));
  expect(mockPush).not.toHaveBeenCalled();
});
