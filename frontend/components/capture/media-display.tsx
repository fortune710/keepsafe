import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { CameraView, CameraType } from 'expo-camera';
import { Zap, ZapOff, SwitchCamera } from 'lucide-react-native';
import { verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import AudioWaveVisualier from '@/components/audio/audio-wave-visualier';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type ZoomLevel = '0.5' | '1';

// expo-camera's `zoom` prop only zooms in from the device's default lens (0 = widest
// available, 1 = max zoom) - there's no public API to switch to a true ultra-wide
// physical lens. These presets are approximated on that same scale so the two
// buttons still produce a visibly different result.
const ZOOM_VALUES: Record<ZoomLevel, number> = {
  '0.5': 0,
  '1': 0.1,
};

interface MediaDisplayProps {
  selectedMode: 'camera' | 'microphone';
  cameraInstance: number;
  cameraMode: 'picture' | 'video';
  facing: CameraType;
  cameraRef: React.RefObject<CameraView | null>;
  onCameraReady: () => void;
  isCameraReady: boolean;
  isVideoRecording: boolean;
  videoDuration: number;
  isCapturing: boolean;
  recordingDuration: number;
  meteringLevel: number;
  toggleCameraFacing: () => void;
}

export const MediaDisplay = ({
  selectedMode,
  cameraInstance,
  cameraMode,
  facing,
  cameraRef,
  onCameraReady,
  isCameraReady,
  isVideoRecording,
  videoDuration,
  isCapturing,
  recordingDuration,
  meteringLevel,
  toggleCameraFacing,
}: MediaDisplayProps) => {
  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('1');

  return (
    <Animated.View
      style={[
        styles.mediaContainer,
        selectedMode === 'microphone' && styles.borderContainer,
      ]}
    >
      <View style={styles.mediaContainerInner}>
        {selectedMode === 'camera' ? (
          <>
            <CameraView
              key={`camera-view-${cameraInstance}-${cameraMode}`}
              mode={cameraMode}
              style={styles.persistentCamera}
              facing={facing}
              ref={cameraRef}
              onCameraReady={onCameraReady}
              enableTorch={torchOn}
              zoom={ZOOM_VALUES[zoomLevel]}
            />

            {!isCameraReady && (
              <View style={styles.cameraLoadingOverlay}>
                <Text style={styles.cameraLoadingText}>
                  Initializing camera...
                </Text>
              </View>
            )}

            {isVideoRecording && (
              <View style={styles.cameraOverlay}>
                <View style={styles.videoRecordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.videoTimerText}>
                    {Math.floor(videoDuration / 60)}:
                    {(videoDuration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              </View>
            )}

            {isCameraReady && (
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => setTorchOn((v) => !v)}
                >
                  {torchOn ? (
                    <Zap color="#FBBF24" size={20} fill="#FBBF24" />
                  ) : (
                    <ZapOff color="white" size={20} />
                  )}
                </TouchableOpacity>

                <View style={styles.zoomPill}>
                  {(['0.5', '1'] as ZoomLevel[]).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.zoomOption,
                        zoomLevel === level && styles.zoomOptionActive,
                      ]}
                      onPress={() => setZoomLevel(level)}
                    >
                      <Text
                        style={[
                          styles.zoomText,
                          zoomLevel === level && styles.zoomTextActive,
                        ]}
                      >
                        {level === '1' ? '1x' : level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleCameraFacing}
                >
                  <SwitchCamera color="white" size={20} />
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.audioVisualizer}>
            <AudioWaveVisualier
              isRecording={isCapturing}
              meteringLevel={meteringLevel}
            />
            {isCapturing && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  Recording... {Math.floor(recordingDuration / 60)}:
                  {(recordingDuration % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mediaContainer: {
    height: SCREEN_HEIGHT * 0.63,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: '#000',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  mediaContainerInner: {
    flex: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  borderContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  persistentCamera: {
    flex: 1,
  },
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
  cameraControls: {
    position: 'absolute',
    bottom: verticalScale(20),
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  zoomOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zoomOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  zoomText: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Outfit-SemiBold',
  },
  zoomTextActive: {
    color: '#000',
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
});
