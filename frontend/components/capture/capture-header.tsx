import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { UserPlus } from "lucide-react-native";
import { scale } from 'react-native-size-matters';
import { DateContainer } from '@/components/date-container';

interface CaptureHeaderProps {
    profile: any;
    defaultAvatarUrl: string;
    convertToLocalTimezone: (date: Date | string) => Date;
}

export const CaptureHeader = ({ profile, defaultAvatarUrl, convertToLocalTimezone }: CaptureHeaderProps) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push('/calendar')}
            >
                <Image
                    source={{
                        uri: profile?.avatar_url || defaultAvatarUrl
                    }}
                    style={styles.profileImage}
                />
            </TouchableOpacity>

            <DateContainer date={convertToLocalTimezone(new Date())} />

            <TouchableOpacity
                style={styles.friendsButton}
                onPress={() => router.push('/friends')}
            >
                <UserPlus color="#64748B" size={18} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    profileButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(20),
        borderWidth: 2,
        borderColor: '#8B5CF6',
        padding: scale(2),
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    friendsButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
});
