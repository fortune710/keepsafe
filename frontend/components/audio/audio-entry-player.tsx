import { Pause, Play } from "lucide-react-native";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import AudioWaveVisualier from "./audio-wave-visualier";
import { useEffect, useState } from "react";
import { formatAudioDuration } from '@/lib/audio-duration';

interface AudioEntryPlayerProps {
    isPlaying: boolean;
    onTogglePlayback: () => void;
    duration: number;
    meteringLevel?: number;
}

export default function AudioEntryPlayer({ isPlaying, onTogglePlayback, duration, meteringLevel = 0 }: AudioEntryPlayerProps) {
    const [durationLeft, setDurationLeft] = useState(duration);
    const displaySeconds = Math.floor(Math.max(0, durationLeft));

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
            <AudioWaveVisualier isRecording={isPlaying} meteringLevel={meteringLevel}/>
            <Text style={styles.durationText}>
                {formatAudioDuration(displaySeconds)}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    audioPreview: {
        flex: 1,
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
