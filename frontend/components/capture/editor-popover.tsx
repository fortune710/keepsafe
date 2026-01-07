import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { verticalScale } from "react-native-size-matters";
import { useDebounce } from "@/hooks/use-debounce";
import { useMusicTag } from "@/hooks/use-music-tag";
import { MediaCanvasItemType, MusicTag } from "@/types/capture";
import TextTab from "./editor/text-tab";
import StickerTab from "./editor/sticker-tab";
import MusicTab from "./editor/music-tab";
import LocationTab from "./editor/location-tab";

const { height } = Dimensions.get("window");
const TEXT_TAB_HEIGHT = height * 0.72;
const DEFAULT_TAB_HEIGHT = height * 0.95;

interface EditorPopoverProps {
  isVisible: boolean;
  onClose: (currentText?: string) => void;
  addText: (text: string, style: { color: string; fontFamily?: string; backgroundColor?: string }) => void;
  addSticker: (uri: string) => void;
  addMusic: (music: MusicTag) => void;
  addLocation: (location: string) => void;
  defaultTab?: MediaCanvasItemType;
  onTextChange?: (text: string) => void;
  onStyleChange?: (styleUpdates: { color?: string; fontFamily?: string; backgroundColor?: string }) => void;
  initialText?: string;
}

export default function EditorPopover({
  isVisible,
  onClose,
  addText,
  addSticker,
  addMusic,
  addLocation,
  defaultTab,
  onTextChange,
  onStyleChange,
  initialText = "",
}: EditorPopoverProps) {
  const [activeTab, setActiveTab] = useState<MediaCanvasItemType>(defaultTab || "text");
  const [textInput, setTextInput] = useState(initialText);
  const [musicTag, setMusicTag] = useState("");
  const musicQuery = useDebounce(musicTag, 600);
  
  // Update activeTab when defaultTab changes
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  
  // Update textInput when initialText changes
  useEffect(() => {
    if (initialText !== undefined) {
      setTextInput(initialText);
    }
  }, [initialText]);
  
  // Handle text input changes
  const handleTextChange = (text: string) => {
    setTextInput(text);
    if (onTextChange) {
      onTextChange(text);
    }
  };

  const { musicTags, isLoading } = useMusicTag(musicQuery);
  const [selectedStyle, setSelectedStyle] = useState({
    color: "#FFFFFF",
    fontFamily: "Arial",
    backgroundColor: "#000000",
  });

  const popoverHeight = useSharedValue(
    activeTab === "text" ? TEXT_TAB_HEIGHT : DEFAULT_TAB_HEIGHT
  );

  // Update height when activeTab changes
  useEffect(() => {
    const targetHeight = activeTab === "text" ? TEXT_TAB_HEIGHT : DEFAULT_TAB_HEIGHT;
    popoverHeight.value = withTiming(targetHeight, { duration: 300 });
  }, [activeTab]);

  const animatedPopoverStyle = useAnimatedStyle(() => {
    return {
      height: popoverHeight.value,
    };
  });

  // Text is now updated in real-time, so we don't need a confirm function
  // This is kept for potential future use but not currently called

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
      <TouchableOpacity style={styles.backdrop} onPress={() => onClose(textInput)} />

      <Animated.View 
        entering={SlideInDown.duration(300).springify().damping(27).stiffness(90)}
        exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
        style={[styles.popover, animatedPopoverStyle]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Content */}
        <View style={styles.tabContent}>
            {activeTab === "text" ? (
              <TextTab
                textInput={textInput}
                onTextChange={handleTextChange}
                selectedColor={selectedStyle.color}
                onColorChange={(color) => {
                  setSelectedStyle({ ...selectedStyle, color });
                  if (onStyleChange) {
                    onStyleChange({ color });
                  }
                }}
                selectedFont={selectedStyle.fontFamily}
                onFontChange={(font) => {
                  setSelectedStyle({ ...selectedStyle, fontFamily: font });
                  if (onStyleChange) {
                    onStyleChange({ fontFamily: font });
                  }
                }}
                selectedBackgroundColor={selectedStyle.backgroundColor}
                onBackgroundColorChange={(color) => {
                  setSelectedStyle({ ...selectedStyle, backgroundColor: color });
                  if (onStyleChange) {
                    onStyleChange({ backgroundColor: color });
                  }
                }}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  popoverContent: {
    //minHeight: verticalScale(470)
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
  tabContent: {
    marginVertical: verticalScale(0),
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
