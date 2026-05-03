import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BlurView } from 'expo-blur';
import { Colors } from '@/lib/constants';

interface MonthlyDumpVideoSlideProps {
  url: string;
}

export default function MonthlyDumpVideoSlide({ url }: MonthlyDumpVideoSlideProps) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });
  const hasStartedPlaybackRef = useRef(false);

  const statusPayload = useEvent(player, 'statusChange', { status: player.status });
  const playbackStatus = statusPayload?.status;
  const isLoading = playbackStatus !== 'readyToPlay' && playbackStatus !== 'error';
  const hasPlaybackError = statusPayload?.status === 'error';

  useEffect(() => {
    hasStartedPlaybackRef.current = false;
  }, [url]);

  useEffect(() => {
    if (playbackStatus !== 'readyToPlay') return;
    if (hasStartedPlaybackRef.current) return;

    hasStartedPlaybackRef.current = true;
    player.play();
  }, [playbackStatus, player]);

  if (!hasPlaybackError) {
    return (
      <View style={styles.videoContainer}>
        <VideoView player={player} style={styles.media} contentFit="cover" />
        {isLoading ? (
          <BlurView intensity={48} tint="dark" style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="white" />
          </BlurView>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackTitle}>Video cannot be played</Text>
      <Text style={styles.fallbackSubtitle}>This clip is unavailable on this device.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
  },
  fallbackTitle: {
    color: Colors.white,
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    color: '#CBD5E1',
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
