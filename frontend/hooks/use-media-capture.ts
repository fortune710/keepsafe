import { useState, useCallback, useEffect } from 'react';
import { MediaCapture, MediaType } from '@/types/media';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { CameraView } from 'expo-camera';
import { MediaService } from '@/services/media-service';
import { useCaptureContext } from '@/providers/capture-provider';

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
  clearCapture: () => void;
}

export function useMediaCapture(): UseCaptureResult {
  const {
    isCapturing,
    setIsCapturing,
    recordingDuration,
    setRecordingDuration,
    meteringLevel,
    setMeteringLevel,
  } = useCaptureContext();
  const [capturedMedia, setCapturedMedia] = useState<MediaCapture | null>(null);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 100);
  useEffect(() => {
    if (!recorderState.isRecording) return;
    setRecordingDuration(Math.floor(recorderState.durationMillis / 1000));
    setMeteringLevel(Math.max(0, Math.min(1, ((recorderState.metering ?? -60) + 60) / 60)));
  }, [recorderState.isRecording, recorderState.durationMillis, recorderState.metering, setRecordingDuration, setMeteringLevel]);

  const generateId = () => {
    return Crypto.randomUUID();
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
    setCapturedMedia(null);
    setRecordingDuration(0);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsCapturing(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start audio recording');
      setIsCapturing(false);
    }
  }, [recorder, setIsCapturing]);

  const stopAudioRecording = useCallback(async (): Promise<MediaCapture | null> => {
    if (!recorder.isRecording) return null;
    try {
      const duration = recorder.currentTime;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (!recorder.uri) throw new Error('No recording URI available');
      const capture: MediaCapture = { id: generateId(), type: 'audio', uri: recorder.uri, duration, timestamp: new Date() };
      setCapturedMedia(capture);
      setRecordingDuration(0);
      setMeteringLevel(0);
      return capture;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop audio recording');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [recorder, setIsCapturing]);

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
    setCapturedMedia(null);
    setIsCapturing(false);
    setRecordingDuration(0);
    setMeteringLevel(0);
    try {
      if (recorder.isRecording) await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch (error) {
      console.error('Error cleaning up recording:', error);
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
