import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRef } from 'react';

export function useAudio() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const currentUri = useRef<string | null>(null);

  const playAudio = async (uri: string) => {
    if (!uri) return;
    try {
      if (status.playing && currentUri.current === uri) {
        player.pause();
        return;
      }
      if (currentUri.current !== uri) {
        player.replace({ uri });
        currentUri.current = uri;
      } else {
        await player.seekTo(0);
      }
      player.play();
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  return { isPlaying: status.playing, playAudio };
}
