import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Plus, Mail } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '@/lib/constants';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { ContactSearchResult } from '@/hooks/use-contact-search';

interface ContactSearchItemProps {
    item: ContactSearchResult;
    index?: number;
    onAdd: (id: string) => void;
    onInvite: (item: ContactSearchResult) => void;
}

/**
 * Item component for contact search results.
 * Uses ES5 function declaration for the component.
 */
export function ContactSearchItem(props: ContactSearchItemProps) {
    const { item, index = 0, onAdd, onInvite } = props;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 50).duration(300).springify().damping(20).stiffness(90)}
        >
            <View style={styles.contactItem}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: item.avatar ?? getDefaultAvatarUrl(item.name) }}
                        style={styles.avatar}
                    />
                </View>

                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.username}>{item.username}</Text>
                </View>

                {item.isOnKeepsafe ? (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={function () { onAdd(item.id); }}
                    >
                        <Plus color={Colors.white} strokeWidth={3} size={20} />
                        <Text style={styles.buttonText}>Add</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: '#64748B' }]}
                        onPress={function () { onInvite(item); }}
                    >
                        <Mail color={Colors.white} strokeWidth={2} size={18} />
                        <Text style={[styles.buttonText, { marginLeft: scale(4) }]}>Invite</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(8),
        marginBottom: verticalScale(8),
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        fontFamily: 'Outfit-Bold',
        color: '#1E293B',
    },
    username: {
        fontSize: moderateScale(12),
        fontFamily: 'Jost-SemiBold',
        color: '#64748B',
    },
    addButton: {
        paddingVertical: verticalScale(6),
        paddingHorizontal: scale(12),
        borderRadius: scale(99),
        backgroundColor: Colors.primary,
        flexDirection: "row",
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: scale(70),
    },
    buttonText: {
        fontSize: moderateScale(12),
        color: Colors.white,
        fontWeight: '600',
        fontFamily: 'Outfit-Bold',
        marginLeft: scale(4),
    },
});
