import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { InspirationTimeline } from '../inspiration-timeline';
import { InspirationPlaceItem } from '@/types/inspiration';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]), router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('expo-media-library/legacy', () => ({ getAssetInfoAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ getInfoAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'capture-id' }));
jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/providers/save-lock-provider', () => ({ useSaveLock: () => ({ unlockSave: jest.fn() }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/lib/last-used-diary', () => ({ resolveCaptureDiaryId: jest.fn() }));
jest.mock('../preview-items', () => ({ getPreviewInspiration: () => [] }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: () => null, Marker: () => null }));
jest.mock('lucide-react-native', () => ({ Camera: () => null, MapPin: () => null, UserPlus: () => null, Play: () => null }));

const date = new Date('2026-11-24T12:00:00Z');
const props = { isLoading: false, error: null, placesError: null, onEnablePlaces: jest.fn(), isPlacesEnabled: false, isPlacesUpdating: false };
const showPlace = (name: string | null) => {
  const item = { id: 'place-1', type: 'place', occurredAt: date.toISOString(), name, latitude: 40.78, longitude: -73.96 } as InspirationPlaceItem;
  return render(<InspirationTimeline {...props} days={[{ key: 'today', date, items: [item] }]} />);
};

beforeEach(() => { mockPush.mockClear(); jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

test('pressing a place opens capture with its location attachment', () => {
  const screen = showPlace('Central Park');
  fireEvent.press(screen.getByLabelText('Visited Central Park'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/capture', params: { locationAttachment: 'Central Park' } });
});

test.each([null, '', '   '])('a missing or blank place name (%p) displays an error alert instead of navigating', (name) => {
  const screen = showPlace(name);
  fireEvent.press(screen.getByLabelText(`Visited ${name}`));
  expect(Alert.alert).toHaveBeenCalledWith(expect.any(String), expect.any(String));
  expect(mockPush).not.toHaveBeenCalled();
});
