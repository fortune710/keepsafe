import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Circle, Mic } from 'lucide-react-native';
import { GalleryIcon } from '@/components/icons/gallery-icon';
import { scale } from 'react-native-size-matters';
import { CaptureUIMode } from '@/components/capture/capture-mode-selector';
import { Colors } from '@/lib/constants';

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
        {isCameraFamily ? (
          <TouchableOpacity
            style={[
              styles.uploadButton,
              {
                minWidth: minTouchTarget,
                minHeight: minTouchTarget,
              },
            ]}
            onPress={handleUpload}
          >
            <GalleryIcon color="#94A3B8" size={26} />
          </TouchableOpacity>
        ) : (
          <View
            style={{
              minWidth: minTouchTarget,
              minHeight: minTouchTarget,
            }}
          />
        )}

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
                  color="#E2E8F0"
                  stroke="#E2E8F0"
                  strokeWidth={0.5}
                  size={scale(80)}
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
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: scale(87),
    height: scale(87),
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: scale(4),
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 87,
    minHeight: 87,
  },
  recordingButton: {
    borderColor: '#EF4444',
  },
  disabledButton: {
    borderColor: '#95a5a6',
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
