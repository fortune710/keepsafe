import { logger } from "@/lib/logger";
import { router } from "expo-router";
import { useMediaCapture } from "@/hooks/use-media-capture";

export function useMediaUpload(selectedMode: 'camera' | 'microphone') {

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
                    duration: capture.duration?.toString()
                }
            });
        }
    };

    return {
        handleUpload
    }
}