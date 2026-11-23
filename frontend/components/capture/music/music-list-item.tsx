import { MusicTag } from "@/types/capture";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { MusicPreviewControl } from "@/components/capture/music/music-preview-control";
import { scale, verticalScale } from "react-native-size-matters";
import TextTicker from 'react-native-text-ticker';

interface MusicListItemProps {
    music: MusicTag;
    onPress?: (music: MusicTag) => void;
    isPreviewPlaying: boolean;
    previewProgress: number;
    onTogglePreview: (music: MusicTag) => void;
}

/**
 * Render a touchable list item showing a music cover, title, artist, and an audio preview control.
 *
 * @param music - The music item to display (cover URI, title, artist, and preview source)
 * @param onPress - Optional callback invoked with `music` when the item is pressed
 * @returns The rendered list item element for the given `music`
 */
export function MusicListItem({ music, onPress, isPreviewPlaying, previewProgress, onTogglePreview }: MusicListItemProps) {
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
                    <TextTicker 
                        style={styles.title}
                        loop
                        duration={7000}
                    >
                        {music.title}
                    </TextTicker>
                    <Text style={styles.subtitle}>{music.artist}</Text>
                </View>
            </View>
            <MusicPreviewControl
                isPlaying={isPreviewPlaying}
                progress={previewProgress}
                onPress={() => onTogglePreview(music)}
            />
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    image: {
        width: scale(40),
        height: verticalScale(37),
        borderRadius: 5
    },
    listItem: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        paddingRight: scale(7),
    },
    listItemInner: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
    },
    textContainer: {
        marginLeft: 7,
        width: '75%'
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
