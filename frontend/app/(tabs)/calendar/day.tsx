import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChevronLeft, CircleAlert as AlertCircle } from 'lucide-react-native';
import VaultEntryCard from '@/components/entries/vault-entry-card';
import { useUserEntries } from '@/hooks/use-user-entries';
import { DateContainer } from '@/components/date-container';
import { EntryPage } from '@/components/entries/entry-page';
import { FlashList } from '@shopify/flash-list';
import { getEntriesForDate } from '@/lib/utils';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTimezone } from '@/hooks/use-timezone';
import { Colors } from '@/lib/constants';
import { TAB_BAR_CONTENT_PADDING } from '@/constants/tab-bar';

export default function CalendarDayScreen() {
  const { date } = useLocalSearchParams();
  const { entries, isLoading, error } = useUserEntries();
  const { getLocalDateString, isUTC } = useTimezone();
  const [headerHeight, setHeaderHeight] = useState(verticalScale(110));

  const selectedDate = date as string;
  console.log(selectedDate);

  // Filter entries for the selected date
  const dayEntries = React.useMemo(() => {
    return getEntriesForDate(selectedDate, entries, { getLocalDateString, isUTC });
  }, [entries, selectedDate, getLocalDateString, isUTC]);

  // Swipe right gesture to go back
  const swipeRightGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX > 100 && event.velocityX > 500) {
        router.back();
      }
    });

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle color="#EF4444" size={48} />
          <Text style={styles.errorTitle}>Unable to Load Entries</Text>
          <Text style={styles.errorMessage}>Something went wrong loading your entries for this day</Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      );
    }

    if (dayEntries.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No entries for this day</Text>
          <Text style={styles.emptySubtext}>You didn't capture any moments on this date</Text>
        </View>
      );
    }

    return (
      <FlashList
        data={dayEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: Math.max(0, headerHeight - verticalScale(16)), paddingBottom: TAB_BAR_CONTENT_PADDING }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <DateContainer timezone="UTC" date={new Date(selectedDate)} />
          </View>
        }
        renderItem={({ item }) => (
          <VaultEntryCard
            entry={item}
          />
        )}
      />
    );
  };

  return (
    <GestureDetector gesture={swipeRightGesture}>
      <Animated.View 
        entering={SlideInRight.duration(300).springify().damping(20).stiffness(90)} 
        exiting={SlideOutRight.duration(300).springify().damping(20).stiffness(90)}
        style={styles.container}
      >
        <>
          <EntryPage>
            <View style={styles.header} pointerEvents="box-none" onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ChevronLeft color="#64748B" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {renderContent()}
            </View>

          </EntryPage>
        </>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(12),
  },
  backButton: {
    padding: scale(10),
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 100,
  },
  listHeader: { alignItems: 'center', justifyContent: 'center', marginVertical: verticalScale(8) },
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
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
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
  },
});
