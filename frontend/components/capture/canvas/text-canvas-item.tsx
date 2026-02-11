import { View, Text, StyleSheet } from "react-native";

interface TextCanvasItemProps {
    text: string,
    textStyle?: { color: string; fontFamily?: string; backgroundColor?: string }
}

/**
 * Renders a rounded text "badge" using the provided text and optional styling.
 *
 * Applies `textStyle.backgroundColor` to the container (defaults to `#000000` if not provided)
 * and applies `textStyle.color` and `textStyle.fontFamily` to the text.
 *
 * @param text - The string to display; if falsy, the component renders `null`.
 * @param textStyle - Optional visual overrides. Recognized properties:
 *   - `backgroundColor`: container background color
 *   - `color`: text color
 *   - `fontFamily`: text font family
 * @returns A React element containing the styled text badge, or `null` when `text` is falsy.
 */
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