
import type { TextInputProps } from "react-native";
import { useState, useRef } from "react";
import { TextInput, View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { X } from "lucide-react-native";

type InputProps = TextInputProps;


export function Input({ style, value, onChangeText, ...props }: InputProps) {
    const [inputValue, setInputValue] = useState(value ?? "");
    const inputRef = useRef<TextInput>(null);

    const handleChangeText = (text: string) => {
        setInputValue(text);
        if (onChangeText) {
            onChangeText(text);
        }
    };

    const handleClear = () => {
        setInputValue("");
        if (onChangeText) {
            onChangeText("");
        }
        // Focus the input after clearing
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    };

    return (
        <View style={styles.inputContainer}>
            <TextInput
                ref={inputRef}
                {...props}
                value={inputValue}
                onChangeText={handleChangeText}
                style={[styles.input, style]}
            />
            {inputValue.length > 0 && (
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClear}
                    accessibilityLabel="Clear text"
                >
                    <X color="#64748B" size={18} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        position: "relative",
        width: "100%",
        justifyContent: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        width: "100%",
        paddingRight: 36, // space for cancel button
    },
    cancelButton: {
        position: "absolute",
        right: 12,
        top: "50%",
        transform: [{ translateY: -12 }],
        backgroundColor: "#E5E7EB",
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButtonText: {
        fontSize: 18,
        color: "#64748B",
        fontWeight: "bold",
        lineHeight: 22,
    },
});