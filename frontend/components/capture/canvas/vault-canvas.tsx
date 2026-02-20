import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { ImageBackground } from "expo-image";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { MediaType } from "@/types/media";
import { RenderedMediaCanvasItem, MusicTag } from "@/types/capture";
import { TextCanvasItem } from "@/components/capture/canvas/text-canvas-item";
import { MusicCanvasItem } from "@/components/capture/canvas/music-canvas-item";
import { StickerCanvasItem } from "./sticker-canvas-item";
import { LocationCanvasItem } from "./location-canvas-item";
import { VideoView } from "expo-video";
import EntryVideoView from "@/components/entries/entry-video-view";
import EntryAudioView from "@/components/entries/entry-audio-view";

interface VaultCanvasProps {
  type: MediaType,
  uri: string,
  items: Array<RenderedMediaCanvasItem>,
  style?: StyleProp<ViewStyle>,
  onMusicPress?: (music: MusicTag) => void;
}

export default function VaultCanvas({ type, uri, style, items, onMusicPress }: VaultCanvasProps) {

  if (!uri) return null;

  if (type === 'video') {
    return <EntryVideoView uri={uri} />

  }

  if (type === 'audio') {
    return <EntryAudioView uri={uri} />
  }

  if (items?.length === 0) {
    return (
      <View style={style}>
        <ImageBackground
          source={{ uri }}
          style={style}
          contentFit="cover"
          cachePolicy="memory-disk"
          imageStyle={{ borderRadius: 0 }}
          transition={200}
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
        imageStyle={{ borderRadius: 0 }}
        cachePolicy="memory-disk"
        transition={200}
        testID="vault-canvas-background"
      >
        {items?.filter((item) => item?.transforms).map((item) => (
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
  // Provide default transforms if missing (defensive programming)
  const transforms = item.transforms || {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  };

  const factor = 0.90
  const x = useSharedValue(transforms.x * 0.6);
  const y = useSharedValue(transforms.y * factor * 0.995);
  const scale = useSharedValue(transforms.scale * 0.8);
  const rotation = useSharedValue(transforms.rotation);

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