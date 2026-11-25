import { requireOptionalNativeModule } from 'expo';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';
import { deviceStorage } from '@/services/device-storage';

interface DetectionCacheEntry {
  hasPerson: boolean;
  modifiedAt: number;
}

const CACHE_PREFIX = 'inspiration_person_detection_v2_';
const supportsFaceDetection = Platform.OS !== 'web'
  && Boolean(requireOptionalNativeModule('RNMLKitFaceDetection'));

async function initializeDetector() {
  if (!supportsFaceDetection) return null;

  const { RNMLKitFaceDetector } = await import('@infinitered/react-native-mlkit-face-detection');
  const detector = new RNMLKitFaceDetector({ performanceMode: 'fast', minFaceSize: 0.08 }, true);
  await detector.initialize();
  return detector.status === 'ready' ? detector : null;
}

let detectorReady: ReturnType<typeof initializeDetector> | undefined;

function isReadableLocalUri(uri: string): boolean {
  if (Platform.OS === 'ios') return uri.startsWith('file://');
  return uri.startsWith('file://') || uri.startsWith('content://');
}

/** Performs face detection locally; source bytes never leave the device. */
export class PersonDetectorService {
  static isAvailable(): boolean {
    return supportsFaceDetection;
  }

  static async hasPerson(asset: { id: string; uri: string; mediaType: 'photo' | 'video'; modificationTime?: number }): Promise<boolean> {
    if (!supportsFaceDetection) return false;
    if (!isReadableLocalUri(asset.uri)) return false;

    const cacheKey = `${CACHE_PREFIX}${asset.id}`;
    const cached = await deviceStorage.getItem<DetectionCacheEntry>(cacheKey);
    if (cached && cached.modifiedAt === (asset.modificationTime || 0)) return cached.hasPerson;

    let imageUri = asset.uri;
    try {
      detectorReady ??= initializeDetector();
      const detector = await detectorReady;
      if (!detector) return false;
      if (asset.mediaType === 'video') {
        const thumbnail = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000, quality: 0.55 });
        imageUri = thumbnail.uri;
      }
      if (!isReadableLocalUri(imageUri)) return false;
      const result = await detector.detectFaces(imageUri);
      const hasPerson = Boolean(result?.success && result.faces.length);
      await deviceStorage.setItem(cacheKey, { hasPerson, modifiedAt: asset.modificationTime || 0 });
      return hasPerson;
    } catch {
      // Fail closed: unclassified assets are never displayed as memories.
      return false;
    }
  }
}
