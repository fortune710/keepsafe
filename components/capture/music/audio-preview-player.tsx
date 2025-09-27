import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, AudioPlayerOptions } from "expo-audio";
import { Play, Pause } from "lucide-react-native";
import {
  Canvas,
  Path,
  Skia,
  Group,
} from "@shopify/react-native-skia";
import { useSharedValue, useDerivedValue, withTiming, cancelAnimation, runOnJS } from "react-native-reanimated";
import { scale, verticalScale } from "react-native-size-matters";
import { Colors } from "@/lib/constants";

interface AudioPreviewProps {
  audioSource: string | number; // either local req or remote URL
  canvasRadius?: number;
}

const AudioPreview: React.FC<AudioPreviewProps> = ({ audioSource, canvasRadius = 12 }) => {
  // Set up options explicitly
  const options: AudioPlayerOptions = {
    updateInterval: 100, 
    downloadFirst: true,
    keepAudioSessionActive: true
    // maybe other options as needed
    // For example, ensure playsInSilentModeIOS
    //playsInSilentModeIOS: true,
  };

  const player = useAudioPlayer(audioSource, options);
  const status = useAudioPlayerStatus(player);

  const [isPlaying, setIsPlaying] = useState(false);

  const DURATION = 30; // seconds

  const progressSV = useSharedValue(0);
  const progressDerived = useDerivedValue(() => {
    return progressSV.value;
  }, [progressSV]);

  useEffect(() => {
    // Once status is loaded, you may want to check duration or readiness
    if (status.isLoaded && status.duration != null) {
      // Optionally override duration logic
      // If actual audio is >30s, you can clamp
    }
    if (status.isLoaded === false) {
      // Maybe show loading indicator
    }
  }, [status]);

  useEffect(() => {
    if (isPlaying) {
      // Calculate remaining time based on progressSV
      const remaining = (1 - progressSV.value) * DURATION * 1100;
      progressSV.value = withTiming(
        1,
        { duration: remaining },
        (isFinished) => {
          if (isFinished) {
            runOnJS(setIsPlaying)(false);
          }
        }
      );
    } else {
      cancelAnimation(progressSV);
    }
    return () => {
      cancelAnimation(progressSV);
    };
  }, [isPlaying]);

  const togglePlayPause = async () => {
    console.log({ audioSource })
    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        // If progress at end, reset
        if (progressSV.value >= 1) {
          progressSV.value = 0;
          // also seek audio
          await player.seekTo(0);
        }
        const result = await player.play();
        // result may indicate success or throw
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Error in togglePlayPause:", err);
      Alert.alert("Audio Error", String(err));
    }
  };

  const radius = scale(canvasRadius);
  const strokeWidth = 3;
  const size = radius * 2 + strokeWidth;
  const center = size / 2;

  const circlePath = React.useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(center, center, radius);
    return p;
  }, [center, radius]);

  return (
    <View style={styles.container}>
      <Canvas style={{ width: size, height: size }}>
        <Group origin={{ x: center, y: center }} transform={[{ rotate: -Math.PI / 2 }]}>
          <Path
            path={circlePath}
            style="stroke"
            color={Colors.mutedSurface}
            strokeWidth={strokeWidth}
            strokeCap="round"
          />
          <Path
            path={circlePath}
            style="stroke"
            color={Colors.primary}
            strokeWidth={strokeWidth}
            strokeCap="round"
            start={0}
            end={progressDerived}
          />
        </Group>
      </Canvas>

      <TouchableOpacity style={styles.button} onPress={togglePlayPause} activeOpacity={0.8}>
        {
            isPlaying ? 
            <Pause size={scale(canvasRadius + 3)} color={Colors.primary} /> : 
            <Play size={scale(canvasRadius + 3)} color={Colors.primary} />
        }
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    width: scale(20),
    height: verticalScale(20),
    borderRadius: 35,
    backgroundColor: "#fff",
    elevation: 3,
  },
});

export default AudioPreview;
