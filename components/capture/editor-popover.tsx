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
import { Music, X } from "lucide-react-native";
import { verticalScale } from "react-native-size-matters";
import { useDebounce } from "@/hooks/use-debounce";
import { useMusicTag } from "@/hooks/use-music-tag";
import { MusicTag } from "@/types/capture";
import { MusicListItem } from "./music/music-list-item";

const { height } = Dimensions.get("window");

interface EditorPopoverProps {
  isVisible: boolean;
  onClose: () => void;
  addText: (text: string, style: { color: string; fontWeight?: string }) => void;
  addSticker: (uri: string) => void;
  addMusic: (music: MusicTag) => void;
}

// Example stickers
const stickers = [
  { id: "1", uri: "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/stickers/1.png" },
  { id: "2", uri: "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/stickers/2.png" },
  { id: "3", uri: "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/stickers/3.png" },
  { id: "4", uri: "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/stickers/4.png" },
];

// Example text styles
const textStyles = [
  { id: "normal", label: "Normal", style: { color: "#000" } },
  { id: "bold", label: "Bold", style: { color: "#000", fontWeight: "700" } },
  { id: "red", label: "Red", style: { color: "red" } },
  { id: "blue", label: "Blue", style: { color: "blue" } },
];

export default function EditorPopover({
  isVisible,
  onClose,
  addText,
  addSticker,
  addMusic,
}: EditorPopoverProps) {
  const [activeTab, setActiveTab] = useState<"text" | "stickers" | "music">("text");
  const [textInput, setTextInput] = useState("");
  const [musicTag, setMusicTag] = useState("");
  const musicQuery = useDebounce(musicTag, 600);

  const { musicTags, isLoading } = useMusicTag(musicQuery);
  const [selectedStyle, setSelectedStyle] = useState(textStyles[0]);

  const popoverHeight = useSharedValue(height * 0.7);

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


  if (!isVisible) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify().damping(20).stiffness(90)}
      exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
      style={styles.overlay}
    >
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />

      <GestureDetector gesture={swipeDownGesture}>
        <Animated.View style={[styles.popover, animatedPopoverStyle, styles.popoverContent]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "text" && styles.activeTab]}
                onPress={() => setActiveTab("text")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "text" && styles.activeTabText,
                  ]}
                >
                  Text
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "stickers" && styles.activeTab]}
                onPress={() => setActiveTab("stickers")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "stickers" && styles.activeTabText,
                  ]}
                >
                  Stickers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "music" && styles.activeTab]}
                onPress={() => setActiveTab("music")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "music" && styles.activeTabText,
                  ]}
                >
                  Music
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View>
            {activeTab === "text" ? (
              <View style={styles.textTab}>
                <TextInput
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder="Enter text..."
                  style={[styles.input, selectedStyle.style as any]}
                />
                <View style={styles.styleRow}>
                  {textStyles.map((ts) => (
                    <TouchableOpacity
                      key={ts.id}
                      style={[
                        styles.styleButton,
                        selectedStyle.id === ts.id && styles.styleButtonActive,
                      ]}
                      onPress={() => setSelectedStyle(ts)}
                    >
                      <Text style={ts.style as any}>{ts.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    if (textInput.trim()) {
                      addText(textInput.trim(), selectedStyle.style);
                      setTextInput("");
                      onClose();
                    }
                  }}
                >
                  <Text style={styles.addButtonText}>Add Text</Text>
                </TouchableOpacity>
              </View>
            ) : activeTab === "stickers" ? (
              <FlatList
                data={stickers}
                keyExtractor={(item) => item.id}
                numColumns={3}
                //style={{ borderWidth: 1 }}
                contentContainerStyle={styles.stickerGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.stickerButton}
                    onPress={() => {
                      addSticker(item.uri);
                      onClose();
                    }}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={{ width: 60, height: 60 }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList
                ListHeaderComponent={
                  <KeyboardAvoidingView behavior="position">
                    <TextInput
                      value={musicTag}
                      onChangeText={setMusicTag}
                      placeholder="Enter music tags..."
                      style={[styles.input, selectedStyle.style as any]}
                    />
                  </KeyboardAvoidingView>
                }
                data={musicTags}
                renderItem={({ item }) => (
                  <MusicListItem 
                    onPress={(music) => {
                      addMusic(music);
                      onClose();
                    }}
                    music={item} 
                  />
                )}
                ListHeaderComponentStyle={{ marginBottom: 10 }}
                contentContainerStyle={{ paddingVertical: 10 }}
                style={{ paddingVertical: 10, height: 600 }}
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
    minHeight: verticalScale(500)
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
    fontSize: 14,
    fontWeight: "500",
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
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  styleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
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
  addButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
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
