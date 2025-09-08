import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Alert, Modal, ScrollView, Image, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSpring, 
  SlideInDown, 
  SlideOutDown,
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { UserPlus, Camera, Mic, Circle, RotateCw, Upload, Archive } from "lucide-react-native"
import { useMediaCapture } from '@/hooks/use-media-capture';
import { MediaService } from '@/services/media-service';
import { useAuthContext } from '@/providers/auth-provider';
import { scale, verticalScale } from 'react-native-size-matters';
import { getDefaultAvatarUrl } from '@/lib/utils';

const { width, height } = Dimensions.get('window');

export default function CaptureScreen() {
  const [selectedMode, setSelectedMode] = useState<'camera' | 'microphone'>('camera');
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const { profile } = useAuthContext();

  const { 
    isCapturing, 
    capturedMedia, 
    recordingDuration, 
    startAudioRecording, 
    stopAudioRecording, 
    uploadMedia, 
    clearCapture 
  } = useMediaCapture();
  
  const waveAnimation = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Pan gesture for dragging up to vault
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow upward swipes to go to vault
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const shouldOpenVault = event.translationY < -height * 0.15 && event.velocityY < -300;
      
      if (shouldOpenVault) {
        translateY.value = 0;
        runOnJS(() => router.push('/vault'))();
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

  useEffect(() => {
    if (selectedMode === 'microphone') {
      waveAnimation.value = withRepeat(
        withTiming(1, { duration: isCapturing ? 300 : 1000 }),
        -1,
        true
      );
    } else {
      waveAnimation.value = withTiming(0);
    }
  }, [isCapturing, selectedMode]);

  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return now.toLocaleDateString('en-US', options);
  };

  const takePicture = async () => {
    try {
      const capture = await MediaService.capturePhoto(cameraRef);
      console.log('Capture', capture);
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
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture');
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
      await startAudioRecording();
    }
  };

  const handleUpload = async () => {
    const mediaType = selectedMode === 'camera' ? 'photo' : 'audio';
    const capture = await uploadMedia(mediaType);

    console.log('Capture', capture);
    
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

  const animatedWaveStyle = useAnimatedStyle(() => {
    return {
      opacity: isCapturing ? waveAnimation.value * 0.8 + 0.2 : 0.3 + waveAnimation.value * 0.2,
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
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={[{ flex: 1 }, animatedStyle, styles.pageStyle]}
          entering={SlideInDown}
          exiting={SlideOutDown}
        >
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
              
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{getCurrentDate()}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.friendsButton}
                onPress={() => router.push('/friends')}
              >
                <UserPlus color="#64748B" size={18} />
              </TouchableOpacity>
            </View>
      
            {/* Top Mode Selector */}
            <View style={styles.modeSelector}>
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
      
            <View style={styles.content}>
              {/* Persistent Camera or Audio Visualizer */}
              <View style={[styles.mediaContainer, selectedMode === 'microphone' && styles.borderContainer]}>
                {selectedMode === 'camera' ? (
                  <CameraView style={styles.persistentCamera} facing={facing} ref={cameraRef} />
                ) : (
                  <View style={styles.audioVisualizer}>
                    <Animated.View style={[styles.waveform, animatedWaveStyle]}>
                      {[...Array(20)].map((_, i) => (
                        <View 
                          key={i} 
                          style={[
                            styles.waveBar,
                            { 
                              height: isCapturing ? Math.random() * 60 + 20 : Math.random() * 30 + 10,
                              backgroundColor: isCapturing ? '#8B5CF6' : '#CBD5E1',
                            }
                          ]} 
                        />
                      ))}
                    </Animated.View>
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
              </View>
      
              {/* Bottom Action Buttons */}
              <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={styles.uploadButton} 
                  onPress={handleUpload}
                  disabled={selectedMode !== 'camera'}
                >
                  <Upload 
                    color={selectedMode === 'camera' ? "#94A3B8" : "#E5E7EB"}  
                    size={20} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.captureButton, isCapturing && styles.recordingButton]} 
                  onPress={selectedMode === 'camera' ? takePicture : toggleRecording}
                >
                  <View style={styles.captureButtonInner}>
                    {selectedMode === 'camera' ? (
                      <Circle 
                        color="white" 
                        stroke="black" 
                        strokeWidth={0.3} 
                        size={scale(75)} 
                        fill="white" 
                      />
                    ) : isCapturing ? (
                      <View style={styles.stopIcon} />
                    ) : (
                      <Mic color="white" size={scale(32)} />
                    )}
                  </View>
                </TouchableOpacity>
      
                <TouchableOpacity 
                  style={styles.flipButton} 
                  onPress={selectedMode === 'camera' ? toggleCameraFacing : undefined}
                  disabled={selectedMode !== 'camera'}
                >
                  <RotateCw 
                    color={selectedMode === 'camera' ? "#94A3B8" : "#E5E7EB"} 
                    size={20} 
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.uploadHint}>
                {selectedMode === 'camera' ? 'Upload Photo/Video' : 'Upload Audio'}
              </Text>
      
              <View style={styles.vaultButtonContainer}>
                <TouchableOpacity style={styles.vaultButton} onPress={() => router.push('/vault')}>
                  <Archive color="#8B5CF6" size={20} />
                  <Text style={styles.vaultButtonText}>Vault</Text>
                </TouchableOpacity>
                
                <View style={styles.swipeHint}>
                  <Text style={styles.swipeHintText}>Swipe up to view vault</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  pageStyle: {
    paddingTop: (StatusBar.currentHeight ?? 0) + 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: verticalScale(32)
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    padding: 2,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  dateContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  friendsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
    fontWeight: '500',
  },
  activeModeText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mediaContainer: {
    height: verticalScale(250),
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: verticalScale(16),
    backgroundColor: '#000',
  },
  borderContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  persistentCamera: {
    flex: 1,
  },
  audioVisualizer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    marginBottom: 16,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 1,
    borderRadius: 2,
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
    fontWeight: '500',
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
  },
  recordingButton: {
    backgroundColor: '#EF4444',
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
    fontWeight: '600',
    marginLeft: 8,
    marginTop: 7
  },
  swipeHint: {
    marginTop: verticalScale(20),
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
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
    fontWeight: '600',
  },
});