import React, { useState, useEffect } from 'react';
import { View, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import InvitePopover from '@/components/invite-popover';
import { useFriends } from '@/hooks/use-friends';
import { useAuthContext } from '@/providers/auth-provider';
import { useSuggestedFriends } from '@/hooks/use-suggested-friends';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/hooks/use-responsive';
import { LocalNotificationService } from '@/services/local-notification-service';
import { logger } from '@/lib/logger';
import { useContactSearch, ContactSearchResult } from '@/hooks/use-contact-search';
import { getDefaultAvatarUrl } from '@/lib/utils';

// Import refactored components
import { FriendsHeader } from '@/components/friends/friends-header';
import { LoadingState } from '@/components/friends/loading-state';
import { ErrorState } from '@/components/friends/error-state';
import { FriendsDefaultView } from '@/components/friends/friends-default-view';
import { ContactSearchView } from '@/components/friends/contact-search-view';
import { FriendsSearchView } from '@/components/friends/friends-search-view';
import { SearchMode } from '@/types/friends';



/**
 * Main screen for managing friends and contacts.
 * Refactored to use modular components and searchMode state.
 */
export default function FriendsScreen() {
  const { profile } = useAuthContext();
  const { refresh } = useLocalSearchParams();
  const { toast: showToast } = useToast();

  const {
    friends,
    pendingRequests,
    isLoading,
    error,
    removeFriend: removeFriendAction,
    blockFriend: blockFriendAction,
    acceptFriendRequest: acceptFriendRequestAction,
    declineFriendRequest: declineFriendRequestAction,
    refetch,
    refreshFriends,
    sendFriendRequest: sendFriendRequestAction,
  } = useFriends(profile?.id);


  const { suggestedFriends } = useSuggestedFriends();


  // Local state
  const [showInvitePopover, setShowInvitePopover] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Contact search fetching using useQuery through hook
  const { results: contactResults, isLoading: isContactSearchLoading } = useContactSearch(
    searchMode === 'contacts' ? searchQuery : ''
  );

  // Event Handlers
  const handleRemoveFriend = async (friendshipId: string) => {
    const result = await removeFriendAction(friendshipId);
    if (result.success) {
      showToast('Friend removed successfully', 'success');
    } else {
      showToast(result.error || 'Failed to remove friend', 'error');
    }
  };

  const handleBlockFriend = async (friendshipId: string) => {
    const result = await blockFriendAction(friendshipId);
    if (result.success) {
      showToast('Friend blocked successfully', 'success');
      await refetch();
    } else {
      showToast(result.error || 'Failed to block friend', 'error');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const result = await acceptFriendRequestAction(friendshipId);
    if (result.success) {
      await LocalNotificationService.sendNotification({
        title: 'Friend Request Accepted',
        body: 'You are now friends!',
        sound: true,
      });
    } else {
      showToast(result.error || 'Failed to accept request', 'error');
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    const result = await declineFriendRequestAction(friendshipId);
    if (result.success) {
      showToast('Friend request declined', 'success');
    } else {
      showToast(result.error || 'Failed to decline request', 'error');
    }
  };

  const handleAddKeepsafeFriend = async (friendId: string) => {
    try {
      const result = await sendFriendRequestAction(friendId);
      if (result.success) {
        showToast('Friend request sent', 'success');
      } else {
        showToast(result.error || 'Failed to send friend request', 'error');
      }
    } catch (err) {
      showToast('Failed to send friend request', 'error');
    }
  };

  const handleInviteContact = (contact: ContactSearchResult) => {
    handleShareLink();
  };

  const handleShareLink = () => {
    setShowInvitePopover(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSearchToggle = (mode: Exclude<SearchMode, null>) => {
    setSearchMode(prev => (prev === mode ? null : mode));
    setSearchQuery('');
  };

  const handleRetry = () => {
    refetch();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFriends();
    } catch (err) {
      logger.warn('Error refreshing friends data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper to format friendships for the list component
  const allFriends = [...friends, ...pendingRequests].map((friendship) => ({
    id: friendship.id,
    name: friendship.friend_profile?.full_name || 'Unknown User',
    email: friendship.friend_profile?.email || '',
    username: friendship.friend_profile?.username || "",
    avatar: friendship.friend_profile?.avatar_url || getDefaultAvatarUrl(friendship.friend_profile?.full_name || 'U'),
    status: friendship.status,
    connectedAt: friendship.status === 'accepted' ? new Date(friendship.updated_at) : undefined,
    invitedAt: friendship.status === 'pending' ? new Date(friendship.created_at) : undefined,
    isOnline: false,
  }));


  return (
    <SafeAreaView style={styles.container}>
      <FriendsHeader title="Friends" />

      <View style={styles.viewContainer}>
        {error ? (
          <ErrorState
            title="Unable to Load Friends"
            message={error.message || 'Something went wrong'}
            onRetry={handleRetry}
          />
        ) : isLoading ? (
          <LoadingState message="Loading friends..." />
        ) : searchMode === 'contacts' ? (
          <ContactSearchView
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onClose={() => handleSearchToggle('contacts')}
            isContactSearchLoading={isContactSearchLoading}
            contactResults={contactResults}
            onAdd={handleAddKeepsafeFriend}
            onInvite={handleInviteContact}
          />
        ) : searchMode === 'friends' ? (
          <FriendsSearchView
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onClose={() => handleSearchToggle('friends')}
            allFriends={allFriends}
            handleRemoveFriend={handleRemoveFriend}
            handleAcceptRequest={handleAcceptRequest}
            handleDeclineRequest={handleDeclineRequest}
            handleBlockFriend={handleBlockFriend}
          />
        ) : (
          <FriendsDefaultView
            allFriends={allFriends}
            suggestedFriends={suggestedFriends}
            onSearchToggle={handleSearchToggle}
            handleRemoveFriend={handleRemoveFriend}
            handleAcceptRequest={handleAcceptRequest}
            handleDeclineRequest={handleDeclineRequest}
            handleBlockFriend={handleBlockFriend}
            handleShareLink={handleShareLink}
            refreshing={refreshing}
            handleRefresh={handleRefresh}
          />
        )}
      </View>


      <InvitePopover
        isVisible={showInvitePopover}
        onClose={() => setShowInvitePopover(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  viewContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
