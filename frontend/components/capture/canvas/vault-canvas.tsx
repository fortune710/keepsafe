import { StyleProp, View, ViewStyle } from "react-native";
import { ImageBackground } from "expo-image";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { MediaType } from "@/types/media";
import {  RenderedMediaCanvasItem, MusicTag } from "@/types/capture";
import { TextCanvasItem } from "@/components/capture/canvas/text-canvas-item";
import { MusicCanvasItem } from "@/components/capture/canvas/music-canvas-item";
import { StickerCanvasItem } from "./sticker-canvas-item";
import { LocationCanvasItem } from "./location-canvas-item";

interface VaultCanvasProps {
  type: MediaType,
  uri: string,
  items: Array<RenderedMediaCanvasItem>,
  style?: StyleProp<ViewStyle>,
  onMusicPress?: (music: MusicTag) => void;
}

export default function VaultCanvas({ type, uri, style, items, onMusicPress }: VaultCanvasProps) {

  if (!uri) return null;

  if (items?.length === 0) {
    return (
      <View style={style}>
        <ImageBackground
          source={{ uri }} 
          style={style}
          contentFit="cover"
          cachePolicy="none"
          imageStyle={{ borderRadius: 18 }}
          //transition={300}
          testID="vault-canvas-image"
        />
      </View>
    )
  }

  return (
    <View style={style}>
      <ImageBackground
        source={{ uri }}
        style={style}
        contentFit="cover"
        imageStyle={{ borderRadius: 18 }}
        //cachePolicy="memory-disk"
        //transition={300}
        testID="vault-canvas-background"
        
      >
          {items?.map((item) => (
            <VaultCanvasItem 
                key={item.id} 
                item={item}
                onMusicPress={onMusicPress}
            />
          ))}
      </ImageBackground>
    </View>
  );
}

interface VaultCanvasItemProps { 
  item: RenderedMediaCanvasItem,
  onMusicPress?: (music: MusicTag) => void;
}

function VaultCanvasItem({ item, onMusicPress }: VaultCanvasItemProps) {
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
            <TextCanvasItem 
              text={item.text} 
              textStyle={item.style} 
            />
        )}

        {item.type === "music" && item.music_tag && (
            <MusicCanvasItem 
              music={item.music_tag}
              onPress={() => item.music_tag && onMusicPress?.(item.music_tag)}
            />
        )}

        {item.type === "sticker" && item.sticker && (
            <StickerCanvasItem uri={item.sticker} />
        )}

        {item.type === "location" && item.location && (
            <LocationCanvasItem location={item.location} />
        )}

    </Animated.View>

  );
}