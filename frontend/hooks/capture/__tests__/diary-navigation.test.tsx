import { act, renderHook } from '@testing-library/react-native';
import { usePhotoCapture } from '../use-photo-capture';
import { useVideoCapture } from '../use-video-capture';
import { useAudioCapture } from '../use-audio-capture';
import { useMediaUpload } from '../use-media-upload';

const mockPush = jest.fn();
const mockCapture = { id: 'capture-1', type: 'photo', uri: 'file://photo.jpg' };
jest.mock('expo-router', () => ({ router: { push: (...args: any[]) => mockPush(...args) }, useRouter: () => ({ push: mockPush }), useFocusEffect: (effect: any) => require('react').useEffect(effect, [effect]) }));
jest.mock('expo-camera', () => ({ useMicrophonePermissions: () => [{ status: 'granted' }, jest.fn()] }));
jest.mock('@/providers/capture-provider', () => ({ useCaptureContext: () => ({ isCapturing: true, isVideoRecording: false, setIsVideoRecording: jest.fn() }) }));
jest.mock('@/providers/auth-provider', () => ({ useAuthContext: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/use-media-capture', () => ({ useMediaCapture: () => ({ uploadMedia: async () => mockCapture, stopAudioRecording: async () => mockCapture, startAudioRecording: jest.fn() }) }));
jest.mock('@/services/media-service', () => ({ MediaService: { capturePhoto: async () => mockCapture, createVideoCapture: async () => mockCapture } }));

beforeEach(() => mockPush.mockClear());
const cameraRef = { current: { recordAsync: jest.fn().mockResolvedValue({ uri: 'file://video.mp4' }) } } as any;
const base = { cameraRef, isCameraReady: true, isTimeCapsule: false, updateCameraMode: jest.fn(), diaryId: 'diary-123' };
const expectDiary = () => expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/capture/details', params: expect.objectContaining({ diary_id: 'diary-123' }) }));

test('photo capture passes the selected diary to details', async () => {
  const { result } = renderHook(() => usePhotoCapture({ ...base, facing: 'back', cameraMode: 'picture' }));
  await act(async () => { await result.current.takePicture(); });
  expectDiary();
});
test('video capture passes the selected diary to details', async () => {
  const { result, unmount } = renderHook(() => useVideoCapture({ ...base, cameraMode: 'video', captureMode: 'camera', updateCameraReady: jest.fn() }));
  await act(async () => { await result.current.startVideo(); });
  expectDiary();
  unmount();
});
test('audio capture passes the selected diary to details', async () => {
  const { result } = renderHook(() => useAudioCapture({ cameraRef, isTimeCapsule: false, setVideoDuration: jest.fn(), diaryId: 'diary-123' }));
  await act(async () => { await result.current.toggleRecording(); });
  expectDiary();
});
test.each(['camera', 'microphone'] as const)('%s upload passes the selected diary to details', async (mode) => {
  const { result } = renderHook(() => useMediaUpload(mode, false, 'diary-123'));
  await act(async () => { await result.current.handleUpload(); });
  expectDiary();
});
test('capture opened without a diary still passes the default diary ID to details', async () => {
  const { result } = renderHook(() => useMediaUpload('camera'));
  await act(async () => { await result.current.handleUpload(); });
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/capture/details', params: expect.objectContaining({ diary_id: expect.any(String) }) }));
});
