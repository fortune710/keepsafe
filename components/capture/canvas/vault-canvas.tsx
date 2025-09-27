import { StyleProp, ViewStyle } from "react-native";
import { ImageBackground } from "expo-image";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { MediaType } from "@/types/media";
import {  RenderedMediaCanvasItem } from "@/types/capture";
import { TextCanvasItem } from "@/components/capture/canvas/text-canvas-item";
import { MusicCanvasItem } from "@/components/capture/canvas/music-canvas-item";
import { StickerCanvasItem } from "./sticker-canvas-item";

interface VaultCanvasProps {
  type: MediaType,
  uri: string,
  items: Array<RenderedMediaCanvasItem>,
  style?: StyleProp<ViewStyle>
}

export default function VaultCanvas({ type, uri, style, items }: VaultCanvasProps) {

  if (!uri) return null;

  if (items?.length === 0) {
    return (
      <ImageBackground
        source={{ uri }} 
        style={style}
        contentFit="cover"
        testID="vault-canvas-image"
      />
    )
  }

  return (
    <ImageBackground
      source={{ uri }}
      style={style}
      contentFit="cover"
      testID="vault-canvas-background"
      
    >
        {items?.map((item) => (
          <VaultCanvasItem 
              key={item.id} 
              item={item} 
          />
        ))}
    </ImageBackground>
  );
}

interface VaultCanvasItemProps { 
  item: RenderedMediaCanvasItem,
}

function VaultCanvasItem({ item }: VaultCanvasItemProps) {
    const factor = 0.90
    const x = useSharedValue(item.transforms.x * 0.6);
    const y = useSharedValue(item.transforms.y * factor * 0.995);
    const scale = useSharedValue(item.transforms.scale * 0.8);
    const rotation = useSharedValue(item.transforms.rotation);

    const style = useAnimatedStyle(() => ({
        transform: [
        { translateX: x.value },
        { translateY: y.value },
        { scale: scale.value },
        { rotateZ: `${rotation.value}rad` },
        ],
    }));

  return (
    <Animated.View style={[{ position: "absolute" }, style]}>
        {item.type === "text" && item.text && (
            <TextCanvasItem text={item.text} />
        )}

        {item.type === "music" && item.music_tag && (
            <MusicCanvasItem music={item.music_tag} />
        )}

        {item.type === "sticker" && item.sticker && (
            <StickerCanvasItem uri={item.sticker} />
        )}

    </Animated.View>

  );
}