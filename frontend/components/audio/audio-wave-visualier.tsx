import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { View, StyleSheet } from "react-native";
import { useEffect } from "react";

interface AudioWaveVisualierProps {
    isRecording: boolean;
}

export default function AudioWaveVisualier({ isRecording }: AudioWaveVisualierProps) {
    const waveAnimation = useSharedValue(0);
    
    const animatedWaveStyle = useAnimatedStyle(() => {
        return {
          opacity: isRecording ? waveAnimation.value * 0.8 + 0.2 : 0.3 + waveAnimation.value * 0.2,
        };
    });

    useEffect(() => {
        waveAnimation.value = withRepeat(
          withTiming(1, { duration: isRecording? 300 : 1000 }),
          -1,
          true
        );
    }, [isRecording]);
    
    return (
        <Animated.View style={[styles.waveform, animatedWaveStyle]}>
            {[...Array(20)].map((_, i) => (
            <View 
                key={i} 
                style={[
                styles.waveBar,
                { 
                    height: isRecording ? Math.random() * 60 + 20 : Math.random() * 30 + 10,
                    backgroundColor: isRecording ? '#8B5CF6' : '#CBD5E1',
                }
                ]} 
            />
            ))}
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 80,
        marginBottom: 16,
    },
    waveBar: {
        width: 3,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 1,
        borderRadius: 2,
    },
})