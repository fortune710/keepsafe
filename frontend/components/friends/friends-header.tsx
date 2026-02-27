import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { scale, verticalScale } from 'react-native-size-matters';

interface FriendsHeaderProps {
    title: string;
}

/**
 * Header component for the Friends screen.
 * Uses ES5 function declaration for the component.
 */
export function FriendsHeader(props: FriendsHeaderProps) {
    const { title } = props;

    return (
        <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
                style={styles.closeButton}
                onPress={function () { router.back(); }}
            >
                <ChevronRight color="#64748B" size={24} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(12),
        backgroundColor: '#F0F9FF',
    },
    title: {
        fontSize: 20,
        fontFamily: 'Outfit-SemiBold',
        fontWeight: '600',
        color: '#1E293B',
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        padding: 8,
    },
});
