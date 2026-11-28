import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { verticalScale, scale } from 'react-native-size-matters';
import TimeCapsuleCard from '@/components/entries/time-capsule-card';
import { useTimeCapsules } from '@/hooks/use-time-capsules';
import { TimeCapsuleWithEntry } from '@/types/time-capsule';
import { Colors } from '@/lib/constants';
import { TAB_BAR_CONTENT_PADDING } from '@/constants/tab-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useCountdown } from '@/hooks/use-countdown';
import { X } from 'lucide-react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { SaveOpenedCapsuleSheet } from '@/components/vault/save-opened-capsule-sheet';

type ListRow =
  | { kind: 'header'; key: string; label: string; accordion?: boolean }
  | { kind: 'capsule'; key: string; capsule: TimeCapsuleWithEntry };

export function TimeCapsuleList() {
  const router = useRouter();
  const {
    pendingCapsules,
    lockedCapsules,
    unlockedCapsules,
    capsules,
    isLoading,
    requestRelease,
    cancelRelease,
  } = useTimeCapsules();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [openedExpanded, setOpenedExpanded] = useState(false);
  const [savingCapsule, setSavingCapsule] =
    useState<TimeCapsuleWithEntry | null>(null);
  const selectedCapsule = capsules.find((capsule) => capsule.id === selectedId);
  const { formatted } = useCountdown(
    selectedCapsule?.status === 'pending_release'
      ? selectedCapsule.release_available_at
      : null,
  );

  const handleCancelRelease = useCallback(
    (capsuleId: string) => {
      Alert.alert(
        'Cancel release?',
        'This time capsule will go back to being locked.',
        [
          { text: 'Keep waiting', style: 'cancel' },
          {
            text: 'Cancel release',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await cancelRelease(capsuleId);
                if (!result.success)
                  Alert.alert(
                    'Unable to cancel release',
                    result.message || 'Please try again.',
                  );
              } catch {
                Alert.alert('Unable to cancel release', 'Please try again.');
              }
            },
          },
        ],
      );
    },
    [cancelRelease],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const rows: ListRow[] = [];
  if (unlockedCapsules.length) {
    rows.push({
      kind: 'header',
      key: 'header-unlocked',
      label: 'Opened',
      accordion: true,
    });
    if (openedExpanded)
      unlockedCapsules.forEach((capsule) =>
        rows.push({ kind: 'capsule', key: capsule.id, capsule }),
      );
  }
  if (pendingCapsules.length) {
    rows.push({
      kind: 'header',
      key: 'header-pending',
      label: 'Pending Release',
    });
    pendingCapsules.forEach((capsule) =>
      rows.push({ kind: 'capsule', key: capsule.id, capsule }),
    );
  }
  if (lockedCapsules.length) {
    rows.push({ kind: 'header', key: 'header-locked', label: 'Locked' });
    lockedCapsules.forEach((capsule) =>
      rows.push({ kind: 'capsule', key: capsule.id, capsule }),
    );
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
        <Text style={styles.emptySubtext}>
          Capture memories for your future self.
        </Text>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={() =>
            router.push({
              pathname: '/capture',
              params: { timeCapsule: 'true' },
            })
          }
          accessibilityRole="button"
        >
          <Text style={styles.captureButtonText}>Start Capturing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleRequestRelease = async () => {
    if (!selectedCapsule || isRequesting) return;
    setIsRequesting(true);
    try {
      const result = await requestRelease(selectedCapsule.id);
      if (!result.success)
        Alert.alert(
          'Unable to release time capsule',
          result.message || 'Please try again.',
        );
    } catch {
      Alert.alert('Unable to release time capsule', 'Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <>
      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.contentContainer}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            if (item.accordion)
              return (
                <TouchableOpacity
                  style={styles.accordionHeader}
                  onPress={() => setOpenedExpanded(!openedExpanded)}
                  accessibilityRole="button"
                  accessibilityLabel="Opened"
                  accessibilityState={{ expanded: openedExpanded }}
                >
                  <Text style={styles.sectionHeaderText}>{item.label}</Text>
                  {openedExpanded ? (
                    <ChevronDown size={20} color={Colors.textMuted} />
                  ) : (
                    <ChevronRight size={20} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{item.label}</Text>
              </View>
            );
          }
          return (
            <TimeCapsuleCard
              capsule={item.capsule}
              onPress={(capsule) => {
                if (capsule.status === 'unlocked') {
                  setSavingCapsule(capsule);
                  return;
                }
                setSelectedId(capsule.id);
              }}
            />
          );
        }}
      />
      <BottomSheet
        visible={!!selectedCapsule}
        onClose={() => setSelectedId(null)}
      >
        {selectedCapsule ? (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Time Capsule</Text>
              <TouchableOpacity
                onPress={() => setSelectedId(null)}
                accessibilityRole="button"
                accessibilityLabel="Close time capsule details"
                hitSlop={12}
              >
                <X color={Colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={styles.detailLabel}>
              {selectedCapsule.reveal_type === 'date'
                ? 'Release date'
                : 'Release condition'}
            </Text>
            <Text style={styles.detailValue}>
              {selectedCapsule.reveal_type === 'date'
                ? selectedCapsule.unlock_at
                  ? new Date(selectedCapsule.unlock_at).toLocaleDateString(
                      undefined,
                      { month: 'long', day: 'numeric', year: 'numeric' },
                    )
                  : 'Date unavailable'
                : selectedCapsule.condition_label || 'Condition unavailable'}
            </Text>
            {selectedCapsule.status === 'pending_release' ? (
              <>
                <Text style={styles.detailDescription}>
                  {selectedCapsule.release_available_at
                    ? `${formatted} remaining until release.`
                    : 'Preparing your release request…'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    isRequesting && styles.disabledButton,
                  ]}
                  onPress={() => handleCancelRelease(selectedCapsule.id)}
                  disabled={isRequesting}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>Cancel release</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.detailDescription}>
                  Early release takes{' '}
                  {selectedCapsule.reveal_type === 'date'
                    ? '24 hours'
                    : '2 hours'}{' '}
                  after you request it.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.releaseButton,
                    isRequesting && styles.disabledButton,
                  ]}
                  onPress={handleRequestRelease}
                  disabled={isRequesting}
                  accessibilityRole="button"
                >
                  <Text style={styles.releaseButtonText}>
                    {isRequesting ? 'Requesting…' : 'Release early'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}
      </BottomSheet>
      {savingCapsule ? (
        <SaveOpenedCapsuleSheet
          capsule={savingCapsule}
          onClose={() => setSavingCapsule(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  contentContainer: {
    paddingVertical: verticalScale(20),
    paddingHorizontal: scale(16),
    paddingBottom: TAB_BAR_CONTENT_PADDING,
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
  sheetContent: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(24),
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'Figtree-SemiBold',
    color: Colors.text,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Figtree-SemiBold',
    color: Colors.textMuted,
    marginBottom: verticalScale(8),
  },
  detailValue: {
    fontSize: 20,
    fontFamily: 'Figtree-SemiBold',
    color: Colors.text,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
    fontFamily: 'Figtree-Regular',
    marginTop: verticalScale(12),
  },
  releaseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 36,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: verticalScale(32),
  },
  releaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
  },
  secondaryButton: {
    backgroundColor: Colors.card,
    borderRadius: 36,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: verticalScale(24),
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
  },
  disabledButton: { opacity: 0.6 },
});
