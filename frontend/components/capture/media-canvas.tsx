import React, { RefObject, useState } from "react";
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import ViewShot from "react-native-view-shot";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { MediaType } from "@/types/media";
import { MediaCanvasItem, MusicTag } from "@/types/capture";
import { scale, verticalScale } from "react-native-size-matters";
import { TextCanvasItem } from "./canvas/text-canvas-item";
import { MusicCanvasItem } from "./canvas/music-canvas-item";
import { StickerCanvasItem } from "./canvas/sticker-canvas-item";
import { LocationCanvasItem } from "./canvas/location-canvas-item";
import { X } from "lucide-react-native";
import { Colors } from "@/lib/constants";
import AudioPreviewPopover from "./music/audio-preview-popover";
import { Portal } from 'react-native-portalize';

interface MediaCanvasProps {
  type: MediaType,
  uri: string,
  items: Array<MediaCanvasItem>,
  removeElement: (itemId: number) => void,
  ref: RefObject<ViewShot | null>,
  transformsRef: RefObject<Record<string, any>>,
  facing?: 'front' | 'back'
}

export default function MediaCanvas({ type, removeElement, uri, ref, items, transformsRef, facing }: MediaCanvasProps) {
  const [showMusicPopover, setShowMusicPopover] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicTag | null>(null);

  if (!uri) return null;

  const removeItemFromCanvas = (deletedItem: MediaCanvasItem) => {
    return removeElement(deletedItem.id);
  }

  const isMirrored = facing === 'front';

  return (
    <View style={{ flex: 1 }}>
      <ViewShot style={{ flex: 1 }} ref={ref}>
        <View style={styles.mediaPreview}>
          <Image
            source={{ uri }}
            style={[styles.mediaPreview, isMirrored && { transform: [{ scaleX: -1 }] }]}
            contentFit="cover"
          />
          <View style={StyleSheet.absoluteFill}>
            {items.map((item) => (
              <DraggableItem
                key={item.id}
                item={item}
                onTransformChange={(t) => {
                  transformsRef.current[item.id] = t;
                }}
                onDeleteItem={removeItemFromCanvas}
                onMusicPress={(music) => {
                  setSelectedMusic(music);
                  setShowMusicPopover(true);
                }}
              />
            ))}
          </View>
        </View>
      </ViewShot>

      {showMusicPopover && selectedMusic && (
        <Portal>
          <AudioPreviewPopover
            music={selectedMusic}
            onClose={() => {
              setShowMusicPopover(false);
              setSelectedMusic(null);
            }}
            isVisible={showMusicPopover}
          />
        </Portal>
      )}
    </View>
  );
}

interface DraggableItemProps {
  item: MediaCanvasItem,
  onDeleteItem: (item: MediaCanvasItem) => void,
  onTransformChange: (t: { x: number; y: number; scale: number; rotation: number }) => void;
  onMusicPress: (music: MusicTag) => void;
}

function DraggableItem({ item, onTransformChange, onDeleteItem, onMusicPress }: DraggableItemProps) {
  const [showCancel, setShowCancel] = useState<boolean>(false);

  const x = useSharedValue(100);
  const y = useSharedValue(100);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const deleteItem = () => {
    setShowCancel(false);
    onDeleteItem(item);
  }

  const drag = Gesture.Pan().onChange((e) => {
    x.value += e.changeX;
    y.value += e.changeY;
    runOnJS(onTransformChange)({
      x: x.value, y: y.value, scale: scale.value, rotation: rotation.value
    });
  });

  const pinch = Gesture.Pinch().onChange((e) => {
    scale.value *= e.scaleChange;
    runOnJS(onTransformChange)({
      x: x.value, y: y.value, scale: scale.value, rotation: rotation.value
    });
  });

  const rotate = Gesture.Rotation().onChange((e) => {
    rotation.value += e.rotationChange;
    runOnJS(onTransformChange)({
      x: x.value, y: y.value, scale: scale.value, rotation: rotation.value
    });
  });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotateZ: `${rotation.value}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(drag, pinch, rotate)}>
      <Animated.View
        style={[{ position: "absolute" }, style]}
      >
        <Pressable
          onLongPress={() => !showCancel && setShowCancel(true)}
          onPress={() => showCancel && setShowCancel(false)}
          delayLongPress={200}
          style={styles.itemPressable}
          pointerEvents="box-none"
        >
          {item.type === "text" && item.text && (
            <TextCanvasItem
              text={item.text}
              textStyle={item.style}
            />
          )}

          {item.type === "music" && item.music_tag && (
            <MusicCanvasItem
              music={item.music_tag}
              onPress={() => item.music_tag && onMusicPress(item.music_tag)}
            />
          )}

          {
            item.type === "sticker" && item.sticker && (
              <StickerCanvasItem uri={item.sticker} />
            )
          }

          {
            item.type === "location" && item.location && (
              <LocationCanvasItem location={item.location} />
            )
          }

          {
            showCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={deleteItem}
              >
                <X />
              </TouchableOpacity>
            )
          }
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}


const styles = StyleSheet.create({
  mediaPreview: {
    width: '100%',
    height: verticalScale(250),
    flex: 1
  },
  textContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "black",
    borderRadius: 45
  },
  textStyle: {
    fontSize: 12,
    color: "white",
    fontWeight: "500"
  },
  musicContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "black",
    borderRadius: 45,
    display: "flex",
    flexDirection: "row",
    alignItems: "center"
  },
  musicImage: {
    width: 30,
    height: 30,
    borderRadius: 8
  },
  itemPressable: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(12)
  },
  cancelButton: {
    width: scale(28),
    height: scale(28),
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white
  }
})