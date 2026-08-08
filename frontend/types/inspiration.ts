export type InspirationItemType = 'media' | 'place' | 'contact';

export interface InspirationMediaItem {
  id: string;
  type: 'media';
  occurredAt: string;
  uri: string;
  mediaType: 'photo' | 'video';
  durationMs?: number;
}

export interface InspirationPlaceItem {
  id: string;
  type: 'place';
  occurredAt: string;
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
}

export interface InspirationContactItem {
  id: string;
  type: 'contact';
  occurredAt: string;
  name: string;
  initials: string;
}

export type InspirationItem = InspirationMediaItem | InspirationPlaceItem | InspirationContactItem;

export interface InspirationDay {
  key: string;
  date: Date;
  items: InspirationItem[];
}

export interface PlaceVisit extends InspirationPlaceItem {}

export interface SpotifyListeningEvent {
  id: string;
  playedAt: string;
  spotifyTrackId: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
}
