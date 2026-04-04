import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { CameraView, CameraType } from 'expo-camera';
import { verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import AudioWaveVisualier from '@/components/audio/audio-wave-visualier';

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
    recordingDuration
}: MediaDisplayProps) => {
    return (
        <Animated.View
            style={[styles.mediaContainer, selectedMode === 'microphone' && styles.borderContainer]}
        >
            {selectedMode === 'camera' ? (
                <>
                    <CameraView
                        key={`camera-view-${cameraInstance}-${cameraMode}`}
                        mode={cameraMode}
                        style={styles.persistentCamera}
                        facing={facing}
                        ref={cameraRef}
                        onCameraReady={onCameraReady}
                    />

                    {!isCameraReady && (
                        <View style={styles.cameraLoadingOverlay}>
                            <Text style={styles.cameraLoadingText}>Initializing camera...</Text>
                        </View>
                    )}

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
    );
};

const styles = StyleSheet.create({
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
});
