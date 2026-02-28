import React from 'react';
import FriendSearchBar from '@/components/friend-search-bar';
import FriendsSection from '@/components/friends-section';

interface FriendsSearchViewProps {
    searchQuery: string;
    onSearch: (query: string) => void;
    onClose: () => void;
    allFriends: any[];
    handleRemoveFriend: (id: string) => void;
    handleAcceptRequest: (id: string) => void;
    handleDeclineRequest: (id: string) => void;
    handleBlockFriend: (id: string) => void;
}

/**
 * View for searching within existing friends.
 * Uses ES5 function declaration for the component.
 */
export function FriendsSearchView(props: FriendsSearchViewProps) {
    const {
        searchQuery,
        onSearch,
        onClose,
        allFriends,
        handleRemoveFriend,
        handleAcceptRequest,
        handleDeclineRequest,
        handleBlockFriend
    } = props;

    return (
        <>
            <FriendSearchBar
                isVisible={true}
                onClose={onClose}
                onSearch={onSearch}
                placeholder="Search friends by name or email..."
            />
            <FriendsSection
                friends={allFriends}
                onRemoveFriend={handleRemoveFriend}
                onAcceptRequest={handleAcceptRequest}
                onDeclineRequest={handleDeclineRequest}
                onBlockFriend={handleBlockFriend}
                isLoading={false}
                searchQuery={searchQuery}
            />
        </>
    );
}
