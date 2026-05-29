import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface MonthlyDumpImageSlideProps {
  url: string;
}

export default function MonthlyDumpImageSlide({ url }: MonthlyDumpImageSlideProps) {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: url }}
        style={styles.image}
        contentFit="cover"
        transition={250}
        cachePolicy="disk"
      />
      <LinearGradient
        colors={['rgba(7,17,31,0.10)', 'rgba(7,17,31,0.42)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topFade}
      />
      <LinearGradient
        colors={['rgba(7,17,31,0)', 'rgba(7,17,31,0.72)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFade}
      />
      <View pointerEvents="none" style={styles.frame} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '28%',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '34%',
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
