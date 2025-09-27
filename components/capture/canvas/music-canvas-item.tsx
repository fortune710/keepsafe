import { MusicTag } from "@/types/capture"
import { View, StyleSheet, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import AudioPreviewPopover from "../music/audio-preview-popover";
import { Portal } from 'react-native-portalize';

interface MusicCanvasItemProps {
    music: MusicTag;
}

export function MusicCanvasItem({ music }: MusicCanvasItemProps) {
    const [showPopover, setShowPopover] = useState(false);
    return (
        <>
            <Pressable onPress={() => setShowPopover(true)} style={styles.musicContainer}>
                <Image source={{ uri: music.cover }} style={styles.musicImage} />
                <Text style={styles.textStyle}>{music.title} - {music.artist}</Text>
            </Pressable>

            <Portal>
                <AudioPreviewPopover 
                    music={music} 
                    onClose={() => setShowPopover(false)} 
                    isVisible={showPopover} 
                />
            </Portal>
        
        </>
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