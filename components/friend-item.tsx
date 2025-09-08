import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';

export interface Friend {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'connected' | 'pending' | 'invited';
  invitedAt?: Date;
  connectedAt?: Date;
  isOnline?: boolean;
}

interface FriendItemProps {
  friend: Friend;
  onRemove: (friendId: string) => void;
  onPress?: (friend: Friend) => void;
  onAccept?: (friendshipId: string) => void;
  onDecline?: (friendshipId: string) => void;
  index?: number;
}

export default function FriendItem({ friend, onRemove, onPress, onAccept, onDecline, index = 0 }: FriendItemProps) {
  const handleRemove = () => {
    if (friend.status === 'pending') {
      // For pending requests, show accept/decline options
      Alert.alert(
        'Friend Request',
        `${friend.name} wants to connect with you`,
        [
          { text: 'Decline', style: 'destructive', onPress: () => onDecline?.(friend.id) },
          { text: 'Accept', onPress: () => onAccept?.(friend.id) },
        ]
      );
    } else {
      // For connected friends, show remove option
      Alert.alert(
        'Remove Friend',
        `Are you sure you want to remove ${friend.name} from your friends?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => onRemove(friend.id)
          },
        ]
      );
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(friend);
    }
  };

  const getStatusColor = () => {
    switch (friend.status) {
      case 'connected':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'invited':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (friend.status) {
      case 'connected':
        return friend.isOnline ? 'Online' : 'Connected';
      case 'pending':
        return 'Invitation pending';
      case 'invited':
        return 'Invited';
      default:
        return '';
    }
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).duration(300).springify().damping(20).stiffness(90)}
    >
      <TouchableOpacity 
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: friend.avatar }} style={styles.avatar} />
          {friend.status === 'connected' && (
            <View 
              style={[
                styles.statusIndicator, 
                { backgroundColor: friend.isOnline ? '#10B981' : '#6B7280' }
              ]} 
            />
          )}
          <View style={[styles.avatarBorder, { borderColor: getStatusColor() }]} />
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendEmail}>{friend.email}</Text>
          {friend.status !== 'connected' && (
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.removeButton}
          onPress={handleRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {friend.status === 'pending' ? (
            <Text style={styles.pendingText}>Tap</Text>
          ) : (
            <X color="#EF4444" size={18} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
});