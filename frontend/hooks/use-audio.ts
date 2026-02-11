import { Audio } from "expo-av";
import { useEffect, useState } from "react";


export function useAudio() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    // Cleanup sound on unmount
    useEffect(() => {
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, [sound]);


    const playAudio = async (uri: string) => {
        if (!uri) return;
        try {
            if (isPlaying) {
              if (sound) {
                await sound.pauseAsync();
              }
              setIsPlaying(false);
            } else {
              if (uri) {
                if (sound) {
                  await sound.replayAsync();
                } else {
                  const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true }
                  );
                  setSound(newSound);
                  
                  newSound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                      setIsPlaying(false);
                    }
                  });
                }
                setIsPlaying(true);
              }
            }
        } catch (error) {
            console.error('Audio playback error:', error);
            setIsPlaying(false);
        }
    }

    return {
        isPlaying,
        playAudio,
    }
}