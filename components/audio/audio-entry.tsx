import { MediaCapture } from "@/types/media"
import AudioEntryPlayer from "./audio-entry-player"
import { useEffect, useState } from "react";

import { Audio } from 'expo-av';
import { Alert } from "react-native";

interface AudioEntryProps {
    entry: MediaCapture
}

export default function AudioEntry({ entry }: AudioEntryProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Cleanup sound on unmount or when capture changes
//   useEffect(() => {
//     return () => {
//       if (sound) {
//         sound.unloadAsync().catch(error => {
//           console.error('Error unloading sound on cleanup:', error);
//         });
//       }
//     };
//   }, [sound]);

  // Cleanup sound when capture changes (e.g., navigating back and returning)
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(error => {
          console.error('Error unloading sound on capture change:', error);
        });
        setSound(null);
        setIsPlaying(false);
      }
    };
  }, [entry?.id, sound]);

    const toggleAudioPlayback = async () => {
        try {
          if (isPlaying) {
            if (sound) {
              await sound.pauseAsync();
            }
            setIsPlaying(false);
          } else {
            if (entry?.uri) {
              // Unload any existing sound before creating a new one
              if (sound) {
                try {
                  await sound.unloadAsync();
                } catch (error) {
                  console.error('Error unloading previous sound:', error);
                }
                setSound(null);
              }
              
              // Create and play new sound instance
              const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: entry.uri },
                { shouldPlay: true }
              );
              await newSound.setVolumeAsync(1.0);
              
              newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                  if (status.didJustFinish) {
                    setIsPlaying(false);
                  }
                }
              });
              
              setSound(newSound);
              setIsPlaying(true);
            }
          }
        } catch (error) {
          console.error('Audio playback error:', error);
          Alert.alert('Error', 'Failed to play audio');
          setIsPlaying(false);
          if (sound) {
            setSound(null);
          }
        }
    };
    
    return (
        <AudioEntryPlayer 
            isPlaying={isPlaying} 
            onTogglePlayback={toggleAudioPlayback} 
            duration={entry?.duration || 0}
        />
        
    )
}