import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Users } from 'lucide-react-native';
import FriendItem, { Friend } from './friend-item';
import { FRIENDSHIP_STATUS } from '@/constants/supabase';
import Badge from './ui/badge';

interface FriendsSectionProps {
  friends: Friend[];
  onRemoveFriend: (friendId: string) => void;
  onFriendPress?: (friend: Friend) => void;
  onAcceptRequest?: (friendshipId: string) => void;
  onDeclineRequest?: (friendshipId: string) => void;
  onBlockFriend?: (friendshipId: string) => void;
  isLoading?: boolean;
  searchQuery?: string;
}

export default function FriendsSection({ 
  friends, 
  onRemoveFriend, 
  onFriendPress, 
  onAcceptRequest,
  onDeclineRequest,
  onBlockFriend,
  isLoading = false,
  searchQuery = ''
}: FriendsSectionProps) {
  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const connectedFriends = filteredFriends.filter(f => f.status === FRIENDSHIP_STATUS.ACCEPTED as string);
  const pendingFriends = filteredFriends.filter(f => f.status === FRIENDSHIP_STATUS.PENDING as string);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading friends...</Text>
      </View>
    );
  }

  if (filteredFriends.length === 0 && searchQuery) {
    return (
      <View style={styles.emptyState}>
        <Users color="#94A3B8" size={48} />
        <Text style={styles.emptyText}>No friends found</Text>
        <Text style={styles.emptySubtext}>Try searching with a different name or email</Text>
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Users color="#94A3B8" size={48} />
        <Text style={styles.emptyText}>No friends yet</Text>
        <Text style={styles.emptySubtext}>Share your invite link to connect with friends</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {connectedFriends.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Users color="#10B981" size={16} />
            <Text style={styles.sectionTitle}>
              Connected
            </Text>
            <Badge style={styles.connectedBadge} text={connectedFriends.length} />
          </View>
          
          {connectedFriends.map((friend, index) => (
            <FriendItem
              key={friend.id}
              friend={friend}
              onRemove={onRemoveFriend}
              onPress={onFriendPress}
              onAccept={onAcceptRequest}
              onDecline={onDeclineRequest}
              onBlock={onBlockFriend}
              index={index}
            />
          ))}
        </>
      )}

      {pendingFriends.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Users color="#F59E0B" size={16} />
            <Text style={styles.sectionTitle}>
              Pending
            </Text>
            <Badge style={styles.pendingBadge} text={pendingFriends.length} />
          </View>
          
          {pendingFriends.map((friend, index) => (
            <FriendItem
              key={friend.id}
              friend={friend}
              onRemove={onRemoveFriend}
              onPress={onFriendPress}
              onAccept={onAcceptRequest}
              onDecline={onDeclineRequest}
              onBlock={onBlockFriend}
              index={connectedFriends.length + index}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  connectedBadge: { marginLeft: 5, backgroundColor: "#10B981" },
  pendingBadge: { marginLeft: 5, backgroundColor: "#F59E0B" },
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
});