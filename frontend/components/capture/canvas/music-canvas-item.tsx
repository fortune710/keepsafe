import { MusicTag } from "@/types/capture"
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { scale, verticalScale } from "react-native-size-matters";

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
        paddingVertical: verticalScale(6),
        paddingHorizontal: scale(14),
        backgroundColor: "black",
        borderRadius: 45,
        display: "flex",
        flexDirection: "row",
        alignItems: "center"
    },
    musicImage: {
        width: scale(22),
        height: verticalScale(20),
        borderRadius: 4
    },
    textStyle: {
        fontSize: scale(12),
        color: "white",
        fontWeight: "500",
        marginLeft: scale(7)
    },
})