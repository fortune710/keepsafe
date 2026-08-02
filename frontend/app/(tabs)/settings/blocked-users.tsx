import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserX, X } from 'lucide-react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { useFriends } from '@/hooks/use-friends';
import { useToast } from '@/hooks/use-toast';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { router } from 'expo-router';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { Colors } from '@/lib/constants';
import { BackButton } from '@/components/back-button';

export default function BlockedUsersScreen() {
  const { profile } = useAuthContext();
  const { blockedFriends, isLoading, unblockFriend } = useFriends(profile?.id);
  const { toast } = useToast();

  const handleBack = () => {
    return router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View className="flex flex-row items-center justify-between px-5 py-4" style={styles.header}>
        <BackButton onPress={handleBack} />
        <Text style={styles.title}>Blocked Users</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading blocked users...</Text>
          </View>
        ) : blockedFriends.length === 0 ? (
          <View style={styles.emptyState}>
            <UserX color="#9CA3AF" size={40} />
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyDescription}>
              You haven't blocked any friends yet.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {blockedFriends.map((friend) => {
              const handleUnblock = () => {
                Alert.alert(
                  'Unblock User',
                  `Are you sure you want to unblock ${friend.friend_profile?.full_name || 'this user'}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Unblock',
                      style: 'destructive',
                      onPress: async () => {
                        const result = await unblockFriend(friend.id);
                        if (result.success) {
                          toast('User unblocked successfully', 'success');
                        } else {
                          toast(result.error || 'Failed to unblock user', 'error');
                        }
                      },
                    },
                  ],
                );
              };

              const avatarUrl = friend.friend_profile?.avatar_url ?? getDefaultAvatarUrl(
                friend.friend_profile?.full_name || friend.friend_profile?.username || ""
              );
              
              return (
                <View key={friend.id} style={styles.userItem}>
                  <View style={styles.avatarContainer}>
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                          {(friend.friend_profile?.full_name?.[0] || friend.friend_profile?.username?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{friend.friend_profile?.full_name || 'Unknown User'}</Text>
                    <Text style={styles.userDetail}>{friend.friend_profile?.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={handleUnblock}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X color={Colors.danger} strokeWidth={3} size={18} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginTop: 12,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContainer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(24),
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    paddingLeft: scale(2),
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: moderateScale(14),
    fontFamily: 'Outfit-Bold',
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  userDetail: {
    fontSize: moderateScale(12),
    fontFamily: 'Jost-SemiBold',
    color: Colors.textMuted,
  },
  unblockButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.danger}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


