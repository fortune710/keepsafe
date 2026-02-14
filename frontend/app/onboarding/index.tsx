import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/lib/constants';
import { Image } from 'expo-image';
import { scale } from 'react-native-size-matters';

const { width, height } = Dimensions.get('window');

const VIDEO_HEIGHT = height * 0.55;

// Module-level variable to track if the video has been played in this session
let hasPlayedOnboardingVideo = false;

export default function WelcomeScreen() {
  const [videoFinished, setVideoFinished] = useState(hasPlayedOnboardingVideo);

  const player = useVideoPlayer(
    require('@/assets/videos/onboarding-video.mp4'),
    (player) => {
      player.loop = false;
      player.muted = true;
      if (hasPlayedOnboardingVideo) {
        // Seek to the end (arbitrary large number to ensure we hit the end)
        player.seekBy(10000);
      } else {
        player.play();
      }
    }
  );

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      hasPlayedOnboardingVideo = true;
      setVideoFinished(true);
    });
    return () => subscription.remove();
  }, [player]);

  return (
    <View style={styles.container}>
      {/* Video at the top */}
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          nativeControls={false}
          contentFit="cover"
        />
        {/* Gradient overlay that fades into the background */}
        <Animated.View
          entering={FadeIn.duration(1000)}
          style={styles.gradient}
        >
          <LinearGradient
            colors={[
              'rgba(240, 249, 255, 0)',
              'rgba(240, 249, 255, 0.1)',
              'rgba(240, 249, 255, 0.3)',
              'rgba(240, 249, 255, 0.6)',
              'rgba(240, 249, 255, 0.85)',
              '#F0F9FF'
            ]}
            style={{ flex: 1 }}
            locations={[0, 0.25, 0.45, 0.65, 0.85, 1]}
          />
        </Animated.View>
      </View>

      {/* Content below the video */}
      <View style={styles.contentContainer}>
        {videoFinished && (
          <>
            <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.logoContainer}>
              <Image
                style={{ width: scale(70), height: scale(70) }}
                source={require('@/assets/images/keepsafe-logo-dark.png')}
                contentFit="contain"
              />
              <Text style={styles.logo}>Keepsafe</Text>
              <Text style={styles.tagline}>Your AI-powered digital diary.</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(800)} style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={() => router.push('/onboarding/auth?mode=signup')}
              >
                <Text style={styles.buttonText}>Get Started</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => router.push('/onboarding/auth?mode=signin')}
              >
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}

const scaleFactor = 7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  videoContainer: {
    width: width + (10 * scaleFactor),
    height: VIDEO_HEIGHT,
    position: 'absolute',
    top: 0,
    left: -5 * scaleFactor,
    right: -5 * scaleFactor,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: VIDEO_HEIGHT * 0.6,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: VIDEO_HEIGHT * 0.75,
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    fontSize: scale(30),
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Outfit-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: width * 0.8,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    width: '100%'
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
  },
  signInButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: width * 0.4,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 0,
  },
  signInButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
  },
});