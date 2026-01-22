
import { useAudio } from "@/hooks/use-audio";
import { Pause, Play } from "lucide-react-native";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function EntryAudioView({ uri }: { uri: string }) {

    const { isPlaying, playAudio } = useAudio();

    const toggleAudioPlayback = async () => {
        if (!uri) return;
        await playAudio(uri);
    };



  return (
    <View style={styles.audioContainer}>
        <TouchableOpacity style={styles.audioPlayButton} onPress={toggleAudioPlayback}>
            {isPlaying ? (
            <Pause color="#8B5CF6" size={32} fill="#8B5CF6" />
            ) : (
            <Play color="#8B5CF6" size={32} fill="#8B5CF6" />
            )}
        </TouchableOpacity>
        <View style={styles.audioWave}>
            {[...Array(15)].map((_, i) => (
            <View 
                key={i} 
                style={[
                styles.waveBar, 
                { height: Math.random() * 40 + 20 }
                ]} 
            />
            ))}
        </View>
    </View>
  )
}

const styles = StyleSheet.create({
    audioContainer: {
        height: 300,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
    },
    audioPlayButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    audioWave: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
    },
    waveBar: {
        width: 4,
        backgroundColor: '#8B5CF6',
        marginHorizontal: 2,
        borderRadius: 2,
    },
})