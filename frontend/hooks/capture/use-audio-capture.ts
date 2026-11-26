import { useCallback, useEffect, useRef, RefObject } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useCaptureContext } from '@/providers/capture-provider';
import { useMediaCapture } from '@/hooks/use-media-capture';
import { logger } from '@/lib/logger';
import { CameraView } from 'expo-camera';
import { useAuthContext } from '@/providers/auth-provider';
import { resolveCaptureDiaryId } from '@/lib/last-used-diary';
import { AppState } from 'react-native';
import type { MediaCapture } from '@/types/media';
import * as FileSystem from 'expo-file-system/legacy';

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
    const pendingCapture = useRef<MediaCapture | null>(null);
    const mounted = useRef(true);
    const focused = useRef(true);
    const openPreviewRef = useRef<(capture: MediaCapture) => Promise<void>>(async () => {});
    const { startAudioRecording, stopAudioRecording, clearCapture } = useMediaCapture((capture) => {
        if (!mounted.current || !focused.current) {
            void FileSystem.deleteAsync(capture.uri, { idempotent: true }).catch(() => {});
            return;
        }
        if (AppState.currentState !== 'active') {
            pendingCapture.current = capture;
            return;
        }
        void openPreviewRef.current(capture);
    });
    const clearCaptureRef = useRef(clearCapture);
    clearCaptureRef.current = clearCapture;

    useFocusEffect(useCallback(() => {
        focused.current = true;
        return () => {
            focused.current = false;
            if (pendingCapture.current) {
                void FileSystem.deleteAsync(pendingCapture.current.uri, { idempotent: true }).catch(() => {});
                pendingCapture.current = null;
            }
            void clearCaptureRef.current?.();
        };
    }, []));

    openPreviewRef.current = async (capture) => {
        const resolvedDiaryId = await resolveCaptureDiaryId(diaryId, user?.id);
            router.push({ pathname: '/capture/details', params: {
                captureId: capture.id, type: capture.type, uri: encodeURIComponent(capture.uri),
                duration: capture.duration?.toString() || '0',
                timeCapsule: isTimeCapsule ? 'true' : undefined, diary_id: resolvedDiaryId,
            } });
    };

    const toggleRecording = useCallback(async () => {
        if (isCapturing) {
            const capture = await stopAudioRecording();
            if (capture) {
                await openPreviewRef.current(capture);
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

    useEffect(() => {
        mounted.current = true;
        const subscription = AppState.addEventListener('change', (state) => {
            if (state !== 'active' || !pendingCapture.current) return;
            const capture = pendingCapture.current;
            pendingCapture.current = null;
            void openPreviewRef.current(capture);
        });
        return () => {
            mounted.current = false;
            subscription.remove();
            if (pendingCapture.current) {
                void FileSystem.deleteAsync(pendingCapture.current.uri, { idempotent: true }).catch(() => {});
                pendingCapture.current = null;
            }
            void clearCaptureRef.current?.();
        };
    }, []);

    return { toggleRecording };
}
