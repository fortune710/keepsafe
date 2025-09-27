import React, { RefObject, useRef, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { Image, ImageBackground } from "expo-image";
import ViewShot from "react-native-view-shot";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { MediaType } from "@/types/media";
import { MediaCanvasItem } from "@/types/capture";
import { verticalScale } from "react-native-size-matters";
import { TextCanvasItem } from "./canvas/text-canvas-item";
import { MusicCanvasItem } from "./canvas/music-canvas-item";
import { StickerCanvasItem } from "./canvas/sticker-canvas-item";

interface MediaCanvasProps {
  type: MediaType,
  uri: string,
  items: Array<MediaCanvasItem>,
  ref: RefObject<ViewShot | null>,
  transformsRef: RefObject<Record<string, any>>
}

export default function MediaCanvas({ type, uri, ref, items, transformsRef }: MediaCanvasProps) {

  if (!uri) return null;

  return (
    <View style={{ flex: 1 }}>
      <ViewShot style={{ flex: 1 }} ref={ref}>
        <ImageBackground
          source={{ uri }}
          style={styles.mediaPreview}
          contentFit="cover"
        >
          {items.map((item) => (
            <DraggableItem 
              key={item.id} 
              item={item} 
              onTransformChange={(t) => {
                transformsRef.current[item.id] = t;
              }}
            />
          ))}
        </ImageBackground>
      </ViewShot>
    </View>
  );
}

interface DraggableItemProps { 
  item: MediaCanvasItem,
  onTransformChange: (t: { x: number; y: number; scale: number; rotation: number }) => void;
}

function DraggableItem({ item, onTransformChange }: DraggableItemProps) {
  const x = useSharedValue(100);
  const y = useSharedValue(100);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

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
      <Animated.View style={[{ position: "absolute" }, style]}>
        {item.type === "text" && item.text && (
          <TextCanvasItem text={item.text} />
        )}

        {item.type === "music" && item.music_tag && (
          <MusicCanvasItem music={item.music_tag} />
        )}

        {
          item.type === "sticker" && item.sticker && (
            <StickerCanvasItem uri={item.sticker} />
          )
        }
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
    }
})