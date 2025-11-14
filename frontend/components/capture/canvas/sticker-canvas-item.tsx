import { Image } from "react-native";

interface StickerCanvasItemProps {
    uri: string;
}

export function StickerCanvasItem({ uri }: StickerCanvasItemProps) {
    return (
        <Image source={{ uri }} style={{ width: 60, height: 60 }} />
    )
}