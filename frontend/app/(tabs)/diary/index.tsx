import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';
import { CircleIconButton } from '@/components/ui/circle-icon-button';
import { DiaryAiIcon } from '@/components/icons/diary-ai-icon';
import { DiaryCoverCard } from '@/components/vault/diary-cover-card';
import { TimeCapsuleList } from '@/components/vault/time-capsule-list';
import { TimeCapsuleWithEntry } from '@/types/time-capsule';
import { CreateDiarySheet } from '@/components/vault/create-diary-sheet';
import { useDiaries } from '@/hooks/use-diaries';
import { EditDiarySheet } from '@/components/vault/edit-diary-sheet';
import { Database } from '@/types/database';
import { InspirationTimeline } from '@/components/inspiration/inspiration-timeline';
import { useWeeklyInspiration } from '@/hooks/use-weekly-inspiration';

type HubChip = 'diaries' | 'capsules' | 'inspiration';
type Diary = Database['public']['Tables']['diaries']['Row'];

const CHIPS: { key: HubChip; label: string }[] = [
  { key: 'diaries', label: 'Diaries' },
  { key: 'capsules', label: 'Time Capsule' },
  { key: 'inspiration', label: 'Inspiration' },
];

export default function DiaryHubScreen() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [activeChip, setActiveChip] = useState<HubChip>('diaries');
  const [isCreateSheetVisible, setIsCreateSheetVisible] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const { diaries, isLoading, createDiary, isCreating, updateDiary, isUpdating } = useDiaries();
  const inspiration = useWeeklyInspiration();

  const handleCreateTimeCapsule = () => {
    setIsCreateSheetVisible(false);
    router.push({ pathname: '/capture', params: { timeCapsule: 'true' } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{
              uri: profile?.avatar_url || getDefaultAvatarUrl(profile?.full_name || 'You'),
            }}
            style={styles.avatar}
          />
          <Text style={styles.headerTitle}>Diary</Text>
        </View>

        <View style={styles.headerActions}>
          <CircleIconButton
            onPress={() => setIsCreateSheetVisible(true)}
            accessibilityLabel="Create a diary or time capsule"
            accessibilityHint="Opens options for a new diary or time capsule"
            style={styles.headerActionSpacing}
          >
            <Plus color="#64748B" size={18} />
          </CircleIconButton>
          <CircleIconButton
            onPress={() => router.push('/search')}
            accessibilityLabel="Open search"
            accessibilityHint="Navigates to the search screen"
          >
            <DiaryAiIcon color="#64748B" size={18} />
          </CircleIconButton>
        </View>
      </View>

      <View style={styles.chipRow}>
        {CHIPS.map((chip) => {
          const isActive = chip.key === activeChip;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveChip(chip.key)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeChip === 'diaries' && (
          <FlatList
            data={diaries}
            keyExtractor={(diary) => diary.id}
            numColumns={3}
            columnWrapperStyle={styles.diaryGridRow}
            contentContainerStyle={styles.diaryGridContent}
            renderItem={({ item }) => (
              <DiaryCoverCard
                diaryId={item.id}
                title={item.name}
                color={item.color || item.cover_color}
                diaryStyle={item.style}
                onPress={(source) => router.push({
                  pathname: '/diary/entries',
                  params: {
                    diaryId: item.id,
                    title: item.name,
                    color: item.color || item.cover_color,
                    style: item.style,
                    transitionX: source?.x,
                    transitionY: source?.y,
                    transitionWidth: source?.width,
                    transitionHeight: source?.height,
                  },
                })}
                onLongPress={() => setSelectedDiary(item)}
              />
            )}
            ListEmptyComponent={isLoading ? <ActivityIndicator color="#8B5CF6" style={styles.loading} /> : <View style={styles.emptyState}><Text style={styles.emptyTitle}>Your diaries will appear here.</Text><Text style={styles.emptySubtitle}>Tap + to create your first one.</Text></View>}
          />
        )}

        {activeChip === 'capsules' && (
          <TimeCapsuleList
            onOpenEntry={(capsule: TimeCapsuleWithEntry) =>
              router.push(`/time-capsule-reveal/${capsule.entry_id}`)
            }
          />
        )}

        {activeChip === 'inspiration' && (
          <InspirationTimeline
            days={inspiration.days}
            isLoading={inspiration.isLoading}
            error={inspiration.error as Error | null}
            placesError={inspiration.placesError}
            onEnablePlaces={() => inspiration.enablePlaces().catch(() => undefined)}
            isPlacesEnabled={inspiration.isPlacesEnabled}
            isPlacesUpdating={inspiration.isPlacesUpdating}
          />
        )}
      </View>
      <CreateDiarySheet
        visible={isCreateSheetVisible}
        isCreating={isCreating}
        onClose={() => setIsCreateSheetVisible(false)}
        onCreateDiary={createDiary}
        onCreateTimeCapsule={handleCreateTimeCapsule}
      />
      <EditDiarySheet
        visible={selectedDiary !== null}
        diary={selectedDiary}
        isSaving={isUpdating}
        onClose={() => setSelectedDiary(null)}
        onSave={updateDiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  avatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
  },
  headerTitle: {
    fontSize: scale(20),
    fontFamily: 'Figtree-SemiBold',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionSpacing: {
    marginRight: scale(10),
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    gap: scale(8),
  },
  chip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(5),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'white',
  },
  chipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  chipText: {
    fontSize: scale(13),
    fontFamily: 'Figtree-Medium',
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: 'white',
    fontFamily: 'Figtree-SemiBold',
  },
  content: {
    flex: 1,
  },
  diaryGridContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(24),
  },
  diaryGridRow: {
    justifyContent: 'space-between',
    marginBottom: verticalScale(20),
  },
  loading: { marginTop: verticalScale(42) },
  emptyState: { alignItems: 'center', paddingHorizontal: scale(32), paddingTop: verticalScale(56) },
  emptyTitle: { color: Colors.text, fontFamily: 'Figtree-SemiBold', fontSize: scale(16), marginBottom: verticalScale(6) },
  emptySubtitle: { color: Colors.textMuted, fontFamily: 'Figtree-Regular', fontSize: scale(14), textAlign: 'center' },
});
