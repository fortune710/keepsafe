import { MediaCapture, MediaType } from '@/types/media';
import { CameraView } from 'expo-camera';
import * as Crypto from 'expo-crypto';

export class MediaService {
  static async capturePhoto(cameraRef: React.RefObject<CameraView | null>): Promise<MediaCapture | null> {
    if (!cameraRef.current) {
      throw new Error('Camera reference not available');
    }

    try {
      const photo = await cameraRef.current.takePictureAsync();
      
      if (!photo) {
        throw new Error('Failed to capture photo');
      }

      return {
        id: Crypto.randomUUID(),
        type: 'photo',
        uri: photo.uri,
        timestamp: new Date(),
        metadata: {
          width: photo.width,
          height: photo.height,
        },
      };
    } catch (error) {
      console.error('Photo capture failed:', error);
      throw error;
    }
  }

  static async startVideoRecording(cameraRef: React.RefObject<CameraView | null>): Promise<MediaCapture | null> {
    if (!cameraRef.current) {
      throw new Error('Camera reference not available');
    }

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 10
      });
      
      if (!video) {
        console.log("Video not done recording");
        return null;
      }

      return {
        id: Crypto.randomUUID(),
        type: 'video',
        uri: video.uri,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Video capture failed:', error);
      throw error;
    }
  }

  // Add to MediaService class
  static async createVideoCapture(uri: string): Promise<MediaCapture | null> {
    try {
      const id = Crypto.randomUUID();
      const capture: MediaCapture = {
        id,
        uri,
        type: 'video',
        timestamp: new Date(),
        duration: 0, // You can get actual duration from video metadata if needed
      };
      return capture;
    } catch (error) {
      console.error('Error creating video capture:', error);
      return null;
    }
  }

  static async stopVideoRecording(cameraRef: React.RefObject<CameraView | null>): Promise<void> {
    if (!cameraRef.current) {
      throw new Error('Camera reference not available');
    }

    try {
      return cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Video capture stop failed:', error);
      throw error;
    }
  }

  static async startAudioRecording(): Promise<string> {
    // This would integrate with expo-av or similar
    // For now, return a mock recording ID
    const recordingId = Crypto.randomUUID();
    console.log('Starting audio recording:', recordingId);
    return recordingId;
  }

  static async stopAudioRecording(recordingId: string): Promise<MediaCapture> {
    // This would stop the actual recording and return the file
    console.log('Stopping audio recording:', recordingId);
    
    return {
      id: recordingId,
      type: 'audio',
      uri: `file://recordings/${recordingId}.m4a`,
      duration: 30, // Mock duration
      timestamp: new Date(),
      metadata: {
        size: 1024000, // Mock file size
      },
    };
  }

  static async playAudio(uri: string): Promise<void> {
    // This would integrate with expo-av for audio playback
    console.log('Playing audio:', uri);
  }

  static async pauseAudio(): Promise<void> {
    // This would pause the current audio playback
    console.log('Pausing audio');
  }

  static validateMediaCapture(capture: MediaCapture): boolean {
    return !!(
      capture.id &&
      capture.type &&
      capture.uri &&
      capture.timestamp
    );
  }

  static getMediaDisplayName(type: MediaType): string {
    switch (type) {
      case 'photo':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio Recording';
      default:
        return 'Media';
    }
  }

  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}