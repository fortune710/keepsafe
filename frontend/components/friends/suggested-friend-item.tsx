import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, X } from 'lucide-react-native';
import { FRIENDSHIP_STATUS } from '@/constants/supabase';
import { Colors } from '@/lib/constants';
import { SuggestedFriend } from '@/types/friends';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useInviteAcceptance } from '@/hooks/use-invite-acceptance';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useSuggestedFriends } from '@/hooks/use-suggested-friends';
import { useFriends } from '@/hooks/use-friends';

interface FriendItemProps {
  friend: SuggestedFriend;
  index: number;
}

export default function SuggestedFriendItem({ friend, index }: FriendItemProps) {
  const { profile } = useAuthContext();
  const { acceptInvite: sendFriendRequest, isProcessing } = useInviteAcceptance();
  const { toast: showToast } = useToast();
  const { removeContactFromList } = useSuggestedFriends();
  const { checkFriendStatus } = useFriends();

  const friendStatus = checkFriendStatus(friend.id);

  const handleAccept = async () => {
    if (!profile?.id) {
      return showToast('Please login to send a friend request', 'error');
    }
    const result = await sendFriendRequest(friend.id, profile.id);
    if (result.success) {
      // Remove contact from list optimistically
      removeContactFromList(friend.id);
      return showToast('Friend request sent', 'success');
    } else {
      return showToast(result.message || 'Failed to send friend request', 'error');
    }
  }


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

        {
          !friendStatus ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAccept}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isProcessing}
            >
              <Plus color={Colors.white} strokeWidth={3} size={20} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          ) :
            friendStatus === FRIENDSHIP_STATUS.PENDING || friendStatus === FRIENDSHIP_STATUS.ACCEPTED ? (
              <TouchableOpacity
                style={styles.pendingButton}
                disabled={true}
              >
                <Plus color={Colors.white} strokeWidth={3} size={20} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.blockedButton}
                disabled={true}
              >
                <X color={Colors.white} strokeWidth={3} size={20} />
                <Text style={styles.addButtonText}>Blocked</Text>
              </TouchableOpacity>
            )
        }

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    //backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: verticalScale(10),
    //marginBottom: verticalScale(0),
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: moderateScale(14),
    fontWeight: '600',
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: moderateScale(12),
    fontFamily: 'Jost-SemiBold',
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
    borderRadius: scale(99), // medium border radius
    backgroundColor: Colors.primary,
    minWidth: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    display: "flex",
    flexDirection: "row"
  },
  pendingButton: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(99), // medium border radius
    backgroundColor: Colors.text,
    opacity: 0.5,
    minWidth: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    display: "flex",
    flexDirection: "row"
  },
  blockedButton: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(99), // medium border radius
    backgroundColor: Colors.danger,
    opacity: 0.5,
    minWidth: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    display: "flex",
    flexDirection: "row"
  },
  addButtonText: {
    fontSize: moderateScale(12),
    color: Colors.white,
    fontWeight: '600',
    fontFamily: 'Outfit-Bold',
    marginLeft: scale(6),
  },
});