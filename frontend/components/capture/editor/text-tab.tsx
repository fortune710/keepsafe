import { View, StyleSheet, TextInput, Text, StyleProp, ViewStyle, TextStyle, TouchableOpacity } from "react-native";
import ColorSlider from "./color-slider";
import FontStyleSelector from "./font-style-selector";
import { Input } from "@/components/ui/input";

interface TextTabProps {
    textInput: string;
    onTextChange: (text: string) => void;
    selectedColor: string;
    onColorChange: (color: string) => void;
    selectedFont: string;
    onFontChange: (font: string) => void;
    onConfirm: () => void;
}

export default function TextTab({ 
    textInput, 
    onTextChange, 
    selectedColor, 
    onColorChange, 
    selectedFont,
    onFontChange,  
    onConfirm,
}: TextTabProps) {

    const selectedStyle: StyleProp<TextStyle> = {
        color: selectedColor,
        fontFamily: selectedFont,
    }

    return (
        <View>
            <View style={styles.styleRow}>
                <Text>Text</Text>
                <Input
                    value={textInput}
                    onChangeText={onTextChange}
                    placeholder="Enter text..."
                    style={selectedStyle}
                />
            </View>
            <View style={styles.styleRow}>
                <Text>Color</Text>
                <ColorSlider
                    value={selectedColor}
                    onChange={onColorChange}
                />
            </View>
            <View style={styles.styleRow}>
                <Text>Font</Text>
                <FontStyleSelector
                    fonts={["Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Tahoma", "Courier New", "Comic Sans MS", "Impact", "Lucida Console", "Palatino", "Garamond", "Bookman", "New York", "Rockwell", "Symbol", "Arial Black", "Arial Narrow", "Arial Rounded MT Bold", "Arial Unicode MS", "Book Antiqua", "Calibri", "Cambria", "Candara", "Century Gothic", "Consolas", "Corbel", "Courier", "Curlz MT", "Franklin Gothic Medium", "Garamond", "Georgia", "Helvetica", "Impact", "Lucida Console", "Lucida Fax", "Lucida Sans", "Lucida Sans Unicode", "Microsoft Sans Serif", "Myriad Pro", "New York", "Palatino Linotype", "Segoe UI", "Segoe UI Symbol", "Symbol", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana", "Webdings", "Wingdings", "Wingdings 2", "Wingdings 3"]}
                    onSelect={onFontChange}
                />
            </View>

            <TouchableOpacity
                style={styles.addButton}
                onPress={onConfirm}
            >
                <Text style={styles.addButtonText}>Add Text</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    textTab: {
        marginTop: 20,
        gap: 16,
    },
    styleRow: {
        flexDirection: "column",
        flexWrap: "wrap",
        width: "100%",
        marginVertical: 12,
        //borderWidth: 1,
        gap: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        width: "100%",
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
})
