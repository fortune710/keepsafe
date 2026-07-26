import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/lib/constants';
import { Image } from 'expo-image';
import { scale } from 'react-native-size-matters';
import { AuthChoiceSheet } from '@/components/onboarding/auth-choice-sheet';
import { useAuthContext } from '@/providers/auth-provider';

const { width, height } = Dimensions.get('window');

const VIDEO_HEIGHT = height;

export default function WelcomeScreen() {
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const { user, session, loading } = useAuthContext();

  // app/index.tsx's redirect only fires once, on initial mount - if the
  // session hydrates or refreshes a moment after that check ran (e.g. the
  // token refresh landing just after cold start), we'd otherwise be stuck
  // showing onboarding despite having a valid session. Re-check here so an
  // active session always forwards to the app.
  useEffect(() => {
    if (!loading && user && session) {
      router.replace('/capture');
    }
  }, [loading, user, session]);

  const player = useVideoPlayer(
    require('@/assets/videos/onboarding-image-new.mp4'),
    (player) => {
      player.loop = true;
      player.muted = true;
      player.play();
    },
  );

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
      </View>

      {/* Content below the video */}
      <View style={styles.contentContainer}>
        <>
          <Animated.View
            entering={FadeInUp.delay(200).duration(800)}
            style={styles.logoContainer}
          >
            <Image
              style={{ width: scale(70), height: scale(70) }}
              source={require('@/assets/images/keepsafe-logo-white.png')}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(500).duration(800)}
            style={styles.buttonContainer}
          >
            <Pressable
              style={styles.getStartedButton}
              onPress={() => setAuthSheetVisible(true)}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </Pressable>
          </Animated.View>
        </>
      </View>

      <AuthChoiceSheet
        visible={authSheetVisible}
        onClose={() => setAuthSheetVisible(false)}
      />
    </View>
  );
}

const scaleFactor = 7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fcff',
  },
  videoContainer: {
    width: width + 10 * scaleFactor,
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
    paddingTop: VIDEO_HEIGHT * 0.08,
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    fontSize: scale(30),
    fontFamily: 'Outfit-Bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Outfit-Regular',
    color: '#F1F5F9',
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
    borderRadius: 36,
    paddingVertical: 16,
    gap: 8,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
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
