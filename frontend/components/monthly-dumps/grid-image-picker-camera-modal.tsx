import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { X } from 'lucide-react-native';

interface GridImagePickerCameraModalProps {
  visible: boolean;
  onClose: () => void;
  cameraRef: React.RefObject<CameraView | null>;
  isCameraReady: boolean;
  isCameraCapturing: boolean;
  onCameraReady: () => void;
  onCapture: () => void;
}

export default function GridImagePickerCameraModal({
  visible,
  onClose,
  cameraRef,
  isCameraReady,
  isCameraCapturing,
  onCameraReady,
  onCapture,
}: GridImagePickerCameraModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.cameraModalOverlay}>
        <View style={styles.cameraBackdrop} />

        <View style={styles.cameraSheet}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraView}
            facing="back"
            mode="picture"
            onCameraReady={onCameraReady}
          />

          {!isCameraReady ? (
            <View style={styles.cameraLoadingOverlay}>
              <ActivityIndicator color="#F8FAFC" />
              <Text style={styles.cameraLoadingText}>Preparing camera...</Text>
            </View>
          ) : null}

          <View style={styles.cameraControls}>
            <TouchableOpacity
              accessibilityLabel="Close camera"
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={onClose}
              style={styles.cameraCloseButton}
            >
              <X size={20} color="#F8FAFC" />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Capture photo"
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={onCapture}
              disabled={!isCameraReady || isCameraCapturing}
              style={[styles.cameraCaptureButton, (!isCameraReady || isCameraCapturing) && styles.cameraCaptureButtonDisabled]}
            >
              <View style={styles.cameraCaptureInner} />
            </TouchableOpacity>

            <View style={styles.cameraSpacer} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cameraModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7,17,31,0.22)',
  },
  cameraBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,17,31,0.34)',
  },
  cameraSheet: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  cameraView: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(7,17,31,0.44)',
  },
  cameraLoadingText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: 'Figtree-Medium',
  },
  cameraControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  cameraCloseButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,31,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cameraCaptureButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  cameraCaptureButtonDisabled: {
    opacity: 0.6,
  },
  cameraCaptureInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
  },
  cameraSpacer: {
    width: 46,
    height: 46,
  },
});
