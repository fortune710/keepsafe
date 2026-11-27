import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { verticalScale, scale } from 'react-native-size-matters';
import TimeCapsuleCard from '@/components/entries/time-capsule-card';
import { useTimeCapsules } from '@/hooks/use-time-capsules';
import { TimeCapsuleWithEntry } from '@/types/time-capsule';
import { Colors } from '@/lib/constants';
import { TAB_BAR_CONTENT_PADDING } from '@/constants/tab-bar';

type ListRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'capsule'; key: string; capsule: TimeCapsuleWithEntry };

interface TimeCapsuleListProps {
  onOpenEntry?: (capsule: TimeCapsuleWithEntry) => void;
}

export function TimeCapsuleList({ onOpenEntry }: TimeCapsuleListProps) {
  const router = useRouter();
  const {
    pendingCapsules,
    lockedCapsules,
    unlockedCapsules,
    isLoading,
    requestRelease,
    cancelRelease,
  } = useTimeCapsules();

  const handleCancelRelease = useCallback((capsuleId: string) => {
    Alert.alert(
      'Cancel release?',
      'This time capsule will go back to being locked.',
      [
        { text: 'Keep waiting', style: 'cancel' },
        {
          text: 'Cancel release',
          style: 'destructive',
          onPress: () => cancelRelease(capsuleId),
        },
      ],
    );
  }, [cancelRelease]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const rows: ListRow[] = [];
  if (pendingCapsules.length) {
    rows.push({ kind: 'header', key: 'header-pending', label: 'Pending Release' });
    pendingCapsules.forEach((capsule) => rows.push({ kind: 'capsule', key: capsule.id, capsule }));
  }
  if (lockedCapsules.length) {
    rows.push({ kind: 'header', key: 'header-locked', label: 'Locked' });
    lockedCapsules.forEach((capsule) => rows.push({ kind: 'capsule', key: capsule.id, capsule }));
  }
  if (unlockedCapsules.length) {
    rows.push({ kind: 'header', key: 'header-unlocked', label: 'Opened' });
    unlockedCapsules.forEach((capsule) => rows.push({ kind: 'capsule', key: capsule.id, capsule }));
  }

  if (!rows.length) {
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('@/assets/illustrations/empty-time-capsule.png')}
          style={styles.emptyIllustration}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <Text style={styles.emptyTitle}>No time capsules yet</Text>
        <Text style={styles.emptySubtext}>Capture memories for your future self.</Text>
        <TouchableOpacity style={styles.captureButton} onPress={() => router.push({ pathname: '/capture', params: { timeCapsule: 'true' } })} accessibilityRole="button">
          <Text style={styles.captureButtonText}>Start Capturing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlashList
      data={rows}
      keyExtractor={(row) => row.key}
      contentContainerStyle={styles.contentContainer}
      renderItem={({ item }) => {
        if (item.kind === 'header') {
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{item.label}</Text>
            </View>
          );
        }
        return (
          <TimeCapsuleCard
            capsule={item.capsule}
            onRequestRelease={requestRelease}
            onCancelRelease={handleCancelRelease}
            onPress={onOpenEntry}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: verticalScale(20),
  },
  sectionHeader: {
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(8),
    marginTop: verticalScale(12),
  },
  sectionHeaderText: {
    fontSize: scale(12),
    fontFamily: 'Figtree-SemiBold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: verticalScale(120),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: TAB_BAR_CONTENT_PADDING,
  },
  emptyIllustration: {
    width: scale(150),
    height: scale(150),
    marginBottom: verticalScale(12),
  },
  emptyTitle: {
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
    borderRadius: 36,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
