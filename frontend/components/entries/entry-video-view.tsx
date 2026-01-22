import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { Pressable, StyleSheet } from "react-native";

export default function EntryVideoView({ uri }: { uri: string }) {
    const player = useVideoPlayer(uri, player => {
        player.loop = false;
    });
    
    const { isPlaying: videoPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
    
    return (
        <Pressable onPress={() => videoPlaying ? player.pause() : player.play()}>
            <VideoView 
                style={styles.entryImage} 
                player={player} 
                contentFit='cover'
            />
        </Pressable>
  )
}

const styles = StyleSheet.create({
  entryImage: {
    width: '100%',
    height: 300,
    borderRadius: 0
  }
})