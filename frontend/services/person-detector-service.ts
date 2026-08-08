import { RNMLKitFaceDetector } from '@infinitered/react-native-mlkit-face-detection';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';
import { deviceStorage } from '@/services/device-storage';

interface DetectionCacheEntry {
  hasPerson: boolean;
  modifiedAt: number;
}

const CACHE_PREFIX = 'inspiration_person_detection_v2_';
const detector = Platform.OS === 'web'
  ? null
  : new RNMLKitFaceDetector({ performanceMode: 'fast', minFaceSize: 0.08 }, true);
const detectorReady = detector
  ? detector.initialize().then(() => detector.status === 'ready')
  : Promise.resolve(false);

function isReadableLocalUri(uri: string): boolean {
  if (Platform.OS === 'ios') return uri.startsWith('file://');
  return uri.startsWith('file://') || uri.startsWith('content://');
}

/** Performs face detection locally; source bytes never leave the device. */
export class PersonDetectorService {
  static async hasPerson(asset: { id: string; uri: string; mediaType: 'photo' | 'video'; modificationTime?: number }): Promise<boolean> {
    if (!detector) return false;
    if (!isReadableLocalUri(asset.uri)) return false;

    const cacheKey = `${CACHE_PREFIX}${asset.id}`;
    const cached = await deviceStorage.getItem<DetectionCacheEntry>(cacheKey);
    if (cached && cached.modifiedAt === (asset.modificationTime || 0)) return cached.hasPerson;

    let imageUri = asset.uri;
    try {
      if (!await detectorReady) return false;
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
