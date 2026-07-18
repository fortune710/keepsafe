import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Circle, Mic } from 'lucide-react-native';
import { GalleryIcon } from '@/components/icons/gallery-icon';
import { scale } from 'react-native-size-matters';
import { CaptureUIMode } from '@/components/capture/capture-mode-selector';

interface CaptureActionsProps {
  captureUIMode: CaptureUIMode;
  handleUpload: () => void;
  isCapturing: boolean;
  isVideoRecording: boolean;
  isCameraReady: boolean;
  handleCameraCapture: () => void;
  toggleRecording: () => void;
  startVideo: () => void;
  stopVideo: () => void;
  pendingVideoStartRef: React.RefObject<boolean>;
  minTouchTarget: number;
}

export const CaptureActions = ({
  captureUIMode,
  handleUpload,
  isCapturing,
  isVideoRecording,
  isCameraReady,
  handleCameraCapture,
  toggleRecording,
  startVideo,
  stopVideo,
  pendingVideoStartRef,
  minTouchTarget,
}: CaptureActionsProps) => {
  const isCameraFamily = captureUIMode !== 'audio';
  // In explicit Video mode, a tap starts/stops recording directly (handleCameraCapture
  // handles this), so the long-press-to-record shortcut and its release-to-stop
  // behavior (both designed for Photo mode's quick-video gesture) must be disabled -
  // otherwise releasing the tap that just started recording would immediately stop it.
  const useHoldToRecordGesture = isCameraFamily && captureUIMode !== 'video';

  return (
    <>
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            {
              minWidth: minTouchTarget,
              minHeight: minTouchTarget,
            },
          ]}
          onPress={handleUpload}
          disabled={!isCameraFamily}
        >
          <GalleryIcon
            color={isCameraFamily ? '#94A3B8' : '#E5E7EB'}
            size={26}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.captureButton,
            (isCapturing || isVideoRecording) && styles.recordingButton,
            !isCameraReady && isCameraFamily && styles.disabledButton,
          ]}
          onPress={isCameraFamily ? handleCameraCapture : toggleRecording}
          onLongPress={useHoldToRecordGesture ? startVideo : undefined}
          onPressOut={
            useHoldToRecordGesture &&
            (isVideoRecording || pendingVideoStartRef.current)
              ? stopVideo
              : undefined
          }
          delayLongPress={200}
          disabled={isCameraFamily && !isCameraReady}
        >
          <View style={styles.captureButtonInner}>
            {isCameraFamily ? (
              isVideoRecording ? (
                <View style={styles.stopIcon} />
              ) : (
                <Circle
                  color={captureUIMode === 'video' ? '#EF4444' : 'white'}
                  stroke="black"
                  strokeWidth={0.3}
                  size={scale(80)}
                  fill={captureUIMode === 'video' ? '#EF4444' : 'white'}
                />
              )
            ) : isCapturing ? (
              <View style={styles.stopIcon} />
            ) : (
              <Mic color="white" size={scale(32)} />
            )}
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.uploadButton,
            {
              minWidth: minTouchTarget,
              minHeight: minTouchTarget,
              opacity: 0,
            },
          ]}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  uploadButton: {
    width: 60,
    height: 60,
    backgroundColor: '#F8FAFC',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  captureButton: {
    width: scale(92),
    height: scale(92),
    borderRadius: 999,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 92,
    minHeight: 92,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    shadowColor: '#95a5a6',
  },
  captureButtonInner: {
    width: scale(76),
    height: scale(76),
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
});
