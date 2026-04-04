import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Upload, Circle, Mic, RotateCw } from "lucide-react-native";
import { scale } from 'react-native-size-matters';

interface CaptureActionsProps {
    selectedMode: 'camera' | 'microphone';
    handleUpload: () => void;
    isCapturing: boolean;
    isVideoRecording: boolean;
    isCameraReady: boolean;
    handleCameraCapture: () => void;
    toggleRecording: () => void;
    startVideo: () => void;
    stopVideo: () => void;
    pendingVideoStartRef: React.RefObject<boolean>;
    toggleCameraFacing: () => void;
    minTouchTarget: number;
}

export const CaptureActions = ({
    selectedMode,
    handleUpload,
    isCapturing,
    isVideoRecording,
    isCameraReady,
    handleCameraCapture,
    toggleRecording,
    startVideo,
    stopVideo,
    pendingVideoStartRef,
    toggleCameraFacing,
    minTouchTarget
}: CaptureActionsProps) => {
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
                            minWidth: minTouchTarget,
                            minHeight: minTouchTarget,
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
        minWidth: 85,
        minHeight: 85,
    },
    recordingButton: {
        backgroundColor: '#EF4444',
    },
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
});
