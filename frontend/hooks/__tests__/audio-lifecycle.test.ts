import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AudioModule, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useMediaCapture } from '../use-media-capture';
import { useCaptureContext } from '@/providers/capture-provider';
import { getInfoAsync } from 'expo-file-system/legacy';

const mockDelete = jest.fn();
jest.mock('expo-file-system/legacy', () => ({ deleteAsync: (...args: unknown[]) => mockDelete(...args), getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: false, size: 128 }) }));
jest.mock('expo-audio', () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  useAudioRecorder: jest.fn(),
  useAudioRecorderState: () => ({ isRecording: false, durationMillis: 0 }),
}));
jest.mock('@/providers/capture-provider', () => ({ useCaptureContext: jest.fn() }));
jest.mock('@/services/media-service', () => ({ MediaService: {} }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'capture-id' }));

let listener: (status: any) => void;
let recorder: any;
let onCompleted: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  mockDelete.mockResolvedValue(undefined);
  (getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: false, size: 128 });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (AudioModule.requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  recorder = { currentTime: 12, uri: 'file:///audio.m4a', prepareToRecordAsync: jest.fn(), record: jest.fn(), stop: jest.fn().mockResolvedValue(undefined) };
  (useAudioRecorder as jest.Mock).mockImplementation((_options, callback) => { listener = callback; return recorder; });
  (useCaptureContext as jest.Mock).mockReturnValue({ isCapturing: false, setIsCapturing: jest.fn(), recordingDuration: 0, setRecordingDuration: jest.fn(), meteringLevel: 0, setMeteringLevel: jest.fn() });
  onCompleted = jest.fn();
});
afterEach(() => jest.restoreAllMocks());

test('starts with a native duration limit and background mode, and manual stop creates a capture', async () => {
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalled();
  expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsRecording: true, allowsBackgroundRecording: true }));
  expect(recorder.prepareToRecordAsync).toHaveBeenCalled();
  expect(recorder.record).toHaveBeenCalledWith({ forDuration: 1800 });
  await act(async () => { expect(await result.current.stopAudioRecording()).toEqual(expect.objectContaining({ uri: recorder.uri })); });
});

test('denied microphone permission prompts through Expo and does not start', async () => {
  (AudioModule.requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Permission Required', expect.any(String));
  expect(recorder.record).not.toHaveBeenCalled();
});

test('automatic completion saves once and ignores duplicate completion', async () => {
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  await act(async () => { listener({ isFinished: true, hasError: false, url: recorder.uri }); await Promise.resolve(); });
  await act(async () => { listener({ isFinished: true, hasError: false, url: recorder.uri }); await Promise.resolve(); });
  expect(onCompleted).toHaveBeenCalledTimes(1);
  expect(onCompleted).toHaveBeenCalledWith(expect.objectContaining({ uri: recorder.uri }));
});

test('manual stop and a competing native completion finalize only once', async () => {
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  await act(async () => { const stopping = result.current.stopAudioRecording(); listener({ isFinished: true, hasError: false, url: recorder.uri }); await stopping; });
  expect(recorder.stop).toHaveBeenCalledTimes(1);
  expect(onCompleted).not.toHaveBeenCalled();
});

test('cancelling stops recording and discards the file', async () => {
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  await act(async () => { await result.current.clearCapture(); });
  expect(recorder.stop).toHaveBeenCalledTimes(1);
  expect(mockDelete).toHaveBeenCalledWith(recorder.uri, { idempotent: true });
  expect(onCompleted).not.toHaveBeenCalled();
});

test('recorder errors surface an alert and do not complete', async () => {
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  await act(async () => { listener({ isFinished: true, hasError: true, url: null }); await Promise.resolve(); });
  expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
  expect(onCompleted).not.toHaveBeenCalled();
});

test.each(['ios', 'android'])('background audio mode is enabled on %s', async (platform) => {
  jest.replaceProperty(require('react-native').Platform, 'OS', platform);
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsBackgroundRecording: true }));
  expect(recorder.stop).not.toHaveBeenCalled();
});

test.each([{ hasError: false, url: null }, { hasError: false, url: 'file:///audio.m4a', mediaServicesDidReset: true }])('rejects invalid completion %p', async (status) => {
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  await act(async () => { listener({ isFinished: true, ...status }); await Promise.resolve(); });
  expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
  expect(onCompleted).not.toHaveBeenCalled();
});

test('preparation errors show an alert without starting', async () => {
  recorder.prepareToRecordAsync.mockRejectedValue(new Error('preparation failed'));
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
  expect(recorder.record).not.toHaveBeenCalled();
});

test('an empty recording is rejected with an error', async () => {
  (getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: false, size: 0 });
  const { result } = renderHook(() => useMediaCapture(onCompleted));
  await act(async () => { await result.current.startAudioRecording(); });
  await act(async () => { expect(await result.current.stopAudioRecording()).toBeNull(); });
  expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
  expect(mockDelete).toHaveBeenCalledWith(recorder.uri, { idempotent: true });
});
