import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import Animated, {
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Music, MusicIcon, StickerIcon, TextIcon, X, MapPin } from "lucide-react-native";
import { verticalScale } from "react-native-size-matters";
import { useDebounce } from "@/hooks/use-debounce";
import { useMusicTag } from "@/hooks/use-music-tag";
import { MediaCanvasItemType, MusicTag } from "@/types/capture";
import { MusicListItem } from "./music/music-list-item";
import ColorSlider from "./editor/color-slider";
import FontStyleSelector from "./editor/font-style-selector";
import TextTab from "./editor/text-tab";
import StickerTab from "./editor/sticker-tab";
import MusicTab from "./editor/music-tab";
import LocationTab from "./editor/location-tab";

const { height } = Dimensions.get("window");

interface EditorPopoverProps {
  isVisible: boolean;
  onClose: () => void;
  addText: (text: string, style: { color: string; fontFamily?: string }) => void;
  addSticker: (uri: string) => void;
  addMusic: (music: MusicTag) => void;
  addLocation: (location: string) => void;
}

export default function EditorPopover({
  isVisible,
  onClose,
  addText,
  addSticker,
  addMusic,
  addLocation,
}: EditorPopoverProps) {
  const [activeTab, setActiveTab] = useState<MediaCanvasItemType>("text");
  const [textInput, setTextInput] = useState("");
  const [musicTag, setMusicTag] = useState("");
  const musicQuery = useDebounce(musicTag, 600);

  const { musicTags, isLoading } = useMusicTag(musicQuery);
  const [selectedStyle, setSelectedStyle] = useState({
    color: "#000",
    fontFamily: "Arial",
  });

  const popoverHeight = useSharedValue(height * 0.6);

  const animatedPopoverStyle = useAnimatedStyle(() => {
    return {
      height: popoverHeight.value,
    };
  });

  const swipeDownGesture = Gesture.Pan().onEnd((event) => {
    if (event.translationY > 100 && event.velocityY > 500) {
      onClose();
    }
  });

  const confirmTextSelection = () => {
    if (textInput.trim()) {
      addText(textInput.trim(), selectedStyle);
      setTextInput("");
      onClose();
    }
  }

  const confirmStickerSelection = (uri: string) => {
    addSticker(uri);
    onClose();
  }

  const confirmMusicSelection = (music: MusicTag) => {
    addMusic(music);
    onClose();
  }

  const confirmLocationSelection = (location: string) => {
    addLocation(location);
    onClose();
  }


  if (!isVisible) return null;

  return (
    <Animated.View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />

      <GestureDetector gesture={swipeDownGesture}>
        <Animated.View 
          entering={SlideInDown.duration(300).springify().damping(27).stiffness(90)}
          exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
          style={[styles.popover, animatedPopoverStyle, styles.popoverContent]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "text" && styles.activeTab]}
                onPress={() => setActiveTab("text")}
              >
                <TextIcon 
                  color={activeTab === "text" ? 
                  styles.activeTabText.color : styles.tabText.color} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "sticker" && styles.activeTab]}
                onPress={() => setActiveTab("sticker")}
              >
                <StickerIcon 
                  color={activeTab === "sticker" ? 
                  styles.activeTabText.color : styles.tabText.color} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "music" && styles.activeTab]}
                onPress={() => setActiveTab("music")}
              >
                <MusicIcon 
                  color={activeTab === "music" ? 
                  styles.activeTabText.color : styles.tabText.color} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "location" && styles.activeTab]}
                onPress={() => setActiveTab("location")}
              >
                <MapPin 
                  color={activeTab === "location" ? 
                  styles.activeTabText.color : styles.tabText.color} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View>
            {activeTab === "text" ? (
              <TextTab
                textInput={textInput}
                onTextChange={setTextInput}
                selectedColor={selectedStyle.color}
                onColorChange={(color) => setSelectedStyle({ ...selectedStyle, color })}
                selectedFont={selectedStyle.fontFamily}
                onFontChange={(font) => setSelectedStyle({ ...selectedStyle, fontFamily: font })}
                onConfirm={confirmTextSelection}
              />
            ) : activeTab === "sticker" ? (
              <StickerTab
                onSelectSticker={confirmStickerSelection}
              />
            ) : activeTab === "music" ? (
              <MusicTab
                isLoading={isLoading}
                musicQuery={musicTag}
                onMusicQueryChange={setMusicTag}
                musicTags={musicTags ?? []}
                onSelectMusic={confirmMusicSelection}
              />
            ) : (
              <LocationTab
                onSelectLocation={confirmLocationSelection}
              />
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  popoverContent: {
    minHeight: verticalScale(670)
  },
  overlay: {
    position: "absolute",
    top: verticalScale(-50),
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  popover: {
    position: "absolute",
    bottom: verticalScale(-40),
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: verticalScale(40),
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: "#8B5CF6",
  },
  tabText: {
    color: "#475569",
  },
  activeTabText: {
    color: "white",
  },
  closeButton: {
    padding: 4,
  },
  textTab: {
    marginTop: 20,
    gap: 16,
  },


  styleButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
  },
  styleButtonActive: {
    backgroundColor: "#E0E7FF",
    borderColor: "#8B5CF6",
  },
  
  stickerGrid: {
    marginTop: 20,
    gap: 12,
    borderWidth: 1
  },
  stickerButton: {
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
