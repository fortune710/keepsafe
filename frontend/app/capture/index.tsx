import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import Animated, {
  SlideInUp
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

export default function CaptureScreen() {
  const responsive = useResponsive();
  const { convertToLocalTimezone } = useTimezone();
  const [selectedMode, setSelectedMode] = useState<'camera' | 'microphone'>('camera');

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
          <CaptureHeader
            profile={profile}
            defaultAvatarUrl={defaultAvatarUrl}
            convertToLocalTimezone={convertToLocalTimezone}
          />

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
