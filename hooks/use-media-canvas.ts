import { MediaCanvasItem, MusicTag } from "@/types/capture";
import { useRef, useState } from "react";
import { Platform, View } from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";

export function useMediaCanvas() {
    const [items, setItems] = useState<Array<MediaCanvasItem>>([]);

    const addText = (text: string) => {
        setItems([...items, { id: Date.now(), type: "text", text: text }]);
    };
    
    const addSticker = (sticker: any) => {
        setItems([...items, { id: Date.now(), type: "sticker", sticker }]);
    }

    const addMusic = (music: MusicTag) => {
        setItems([...items, { id: Date.now(), type: "music", music_tag: music }]);
    }

    const removeElement = (id: number) => {
        const remainingElements = items.filter(item => item.id != id);
        setItems(remainingElements);
    }

    const viewShotRef = useRef<ViewShot | null>(null);
  

    const saveImage = async () => {
        console.log("🚀 Starting ViewShot capture...");
        //setIsCapturing(true);

        // Check if we're on web platform
        if (Platform.OS === 'web') {
            console.warn("ViewShot is not supported on web platform");
            return null;
        }

        // Validate ref
        if (!viewShotRef.current) {
            console.error("❌ ViewShot ref is null");
            return null;
        }

        console.log("✅ ViewShot ref exists, capturing...");

        try{

            // Use ViewShot's capture method with timeout
            const capturePromise = viewShotRef.current.capture!();
            
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Capture timeout after 15 seconds')), 15000);
            });

            const uri = await Promise.race([capturePromise, timeoutPromise]);

            console.log("✅ Capture successful:", uri);
            //setCapturedUri(uri);
            
            return "file://" + uri;

        } catch (error) {
            console.error("❌ ViewShot capture error:", error);
            return null;
        }
    };


    return {
        viewShotRef,
        items,
        addText,
        addSticker,
        saveImage,
        removeElement,
        addMusic
    }
}