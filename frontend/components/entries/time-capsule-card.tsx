import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, Hourglass, CheckCircle } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import { useCountdown } from '@/hooks/use-countdown';
import { TimeCapsuleWithEntry } from '@/types/time-capsule';
import VaultCanvas from '@/components/capture/canvas/vault-canvas';

interface TimeCapsuleCardProps {
  capsule: TimeCapsuleWithEntry;
  onRequestRelease: (capsuleId: string) => void;
  onCancelRelease: (capsuleId: string) => void;
  onPress?: (capsule: TimeCapsuleWithEntry) => void;
}

function formatUnlockDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TimeCapsuleCard({
  capsule,
  onRequestRelease,
  onCancelRelease,
  onPress,
}: TimeCapsuleCardProps) {
  const isPending = capsule.status === 'pending_release';
  const { formatted } = useCountdown(isPending ? capsule.release_available_at : null);

  if (capsule.status === 'unlocked') {
    return (
      <TouchableOpacity style={styles.card} onPress={() => onPress?.(capsule)}>
        <View style={styles.thumbnailWrapper}>
          <VaultCanvas
            type={capsule.entry.type}
            items={capsule.entry.attachments}
            uri={capsule.entry.content_url || ''}
            style={styles.thumbnail as any}
            metadata={capsule.entry.metadata}
          />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={1}>
            {capsule.entry.text_content || 'Time capsule entry'}
          </Text>
          <Text style={styles.subtitle}>Opened</Text>
        </View>
        <View style={styles.openedBadge}>
          <CheckCircle color="#059669" size={14} />
        </View>
      </TouchableOpacity>
    );
  }

  const title =
    capsule.reveal_type === 'date'
      ? isPending
        ? 'Releasing soon'
        : `Unlocks on ${formatUnlockDate(capsule.unlock_at!)}`
      : capsule.condition_label || 'A condition you set';

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, isPending && styles.iconCircleActive]}>
        {isPending ? (
          <Hourglass color="#8B5CF6" size={20} />
        ) : (
          <Lock color="#64748B" size={20} />
        )}
      </View>

      <View style={styles.textColumn}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {isPending ? (
          <Text style={styles.countdown}>{formatted} remaining</Text>
        ) : capsule.reveal_type === 'condition' ? (
          <Text style={styles.subtitle}>Tap when it feels true</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.actionButton, isPending && styles.cancelButton]}
        onPress={() =>
          isPending ? onCancelRelease(capsule.id) : onRequestRelease(capsule.id)
        }
      >
        <Text style={[styles.actionText, isPending && styles.cancelText]}>
          {isPending ? 'Cancel' : capsule.reveal_type === 'date' ? 'Release early' : "I'm ready"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: scale(12),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(10),
    gap: scale(12),
  },
  iconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.mutedSurface,
  },
  iconCircleActive: {
    backgroundColor: Colors.brandTranslucent,
  },
  thumbnailWrapper: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: scale(14),
    fontFamily: 'Figtree-SemiBold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: scale(12),
    fontFamily: 'Figtree-Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  countdown: {
    fontSize: scale(12),
    fontFamily: 'Figtree-Medium',
    color: '#8B5CF6',
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: 20,
    backgroundColor: Colors.brandTranslucent,
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  actionText: {
    fontSize: scale(12),
    fontFamily: 'Figtree-SemiBold',
    color: '#8B5CF6',
  },
  cancelText: {
    color: '#DC2626',
  },
  openedBadge: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
  },
});
