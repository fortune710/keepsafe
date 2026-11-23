import { act, renderHook } from '@testing-library/react-native';
import { useMediaCapture } from '../use-media-capture';
import { useAudioRecorder } from 'expo-audio';
import { useCaptureContext } from '@/providers/capture-provider';

jest.mock('expo-audio', () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }) },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  useAudioRecorder: jest.fn(),
  useAudioRecorderState: () => ({ isRecording: false, durationMillis: 0 }),
}));
jest.mock('@/providers/capture-provider', () => ({ useCaptureContext: jest.fn() }));
jest.mock('@/services/media-service', () => ({ MediaService: {} }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'capture-id' }));

test('stops an interrupted owned recording and ignores a second stop', async () => {
  const recorder = {
    isRecording: false,
    currentTime: 12.5,
    uri: 'file:///recording.m4a',
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    record: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  const setIsCapturing = jest.fn();
  (useAudioRecorder as jest.Mock).mockReturnValue(recorder);
  (useCaptureContext as jest.Mock).mockReturnValue({
    isCapturing: false,
    setIsCapturing,
    recordingDuration: 0,
    setRecordingDuration: jest.fn(),
    meteringLevel: 0,
    setMeteringLevel: jest.fn(),
  });
  const { result } = renderHook(() => useMediaCapture());

  await act(async () => { await result.current.startAudioRecording(); });
  let capture;
  await act(async () => { capture = await result.current.stopAudioRecording(); });

  expect(recorder.stop).toHaveBeenCalledTimes(1);
  expect(capture).toEqual(expect.objectContaining({ duration: 12.5, uri: recorder.uri }));
  expect(setIsCapturing).toHaveBeenLastCalledWith(false);
  await act(async () => { expect(await result.current.stopAudioRecording()).toBeNull(); });
  expect(recorder.stop).toHaveBeenCalledTimes(1);
});
