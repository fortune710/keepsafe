import { MediaCapture } from '@/types/media';
import AudioEntryPlayer from './audio-entry-player';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Alert } from 'react-native';

interface AudioEntryProps {
  entry: MediaCapture;
}

export default function AudioEntry({ entry }: AudioEntryProps) {
  const player = useAudioPlayer(entry?.uri ? { uri: entry.uri } : null);
  const status = useAudioPlayerStatus(player);

  const toggleAudioPlayback = async () => {
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      if (!entry?.uri) return;
      await player.seekTo(0);
      player.play();
    } catch (error) {
      console.error('Audio playback error:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  return <AudioEntryPlayer isPlaying={status.playing} onTogglePlayback={toggleAudioPlayback} duration={entry?.duration || 0} />;
}
