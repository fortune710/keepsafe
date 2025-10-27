// FontStyleSelectorGrid.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ViewStyle,
} from "react-native";

type FontStyleSelectorProps = {
  fonts: string[]; // List of font family names
  onSelect?: (font: string) => void;
  style?: ViewStyle;
  previewChar?: string; // Character to preview, default "A"
  initialFont?: string;
};

const FontStyleSelector: React.FC<FontStyleSelectorProps> = ({
  fonts,
  onSelect,
  style,
  previewChar = "A",
  initialFont,
}) => {
  const [selected, setSelected] = useState<string>(
    initialFont || fonts[0] || ""
  );

  const handleSelect = (font: string) => {
    setSelected(font);
    onSelect?.(font);
  };

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={fonts}
        numColumns={4}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isSelected = selected === item;
          return (
            <TouchableOpacity
              onPress={() => handleSelect(item)}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.preview,
                  { fontFamily: item },
                  isSelected && { color: "#007AFF" },
                ]}
              >
                {previewChar}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400, // 👈 Fixed height instead of flex: 1
    width: "100%",
  },
  flatList: {
    flex: 1,
  },
  grid: {
    //paddingHorizontal: 10,
    paddingBottom: 20,
  },
  option: {
    flex: 1,
    margin: 8,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  optionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#e6f0ff",
  },
  preview: {
    fontSize: 28,
    color: "#000",
  },
});

export default FontStyleSelector;