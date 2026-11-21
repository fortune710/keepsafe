import * as MediaLibrary from 'expo-media-library';
import { PersonDetectorService } from '@/services/person-detector-service';
import { InspirationMediaItem } from '@/types/inspiration';

const PAGE_SIZE = 36;

export class InspirationMediaService {
  static async getRecentPeopleMedia(start: Date, end: Date): Promise<InspirationMediaItem[]> {
    const response = await MediaLibrary.getAssetsAsync({
      first: PAGE_SIZE,
      createdAfter: start.getTime(),
      createdBefore: end.getTime(),
      mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
      sortBy: [MediaLibrary.SortBy.creationTime],
    } as any);

    const analyzeAsset = async (asset: MediaLibrary.Asset): Promise<InspirationMediaItem | null> => {
      const mediaType: 'photo' | 'video' = asset.mediaType === MediaLibrary.MediaType.video ? 'video' : 'photo';
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: true });
      if (!assetInfo.localUri) return null;
      const hasPerson = await PersonDetectorService.hasPerson({
        id: asset.id,
        uri: assetInfo.localUri,
        mediaType,
        modificationTime: asset.modificationTime,
      });
      if (!hasPerson) return null;
      const item: InspirationMediaItem = {
        id: `media-${asset.id}`,
        type: 'media' as const,
        occurredAt: new Date(asset.creationTime).toISOString(),
        uri: asset.uri,
        mediaType,
      };
      if (asset.duration) item.durationMs = asset.duration * 1000;
      return item;
    };

    // Keep native image decoding bounded; a large Promise.all can exhaust iOS Photos resources.
    const items: Array<InspirationMediaItem | null> = [];
    for (let index = 0; index < response.assets.length; index += 4) {
      const batch = response.assets.slice(index, index + 4);
      const results = await Promise.all(batch.map(async (asset) => {
        try {
          return await analyzeAsset(asset);
        } catch {
          return null;
        }
      }));
      items.push(...results);
    }

    return items.filter((item): item is InspirationMediaItem => item !== null);
  }
}
