import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ArrowLeft, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useEntries } from '@/hooks/use-entries';
import { useAuthContext } from '@/providers/auth-provider';
import VaultEntryCard from '@/components/vault-entry-card';
import { StorageService } from '@/services/storage-service';

export default function CalendarDayScreen() {
  const { date } = useLocalSearchParams();
  const { user } = useAuthContext();
  const { entries, isLoading, error } = useEntries(user?.id);

  const selectedDate = date as string;
  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Filter entries for the selected date
  const dayEntries = React.useMemo(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
      return entryDate === selectedDate;
    }).map(entry => ({
      id: entry.id,
      type: entry.type as 'photo' | 'video' | 'audio',
      content: entry.content_url || '',
      text: entry.text_content || '',
      music: entry.music_tag || undefined,
      location: entry.location_tag || undefined,
      date: new Date(entry.created_at),
      isPrivate: entry.is_private,
    }));
  }, [entries, selectedDate]);

  // Swipe right gesture to go back
  const swipeRightGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX > 100 && event.velocityX > 500) {
        router.back();
      }
    });

  const handleEntryPress = (entry: any) => {
    console.log('Entry pressed:', entry.id);
    // Navigate to entry details or perform other actions
  };

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
      <ScrollView 
        style={styles.entriesScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.entriesContent}
      >
        {dayEntries.map((entry, index) => (
          <VaultEntryCard
            key={entry.id}
            entry={entry}
            index={index}
            onPress={handleEntryPress}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <GestureDetector gesture={swipeRightGesture}>
      <Animated.View 
        entering={SlideInRight.duration(300).springify().damping(20).stiffness(90)} 
        exiting={SlideOutRight.duration(300).springify().damping(20).stiffness(90)}
        style={styles.container}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#64748B" size={24} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Day Entries</Text>
              <Text style={styles.subtitle}>{formattedDate}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.content}>
            {renderContent()}
          </View>
        </SafeAreaView>
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
    backgroundColor: '#F0F9FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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