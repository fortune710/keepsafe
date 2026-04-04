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

/**
 * A custom hook that provides functionality to capture photos using the `expo-camera` component.
 * 
 * @param params - The configuration options for the photo capture hook.
 * @param params.cameraRef - A React `RefObject` pointing to the `CameraView` instance.
 * @param params.facing - The current camera lens being used ('front' or 'back').
 * @param params.isCameraReady - Tracks whether the camera component is fully initialized and ready to take pictures.
 * @param params.cameraMode - The current operational mode of the camera: 'picture' or 'video'.
 * @param params.updateCameraMode - A state setter or callback function to switch the camera mode.
 * @returns An object containing the following:
 * - `takePicture`: An asynchronous function to trigger the photo capture process.
 * 
 * @behavior
 * - Validates camera readiness and `cameraRef` availability.
 * - Switches the `cameraMode` to 'picture' automatically if it's currently in 'video' mode.
 * - Uses `MediaService.capturePhoto` to perform the capture.
 * - Navigates to `/capture/details` on successful capture with ID and URI metadata.
 * 
 * @example
 * const { takePicture } = usePhotoCapture({
 *   cameraRef,
 *   facing,
 *   isCameraReady,
 *   cameraMode: 'picture',
 *   updateCameraMode: setMode
 * });
 * 
 * @note This hook should be used within a component that manages a `CameraView`.
 */
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