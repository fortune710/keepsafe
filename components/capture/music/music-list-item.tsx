import { MusicTag } from "@/types/capture";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import AudioPreview from "@/components/capture/music/audio-preview-player";
import { scale, verticalScale } from "react-native-size-matters";

interface MusicListItemProps {
    music: MusicTag;
    onPress?: (music: MusicTag) => void;
}

export function MusicListItem({ music, onPress }: MusicListItemProps) {
    const handleMusicSelection = () => {
        onPress && onPress(music);
    }

    return (
        <TouchableOpacity style={styles.listItem} onPress={handleMusicSelection}>
            <View style={styles.listItemInner}>
                <Image 
                    source={{ uri: music.cover }} 
                    style={styles.image} 
                />
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{music.title}</Text>
                    <Text style={styles.subtitle}>{music.artist}</Text>
                </View>
            </View>
            <AudioPreview audioSource={music.preview}/>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    image: {
        width: scale(35),
        height: verticalScale(33),
        borderRadius: 5
    },
    listItem: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8
    },
    listItemInner: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
    },
    textContainer: {
        marginLeft: 7
    },
    title: {
        fontSize: scale(12),
        fontWeight: "500"
    },
    subtitle: {
        fontSize: scale(10),
        fontWeight: "300"
    }
})