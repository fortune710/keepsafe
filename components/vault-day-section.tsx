import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import VaultEntryCard, { VaultEntry } from './entries/vault-entry-card';

interface VaultDaySectionProps {
  date: string;
  entries: VaultEntry[];
  onEntryPress?: (entry: VaultEntry) => void;
  isLoading?: boolean;
}

export default function VaultDaySection({ 
  date, 
  entries, 
  onEntryPress, 
  isLoading = false 
}: VaultDaySectionProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading entries...</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No entries for this day</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{date}</Text>
      </View>

      <ScrollView 
        style={styles.entriesScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.entriesContent}
      >
        {entries.map((entry, index) => (
          <VaultEntryCard
            key={entry.id}
            entry={entry}
            index={index}
            onPress={onEntryPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 20,
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
  entriesScroll: {
    flex: 1,
  },
  entriesContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
  },
});