import { useState, useCallback } from 'react';
import { MediaCapture, MediaType } from '@/types/media';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { CameraView } from 'expo-camera';
import { MediaService } from '@/services/media-service';

interface UseCaptureResult {
  isCapturing: boolean;
  capturedMedia: MediaCapture | null;
  recordingDuration: number;
  startAudioRecording: () => Promise<void>;
  stopAudioRecording: () => Promise<MediaCapture | null>;
  startVideoRecording: (cameraRef: React.RefObject<CameraView | null>) => Promise<{ data: MediaCapture, cleanup: Function } | undefined>;
  stopVideoRecording: (cameraRef: React.RefObject<CameraView | null>) => Promise<void>;
  uploadMedia: (mediaType: MediaType) => Promise<MediaCapture | null>;
  clearCapture: () => void;
}

export function useMediaCapture(): UseCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<MediaCapture | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const generateId = () => {
    return Crypto.randomUUID();
  };

  const startVideoRecording = useCallback(async (cameraRef: React.RefObject<CameraView | null>) => {
    setIsCapturing(true);
    setRecordingDuration(0);

    try {
      const capture = await MediaService.startVideoRecording(cameraRef);

      if (!capture) {
        console.warn("Error with camera or recorsing may not have started yet");
        return;
      }
      
      // Start duration timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      const newCapture: MediaCapture = {
        ...capture,
        duration: recordingDuration,
      }
  
      return {
        data: newCapture,
        cleanup: () => clearInterval(timer),
      }
    } catch (error) {
      console.error('Error starting recording', error);
      Alert.alert('Error starting recording' + error);
    } finally {
      setIsCapturing(false);
    }

  }, []);

  const stopVideoRecording = useCallback(async (cameraRef: React.RefObject<CameraView | null>) => {
    await MediaService.stopVideoRecording(cameraRef);
  }, []);

  const startAudioRecording = useCallback(async () => {
    setIsCapturing(true);
    setCapturedMedia(null);
    setRecordingDuration(0);
    
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        setIsCapturing(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Custom recording options for higher volume and quality
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 256000, // Higher bit rate for better quality
          maxFileSize: 10 * 1024 * 1024, // 10MB max file size
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.MAX, // Maximum quality
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 256000, // Higher bit rate for better quality
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 256000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions
      );
      
      setRecording(newRecording);
      
      // Start duration timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Store timer reference for cleanup
      (newRecording as any)._timer = timer;
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start audio recording');
      setIsCapturing(false);
    }
  }, []);

  const stopAudioRecording = useCallback(async (): Promise<MediaCapture | null> => {
    setIsCapturing(false);
    
    if (!recording) return null;

    try {
      // Clear timer
      if ((recording as any)._timer) {
        clearInterval((recording as any)._timer);
      }
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        throw new Error('No recording URI available');
      }

      const audioCapture: MediaCapture = {
        id: generateId(),
        type: 'audio',
        uri,
        duration: recordingDuration,
        timestamp: new Date(),
      };
      
      setCapturedMedia(audioCapture);
      setRecording(null);
      setRecordingDuration(0);
      
      return audioCapture;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop audio recording');
      setRecording(null);
      setRecordingDuration(0);
      return null;
    }
  }, [recording, recordingDuration, generateId]);

  const uploadMedia = useCallback(async (mediaType: MediaType): Promise<MediaCapture | null> => {
    try {
      // Return early for audio type
      if (mediaType === 'audio') {
        Alert.alert('Audio Not Supported', 'Audio upload from library is not currently supported. Please use the microphone to record audio.');
        return null;
      }

      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permission to access photos and videos.');
        return null;
      }

      // Launch the image/video picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
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
  }, [generateId]);
    

  const clearCapture = useCallback(() => {
    setCapturedMedia(null);
    setIsCapturing(false);
    setRecordingDuration(0);
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
  }, []);

  return {
    isCapturing,
    capturedMedia,
    recordingDuration,
    startAudioRecording,
    stopAudioRecording,
    startVideoRecording,
    stopVideoRecording,
    uploadMedia,
    clearCapture,
  };
}