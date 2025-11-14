import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, X } from 'lucide-react-native';
import { FRIENDSHIP_STATUS } from '@/constants/supabase';
import { Colors } from '@/lib/constants';
import { SuggestedFriend } from '@/types/friends';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { scale, verticalScale } from 'react-native-size-matters';



interface FriendItemProps {
  friend: SuggestedFriend;
  onAccept?: (friendshipId: string) => void;
  index?: number;
}

export default function SuggestedFriendItem({ friend, onAccept, index = 0 }: FriendItemProps) {
  const handleAccept = () => {}


  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).duration(300).springify().damping(20).stiffness(90)}
    >
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: friend.avatar ?? getDefaultAvatarUrl(friend.name) }} 
            style={styles.avatar} 
          />
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendEmail}>{friend.username}</Text>
        </View>

        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAccept}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
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
    borderColor: Colors.primary
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 100
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
  addButton: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: 15, // medium border radius
    backgroundColor: Colors.primary,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    display: "flex",
    flexDirection: "row"
  },
  addButtonText: {
    fontSize: scale(10),
    color: 'white',
    fontWeight: '600',
    marginLeft: scale(6)
  },
});