import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { Camera, CameraView, useMicrophonePermissions } from 'expo-camera';
import { router } from 'expo-router';
import { logger } from '@/lib/logger';
import { MediaService } from '@/services/media-service';
import { Alert } from 'react-native';
import { useCaptureContext } from '@/providers/capture-provider';

interface VideoCaptureParams {
    cameraRef: RefObject<CameraView | null>;
    isCameraReady: boolean;
    cameraMode: 'picture' | 'video';
    captureMode: 'camera' | 'microphone';
    isTimeCapsule: boolean;
    updateCameraMode: (mode: 'picture' | 'video') => void;
    updateCameraReady: (ready: boolean) => void;
}

/**
 * A custom hook to manage the complex video recording lifecycle using `expo-camera`.
 * 
 * This hook handles microphone permissions, camera mode transitions (switching between 
 * photo and video), recording state management, and navigation to the capture details 
 * screen once recording is finalized.
 * 
 * @param params - The input parameters for the video capture logic.
 * @param params.cameraRef - A reference to the underlying `CameraView` component.
 * @param params.isCameraReady - Indicates if the camera component is currently finished loading.
 * @param params.cameraMode - The current operational mode ('picture' or 'video').
 * @param params.captureMode - The selected capture interface ('camera' or 'microphone').
 * @param params.updateCameraMode - Callback to update the parent component's camera mode state.
 * @param params.updateCameraReady - Callback to manually toggle the camera's readiness state.
 * @returns An extensive object containing functions (`startVideo`, `stopVideo`, `onCameraReady`) 
 * and state variables (`isVideoRecording`, `videoDuration`, etc.) to control the video UI.
 * 
 * @sideeffects
 * - Requests microphone permissions if not already granted.
 * - Automatically updates `cameraMode` to 'video' before initiating a recording.
 * - Sets a `setInterval` for the recording timer and clears it on completion or unmount.
 * - Triggers a navigation push to `/capture/details` after a successful capture.
 * - Forces a camera remount (via `cameraInstance`) if a fatal recording error occurs.
 */
export function useVideoCapture({
    cameraRef,
    isCameraReady,
    cameraMode,
    captureMode,
    isTimeCapsule,
    updateCameraMode,
    updateCameraReady
}: VideoCaptureParams) {
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const { isVideoRecording, setIsVideoRecording } = useCaptureContext();
    const [videoDuration, setVideoDuration] = useState(0);
    const videoTimerRef = useRef<number | null>(null);
    const videoStateRef = useRef<'idle' | 'starting' | 'failed'>('idle');
    const pendingVideoStartRef = useRef(false);
    const pendingVideoStopRef = useRef(false);
    const isCameraReadyRef = useRef(isCameraReady);
    const [cameraInstance, setCameraInstance] = useState(0);

    // Sync ref with prop
    useEffect(() => {
        isCameraReadyRef.current = isCameraReady;
    }, [isCameraReady]);

    // Cleanup video timer on unmount
    useEffect(() => {
        return () => {
            if (videoTimerRef.current) {
                clearInterval(videoTimerRef.current);
            }
        };
    }, []);

    // FIXED: Proper video recording
    const startVideo = async () => {
        if (!cameraRef.current || (isVideoRecording && !pendingVideoStartRef.current)) return;

        try {
            // On iOS, video recording typically needs microphone permission (unless muted).
            if (micPermission?.status !== 'granted') {
                const res = await requestMicPermission();
                if (res?.status !== 'granted') {
                    Alert.alert('Microphone Permission Required', 'Please enable microphone permission to record videos with audio.');
                    return;
                }
            }

            // Use the ref to check readiness, bypassing stale closure issues
            if (!isCameraReadyRef.current && !pendingVideoStartRef.current) {
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
                updateCameraReady(false);
                updateCameraMode('video');
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

            // Proactively wait for native outputs to settle. 
            // 500ms is a safe value for most hardware to fully stabilize the video pipeline.
            const startAttemptTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, 500));

            let videoResult;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                if (!cameraRef.current) {
                    throw new Error('Camera ref lost during recording initialization');
                }

                try {
                    const callTime = Date.now();
                    logger.debug(`recordAsync attempt ${retryCount + 1} (T+${callTime - startAttemptTime}ms)`);

                    videoResult = await cameraRef.current.recordAsync({
                        maxDuration: 60,
                    });
                    break; // Success
                } catch (error: any) {
                    const isRetryable = error?.code === 'ERR_CAMERA_OUTPUT_NOT_READY' ||
                        error?.code === 'ERR_CAMERA_RECORDING_FAILED';

                    if (isRetryable && retryCount < maxRetries - 1) {
                        retryCount++;
                        logger.debug(`recordAsync failed with ${error.code}: "${error.message}". Retrying (${retryCount}/${maxRetries}) in 400ms...`);
                        await new Promise(resolve => setTimeout(resolve, 400));
                    } else {
                        logger.debug(`recordAsync failed permanently with ${error?.code}: ${error?.message}`);
                        throw error;
                    }
                }
            }

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
                            duration: videoDuration.toString(),
                            timeCapsule: isTimeCapsule ? 'true' : undefined,
                        }
                    });
                }
            }
        } catch (error: any) {
            logger.debug('startVideo error caught by outer catch:', { name: error?.name, message: error?.message, code: error?.code });
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

    // Camera ready handler
    const onCameraReady = () => {
        logger.debug('Camera is ready');
        logger.debug('onCameraReady', { cameraMode, captureMode, pendingVideoStart: pendingVideoStartRef.current, pendingVideoStop: pendingVideoStopRef.current });
        isCameraReadyRef.current = true;
        updateCameraReady(true);

        // If we switched to video mode and were waiting to start recording, do it now.
        if (captureMode === 'camera' && cameraMode === 'video' && pendingVideoStartRef.current) {
            if (pendingVideoStopRef.current) {
                pendingVideoStopRef.current = false;
                pendingVideoStartRef.current = false;
                videoStateRef.current = 'idle';
                setIsVideoRecording(false);
                logger.debug('pending stop was set; skipping video start');
                return;
            }
            logger.debug('starting pending video now that camera is ready in video mode');
            // Fire and forget; `startVideo` will proceed because pendingVideoStartRef is still true and cameraMode is video.
            startVideo();
        }
    };

    return {
        startVideo,
        stopVideo,
        isVideoRecording,
        videoDuration,
        videoTimerRef,
        videoStateRef,
        pendingVideoStartRef,
        pendingVideoStopRef,
        cameraInstance,
        cameraMode,
        setIsVideoRecording,
        setVideoDuration,
        setCameraInstance,
        onCameraReady
    }
}
