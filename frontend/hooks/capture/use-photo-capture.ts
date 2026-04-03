import { logger } from "@/lib/logger";
import { MediaService } from "@/services/media-service";
import { CameraType, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { RefObject, useRef, useEffect } from "react";
import { Alert } from "react-native";

interface VideoCaptureParams {
    cameraRef: RefObject<CameraView | null>;
    facing: CameraType;
    isCameraReady: boolean;
    cameraMode: 'picture' | 'video';
    updateCameraMode: (mode: 'picture' | 'video') => void;
}

export function usePhotoCapture({
    cameraRef,
    facing,
    isCameraReady,
    cameraMode,
    updateCameraMode,
}: VideoCaptureParams) {
    const router = useRouter();
    const isCameraReadyRef = useRef(isCameraReady);

    // Sync ref with prop
    useEffect(() => {
        isCameraReadyRef.current = isCameraReady;
    }, [isCameraReady]);

    // FIXED: Proper photo capture
    const takePicture = async () => {
        try {
            logger.debug('Taking picture...');

            if (!cameraRef.current) {
                throw new Error('Camera ref not available');
            }

            if (!isCameraReadyRef.current) {
                Alert.alert('Camera Not Ready', 'Please wait for camera to initialize');
                return;
            }

            // Ensure we're in picture mode for photos
            if (cameraMode !== 'picture') {
                updateCameraMode('picture');
                // Wait a moment for mode to change
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            logger.debug('Camera ready, taking picture...');

            // Process the photo using your MediaService
            const capture = await MediaService.capturePhoto(cameraRef);

            if (capture) {
                router.push({
                    pathname: '/capture/details',
                    params: {
                        captureId: capture.id,
                        type: capture.type,
                        uri: encodeURIComponent(capture.uri),
                        facing: facing
                    }
                });
            }


        } catch (error: any) {
            logger.error('Photo capture failed:', error);
            Alert.alert('Error', `Failed to take picture: ${error.message}`);
        }
    };

    return {
        takePicture
    };

}