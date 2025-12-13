import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserX } from 'lucide-react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { useFriends } from '@/hooks/use-friends';
import { useToast } from '@/hooks/use-toast';
import { scale, verticalScale } from 'react-native-size-matters';
import { router } from 'expo-router';

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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Users</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Friends</Text>
          <Text style={styles.sectionDescription}>
            These users can no longer view your content or interact with you.
          </Text>
        </View>

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

              return (
                <View key={friend.id} style={styles.userItem}>
                  <View style={styles.avatarContainer}>
                    <Image
                      source={{ uri: friend.friend_profile?.avatar_url || undefined }}
                      style={styles.avatar}
                    />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{friend.friend_profile?.full_name || 'Unknown User'}</Text>
                    <Text style={styles.userDetail}>{friend.friend_profile?.username}</Text>
                  </View>
                  <TouchableOpacity style={styles.unblockButton} onPress={handleUnblock}>
                    <Text style={styles.unblockText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: '#F0F9FF',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(8),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContainer: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(24),
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2933',
  },
  userDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  unblockButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
});


