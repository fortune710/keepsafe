import { View, Text, StyleSheet } from "react-native";

interface TextCanvasItemProps {
    text: string,
    textStyle?: { color: string; fontFamily?: string }
}

export function TextCanvasItem({ text, textStyle }: TextCanvasItemProps) {
    if (!text) return null;
    
    console.log({ textStyle })
    return (
        <View style={styles.textContainer}>
            <Text testID="canvas-text" style={[styles.textStyle, textStyle]}>
                {text}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
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
})