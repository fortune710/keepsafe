import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { Pause, Play } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';

interface MusicPreviewControlProps {
  isPlaying: boolean;
  progress: number;
  onPress: () => void;
}

export function MusicPreviewControl({ isPlaying, progress, onPress }: MusicPreviewControlProps) {
  const radius = scale(15);
  const size = radius * 2 + 3;
  const center = size / 2;
  const circle = React.useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(center, center, radius);
    return path;
  }, [center, radius]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause song preview' : 'Play song preview'}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={styles.container}
    >
      <Canvas style={{ width: size, height: size }}>
        <Group origin={{ x: center, y: center }} transform={[{ rotate: -Math.PI / 2 }]}>
          <Path path={circle} style="stroke" color={Colors.mutedSurface} strokeWidth={3} strokeCap="round" />
          <Path path={circle} style="stroke" color={Colors.primary} strokeWidth={3} strokeCap="round" end={progress} />
        </Group>
      </Canvas>
      <View pointerEvents="none" style={styles.button}>
        {isPlaying ? <Pause size={scale(18)} color={Colors.primary} /> : <Play size={scale(18)} color={Colors.primary} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  button: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: scale(20),
    height: verticalScale(20),
    borderRadius: 35,
    backgroundColor: '#fff',
    elevation: 3,
  },
});
