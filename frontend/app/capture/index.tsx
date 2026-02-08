import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate,
  Extrapolate,
  SlideInUp
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { UserPlus, Camera, Mic, Circle, RotateCw, Upload, Archive } from "lucide-react-native"
import { useMediaCapture } from '@/hooks/use-media-capture';
import { MediaService } from '@/services/media-service';
import { useAuthContext } from '@/providers/auth-provider';
import { scale, verticalScale } from 'react-native-size-matters';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { useTimezone } from '@/hooks/use-timezone';
import { DateContainer } from '@/components/date-container';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/lib/constants';
import AudioWaveVisualier from '@/components/audio/audio-wave-visualier';
import { useResponsive } from '@/hooks/use-responsive';
import { logger } from '@/lib/logger';
import PhoneNumberBottomSheet from '@/components/phone-number-bottom-sheet';
import { supabase } from '@/lib/supabase';
import { getPhonePromptState } from '@/services/phone-number-prompt-service';

const { height } = Dimensions.get('window');

export default function CaptureScreen() {
  const responsive = useResponsive();
  const { convertToLocalTimezone } = useTimezone();
  const [selectedMode, setSelectedMode] = useState<'camera' | 'microphone'>('camera');
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const videoTimerRef = useRef<number | null>(null);
  const videoStateRef = useRef<'idle' | 'starting' | 'failed'>('idle');
  const pendingVideoStartRef = useRef(false);
  const pendingVideoStopRef = useRef(false);
  const [cameraInstance, setCameraInstance] = useState(0);
  
  // Add camera ready state
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');

  const { profile, user } = useAuthContext();
  const [showPhoneSheet, setShowPhoneSheet] = useState(false);

  const { 
    isCapturing, 
    capturedMedia, 
    recordingDuration, 
    startAudioRecording, 
    startVideoRecording,
    stopVideoRecording,
    stopAudioRecording, 
    uploadMedia, 
    clearCapture 
  } = useMediaCapture();
  
  
  const translateY = useSharedValue(0);

  // Pan gesture for dragging up to vault
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const shouldOpenVault = event.translationY < -height * 0.15 && event.velocityY < -300;
      
      if (shouldOpenVault && !isNavigating) {
        setIsNavigating(true);
        translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
        setTimeout(() => {
          try {
            router.push('/vault');
          } finally {
            setIsNavigating(false);
          }
        }, 50);
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-height * 0.3, 0],
      [0.7, 1],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      translateY.value,
      [-height * 0.3, 0],
      [0.9, 1],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateY: translateY.value },
        { scale }
      ],
      opacity,
    };
  });


  // Cleanup video timer on unmount
  useEffect(() => {
    return () => {
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
      }
    };
  }, []);

  // Show the phone-number prompt bottom sheet when entering `/capture` if needed.
  useEffect(() => {
    let cancelled = false;

    const checkShouldShowPhonePrompt = async () => {
      if (!user?.id) return;
      if (profile?.phone_number) {
        if (!cancelled) setShowPhoneSheet(false);
        return;
      }

      // If the user already has a pending OTP record, always show the sheet.
      const { data: pendingRecord } = await supabase
        .from('phone_number_updates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pendingRecord?.id) {
        if (!cancelled) setShowPhoneSheet(true);
        return;
      }

      const state = await getPhonePromptState(user.id);
      const now = Date.now();
      const shouldShow =
        !state.dontAskAgain && (!state.nextPromptAtMs || now >= state.nextPromptAtMs);

      if (!cancelled) setShowPhoneSheet(shouldShow);
    };

    checkShouldShowPhonePrompt().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile?.phone_number, user?.id]);

  // Cleanup audio recording when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      // Clean up any active recording when component unmounts
      // Note: We call clearCapture which checks internally if there's a recording
      clearCapture();
    };
  }, []); // Empty dependency array - only run cleanup on unmount



  // FIXED: Proper photo capture
  const takePicture = async () => {
    try {
      logger.debug('Taking picture...');
      
      if (!cameraRef.current) {
        throw new Error('Camera ref not available');
      }

      if (!isCameraReady) {
        Alert.alert('Camera Not Ready', 'Please wait for camera to initialize');
        return;
      }

      // Ensure we're in picture mode for photos
      if (cameraMode !== 'picture') {
        setCameraMode('picture');
        // Wait a moment for mode to change
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.debug('Camera ready, taking picture...');

      // Process the photo using your MediaService
      const capture = await MediaService.capturePhoto(cameraRef);
        
      if (capture) {
        router.push({
          pathname: '/capture/details',
          params: { 
            captureId: capture.id,
            type: capture.type,
            uri: encodeURIComponent(capture.uri)
          }
        });
      }


    } catch (error: any) {
      logger.error('Photo capture failed:', error);
      Alert.alert('Error', `Failed to take picture: ${error.message}`);
    }
  };

  // FIXED: Proper video recording
  const startVideo = async () => {
    if (!cameraRef.current || isCapturing || (isVideoRecording && !pendingVideoStartRef.current)) return;
    
    try {
      // On iOS, video recording typically needs microphone permission (unless muted).
      if (micPermission?.status !== 'granted') {
        const res = await requestMicPermission();
        if (res?.status !== 'granted') {
          Alert.alert('Microphone Permission Required', 'Please enable microphone permission to record videos with audio.');
          return;
        }
      }
      
      if (!isCameraReady) {
        Alert.alert('Camera Not Ready', 'Please wait for camera to initialize');
        return;
      }

      // Switch to video mode
      if (cameraMode !== 'video') {
        // We intentionally wait for `onCameraReady` to fire in video mode before calling `recordAsync`.
        pendingVideoStartRef.current = true;
        pendingVideoStopRef.current = false;
        // Keep UI in a "recording" state so onPressOut can cancel before recording starts.
        setIsVideoRecording(true);
        videoStateRef.current = 'starting';
        setIsCameraReady(false);
        setCameraMode('video');
        return;
      }

      pendingVideoStartRef.current = false;
      pendingVideoStopRef.current = false;
      videoStateRef.current = 'starting';
      setIsVideoRecording(true);
      
      // Start the timer
      const startTime = Date.now();
      videoTimerRef.current = setInterval(() => {
        setVideoDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      logger.debug('Starting recording...');
      const videoResult = await cameraRef.current.recordAsync({
        maxDuration: 60,
        //quality: '720p',
        // NOTE: if mic permission is flaky on some devices, try setting mute: true as a fallback.
      });
      logger.debug('Video recorded:', videoResult);

      if (videoResult && videoResult.uri) {
        const capture = await MediaService.createVideoCapture(videoResult.uri);
        if (capture) {
          router.push({
            pathname: '/capture/details',
            params: { 
              captureId: capture.id,
              type: capture.type,
              uri: encodeURIComponent(capture.uri),
              duration: videoDuration.toString()
            }
          });
        }
      }
    } catch (error: any) {
      logger.debug('recordAsync threw', { name: error?.name, message: error?.message, code: error?.code });
      videoStateRef.current = 'failed';
      // Cleanup timer/state so we don't call stopRecording after a failed start.
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
      }
      setIsVideoRecording(false);
      setVideoDuration(0);
      // Force a remount of the camera to recover from blank/unresponsive native state.
      setCameraInstance((v) => v + 1);
      logger.error('Error starting video recording:', error);
      Alert.alert('Error', `Failed to start video recording: ${error.message}`);
    }
  };

  const stopVideo = async () => {
    if (!cameraRef.current) return;
    
    try {
      logger.debug('stopVideo called', { isVideoRecording, hasCameraRef: !!cameraRef.current });
      logger.debug('Stopping video recording...');
      // If we're waiting to start (mode switch -> onCameraReady), just mark pending stop.
      if (pendingVideoStartRef.current) {
        pendingVideoStopRef.current = true;
        pendingVideoStartRef.current = false;
        videoStateRef.current = 'idle';
        setIsVideoRecording(false);
        setVideoDuration(0);
        logger.debug('stopVideo: cancelled pending start before recordAsync');
        return;
      }
      // If recordAsync already failed, do NOT call stopRecording (it can wedge the native session).
      if (videoStateRef.current === 'failed') {
        logger.debug('stopVideo: skipping stopRecording because videoState=failed');
        return;
      }
      if (!isVideoRecording) {
        logger.debug('stopVideo: not recording; nothing to stop');
        return;
      }
      
      // Clear timer
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
      }
      
      setIsVideoRecording(false);
      setVideoDuration(0);
      
      // Stop recording
      logger.debug('calling cameraRef.current.stopRecording()');
      cameraRef.current.stopRecording();
    } catch (error) {
      logger.debug('stopRecording threw', { name: (error as any)?.name, message: (error as any)?.message, code: (error as any)?.code });
      logger.error('Error stopping video recording:', error);
      Alert.alert('Error', 'Failed to stop video recording');
    }
  };

  const handleCameraCapture = async () => {
    if (isVideoRecording) {
      await stopVideo();
    } else {
      await takePicture();
    }
  };

  const toggleRecording = async () => {
    if (isCapturing) {
      const capture = await stopAudioRecording();
      if (capture) {
        router.push({
          pathname: '/capture/details',
          params: {
            captureId: capture.id,
            type: capture.type,
            uri: encodeURIComponent(capture.uri),
            duration: capture.duration?.toString()
          }
        });
      }
    } else {
      // Ensure camera is stopped and video recording is stopped before starting audio
      if (isVideoRecording && cameraRef.current) {
        try {
          cameraRef.current.stopRecording();
          setIsVideoRecording(false);
          setVideoDuration(0);
        } catch (error) {
          logger.error('Error stopping video before audio recording:', error);
        }
      }
      
      // Longer delay to ensure camera fully unmounts and releases audio session
      // React needs time to unmount CameraView, and iOS needs time to release the session
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await startAudioRecording();
    }
  };

  const handleUpload = async () => {
    const mediaType = selectedMode === 'camera' ? 'photo' : 'audio';
    const capture = await uploadMedia(mediaType);

    logger.debug('Capture', capture);
    
    if (capture) {
      router.push({
        pathname: '/capture/details',
        params: {
          captureId: capture.id,
          type: capture.type,
          uri: encodeURIComponent(capture.uri),
          duration: capture.duration?.toString()
        }
      });
    }
  };

  const defaultAvatarUrl = getDefaultAvatarUrl(profile?.full_name || '');

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };


  // Camera ready handler
  const onCameraReady = () => {
    logger.debug('Camera is ready');
    logger.debug('onCameraReady', { cameraMode, selectedMode, pendingVideoStart: pendingVideoStartRef.current, pendingVideoStop: pendingVideoStopRef.current });
    setIsCameraReady(true);

    // If we switched to video mode and were waiting to start recording, do it now.
    if (selectedMode === 'camera' && cameraMode === 'video' && pendingVideoStartRef.current) {
      pendingVideoStartRef.current = false;
      if (pendingVideoStopRef.current) {
        pendingVideoStopRef.current = false;
        videoStateRef.current = 'idle';
        setIsVideoRecording(false);
        logger.debug('pending stop was set; skipping video start');
        return;
      }
      logger.debug('starting pending video now that camera is ready in video mode');
      // Fire and forget; `startVideo` will proceed because pendingVideoStartRef is now false and cameraMode is video.
      startVideo();
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>We need camera permission to continue</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Animated.View 
      style={[{ flex: 1 }, animatedStyle, styles.pageStyle]}
      entering={SlideInUp}
    >
      <SafeAreaView style={styles.container}>
        <GestureDetector gesture={panGesture}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push('/calendar')}
              >
                <Image 
                  source={{ 
                    uri: profile?.avatar_url || defaultAvatarUrl
                  }}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
              
              <DateContainer date={convertToLocalTimezone(new Date())} />
              
              <TouchableOpacity
                style={styles.friendsButton}
                onPress={() => router.push('/friends')}
              >
                <UserPlus color="#64748B" size={18} />
              </TouchableOpacity>
            </View>
      
            {/* Top Mode Selector */}
            <View style={[styles.modeSelector, { minHeight: responsive.minTouchTarget }]}>
              <TouchableOpacity
                style={[styles.modeTab, selectedMode === 'camera' && styles.activeModeTab]}
                onPress={() => setSelectedMode('camera')}
              >
                <Camera color={selectedMode === 'camera' ? '#8B5CF6' : '#94A3B8'} size={12} />
                <Text style={[styles.modeText, selectedMode === 'camera' && styles.activeModeText]}>
                  Camera
                </Text>
              </TouchableOpacity>
      
              <TouchableOpacity
                style={[styles.modeTab, selectedMode === 'microphone' && styles.activeModeTab]}
                onPress={() => setSelectedMode('microphone')}
              >
                <Mic color={selectedMode === 'microphone' ? '#8B5CF6' : '#94A3B8'} size={12} />
                <Text style={[styles.modeText, selectedMode === 'microphone' && styles.activeModeText]}>
                  Microphone
                </Text>
              </TouchableOpacity>
            </View>
      
            <View 
              style={[
                styles.content,
                {
                  paddingHorizontal: responsive.contentPadding,
                  maxWidth: responsive.maxContentWidth,
                },
              ]}
            >
              {/* Persistent Camera or Audio Visualizer */}
              <Animated.View 
                style={[styles.mediaContainer, selectedMode === 'microphone' && styles.borderContainer]}
              >
                {selectedMode === 'camera' ? (
                  <>
                    <CameraView 
                      key={`camera-view-${cameraInstance}`} // Force remount when camera gets wedged
                      mode={cameraMode} // Dynamic mode based on current action
                      style={styles.persistentCamera} 
                      facing={facing} 
                      ref={cameraRef}
                      onCameraReady={onCameraReady} // Add camera ready handler
                    />
                    
                    {/* Camera status indicator */}
                    {!isCameraReady && (
                      <View style={styles.cameraLoadingOverlay}>
                        <Text style={styles.cameraLoadingText}>Initializing camera...</Text>
                      </View>
                    )}
                    
                    {/* Video recording indicator */}
                    {isVideoRecording && (
                      <View style={styles.cameraOverlay}>
                        <View style={styles.videoRecordingIndicator}>
                          <View style={styles.recordingDot} />
                          <Text style={styles.videoTimerText}>
                            {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.audioVisualizer}>
                    <AudioWaveVisualier
                      isRecording={isCapturing}
                    />
                    {isCapturing && (
                      <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>
                          Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </Animated.View>
      
              {/* Bottom Action Buttons */}
              <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={[
                    styles.uploadButton,
                    {
                      minWidth: responsive.minTouchTarget,
                      minHeight: responsive.minTouchTarget,
                    },
                  ]} 
                  onPress={handleUpload}
                  disabled={selectedMode !== 'camera'}
                >
                  <Upload 
                    color={selectedMode === 'camera' ? "#94A3B8" : "#E5E7EB"}  
                    size={20} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.captureButton, 
                    (isCapturing || isVideoRecording) && styles.recordingButton,
                    !isCameraReady && selectedMode === 'camera' && styles.disabledButton
                  ]} 
                  onPress={selectedMode === 'camera' ? handleCameraCapture : toggleRecording}
                  onLongPress={selectedMode === 'camera' ? startVideo : undefined}
                  onPressOut={
                    selectedMode === 'camera' && (isVideoRecording || pendingVideoStartRef.current)
                      ? stopVideo
                      : undefined
                  }
                  delayLongPress={200}
                  disabled={selectedMode === 'camera' && !isCameraReady}
                >
                  <View style={styles.captureButtonInner}>
                    {selectedMode === 'camera' ? (
                      isVideoRecording ? (
                        <View style={styles.stopIcon} />
                      ) : (
                        <Circle 
                          color="white" 
                          stroke="black" 
                          strokeWidth={0.3} 
                          size={scale(75)} 
                          fill="white" 
                        />
                      )
                    ) : isCapturing ? (
                      <View style={styles.stopIcon} />
                    ) : (
                      <Mic color="white" size={scale(32)} />
                    )}
                  </View>
                </TouchableOpacity>
      
                <TouchableOpacity 
                  style={[
                    styles.flipButton,
                    {
                      minWidth: responsive.minTouchTarget,
                      minHeight: responsive.minTouchTarget,
                    },
                  ]} 
                  onPress={selectedMode === 'camera' ? toggleCameraFacing : undefined}
                  disabled={selectedMode !== 'camera' || !isCameraReady}
                >
                  <RotateCw 
                    color={selectedMode === 'camera' && isCameraReady ? "#94A3B8" : "#E5E7EB"} 
                    size={20} 
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.uploadHint}>
                {selectedMode === 'camera' ? 
                  (isCameraReady ? 'Tap for photo • Long press for video' : 'Camera initializing...') : 
                  'Tap to record audio'
                }
              </Text>
      
              <View style={styles.vaultButtonContainer}>
                <TouchableOpacity style={styles.vaultButton} onPress={() => router.push('/vault')}>
                  <Archive color="#8B5CF6" size={20} />
                  <Text style={styles.vaultButtonText}>Vault</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </GestureDetector>
      </SafeAreaView>

      <PhoneNumberBottomSheet
        isVisible={showPhoneSheet}
        onClose={() => setShowPhoneSheet(false)}
      />
    </Animated.View>
  );
}

// Add new styles for the fixes
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  pageStyle: {
    //paddingTop: (StatusBar.currentHeight ?? 0) + 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    //marginTop: verticalScale(24)
  },
  profileButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(20),
    borderWidth: 2,
    borderColor: '#8B5CF6',
    padding: scale(2),
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  
  friendsButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 16,
    maxWidth: scale(200),
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 27,
  },
  activeModeTab: {
    backgroundColor: '#F3F4F6',
  },
  modeText: {
    fontSize: scale(10),
    color: '#94A3B8',
    marginLeft: 4,
    fontFamily: 'Outfit-Medium',
  },
  activeModeText: {
    color: '#8B5CF6',
    fontFamily: 'Outfit-SemiBold',
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
  },
  mediaContainer: {
    height: verticalScale(250),
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: verticalScale(16),
    backgroundColor: '#000',
    position: 'relative',
  },
  borderContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  persistentCamera: {
    flex: 1,
  },
  // NEW: Camera loading overlay
  cameraLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  cameraLoadingText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  videoRecordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  videoTimerText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    marginLeft: 8,
  },
  audioVisualizer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Outfit-Medium',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  uploadButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadHint: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
  },
  flipButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  captureButton: {
    width: scale(85),
    height: scale(85),
    borderRadius: 999,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // Ensure minimum touch target for tablets (iOS guideline: 44pt)
    minWidth: 85,
    minHeight: 85,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  // NEW: Disabled button style
  disabledButton: {
    backgroundColor: '#95a5a6',
    shadowColor: '#95a5a6',
  },
  captureButtonInner: {
    width: scale(70),
    height: scale(70),
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 4,
  },
  vaultButtonContainer: {
    alignItems: 'center',
    marginVertical: scale(30),
  },
  vaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vaultButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    marginLeft: 8,
  },
  swipeHint: {
    marginTop: verticalScale(20),
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Outfit-Medium',
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