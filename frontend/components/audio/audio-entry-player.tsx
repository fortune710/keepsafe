import { Pause, Play } from "lucide-react-native";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import AudioWaveVisualier from "./audio-wave-visualier";
import { useEffect, useState } from "react";

interface AudioEntryPlayerProps {
    isPlaying: boolean;
    onTogglePlayback: () => void;
    duration: number;
}

export default function AudioEntryPlayer({ isPlaying, onTogglePlayback, duration }: AudioEntryPlayerProps) {
    const [durationLeft, setDurationLeft] = useState(duration);

    useEffect(() => {
        if (!isPlaying && durationLeft <= 0) {
            setDurationLeft(duration);
            return;
        }
        if (!isPlaying) return;
        if (durationLeft <= 0) return;

        const interval = setInterval(() => {
            setDurationLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, durationLeft]);

    return (
        <View style={styles.audioPreview}>
            <TouchableOpacity style={styles.playButton} onPress={onTogglePlayback}>
                {isPlaying ? (
                <Pause color="#8B5CF6" size={24} fill="#8B5CF6" />
                ) : (
                <Play color="#8B5CF6" size={24} fill="#8B5CF6" />
                )}
            </TouchableOpacity>
            <AudioWaveVisualier isRecording={isPlaying}/>
            <Text style={styles.durationText}>
                {durationLeft ? `${Math.floor(durationLeft / 60)}:${(durationLeft % 60).toString().padStart(2, '0')}` : '0:00'}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    audioPreview: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        position: 'relative',
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    durationText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
})