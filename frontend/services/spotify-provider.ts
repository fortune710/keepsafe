import * as WebBrowser from 'expo-web-browser';
import { BACKEND_URL } from '@/lib/constants';
import { apiFetch } from '@/lib/api-client';
import { SpotifyListeningEvent } from '@/types/inspiration';

export interface SpotifyProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  syncRecentListening(): Promise<void>;
  getRecentListening(): Promise<SpotifyListeningEvent[]>;
}

/** OAuth and sync contract only. Inspiration intentionally does not render Spotify data yet. */
class KeepsafeSpotifyProvider implements SpotifyProvider {
  async connect(): Promise<void> {
    const response = await apiFetch(`${BACKEND_URL}/spotify/authorize`, { method: 'POST' });
    if (!response.ok) throw new Error('Unable to start Spotify connection.');
    const { authorizationUrl } = await response.json();
    await WebBrowser.openAuthSessionAsync(authorizationUrl);
  }

  async disconnect(): Promise<void> {
    const response = await apiFetch(`${BACKEND_URL}/spotify/connection`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Unable to disconnect Spotify.');
  }

  async syncRecentListening(): Promise<void> {
    const response = await apiFetch(`${BACKEND_URL}/spotify/sync`, { method: 'POST' });
    if (!response.ok) throw new Error('Unable to sync Spotify listening history.');
  }

  async getRecentListening(): Promise<SpotifyListeningEvent[]> {
    const response = await apiFetch(`${BACKEND_URL}/spotify/listening?limit=50`);
    if (!response.ok) throw new Error('Unable to load Spotify listening history.');
    return response.json();
  }
}

export const spotifyProvider: SpotifyProvider = new KeepsafeSpotifyProvider();
