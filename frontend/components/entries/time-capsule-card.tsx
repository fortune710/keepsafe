import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LockIcon } from '@/components/icons/lock-icon';
import VaultEntryCard from '@/components/entries/vault-entry-card';
import { TimeCapsuleWithEntry } from '@/types/time-capsule';
import { EntryWithProfile } from '@/types/entries';
import { getRelativeDate } from '@/lib/utils';
import { scale, verticalScale } from 'react-native-size-matters';

interface TimeCapsuleCardProps {
  capsule: TimeCapsuleWithEntry;
  onPress: (capsule: TimeCapsuleWithEntry) => void;
}

export default function TimeCapsuleCard({ capsule, onPress }: TimeCapsuleCardProps) {
  const isLocked = capsule.status !== 'unlocked';
  // Locked entries may be hidden by RLS, leaving the joined entry unavailable.
  const entry = capsule.entry ?? ({ id: capsule.entry_id, user_id: capsule.user_id, created_at: capsule.created_at } as EntryWithProfile);
  return (
    <VaultEntryCard
      entry={entry}
      showAuthor={false}
      footer={<View style={styles.footer}><Text style={styles.dateText}>{getRelativeDate(capsule.created_at)}</Text></View>}
      onPress={() => onPress(capsule)}
      accessibilityLabel={isLocked ? 'View locked time capsule' : 'Open time capsule entry'}
      mediaPlaceholder={isLocked ? (
        <View style={styles.lockedPreview}>
          <View style={styles.lockIcon}>
            <LockIcon color="#7C3AED" size={36} />
          </View>
        </View>
      ) : undefined}
    />
  );
}

const styles = StyleSheet.create({
  lockedPreview: { width: '100%', height: 300, backgroundColor: '#F1EBFF', alignItems: 'center', justifyContent: 'center' },
  lockIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  footer: { alignItems: 'center', paddingTop: verticalScale(12) },
  dateText: { fontSize: scale(12), color: '#1E293B', fontFamily: 'Figtree-SemiBold', fontWeight: '500' },
});
