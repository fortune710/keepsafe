import { logger } from "@/lib/logger";
import { router } from "expo-router";
import { useMediaCapture } from "@/hooks/use-media-capture";

/**
 * A custom hook to handle the media upload workflow based on the selected mode.
 * 
 * @param selectedMode - The media capture mode: 'camera' (photo) or 'microphone' (audio).
 * @returns An object containing the `handleUpload` function to trigger the capture and upload process.
 * 
 * @behavior
 * This hook delegates the physical capture and upload to `useMediaCapture`. Once the media is
 * uploaded successfully, it navigates to the capture details screen with the resulting metadata.
 * 
 * @sideeffects
 * Triggers navigation via `router.push` and logs debug information about the capture.
 * May indirectly trigger media permission requests and hardware access via `useMediaCapture`.
 */
export function useMediaUpload(selectedMode: 'camera' | 'microphone', isTimeCapsule = false) {

    const {
        uploadMedia
    } = useMediaCapture();

    const handleUpload = async () => {
        const mediaType = selectedMode === 'camera' ? 'photo' : 'audio';
        const capture = await uploadMedia(mediaType);

        logger.debug('Capture', capture);

        if (capture) {
            router.push({
                pathname: '/capture/details',
                params: {
                    captureId: capture.id,
                    type: capture.type,
                    uri: encodeURIComponent(capture.uri),
                    duration: capture.duration?.toString(),
                    timeCapsule: isTimeCapsule ? 'true' : undefined,
                }
            });
        }
    };

    return {
        handleUpload
    }
}
