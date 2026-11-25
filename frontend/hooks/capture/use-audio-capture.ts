import { useCallback, useEffect, useRef, RefObject } from 'react';
import { router } from 'expo-router';
import { useCaptureContext } from '@/providers/capture-provider';
import { useMediaCapture } from '@/hooks/use-media-capture';
import { logger } from '@/lib/logger';
import { CameraView } from 'expo-camera';
import { useAuthContext } from '@/providers/auth-provider';
import { resolveCaptureDiaryId } from '@/lib/last-used-diary';
import { MAX_AUDIO_DURATION_SECONDS } from '@/lib/audio-duration';

interface AudioCaptureParams {
    cameraRef: RefObject<CameraView | null>;
    setVideoDuration: (duration: number) => void;
    isTimeCapsule: boolean;
    diaryId?: string;
}

export function useAudioCapture({
    cameraRef,
    setVideoDuration,
    isTimeCapsule,
    diaryId,
}: AudioCaptureParams) {
    const { isCapturing, isVideoRecording, setIsVideoRecording } = useCaptureContext();
    const { user } = useAuthContext();
    const { startAudioRecording, stopAudioRecording } = useMediaCapture();
    const toggleRef = useRef<() => Promise<void>>(async () => {});

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
                        diary_id: await resolveCaptureDiaryId(diaryId, user?.id),
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
        diaryId,
        user?.id,
    ]);

    toggleRef.current = toggleRecording;
    useEffect(() => {
        if (!isCapturing) return;
        const timer = setTimeout(() => { void toggleRef.current(); }, (MAX_AUDIO_DURATION_SECONDS - 1) * 1000);
        return () => clearTimeout(timer);
    }, [isCapturing]);

    return { toggleRecording };
}
