import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { SparklesIcon } from '@/components/icons/sparkles';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useMediaCapture } from '@/hooks/use-media-capture';
import { useSaveLock } from '@/providers/save-lock-provider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/use-responsive';
import { logger } from '@/lib/logger';
import { Colors } from '@/lib/constants';
import { scale, verticalScale } from 'react-native-size-matters';
import PhoneNumberBottomSheet from '@/components/phone-number-bottom-sheet';
import { useVaultPreloader } from '@/hooks/use-vault-preloader';
import { useManagePhoneSheet } from '@/hooks/phone-number/use-manage-phone-sheet';
import { useVideoCapture } from '@/hooks/capture/use-video-capture';
import { usePhotoCapture } from '@/hooks/capture/use-photo-capture';
import { useCameraControl } from '@/hooks/capture/use-camera-control';
import { useMediaUpload } from '@/hooks/capture/use-media-upload';
import { useAudioCapture } from '@/hooks/capture/use-audio-capture';

// Refactored Components
import {
  CaptureModeSelector,
  type CaptureUIMode,
} from '@/components/capture/capture-mode-selector';
import { MediaDisplay } from '@/components/capture/media-display';
import { CaptureActions } from '@/components/capture/capture-actions';
import MonthlyDumpBanner from '@/components/monthly-dumps/monthly-dump-banner';
import { useMonthlyDump } from '@/hooks/use-monthly-dump';

export default function CaptureScreen() {
  const RECAP_CLOSE_DURATION_MS = 620;
  const RECAP_CHIP_REVEAL_EARLY_MS = 140;

  const responsive = useResponsive();
  const insets = useSafeAreaInsets();
  const [captureUIMode, setCaptureUIMode] = useState<CaptureUIMode>('photo');
  const selectedMode: 'camera' | 'microphone' =
    captureUIMode === 'audio' ? 'microphone' : 'camera';
  const [isRecapExpanded, setIsRecapExpanded] = useState(false);
  const [isRecapChipReady, setIsRecapChipReady] = useState(true);
  const recapBannerProgress = useSharedValue(0);
  const recapChipRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { month, hasDump, isEnabled } = useMonthlyDump();

  const [permission, requestPermission] = useCameraPermissions();

  // Add camera ready state
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');

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
    onCameraReady,
  } = useVideoCapture({
    cameraRef,
    isCameraReady,
    cameraMode,
    captureMode: selectedMode,
    updateCameraMode: setCameraMode,
    updateCameraReady: setIsCameraReady,
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
    setVideoDuration,
  });

  const { handleUpload } = useMediaUpload(selectedMode);

  // Release save lock when capture screen mounts (after navigating back from details)
  useVaultPreloader();
  useFocusEffect(
    useCallback(() => {
      unlockSave();
      logger.info('isSaveLocked', isSaveLocked);
    }, []),
  );

  const { isCapturing, recordingDuration, meteringLevel, clearCapture } =
    useMediaCapture();

  // Cleanup audio recording when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      clearCapture();
    };
  }, []);

  // Pre-configure the camera pipeline for the selected mode as soon as the user
  // swipes/taps it, rather than waiting for the first capture attempt.
  useEffect(() => {
    if (captureUIMode === 'video' && cameraMode !== 'video') {
      setCameraMode('video');
    } else if (captureUIMode === 'photo' && cameraMode !== 'picture') {
      setCameraMode('picture');
    }
  }, [captureUIMode, cameraMode]);

  const handleCameraCapture = async () => {
    if (captureUIMode === 'video') {
      if (isVideoRecording) {
        await stopVideo();
      } else {
        await startVideo();
      }
    } else {
      await takePicture();
    }
  };

  const canShowRecap = !!month && hasDump && isEnabled;

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
      const revealAfterMs = Math.max(
        0,
        RECAP_CLOSE_DURATION_MS - RECAP_CHIP_REVEAL_EARLY_MS,
      );
      recapChipRevealTimerRef.current = setTimeout(() => {
        setIsRecapChipReady(true);
        recapChipRevealTimerRef.current = null;
      }, revealAfterMs);
    }

    setIsRecapExpanded(nextExpanded);
    recapBannerProgress.value = withTiming(
      nextExpanded ? 1 : 0,
      {
        duration: RECAP_CLOSE_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
      },
      (finished) => {
        if (!finished) return;
        if (!nextExpanded) {
          runOnJS(setIsRecapChipReady)(true);
        }
      },
    );
  };

  useEffect(() => {
    return () => {
      if (!recapChipRevealTimerRef.current) return;
      clearTimeout(recapChipRevealTimerRef.current);
    };
  }, []);

  const recapBannerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      recapBannerProgress.value,
      [0, 0.2, 1],
      [0, 1, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      recapBannerProgress.value,
      [0, 0.55, 1],
      [-24, 0, 0],
      Extrapolation.CLAMP,
    );

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
          <Text style={styles.permissionText}>
            We need camera permission to continue
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
          >
            <Text style={styles.permissionButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[{ flex: 1 }, styles.pageStyle]}>
      <StatusBar style={captureUIMode === 'audio' ? 'dark' : 'light'} />
      <SafeAreaView
        style={styles.container}
        edges={['left', 'right', 'bottom']}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.headerSection}>
            {canShowRecap && !isRecapExpanded && isRecapChipReady && (
              <TouchableOpacity
                style={[styles.recapChip, { top: insets.top + verticalScale(8) }]}
                onPress={toggleRecapBanner}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${formatRecapChipMonth(month)} recap is ready, open it`}
              >
                <View style={styles.recapChipIcon}>
                  <SparklesIcon size={12} color="#C084FC" />
                </View>
                <Text style={styles.recapChipText} numberOfLines={1}>
                  {formatRecapChipMonth(month)} Recap
                </Text>
              </TouchableOpacity>
            )}

            <Animated.View
              pointerEvents={isRecapExpanded ? 'auto' : 'none'}
              style={[
                styles.bannerOverlay,
                { top: insets.top + verticalScale(8) },
                recapBannerAnimatedStyle,
              ]}
            >
              <MonthlyDumpBanner
                month={month}
                animationProgress={recapBannerProgress}
              />
            </Animated.View>
          </View>

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
            meteringLevel={meteringLevel}
            toggleCameraFacing={toggleCameraFacing}
          />

          <View
            style={[
              styles.content,
              {
                maxWidth: responsive.maxContentWidth,
              },
            ]}
          >
            <CaptureModeSelector
              selectedMode={captureUIMode}
              onChange={setCaptureUIMode}
            />

            <CaptureActions
              captureUIMode={captureUIMode}
              handleUpload={handleUpload}
              isCapturing={isCapturing}
              isVideoRecording={isVideoRecording}
              isCameraReady={isCameraReady}
              handleCameraCapture={handleCameraCapture}
              toggleRecording={toggleRecording}
              startVideo={startVideo}
              stopVideo={stopVideo}
              pendingVideoStartRef={pendingVideoStartRef}
              minTouchTarget={responsive.minTouchTarget}
            />
          </View>
        </View>
      </SafeAreaView>

      <PhoneNumberBottomSheet
        isVisible={showPhoneSheet}
        onClose={() => setShowPhoneSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pageStyle: {},
  headerSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  recapChip: {
    position: 'absolute',
    right: 20,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: scale(150),
    paddingVertical: 6,
    paddingRight: 12,
    paddingLeft: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  recapChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
  },
  recapChipText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    flexShrink: 1,
  },
  bannerOverlay: {
    position: 'absolute',
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
    paddingTop: verticalScale(8),
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
    backgroundColor: Colors.primary,
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
