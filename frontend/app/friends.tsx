import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Search, Share, ChevronRight, UserPlus, CircleAlert as AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import InvitePopover from '@/components/invite-popover';
import FriendSearchBar from '@/components/friend-search-bar';
import FriendsSection from '@/components/friends-section';
import { useFriends } from '@/hooks/use-friends';
import { useAuthContext } from '@/providers/auth-provider';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSuggestedFriends } from '@/hooks/use-suggested-friends';
import SuggestedFriendsList from '@/components/friends/suggested-friends-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


export default function FriendsScreen() {
  const { profile } = useAuthContext();
  const { 
    friends, 
    pendingRequests, 
    blockedFriends,
    isLoading, 
    error, 
    removeFriend,
    blockFriend,
    acceptFriendRequest,
    declineFriendRequest,
    refetch 
  } = useFriends(profile?.id);

  const { suggestedFriends } = useSuggestedFriends();

  const [showInvitePopover, setShowInvitePopover] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast: showToast } = useToast();


  const handleRemoveFriend = async (friendshipId: string) => {
    const result = await removeFriend(friendshipId);
    if (result.success) {
      showToast('Friend removed successfully', 'success');
    } else {
      showToast(result.error || 'Failed to remove friend', 'error');
    }
  };

  const handleBlockFriend = async (friendshipId: string) => {
    const result = await blockFriend(friendshipId);
    if (result.success) {
      showToast('Friend blocked successfully', 'success');
      await refetch();
    } else {
      showToast(result.error || 'Failed to block friend', 'error');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const result = await acceptFriendRequest(friendshipId);
    if (result.success) {
      showToast('Friend request accepted', 'success');
    } else {
      showToast(result.error || 'Failed to accept request', 'error');
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    const result = await declineFriendRequest(friendshipId);
    if (result.success) {
      showToast('Friend request declined', 'success');
    } else {
      showToast(result.error || 'Failed to decline request', 'error');
    }
  };

  const handleShareLink = () => {
    setShowInvitePopover(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  const handleRetry = () => {
    refetch();
  };

  // Convert friendship data to Friend format for components
  const convertToFriendFormat = (friendships: any[]) => {
    return friendships.map(friendship => ({
      id: friendship.id,
      name: friendship.friend_profile?.full_name || 'Unknown User',
      email: friendship.friend_profile?.email || '',
      username: friendship.friend_profile?.username || "",
      avatar: friendship.friend_profile?.avatar_url || getDefaultAvatarUrl(friendship.friend_profile?.full_name),
      status: friendship.status,
      connectedAt: friendship.status === 'accepted' ? new Date(friendship.updated_at) : undefined,
      invitedAt: friendship.status === 'pending' ? new Date(friendship.created_at) : undefined,
      isOnline: false, // Mock online status
    }));
  };

  const allFriends = convertToFriendFormat([...friends, ...pendingRequests]);

  return (
    <SafeAreaView style={styles.container}>
  
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <ChevronRight color="#64748B" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircle color="#EF4444" size={48} />
              <Text style={styles.errorTitle}>Unable to Load Friends</Text>
              <Text style={styles.errorMessage}>{error.message || 'Something went wrong'}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : (
            <>
              {!showSearch ? (
                <>
                  <TouchableOpacity 
                    style={styles.searchBox} 
                    onPress={handleSearchToggle}
                    activeOpacity={0.7}
                  >
                    <Search color="#94A3B8" size={20} />
                    <Text style={styles.searchPlaceholder}>Search friends...</Text>
                  </TouchableOpacity>

                  <View style={styles.addFriendsSection}>
                    <View style={styles.sectionHeader}>
                      <UserPlus color="#8B5CF6" size={16} />
                      <Text style={styles.sectionTitle}>Add Friends</Text>
                    </View>
                    
                    <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
                      <Share color="#8B5CF6" size={20} />
                      <Text style={styles.shareButtonText}>Share Your Link</Text>
                    </TouchableOpacity>
                  </View>

                  <SuggestedFriendsList friends={suggestedFriends}/>

                  <FriendsSection
                    friends={allFriends}
                    onRemoveFriend={handleRemoveFriend}
                    onAcceptRequest={handleAcceptRequest}
                    onDeclineRequest={handleDeclineRequest}
                    onBlockFriend={handleBlockFriend}
                    isLoading={false}
                    searchQuery=""
                  />
                </>
              ) : (
                <>
                  <FriendSearchBar
                    isVisible={showSearch}
                    onClose={() => setShowSearch(false)}
                    onSearch={handleSearch}
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
              )}
            </>
          )}
        </View>
      </ScrollView>
      
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
  pageStyle: {
    // SafeAreaView from react-native-safe-area-context handles safe area spacing
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    //marginBottom: verticalScale(8),
    backgroundColor: '#F0F9FF',
    //shadowColor: '#000',
    //shadowOffset: { width: 0, height: 2 },
    //shadowOpacity: 0.1,
    //shadowRadius: 4,
    //elevation: 3,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
    marginLeft: 12,
  },
  addFriendsSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shareButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});