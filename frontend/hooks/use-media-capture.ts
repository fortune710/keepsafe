import { useState, useCallback, useEffect, useRef } from 'react';
import { MediaCapture, MediaType } from '@/types/media';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { CameraView } from 'expo-camera';
import { MediaService } from '@/services/media-service';
import { useCaptureContext } from '@/providers/capture-provider';
import { MAX_AUDIO_DURATION_SECONDS } from '@/lib/audio-duration';

interface UseCaptureResult {
  isCapturing: boolean;
  capturedMedia: MediaCapture | null;
  recordingDuration: number;
  meteringLevel: number;
  startAudioRecording: () => Promise<void>;
  stopAudioRecording: () => Promise<MediaCapture | null>;
  startVideoRecording: (
    cameraRef: React.RefObject<CameraView | null>,
  ) => Promise<{ data: MediaCapture; cleanup: Function } | undefined>;
  stopVideoRecording: (
    cameraRef: React.RefObject<CameraView | null>,
  ) => Promise<void>;
  uploadMedia: (mediaType: MediaType) => Promise<MediaCapture | null>;
  clearCapture: () => Promise<void>;
}

export function useMediaCapture(onAudioCompleted?: (capture: MediaCapture) => void): UseCaptureResult {
  const {
    isCapturing,
    setIsCapturing,
    recordingDuration,
    setRecordingDuration,
    meteringLevel,
    setMeteringLevel,
  } = useCaptureContext();
  const [capturedMedia, setCapturedMedia] = useState<MediaCapture | null>(null);
  const ownsAudioRecording = useRef(false);
  const recordingGeneration = useRef(0);
  const completingManually = useRef(false);
  const completionHandler = useRef<(status: RecordingStatus) => void>(() => {});
  const onCompletedRef = useRef(onAudioCompleted);
  onCompletedRef.current = onAudioCompleted;
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true }, (status) => completionHandler.current(status));
  const recorderState = useAudioRecorderState(recorder, 100);
  useEffect(() => {
    if (!recorderState.isRecording) return;
    setRecordingDuration(Math.floor(recorderState.durationMillis / 1000));
    setMeteringLevel(Math.max(0, Math.min(1, ((recorderState.metering ?? -60) + 60) / 60)));
  }, [recorderState.isRecording, recorderState.durationMillis, recorderState.metering, setRecordingDuration, setMeteringLevel]);

  const generateId = () => {
    return Crypto.randomUUID();
  };

  const isUsableRecording = async (uri: string | null): Promise<boolean> => {
    if (!uri || !uri.startsWith('file://')) return false;
    const file = await FileSystem.getInfoAsync(uri);
    return file.exists && !file.isDirectory && (file.size === undefined || file.size > 0);
  };

  const startVideoRecording = useCallback(
    async (cameraRef: React.RefObject<CameraView | null>) => {
      setIsCapturing(true);
      setRecordingDuration(0);

      try {
        const capture = await MediaService.startVideoRecording(cameraRef);

        if (!capture) {
          console.warn(
            'Error with camera or recorsing may not have started yet',
          );
          return;
        }

        // Start duration timer
        const timer = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);

        const newCapture: MediaCapture = {
          ...capture,
          duration: recordingDuration,
        };

        return {
          data: newCapture,
          cleanup: () => clearInterval(timer),
        };
      } catch (error) {
        console.error('Error starting recording', error);
        Alert.alert('Error starting recording' + error);
      } finally {
        setIsCapturing(false);
      }
    },
    [],
  );

  const stopVideoRecording = useCallback(
    async (cameraRef: React.RefObject<CameraView | null>) => {
      await MediaService.stopVideoRecording(cameraRef);
    },
    [],
  );

  const startAudioRecording = useCallback(async () => {
    const generation = ++recordingGeneration.current;
    setCapturedMedia(null);
    setRecordingDuration(0);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (generation !== recordingGeneration.current) return;
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
      await recorder.prepareToRecordAsync();
      if (generation !== recordingGeneration.current) {
        await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false });
        return;
      }
      ownsAudioRecording.current = true;
      recorder.record({ forDuration: MAX_AUDIO_DURATION_SECONDS });
      setIsCapturing(true);
    } catch (error) {
      ownsAudioRecording.current = false;
      await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => {});
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start audio recording');
      setIsCapturing(false);
    }
  }, [recorder, setIsCapturing]);

  const stopAudioRecording = useCallback(async (): Promise<MediaCapture | null> => {
    if (!ownsAudioRecording.current) return null;
    ownsAudioRecording.current = false;
    completingManually.current = true;
    try {
      const duration = recorder.currentTime;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false });
      if (!await isUsableRecording(recorder.uri)) throw new Error('No usable recording available');
      if (!recorder.uri) throw new Error('No recording URI available');
      const capture: MediaCapture = { id: generateId(), type: 'audio', uri: recorder.uri, duration: Math.min(duration, MAX_AUDIO_DURATION_SECONDS), timestamp: new Date() };
      setCapturedMedia(capture);
      setRecordingDuration(0);
      setMeteringLevel(0);
      return capture;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop audio recording');
      if (recorder.uri) await FileSystem.deleteAsync(recorder.uri, { idempotent: true }).catch(() => {});
      return null;
    } finally {
      await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => {});
      completingManually.current = false;
      setIsCapturing(false);
    }
  }, [recorder, setIsCapturing]);

  completionHandler.current = (status) => {
    if (!status.isFinished || !ownsAudioRecording.current || completingManually.current) return;
    ownsAudioRecording.current = false;
    const duration = Math.min(recorder.currentTime || MAX_AUDIO_DURATION_SECONDS, MAX_AUDIO_DURATION_SECONDS);
    void (async () => {
      await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => {});
      setIsCapturing(false);
      setRecordingDuration(0);
      setMeteringLevel(0);
      const usable = !status.hasError && !status.mediaServicesDidReset && await isUsableRecording(status.url).catch(() => false);
      if (!usable || !status.url) {
        if (status.url) await FileSystem.deleteAsync(status.url, { idempotent: true }).catch(() => {});
        Alert.alert('Error', 'Failed to finish audio recording');
        return;
      }
      const capture: MediaCapture = { id: generateId(), type: 'audio', uri: status.url, duration, timestamp: new Date() };
      setCapturedMedia(capture);
      onCompletedRef.current?.(capture);
    })();
  };

  const uploadMedia = useCallback(
    async (mediaType: MediaType): Promise<MediaCapture | null> => {
      try {
        // Return early for audio type
        if (mediaType === 'audio') {
          Alert.alert(
            'Audio Not Supported',
            'Audio upload from library is not currently supported. Please use the microphone to record audio.',
          );
          return null;
        }

        // Request media library permissions
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant media library permission to access photos and videos.',
          );
          return null;
        }

        // Launch the image/video picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7, // Highest quality
          allowsMultipleSelection: false,
          selectionLimit: 1,
        });

        if (result.canceled) {
          return null;
        }

        const asset = result.assets[0];
        const timestamp = new Date();

        // Determine the capture type based on the selected asset
        let captureType: MediaType;
        if (asset.type === 'image') {
          captureType = 'photo';
        } else if (asset.type === 'video') {
          captureType = 'video';
        } else {
          throw new Error('Unsupported media type');
        }

        const uploadedCapture: MediaCapture = {
          id: generateId(),
          type: captureType,
          uri: asset.uri,
          duration: asset?.duration || undefined,
          timestamp,
          metadata: {
            width: asset.width,
            height: asset.height,
          },
        };

        setCapturedMedia(uploadedCapture);
        return uploadedCapture;
      } catch (error) {
        console.error('Failed to pick media:', error);
        Alert.alert('Error', 'Failed to access media library');
        return null;
      }
    },
    [generateId],
  );

  const clearCapture = useCallback(async () => {
    recordingGeneration.current += 1;
    setCapturedMedia(null);
    setIsCapturing(false);
    setRecordingDuration(0);
    setMeteringLevel(0);
    const shouldDiscard = ownsAudioRecording.current;
    ownsAudioRecording.current = false;
    try {
      if (shouldDiscard) await recorder.stop();
    } catch (error) {
      console.error('Error cleaning up recording:', error);
    } finally {
      if (shouldDiscard && recorder.uri) await FileSystem.deleteAsync(recorder.uri, { idempotent: true }).catch(() => {});
      await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => {});
    }
  }, [recorder, setIsCapturing]);

  return {
    isCapturing,
    capturedMedia,
    recordingDuration,
    meteringLevel,
    startAudioRecording,
    stopAudioRecording,
    startVideoRecording,
    stopVideoRecording,
    uploadMedia,
    clearCapture,
  };
}
