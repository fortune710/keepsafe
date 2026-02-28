import { View, StyleSheet, TextInput, Text, TouchableOpacity, ScrollView, Platform, Keyboard, Dimensions, KeyboardAvoidingView } from "react-native";
import ColorSlider from "./color-slider";
import FontStyleSelector from "./font-style-selector";
import { verticalScale } from "react-native-size-matters";
import { useState, useRef, useEffect } from "react";
import { Type, Palette, Square, AlignLeft } from "lucide-react-native";

type InternalTab = "text" | "textColor" | "backgroundColor" | "font";

interface TextTabProps {
    textInput: string;
    onTextChange: (text: string) => void;
    selectedColor: string;
    onColorChange: (color: string) => void;
    selectedFont: string;
    onFontChange: (font: string) => void;
    selectedBackgroundColor?: string;
    onBackgroundColorChange?: (color: string) => void;
}


// Popular colors palette
const POPULAR_COLORS = [
    "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF",
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
    "#FFC0CB", "#A52A2A", "#808080", "#FFD700", "#4B0082",
    "#FF1493", "#00CED1", "#32CD32", "#FF4500", "#DA70D6",
];

/**
 * Renders a multi-tab text editor panel for editing text, text color, background color, and font.
 *
 * Provides an internal tab bar with: a multiline text input (auto-focused when active), a text color picker
 * (preset palette plus optional custom ColorSlider), a background color picker (same behavior), and a font selector.
 *
 * @param textInput - Current text value shown in the editor
 * @param onTextChange - Called with the new text when the user edits the text input
 * @param selectedColor - Currently selected text color (hex string)
 * @param onColorChange - Called with a hex color when the text color is changed
 * @param selectedFont - Currently selected font name
 * @param onFontChange - Called with the font name when a font is selected
 * @param selectedBackgroundColor - Currently selected background color (hex string); defaults to `#000000`
 * @param onBackgroundColorChange - Optional callback called with a hex color when the background color is changed
 * @returns A React element containing the internal tab bar and the active tab's content
 */
export default function TextTab({
    textInput,
    onTextChange,
    selectedColor,
    onColorChange,
    selectedFont,
    onFontChange,
    selectedBackgroundColor = "#000000",
    onBackgroundColorChange
}: TextTabProps) {
    const [activeInternalTab, setActiveInternalTab] = useState<InternalTab>("text");
    const [showCustomColor, setShowCustomColor] = useState(false);
    const textInputRef = useRef<TextInput>(null);

    // Auto-focus when text tab becomes active, but keep keyboard persistent when switching tabs
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        if (activeInternalTab === "text") {
            // Small delay to ensure the component is rendered
            timer = setTimeout(() => {
                if (textInputRef.current) {
                    textInputRef.current.focus();
                }
            }, 100);
        }

        // Cleanup function to clear timeout if activeInternalTab changes or component unmounts
        return () => {
            if (timer !== null) {
                clearTimeout(timer);
            }
        };
    }, [activeInternalTab]);


    const renderTextTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.textInputSection}>
                <TextInput
                    ref={textInputRef}
                    value={textInput}
                    onChangeText={onTextChange}
                    placeholder="Enter text..."
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                    autoFocus
                    multiline
                />
            </View>
        </View>
    );

    const renderTextColorTab = () => (
        <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContentContainer}
        >
            {/* <View style={styles.colorSection}>
                <Text style={styles.sectionTitle}>Custom Color</Text>
                <TouchableOpacity
                    key={`text-custom-${selectedColor}`}
                    style={styles.colorGridItem}
                    onPress={() => setShowCustomColor(!showCustomColor)}
                >
                    <Plus size={16} color={selectedColor} />
                </TouchableOpacity>
            </View> */}

            <View style={styles.colorSection}>
                <View style={styles.colorGrid}>
                    {POPULAR_COLORS.map((color) => (
                        <TouchableOpacity
                            key={`text-${color}`}
                            style={[
                                styles.colorGridItem,
                                { backgroundColor: color },
                                selectedColor === color && styles.selectedColorItem,
                            ]}
                            onPress={() => {
                                onColorChange(color);
                                setShowCustomColor(false);
                            }}
                        >
                            {selectedColor === color && (
                                <View style={styles.checkmark} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.customColorButton}
                    onPress={() => setShowCustomColor(!showCustomColor)}
                >
                    <Text style={styles.customColorButtonText}>
                        {showCustomColor ? "Hide Custom Color" : "Custom Color"}
                    </Text>
                </TouchableOpacity>


                {showCustomColor && (
                    <View style={styles.customColorSection}>
                        <ColorSlider value={selectedColor} onChange={onColorChange} />
                        <Text style={styles.colorCode}>{selectedColor.toUpperCase()}</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );

    const renderBackgroundColorTab = () => (
        <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContentContainer}
        >
            <View style={styles.colorSection}>
                <View style={styles.colorGrid}>
                    {POPULAR_COLORS.map((color) => (
                        <TouchableOpacity
                            key={`bg-${color}`}
                            style={[
                                styles.colorGridItem,
                                { backgroundColor: color },
                                selectedBackgroundColor === color && styles.selectedColorItem,
                            ]}
                            onPress={() => {
                                onBackgroundColorChange?.(color);
                                setShowCustomColor(false);
                            }}
                        >
                            {selectedBackgroundColor === color && (
                                <View style={styles.checkmark} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.customColorButton}
                    onPress={() => setShowCustomColor(!showCustomColor)}
                >
                    <Text style={styles.customColorButtonText}>
                        {showCustomColor ? "Hide Custom Color" : "Custom Color"}
                    </Text>
                </TouchableOpacity>

                {showCustomColor && (
                    <View style={styles.customColorSection}>
                        <ColorSlider
                            value={selectedBackgroundColor}
                            onChange={onBackgroundColorChange || (() => { })}
                        />
                        <Text style={styles.colorCode}>{selectedBackgroundColor.toUpperCase()}</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );

    const renderFontTab = () => (
        <View style={styles.tabContent}>
            <FontStyleSelector
                fonts={["Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Tahoma", "Courier New", "Comic Sans MS", "Impact", "Lucida Console", "Palatino", "Garamond", "Bookman", "New York", "Rockwell", "Symbol", "Arial Black", "Arial Narrow", "Arial Rounded MT Bold", "Arial Unicode MS", "Book Antiqua", "Calibri", "Cambria", "Candara", "Century Gothic", "Consolas", "Corbel", "Courier", "Curlz MT", "Franklin Gothic Medium", "Garamond", "Georgia", "Helvetica", "Impact", "Lucida Console", "Lucida Fax", "Lucida Sans", "Lucida Sans Unicode", "Microsoft Sans Serif", "Myriad Pro", "New York", "Palatino Linotype", "Segoe UI", "Segoe UI Symbol", "Symbol", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana", "Webdings", "Wingdings", "Wingdings 2", "Wingdings 3"]}
                onSelect={onFontChange}
            />
        </View>
    );



    return (
        <View style={styles.container}>
            {/* Internal Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabBarScrollView}
                contentContainerStyle={styles.tabBar}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity
                    style={[styles.tab, activeInternalTab === "text" && styles.activeTab]}
                    onPress={() => setActiveInternalTab("text")}
                >
                    <Type
                        size={20}
                        color={activeInternalTab === "text" ? "#8B5CF6" : "#64748B"}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeInternalTab === "textColor" && styles.activeTab]}
                    onPress={() => {
                        setActiveInternalTab("textColor");
                        setShowCustomColor(false);
                    }}
                >
                    <Palette
                        size={20}
                        color={activeInternalTab === "textColor" ? "#8B5CF6" : "#64748B"}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeInternalTab === "backgroundColor" && styles.activeTab]}
                    onPress={() => {
                        setActiveInternalTab("backgroundColor");
                        setShowCustomColor(false);
                    }}
                >
                    <Square
                        size={20}
                        color={activeInternalTab === "backgroundColor" ? "#8B5CF6" : "#64748B"}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeInternalTab === "font" && styles.activeTab]}
                    onPress={() => setActiveInternalTab("font")}
                >
                    <AlignLeft
                        size={20}
                        color={activeInternalTab === "font" ? "#8B5CF6" : "#64748B"}
                    />
                </TouchableOpacity>
            </ScrollView>

            {/* Tab Content */}
            {activeInternalTab === "text" && renderTextTab()}
            {activeInternalTab === "textColor" && renderTextColorTab()}
            {activeInternalTab === "backgroundColor" && renderBackgroundColorTab()}
            {activeInternalTab === "font" && renderFontTab()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(420)
    },
    tabBarScrollView: {
        flexGrow: 0,
        marginBottom: 16,
    },
    tabBar: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginRight: 8,
        backgroundColor: 'transparent',
    },
    activeTab: {
        backgroundColor: '#EEF2FF',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    activeTabText: {
        color: '#8B5CF6',
    },
    tabContent: {
        flex: 1,
        minHeight: 200,
    },
    scrollContentContainer: {
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    textInputSection: {
        gap: 12,
        paddingVertical: 8,
        width: '100%',
    },
    textInput: {
        width: '100%',
        minHeight: 100,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontSize: 16,
    },
    labelCentered: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 4,
        textAlign: 'center',
    },
    colorSection: {
        marginBottom: 24,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 8,
    },
    colorGridItem: {
        width: '17.5%',
        height: 40,
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedColorItem: {
        borderColor: '#8B5CF6',
        borderWidth: 3,
    },
    checkmark: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    customColorButton: {
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        alignItems: 'center',
    },
    customColorButtonText: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        fontWeight: '600',
        color: '#8B5CF6',
    },
    customColorSection: {
        marginTop: 16,
        gap: 12,
    },
    colorCode: {
        fontSize: 14,
        fontFamily: 'Jost-Regular',
        fontWeight: '600',
        color: '#1E293B',
        textAlign: 'center',
    },
})