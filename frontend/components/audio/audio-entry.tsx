import { MediaCapture } from '@/types/media';
import AudioEntryPlayer from './audio-entry-player';
import { useAudioPlayer, useAudioPlayerStatus, useAudioSampleListener } from 'expo-audio';
import { Alert } from 'react-native';
import { useState } from 'react';

interface AudioEntryProps {
  entry: MediaCapture;
}

export default function AudioEntry({ entry }: AudioEntryProps) {
  const player = useAudioPlayer(entry?.uri ? { uri: entry.uri } : null);
  const status = useAudioPlayerStatus(player);
  const [level, setLevel] = useState(0);
  useAudioSampleListener(player, (sample) => {
    const frames = sample.channels[0]?.frames;
    if (!frames?.length) return;
    const rms = Math.sqrt(frames.reduce((sum, frame) => sum + frame * frame, 0) / frames.length);
    setLevel(Math.min(1, rms * 4));
  });

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

  return <AudioEntryPlayer isPlaying={status.playing} onTogglePlayback={toggleAudioPlayback} duration={entry?.duration || 0} meteringLevel={level} />;
}
