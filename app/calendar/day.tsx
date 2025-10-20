import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ArrowLeft, CircleAlert as AlertCircle } from 'lucide-react-native';
import VaultEntryCard from '@/components/entries/vault-entry-card';
import { useUserEntries } from '@/hooks/use-user-entries';
import { DateContainer } from '@/components/date-container';
import { EntryPage } from '@/components/entries/entry-page';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getEntriesForDate } from '@/lib/utils';
import { verticalScale } from 'react-native-size-matters';

export default function CalendarDayScreen() {
  const { date } = useLocalSearchParams();
  const { entries, isLoading, error } = useUserEntries();

  const selectedDate = date as string;

  // Filter entries for the selected date
  const dayEntries = React.useMemo(() => {
    return getEntriesForDate(selectedDate, entries);
  }, [entries, selectedDate]);

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
        renderItem={({ item }) => (
          <VaultEntryCard
            key={item.id}
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
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft color="#64748B" size={24} />
              </TouchableOpacity>
              <DateContainer date={new Date(selectedDate)}/>
              <View style={{ width: 40 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: verticalScale(30)
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
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
  entriesScroll: {
    flex: 1,
  },
  entriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});