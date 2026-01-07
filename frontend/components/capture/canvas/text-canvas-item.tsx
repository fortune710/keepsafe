import { View, Text, StyleSheet } from "react-native";

interface TextCanvasItemProps {
    text: string,
    textStyle?: { color: string; fontFamily?: string; backgroundColor?: string }
}

export function TextCanvasItem({ text, textStyle }: TextCanvasItemProps) {
    if (!text) return null;
    
    console.log({ textStyle })
    return (
        <View style={[styles.textContainer, { backgroundColor: textStyle?.backgroundColor || "#000000" }]}>
            <Text testID="canvas-text" style={[styles.textStyle, { color: textStyle?.color, fontFamily: textStyle?.fontFamily }]}>
                {text}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    textContainer: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 45
    },
    textStyle: {
        fontSize: 12,
        fontWeight: "500"
    },
})