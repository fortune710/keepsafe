import { useCallback, RefObject } from 'react';
import { router } from 'expo-router';
import { useCaptureContext } from '@/providers/capture-provider';
import { useMediaCapture } from '@/hooks/use-media-capture';
import { logger } from '@/lib/logger';
import { CameraView } from 'expo-camera';

interface AudioCaptureParams {
    cameraRef: RefObject<CameraView | null>;
    setVideoDuration: (duration: number) => void;
    isTimeCapsule: boolean;
}

export function useAudioCapture({
    cameraRef,
    setVideoDuration,
    isTimeCapsule,
}: AudioCaptureParams) {
    const { isCapturing, isVideoRecording, setIsVideoRecording } = useCaptureContext();
    const { startAudioRecording, stopAudioRecording } = useMediaCapture();

    const toggleRecording = useCallback(async () => {
        if (isCapturing) {
            const capture = await stopAudioRecording();
            if (capture) {
                router.push({
                    pathname: '/capture/details',
                    params: {
                        captureId: capture.id,
                        type: capture.type,
                        uri: encodeURIComponent(capture.uri),
                        duration: capture.duration?.toString() || '0',
                        timeCapsule: isTimeCapsule ? 'true' : undefined,
                    }
                });
            }
        } else {
            // Ensure camera is stopped and video recording is stopped before starting audio
            if (isVideoRecording && cameraRef.current) {
                try {
                    cameraRef.current.stopRecording();
                    setIsVideoRecording(false);
                    if (setVideoDuration) {
                        setVideoDuration(0);
                    }
                } catch (error) {
                    logger.error('Error stopping video before audio recording:', error);
                }
            }

            // Longer delay to ensure camera fully unmounts and releases audio session
            // React needs time to unmount CameraView, and iOS needs time to release the session
            await new Promise(resolve => setTimeout(resolve, 500));

            await startAudioRecording();
        }
    }, [
        isCapturing,
        isVideoRecording,
        cameraRef,
        startAudioRecording,
        stopAudioRecording,
        setIsVideoRecording,
        setVideoDuration,
        isTimeCapsule,
    ]);

    return { toggleRecording };
}
