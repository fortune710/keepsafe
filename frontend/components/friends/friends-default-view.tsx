import React from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, RefreshControl } from 'react-native';
import { Search } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import FriendsSection from '@/components/friends-section';
import SuggestedFriendsList from '@/components/friends/suggested-friends-list';
import AddFriendsSection from '@/components/friends/add-friends-section';
import { SearchMode, SuggestedFriend } from '@/types/friends';

interface FriendsDefaultViewProps {
    allFriends: any[];
    suggestedFriends: SuggestedFriend[];
    onSearchToggle: (mode: Exclude<SearchMode, null>) => void;
    handleRemoveFriend: (id: string) => void;
    handleAcceptRequest: (id: string) => void;
    handleDeclineRequest: (id: string) => void;
    handleBlockFriend: (id: string) => void;
    handleShareLink: () => void;
    refreshing: boolean;
    handleRefresh: () => void;
}

/**
 * Default view for the Friends screen when not searching.
 */
export function FriendsDefaultView({
    allFriends,
    suggestedFriends,
    onSearchToggle,
    handleRemoveFriend,
    handleAcceptRequest,
    handleDeclineRequest,
    handleBlockFriend,
    handleShareLink,
    refreshing,
    handleRefresh
}: FriendsDefaultViewProps) {

    const openSearchView = () => {
        if (allFriends.length === 0) {
            return onSearchToggle('contacts');
        }
        return onSearchToggle('friends');
    }


    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#8B5CF6"
                    colors={['#8B5CF6']}
                />
            }
        >
            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.searchBox}
                    onPress={openSearchView}
                    activeOpacity={0.7}
                >
                    <Search color="#94A3B8" strokeWidth={3} size={20} />
                    <Text style={styles.searchPlaceholder}>Search contacts</Text>
                </TouchableOpacity>

                {allFriends.length > 0 ? (
                    <FriendsSection
                        friends={allFriends}
                        onRemoveFriend={handleRemoveFriend}
                        onAcceptRequest={handleAcceptRequest}
                        onDeclineRequest={handleDeclineRequest}
                        onBlockFriend={handleBlockFriend}
                        isLoading={false}
                        searchQuery=""
                    />
                ) : null}

                <SuggestedFriendsList friends={suggestedFriends} />
                <AddFriendsSection showModal={handleShareLink} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingBottom: 40,
        maxWidth: 900,
        alignSelf: 'center',
        width: '100%',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: verticalScale(8),
        marginBottom: verticalScale(16),
    },
    searchPlaceholder: {
        fontSize: scale(14),
        fontFamily: 'Jost-SemiBold',
        fontWeight: '600',
        color: '#94A3B8',
        marginLeft: scale(12),
    },
});
