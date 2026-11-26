import { act, renderHook } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';
import { useAudioCapture } from '../use-audio-capture';

const mockPush = jest.fn();
const mockClear = jest.fn();
let mockComplete: (capture: any) => void;
let appStateListener: (state: any) => void;
const originalAppState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
jest.mock('expo-router', () => ({ router: { push: (...args: any[]) => mockPush(...args) }, useFocusEffect: (effect: any) => require('react').useEffect(effect, [effect]) }));
jest.mock('@/providers/capture-provider', () => ({ useCaptureContext: () => ({ isCapturing: false, isVideoRecording: false, setIsVideoRecording: jest.fn() }) }));
jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ user: { id: 'user' } }) }));
jest.mock('@/lib/last-used-diary', () => ({ resolveCaptureDiaryId: async () => 'diary' }));
jest.mock('@/hooks/use-media-capture', () => ({ useMediaCapture: (callback: any) => { mockComplete = callback; return { startAudioRecording: jest.fn(), stopAudioRecording: jest.fn(), clearCapture: mockClear }; } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => { appStateListener = listener; return { remove: jest.fn() }; });
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalAppState) Object.defineProperty(AppState, 'currentState', originalAppState);
});

test.each(['ios', 'android'] as const)('%s defers automatic preview until foreground and cancels only when leaving', async (platform) => {
  jest.replaceProperty(Platform, 'OS', platform);
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
  const { unmount } = renderHook(() => useAudioCapture({ cameraRef: { current: null }, setVideoDuration: jest.fn(), isTimeCapsule: false }));
  await act(async () => { mockComplete({ id: 'id', type: 'audio', uri: 'file:///audio.m4a', duration: 1800 }); });
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockClear).not.toHaveBeenCalled();
  await act(async () => { appStateListener('active'); await Promise.resolve(); });
  expect(mockPush).toHaveBeenCalledTimes(1);
  unmount();
  expect(mockClear).toHaveBeenCalled();
});
