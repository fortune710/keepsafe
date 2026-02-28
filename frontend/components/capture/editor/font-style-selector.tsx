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
import { scale, verticalScale } from "react-native-size-matters";

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
  previewChar,
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
        numColumns={2}
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
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {previewChar || item}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: verticalScale(380), // 👈 Fixed height instead of flex: 1
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
    minHeight: 60,
    borderRadius: 12,
    padding: scale(10),
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
    fontSize: scale(16),
    color: "#000",
    textAlign: "center",
    flexWrap: "wrap",
  },
});

export default FontStyleSelector;