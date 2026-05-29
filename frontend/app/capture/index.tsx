import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import Animated, {
  Easing,
  Extrapolation,
  SlideInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useMediaCapture } from '@/hooks/use-media-capture';
import { useAuthContext } from '@/providers/auth-provider';
import { useSaveLock } from '@/providers/save-lock-provider';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { useTimezone } from '@/hooks/use-timezone';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/use-responsive';
import { logger } from '@/lib/logger';
import PhoneNumberBottomSheet from '@/components/phone-number-bottom-sheet';
import { useVaultPreloader } from '@/hooks/use-vault-preloader';
import { useManagePhoneSheet } from '@/hooks/phone-number/use-manage-phone-sheet';
import { useVideoCapture } from '@/hooks/capture/use-video-capture';
import { usePhotoCapture } from '@/hooks/capture/use-photo-capture';
import { useCameraControl } from '@/hooks/capture/use-camera-control';
import { useMediaUpload } from '@/hooks/capture/use-media-upload';
import { useAudioCapture } from '@/hooks/capture/use-audio-capture';

// Refactored Components
import { CaptureHeader } from '@/components/capture/capture-header';
import { ModeSelector } from '@/components/capture/mode-selector';
import { MediaDisplay } from '@/components/capture/media-display';
import { CaptureActions } from '@/components/capture/capture-actions';
import { VaultButton } from '@/components/capture/vault-button';
import MonthlyDumpBanner from '@/components/monthly-dumps/monthly-dump-banner';
import { useMonthlyDump } from '@/hooks/use-monthly-dump';

export default function CaptureScreen() {
  const RECAP_CLOSE_DURATION_MS = 620;
  const RECAP_CHIP_REVEAL_EARLY_MS = 140;

  const responsive = useResponsive();
  const { convertToLocalTimezone } = useTimezone();
  const [selectedMode, setSelectedMode] = useState<'camera' | 'microphone'>('camera');
  const [isRecapExpanded, setIsRecapExpanded] = useState(false);
  const [isRecapChipReady, setIsRecapChipReady] = useState(true);
  const recapBannerProgress = useSharedValue(0);
  const recapChipRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { month, hasDump, isEnabled } = useMonthlyDump();

  const [permission, requestPermission] = useCameraPermissions();

  // Add camera ready state
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');

  const { profile } = useAuthContext();
  const { unlockSave, isSaveLocked } = useSaveLock();
  const { showPhoneSheet, setShowPhoneSheet } = useManagePhoneSheet();

  //Media Hooks
  const { facing, toggleCameraFacing, cameraRef } = useCameraControl();

  const {
    startVideo,
    stopVideo,
    cameraInstance,
    pendingVideoStartRef,
    videoDuration,
    isVideoRecording,
    setVideoDuration,
    onCameraReady
  } = useVideoCapture({
    cameraRef,
    isCameraReady,
    cameraMode,
    captureMode: selectedMode,
    updateCameraMode: setCameraMode,
    updateCameraReady: setIsCameraReady
  });

  const { takePicture } = usePhotoCapture({
    cameraRef,
    isCameraReady,
    cameraMode,
    facing,
    updateCameraMode: setCameraMode,
  });

  const { toggleRecording } = useAudioCapture({
    cameraRef,
    setVideoDuration
  });

  const { handleUpload } = useMediaUpload(selectedMode);

  // Release save lock when capture screen mounts (after navigating back from details)
  useVaultPreloader();
  useFocusEffect(
    useCallback(() => {
      unlockSave();
      logger.info('isSaveLocked', isSaveLocked);
    }, [])
  );

  const {
    isCapturing,
    recordingDuration,
    clearCapture
  } = useMediaCapture();

  // Cleanup audio recording when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      clearCapture();
    };
  }, []);

  const handleCameraCapture = async () => {
    if (isVideoRecording) {
      await stopVideo();
    } else {
      await takePicture();
    }
  };

  const defaultAvatarUrl = getDefaultAvatarUrl(profile?.full_name || '');
  const canShowRecap = !!month && (hasDump || isEnabled);

  const formatRecapChipMonth = (value?: string) => {
    if (!value) return '';
    try {
      const [year, monthValue] = value.split('-');
      const date = new Date(parseInt(year, 10), parseInt(monthValue, 10) - 1);
      return date.toLocaleString('default', { month: 'long' });
    } catch {
      return value;
    }
  };

  const toggleRecapBanner = () => {
    if (!canShowRecap) return;

    if (recapChipRevealTimerRef.current) {
      clearTimeout(recapChipRevealTimerRef.current);
      recapChipRevealTimerRef.current = null;
    }

    const nextExpanded = !isRecapExpanded;
    if (nextExpanded) {
      setIsRecapChipReady(false);
    } else {
      const revealAfterMs = Math.max(0, RECAP_CLOSE_DURATION_MS - RECAP_CHIP_REVEAL_EARLY_MS);
      recapChipRevealTimerRef.current = setTimeout(() => {
        setIsRecapChipReady(true);
        recapChipRevealTimerRef.current = null;
      }, revealAfterMs);
    }

    setIsRecapExpanded(nextExpanded);
    recapBannerProgress.value = withTiming(nextExpanded ? 1 : 0, {
      duration: RECAP_CLOSE_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
    }, (finished) => {
      if (!finished) return;
      if (!nextExpanded) {
        runOnJS(setIsRecapChipReady)(true);
      }
    });
  };

  useEffect(() => {
    return () => {
      if (!recapChipRevealTimerRef.current) return;
      clearTimeout(recapChipRevealTimerRef.current);
    };
  }, []);

  const recapBannerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(recapBannerProgress.value, [0, 0.2, 1], [0, 1, 1], Extrapolation.CLAMP);
    const translateY = interpolate(recapBannerProgress.value, [0, 0.55, 1], [-24, 0, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>We need camera permission to continue</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Animated.View
      style={[{ flex: 1 }, styles.pageStyle]}
      entering={SlideInUp}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerSection}>
            <View style={styles.headerTopLayer}>
              <CaptureHeader
                profile={profile}
                defaultAvatarUrl={defaultAvatarUrl}
                convertToLocalTimezone={convertToLocalTimezone}
                onDatePress={toggleRecapBanner}
                showRecapChip={canShowRecap && !isRecapExpanded && isRecapChipReady}
                recapChipText={`${formatRecapChipMonth(month)} Recap`}
                highlightDateBorder={canShowRecap && !isRecapExpanded && isRecapChipReady}
              />
            </View>

            <Animated.View
              pointerEvents={isRecapExpanded ? 'auto' : 'none'}
              style={[styles.bannerOverlay, recapBannerAnimatedStyle]}
            >
              <MonthlyDumpBanner month={month} animationProgress={recapBannerProgress} />
            </Animated.View>
          </View>

          <ModeSelector
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            minTouchTarget={responsive.minTouchTarget}
          />

          <View
            style={[
              styles.content,
              {
                paddingHorizontal: responsive.contentPadding,
                maxWidth: responsive.maxContentWidth,
              },
            ]}
          >
            <MediaDisplay
              selectedMode={selectedMode}
              cameraInstance={cameraInstance}
              cameraMode={cameraMode}
              facing={facing}
              cameraRef={cameraRef}
              onCameraReady={onCameraReady}
              isCameraReady={isCameraReady}
              isVideoRecording={isVideoRecording}
              videoDuration={videoDuration}
              isCapturing={isCapturing}
              recordingDuration={recordingDuration}
            />

            <CaptureActions
              selectedMode={selectedMode}
              handleUpload={handleUpload}
              isCapturing={isCapturing}
              isVideoRecording={isVideoRecording}
              isCameraReady={isCameraReady}
              handleCameraCapture={handleCameraCapture}
              toggleRecording={toggleRecording}
              startVideo={startVideo}
              stopVideo={stopVideo}
              pendingVideoStartRef={pendingVideoStartRef}
              toggleCameraFacing={toggleCameraFacing}
              minTouchTarget={responsive.minTouchTarget}
            />

            <VaultButton />
          </View>
        </ScrollView>
      </SafeAreaView>

      <PhoneNumberBottomSheet
        isVisible={showPhoneSheet}
        onClose={() => setShowPhoneSheet(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  pageStyle: {
  },
  headerSection: {
    position: 'relative',
    zIndex: 20,
  },
  headerTopLayer: {
    zIndex: 30,
  },
  bannerOverlay: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'Outfit-Regular',
  },
  permissionButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
  },
});

