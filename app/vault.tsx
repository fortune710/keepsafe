import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { 
  SlideInUp,
  SlideInDown
} from 'react-native-reanimated';
import { useUserEntries } from '@/hooks/use-user-entries';
import { usePopupParams } from '@/hooks/use-popup-params';
import EntryReactionsPopup from '@/components/entry-reactions-popup';
import EntryCommentsPopup from '@/components/entry-comments-popup';
import VaultEntryCard from '@/components/entries/vault-entry-card';
import { EntryPage } from '@/components/entries/entry-page';
import PageFlipper from '@/components/entries/page-flipper';
import { scale, verticalScale } from 'react-native-size-matters';
import { FlashList } from '@shopify/flash-list';
import { VaultHeader } from '@/components/vault/vault-header';
import { DateContainer } from '@/components/date-container';

const { height, width } = Dimensions.get('window');

export default function VaultScreen() {
  const { entries, entriesByDate, isLoading, error, refetch } = useUserEntries();
  const { selectedEntryId, popupType, isPopupVisible, showReactions, showComments, hidePopup } = usePopupParams();

  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  const prevOffset = useRef(0);

  const handleScroll = (event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;

    if (currentOffset > prevOffset.current && isHeaderVisible) {
      //Scrolling downwards
      setIsHeaderVisible(false);
    } else if (currentOffset < prevOffset.current && !isHeaderVisible) {
      //Scrolling upwards
      setIsHeaderVisible(true);
    }

    prevOffset.current = currentOffset;
  };



  const handleEntryReactions = (entryId: string) => {
    showReactions(entryId);
  };

  const handleEntryComments = (entryId: string) => {
    showComments(entryId);
  };


  const renderContent = () => {
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

    if (entries.length === 0) {
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
      <PageFlipper
        data={Object.keys(entriesByDate)}
    
        //pageSize={{ width, height: 800 }}
        //contentContainerStyle={{}}
        renderPage={(key: string) => {
          const entries = entriesByDate[key];
          const entriesDate = new Date(key);

          return (
            <EntryPage>
              <FlashList
                data={entries}
                contentContainerStyle={styles.contentContainer}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                ListHeaderComponent={
                  <View style={styles.listHeader}>
                    <DateContainer date={entriesDate}/>
                  </View>
                }
                renderItem={({ item }) => (
                  <VaultEntryCard
                    entry={item as any}
                    key={item.id}
                    onReactions={handleEntryReactions}
                    onComments={handleEntryComments}
                  />
                )}
              />
            </EntryPage>
          )
        }}
      />
    );
  };

  return (
    <Animated.View 
      entering={SlideInDown.duration(400).springify().damping(20).stiffness(90)} 
      exiting={SlideInUp.duration(400).springify().damping(20).stiffness(90)}
      style={styles.container}
    >
      <>
        <VaultHeader isVisible={isHeaderVisible}/>

        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* Popups at screen level */}
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
      </>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  contentContainer: {
    paddingVertical: verticalScale(30)
  },
  listHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    marginTop: verticalScale(24)
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
  entryContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dateContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    flex: 1,
    maxHeight: height * 0.6,
  },
  entryImage: {
    width: '100%',
    height: 300,
  },
  audioContainer: {
    height: 300,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  audioWave: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#8B5CF6',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  entryContent: {
    padding: 24,
    flex: 1,
  },
  entryText: {
    fontSize: 18,
    color: '#1E293B',
    lineHeight: 26,
    marginBottom: 16,
  },
  entryMeta: {
    marginBottom: 20,
    gap: 8,
  },
  musicTag: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  locationTag: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '500',
  },
  privateTag: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  navigationContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  progressIndicator: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  swipeHintText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});