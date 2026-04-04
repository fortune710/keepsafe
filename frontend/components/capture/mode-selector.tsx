import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Camera, Mic } from "lucide-react-native";
import { scale } from 'react-native-size-matters';

interface ModeSelectorProps {
    selectedMode: 'camera' | 'microphone';
    setSelectedMode: (mode: 'camera' | 'microphone') => void;
    minTouchTarget: number;
}

export const ModeSelector = ({ selectedMode, setSelectedMode, minTouchTarget }: ModeSelectorProps) => {
    return (
        <View style={[styles.modeSelector, { minHeight: minTouchTarget }]}>
            <TouchableOpacity
                style={[styles.modeTab, selectedMode === 'camera' && styles.activeModeTab]}
                onPress={() => setSelectedMode('camera')}
            >
                <Camera color={selectedMode === 'camera' ? '#8B5CF6' : '#94A3B8'} size={12} />
                <Text style={[styles.modeText, selectedMode === 'camera' && styles.activeModeText]}>
                    Camera
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.modeTab, selectedMode === 'microphone' && styles.activeModeTab]}
                onPress={() => setSelectedMode('microphone')}
            >
                <Mic color={selectedMode === 'microphone' ? '#8B5CF6' : '#94A3B8'} size={12} />
                <Text style={[styles.modeText, selectedMode === 'microphone' && styles.activeModeText]}>
                    Microphone
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    modeSelector: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 3,
        marginHorizontal: 20,
        marginBottom: 20,
        marginTop: 16,
        maxWidth: scale(200),
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 27,
    },
    activeModeTab: {
        backgroundColor: '#F3F4F6',
    },
    modeText: {
        fontSize: scale(10),
        color: '#94A3B8',
        marginLeft: 4,
        fontFamily: 'Outfit-Medium',
    },
    activeModeText: {
        color: '#8B5CF6',
        fontFamily: 'Outfit-SemiBold',
    },
});
