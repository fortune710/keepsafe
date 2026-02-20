import { Image } from "expo-image";

interface StickerCanvasItemProps {
    uri: string;
}

export function StickerCanvasItem({ uri }: StickerCanvasItemProps) {
    return (
        <Image
            source={{ uri }}
            style={{ width: 60, height: 60 }}
            contentFit="contain"
            cachePolicy="memory-disk"
        />
    )
}