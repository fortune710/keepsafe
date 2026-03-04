import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
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
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { Colors } from '@/lib/constants';
import NewEntriesIndicator from '@/components/new-entries-indicator';
import { useToast } from '@/hooks/use-toast';
import { EntryWithProfile } from '@/types/entries';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useMutation } from '@tanstack/react-query';
import VaultEntryActionPopover from '@/components/vault/vault-entry-action-popover';

const MUSIC_PLAYER_ANIMATION_DURATION = 300;
const MUSIC_PLAYER_CLEANUP_DELAY = MUSIC_PLAYER_ANIMATION_DURATION + 50;

export default function VaultScreen() {
  const responsive = useResponsive();
  const { toast } = useToast();
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
  } = useUserEntries();
  const { selectedEntryId, popupType, isPopupVisible, hidePopup } = usePopupParams();

  const [selectedMusic, setSelectedMusic] = useState<MusicTag | null>(null);
  const [isMusicPlayerVisible, setIsMusicPlayerVisible] = useState(false);
  const [actionEntry, setActionEntry] = useState<EntryWithProfile | null>(null);

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
      const dateEntries = entriesByDate?.[dateKey] || [];
      dateEntries.forEach((entry: any) => {
        if (!unseenEntryIds.has(entry.id)) return;
        visibleEntryIds.push(entry.id);
      });
    });

    if (!visibleEntryIds.length) return;
    markEntriesAsSeen(visibleEntryIds);
  }, [entriesByDate, unseenEntryIds, markEntriesAsSeen]);

  const scrollToTop = () => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
      const downloadResult = await FileSystem.downloadAsync(entry.content_url, fileUri);

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download this entry.');
      }

      if (!await Sharing.isAvailableAsync()) {
        throw new Error('Sharing is not available on this device.');
      }

      await Sharing.shareAsync(downloadResult.uri, { dialogTitle: 'Save to Photos' });
    },
    onSuccess: () => {
      toast('Use Save Image/Video from the share sheet to add this entry to your library.');
    },
    onError: (mutationError: Error) => {
      toast(mutationError.message || 'Unable to save this entry.', 'error');
    },
  });

  const handleSaveEntry = () => {
    if (!actionEntry) return;

    saveEntryMutation.mutate(actionEntry);
    setActionEntry(null);
  };

  const handleReportEntry = () => {
    if (!actionEntry?.id) {
      setActionEntry(null);
      router.replace('/vault');
      return;
    }

    Alert.alert(
      'Report this entry?',
      'Are you sure you want to report this diary entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            const entryId = actionEntry.id;
            setActionEntry(null);
            router.push({ pathname: '/report-entry', params: { entryId } });
          }
        }
      ]
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

  if (!entries || entries.length === 0) {
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
          >
            <ChevronLeft color="#64748B" size={24} />
          </Pressable>
          <Pressable
            style={styles.sparklesButton}
            onPress={() => router.push('/search')}
          >
            <Sparkles color="#64748B" size={24} />
          </Pressable>
          <FlashList
            ref={flashListRef}
            data={entriesByDate ? Object.keys(entriesByDate) : []}
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
            renderItem={({ item }) => {
              const dateEntries = entriesByDate?.[item];
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
                        onLongPress={setActionEntry}
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

      <VaultEntryActionPopover
        isVisible={!!actionEntry}
        creatorName={actionEntry?.profile?.full_name || 'Unknown User'}
        onClose={() => setActionEntry(null)}
        onSave={handleSaveEntry}
        onReport={handleReportEntry}
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
