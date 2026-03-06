import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ghost, Sparkles } from 'lucide-react-native';
import { Colors } from '@/lib/constants';

interface EmptyFriendVaultProps {
    friendName: string;
}

const { height } = Dimensions.get('window');

export default function EmptyFriendVault({ friendName }: EmptyFriendVaultProps) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ghost size={64} color="#8B5CF6" strokeWidth={1.5} />
                    <View style={styles.decorativeCircles}>
                        <View style={[styles.circle, styles.circleLarge]} />
                        <View style={[styles.circle, styles.circleSmall]} />
                    </View>
                </View>

                <Text style={styles.title}>Silence is golden...</Text>
                <Text style={styles.description}>
                    <Text style={styles.highlight}>{friendName}</Text> hasn't shared any diary entries yet.
                    We'll let you know when they do!
                </Text>

                <View style={styles.badge}>
                    <Sparkles size={16} color="#8B5CF6" />
                    <Text style={styles.badgeText}>More coming soon</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: height * 0.7,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    decorativeCircles: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    circle: {
        position: 'absolute',
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    circleLarge: {
        width: 160,
        height: 160,
        top: -20,
        left: -20,
    },
    circleSmall: {
        width: 140,
        height: 140,
        top: -10,
        left: -10,
    },
    title: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        fontFamily: 'Outfit-Regular',
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    highlight: {
        color: '#8B5CF6',
        fontFamily: 'Outfit-SemiBold',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    badgeText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: '#8B5CF6',
    },
});
