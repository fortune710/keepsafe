import { MusicTag } from "@/types/capture"
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";

interface MusicCanvasItemProps {
    music: MusicTag;
    onPress?: () => void;
}

export function MusicCanvasItem({ music, onPress }: MusicCanvasItemProps) {
    return (
        <TouchableOpacity style={styles.musicContainer} onPress={onPress}>
            <Image source={{ uri: music.cover }} style={styles.musicImage} />
            <Text style={styles.textStyle}>{music.title} - {music.artist}</Text>
        </TouchableOpacity>
    )
}


const styles = StyleSheet.create({
    musicContainer: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: "black",
        borderRadius: 45,
        display: "flex",
        flexDirection: "row",
        alignItems: "center"
    },
    musicImage: {
        width: 30,
        height: 30,
        borderRadius: 8
    },
    textStyle: {
        fontSize: 12,
        color: "white",
        fontWeight: "500",
        marginLeft: 7
    },
})