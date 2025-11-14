import { FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";

const stickers = [
    { id: "1", uri: "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/stickers/1.png" },
    { id: "2", uri: "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/stickers/2.png" },
    { id: "3", uri: "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/stickers/3.png" },
    { id: "4", uri: "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/stickers/4.png" },
];

interface StickerTabProps {
    onSelectSticker: (uri: string) => void;
}

const NUM_COLUMNS = 3;

export default function StickerTab({ onSelectSticker }: StickerTabProps) {
    
    // Calculate how many dummy cells are needed to fill the last row
    const remainder = stickers.length % NUM_COLUMNS;
    const numDummyCells = remainder === 0 ? 0 : NUM_COLUMNS - remainder;
    // Dummy cells will have a uri of "dummy"
    const dummyCells = Array.from({ length: numDummyCells }, (_, index) => ({
        id: `dummy-${index}`,
        uri: "dummy",
    }));
    // Merge stickers and dummy cells
    const dataWithDummies = [...stickers, ...dummyCells];

    return (
        <FlatList
            data={dataWithDummies}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            renderItem={({ item }) =>
                item.uri === "dummy" ? (
                    <TouchableOpacity
                        style={[styles.stickerButton, { backgroundColor: "transparent", borderWidth: 0 }]}
                        disabled
                    />
                ) : (
                    <TouchableOpacity
                        style={styles.stickerButton}
                        onPress={() => onSelectSticker(item.uri)}
                    >
                        <Image
                            source={{ uri: item.uri }}
                            style={{ width: 60, height: 60 }}
                            contentFit="contain"
                        />
                    </TouchableOpacity>
                )
            }
        />
    );
}

const styles = StyleSheet.create({
    stickerButton: {
        flex: 1,
        margin: 8,
        aspectRatio: 1, // 👈 Keeps it square
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ccc",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9f9f9",
    }
})
