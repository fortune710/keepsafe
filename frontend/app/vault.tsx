import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useUserEntries } from '@/hooks/use-user-entries';
import { usePopupParams } from '@/hooks/use-popup-params';
import EntryReactionsPopup from '@/components/entry-reactions-popup';
import EntryCommentsPopup from '@/components/entry-comments-popup';
import VaultEntryCard from '@/components/entries/vault-entry-card';
import { EntryPage } from '@/components/entries/entry-page';
import { scale, verticalScale } from 'react-native-size-matters';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { DateContainer } from '@/components/date-container';
import AudioPreviewPopover from '@/components/capture/music/audio-preview-popover';
import { MusicTag } from '@/types/capture';
import { useResponsive } from '@/hooks/use-responsive';
import { ChevronLeft, Sparkles, Users } from 'lucide-react-native';
import { Colors } from '@/lib/constants';
import NewEntriesIndicator from '@/components/new-entries-indicator';
import { useToast } from '@/hooks/use-toast';
import { EntryWithProfile } from '@/types/entries';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMutation } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import FriendFilterPopover from '@/components/vault/friend-filter-popover';
import { useAuthContext } from '@/providers/auth-provider';
import { useFriends } from '@/hooks/use-friends';
import { useReportedEntries } from '@/hooks/use-reported-entries';
import { getDefaultAvatarUrl } from '@/lib/utils';
import EmptyFriendVault from '@/components/vault/empty-friend-vault';
import { deviceStorage } from '@/services/device-storage';

const MUSIC_PLAYER_ANIMATION_DURATION = 300;
const MUSIC_PLAYER_CLEANUP_DELAY = MUSIC_PLAYER_ANIMATION_DURATION + 50;

export default function VaultScreen() {
  const { profile, user } = useAuthContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ friendId?: string | string[] }>();
  const selectedFriendId = Array.isArray(params.friendId) ? params.friendId[0] : params.friendId;
  const responsive = useResponsive();
  const { toast } = useToast();
  const { friends, blockFriend: blockFriendAction } = useFriends(profile?.id);
  const { reportedPostIds } = useReportedEntries();
  const {
    entries,
    entriesByDate,
    isLoading,
    isFetchingNextPage,
    error,
    refetch,
    retryEntry,
    unseenEntryIds,
    markEntriesAsSeen,
    loadMore,
  } = useUserEntries(selectedFriendId);
  const { selectedEntryId, popupType, isPopupVisible, hidePopup } = usePopupParams();
  const reportedPostIdSet = new Set(reportedPostIds);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const filteredEntriesByDate: Record<string, EntryWithProfile[]> = Object.fromEntries(
    Object.entries(entriesByDate || {}).map(([date, dateEntries]) => {
      const visibleDateEntries = (dateEntries as EntryWithProfile[])
        .filter((entry) => !reportedPostIdSet.has(entry.id))
        .filter((entry) => !blockedUserIds.has(entry.user_id));
      return [date, visibleDateEntries];
    }).filter(([, dateEntries]) => dateEntries.length > 0)
  ) as Record<string, EntryWithProfile[]>;
  const visibleEntriesCount = Object.values(filteredEntriesByDate).reduce((count, dateEntries) => count + dateEntries.length, 0);

  const [selectedMusic, setSelectedMusic] = useState<MusicTag | null>(null);
  const [isMusicPlayerVisible, setIsMusicPlayerVisible] = useState(false);
  const [isFriendFilterVisible, setIsFriendFilterVisible] = useState(false);

  const musicPlayerCleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashListRef = useRef<FlashListRef<string>>(null);

  const handleMusicPress = (music: MusicTag) => {
    if (musicPlayerCleanupTimeoutRef.current) {
      clearTimeout(musicPlayerCleanupTimeoutRef.current);
      musicPlayerCleanupTimeoutRef.current = null;
    }

    setSelectedMusic(music);
    setIsMusicPlayerVisible(true);
  };

  const closeMusicPlayer = () => {
    setIsMusicPlayerVisible(false);
    if (musicPlayerCleanupTimeoutRef.current) {
      clearTimeout(musicPlayerCleanupTimeoutRef.current);
    }

    musicPlayerCleanupTimeoutRef.current = setTimeout(() => {
      setSelectedMusic(null);
      musicPlayerCleanupTimeoutRef.current = null;
    }, MUSIC_PLAYER_CLEANUP_DELAY);
  };

  useEffect(() => {
    return () => {
      if (!musicPlayerCleanupTimeoutRef.current) return;
      clearTimeout(musicPlayerCleanupTimeoutRef.current);
      musicPlayerCleanupTimeoutRef.current = null;
    };
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 500,
  }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    const visibleEntryIds: string[] = [];

    viewableItems.forEach(item => {
      const dateKey = item.item;
      const dateEntries = filteredEntriesByDate[dateKey] || [];
      dateEntries.forEach((entry: any) => {
        if (!unseenEntryIds.has(entry.id)) return;
        visibleEntryIds.push(entry.id);
      });
    });

    if (!visibleEntryIds.length) return;
    markEntriesAsSeen(visibleEntryIds);
  }, [filteredEntriesByDate, unseenEntryIds, markEntriesAsSeen]);

  const scrollToTop = () => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const friendOptions = friends.map((friend) => ({
    id: friend.friend_profile.id,
    label: friend.friend_profile.full_name || friend.friend_profile.username || 'Unknown User',
    avatar: friend.friend_profile.avatar_url ? (
      <Image
        source={{ uri: friend.friend_profile.avatar_url }}
        style={styles.friendAvatar}
      />
    ) : (
      <Image
        source={{ uri: getDefaultAvatarUrl(friend.friend_profile.full_name || friend.friend_profile.username || 'Unknown User') }}
        style={styles.friendAvatar}
      />
    ),
  }));

  const selectedFriend = friendOptions.find((friend) => friend.id === selectedFriendId);
  const friendFilterAccessibilityLabel = selectedFriend
    ? `Open friend filter. Currently filtering by ${selectedFriend.label}`
    : 'Open friend filter';

  const handleFriendFilterSelect = (friendId?: string) => {
    router.setParams({ friendId: friendId || undefined });
  };

  const saveEntryMutation = useMutation({
    mutationFn: async (entry: EntryWithProfile) => {
      if (!entry.content_url) {
        throw new Error('This entry has no media to save.');
      }

      const typeToExtension: Record<string, string> = {
        video: 'mp4',
        audio: 'mp3',
        photo: 'jpg',
        image: 'jpg',
      };

      const parsedUrl = entry.content_url.split('?')[0] || '';
      const derivedExtension = parsedUrl.includes('.') ? parsedUrl.split('.').pop()?.toLowerCase() : '';
      const safeExtension = derivedExtension && /^[a-z0-9]+$/.test(derivedExtension) ? derivedExtension : '';
      const extension = typeToExtension[entry.type] || safeExtension || 'bin';
      const fileName = `${entry.id}.${extension}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      try {
        const downloadResult = await FileSystem.downloadAsync(entry.content_url, fileUri);

        if (downloadResult.status !== 200) {
          throw new Error('Failed to download this entry.');
        }

        if (!await Sharing.isAvailableAsync()) {
          throw new Error('Sharing is not available on this device.');
        }

        await Sharing.shareAsync(downloadResult.uri, { dialogTitle: 'Save to Photos' });
      } finally {
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        } catch (cleanupError) {
          logger.warn('Unable to clean temporary entry media file', cleanupError);
        }
      }
    },
    onSuccess: () => {
      toast('Use Save Image/Video from the share sheet to add this entry to your library.');
    },
    onError: (mutationError: Error) => {
      toast(mutationError.message || 'Unable to save this entry.', 'error');
    },
  });


  const removeUserEntriesFromDevice = useCallback(async (blockedUserId: string) => {
    if (!user?.id) return;

    const blockedUserEntryIds = entries
      .filter((vaultEntry) => vaultEntry.user_id === blockedUserId)
      .map((vaultEntry) => vaultEntry.id);

    if (!blockedUserEntryIds.length) return;
    await Promise.all(blockedUserEntryIds.map((entryId) => deviceStorage.removeEntry(user.id, entryId)));
  }, [entries, user?.id]);

  const handleBlockUser = useCallback((entry: EntryWithProfile) => {
    const friendship = friends.find((friend) => friend.friend_profile.id === entry.user_id);
    if (!friendship) {
      toast('Unable to block this user right now.', 'error');
      return;
    }

    const friendName = entry.profile?.full_name || entry.profile?.username || 'this user';
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${friendName}? They will no longer be able to interact with you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const result = await blockFriendAction(friendship.id);
            if (!result.success) {
              toast(result.error || 'Failed to block user', 'error');
              return;
            }

            setBlockedUserIds((prev) => new Set(prev).add(entry.user_id));
            await removeUserEntriesFromDevice(entry.user_id);
            toast('User blocked successfully', 'success');
            if (selectedFriendId === entry.user_id) {
              router.setParams({ friendId: undefined });
            }
          }
        }
      ]
    );
  }, [blockFriendAction, friends, removeUserEntriesFromDevice, router, selectedFriendId, toast]);

  const handleEntryActions = (entry: EntryWithProfile) => {
    Alert.alert(
      'Entry Actions',
      `What do you want to do with this diary entry from ${entry.profile?.full_name || 'Unknown User'}?`,
      [
        {
          text: 'Save',
          onPress: () => saveEntryMutation.mutate(entry),
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Report this entry?',
              'Are you sure you want to report this diary entry?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Report',
                  style: 'destructive',
                  onPress: () => {
                    router.push({ pathname: '/report-entry', params: { entryId: entry.id } });
                  }
                }
              ]
            );
          }
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () => handleBlockUser(entry),
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Entries</Text>
        <Text style={styles.errorMessage}>{error.message || 'Something went wrong'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading your entries...</Text>
      </View>
    );
  }

  if ((!entries || visibleEntriesCount === 0) && !params.friendId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No entries yet</Text>
        <Text style={styles.emptySubtext}>Start capturing moments to see them here</Text>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={() => router.back()}
        >
          <Text style={styles.captureButtonText}>Start Capturing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={styles.container}>
      <View style={styles.content}>
        <EntryPage>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityHint="Returns to the previous screen"
          >
            <ChevronLeft color="#64748B" size={24} />
          </Pressable>
          <Pressable
            style={styles.sparklesButton}
            onPress={() => router.push('/search')}
            accessibilityLabel="Open search"
            accessibilityHint="Navigates to the search screen"
          >
            <Sparkles color="#64748B" size={24} />
          </Pressable>
          <Pressable
            style={styles.friendFilterFab}
            onPress={() => setIsFriendFilterVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={friendFilterAccessibilityLabel}
            accessibilityHint="Opens the friend filter menu"
          >
            {selectedFriend ? (
              <>{selectedFriend.avatar}</>
            ) : (
              <View accessible={false}>
                <Users color="#64748B" size={24} />
              </View>
            )}
          </Pressable>


          <FlashList
            ref={flashListRef}
            data={Object.keys(filteredEntriesByDate)}
            contentContainerStyle={{
              ...styles.contentContainer,
              ...(responsive.isTablet && {
                paddingHorizontal: responsive.contentPadding,
                maxWidth: responsive.maxContentWidth,
                alignSelf: 'center' as const,
                width: '100%',
              }),
            }}
            keyExtractor={(item) => item}
            scrollEnabled={!isMusicPlayerVisible}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              isFetchingNextPage ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                </View>
              ) : null
            )}
            ListEmptyComponent={() => (
              selectedFriend ? (
                <EmptyFriendVault friendName={selectedFriend.label} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No entries found</Text>
                </View>
              )
            )}
            renderItem={({ item }) => {
              const dateEntries = filteredEntriesByDate[item];
              if (!dateEntries || dateEntries.length === 0) {
                return null;
              }

              const [year, month, day] = item.split('-').map(Number);
              const entriesDate = new Date(year, month - 1, day);
              if (isNaN(entriesDate.getTime())) return null;

              return (
                <View>
                  <View style={styles.listHeader}>
                    <DateContainer date={entriesDate} />
                  </View>
                  {dateEntries.map((entry) => {
                    if (!entry?.id) return null;

                    return (
                      <VaultEntryCard
                        entry={entry as EntryWithProfile}
                        key={entry.id}
                        onRetry={retryEntry}
                        onMusicPress={handleMusicPress}
                        onLongPress={handleEntryActions}
                      />
                    );
                  })}
                </View>
              );
            }}
          />
        </EntryPage>
      </View>

      {unseenEntryIds.size > 0 && (
        <NewEntriesIndicator
          count={unseenEntryIds.size}
          onPress={scrollToTop}
          visible={unseenEntryIds.size > 0}
        />
      )}

      {isPopupVisible && selectedEntryId && (
        <>
          {popupType === 'reactions' && (
            <EntryReactionsPopup
              isVisible={true}
              entryId={selectedEntryId}
              onClose={hidePopup}
            />
          )}
          {popupType === 'comments' && (
            <EntryCommentsPopup
              isVisible={true}
              entryId={selectedEntryId}
              onClose={hidePopup}
            />
          )}
        </>
      )}

      {selectedMusic && (
        <AudioPreviewPopover
          music={selectedMusic}
          isVisible={isMusicPlayerVisible}
          onClose={closeMusicPlayer}
        />
      )}

      <FriendFilterPopover
        isVisible={isFriendFilterVisible}
        onClose={() => setIsFriendFilterVisible(false)}
        options={friendOptions}
        selectedFriendId={selectedFriendId}
        onSelect={handleFriendFilterSelect}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  contentContainer: {
    paddingVertical: verticalScale(30),
  },
  listHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: verticalScale(24)
  },
  backButton: {
    padding: scale(10),
    position: 'absolute',
    top: verticalScale(50),
    left: scale(20),
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 100,
    zIndex: 9999,
  },
  sparklesButton: {
    padding: scale(10),
    position: 'absolute',
    top: verticalScale(50),
    right: scale(20),
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 100,
    zIndex: 9999,
  },
  friendFilterFab: {
    padding: scale(10),
    position: 'absolute',
    bottom: verticalScale(30),
    right: scale(20),
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 100,
    zIndex: 9999,
  },
  friendAvatar: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
  },
  content: {
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  captureButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoading: {
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
