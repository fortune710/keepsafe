import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, MapPin } from 'lucide-react-native';
import { InspirationDay, InspirationItem } from '@/types/inspiration';
import { MediaMemoryCard } from './media-memory-card';
import { NewContactCard } from './new-contact-card';
import { PlaceVisitCard } from './place-visit-card';
import { useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { InspirationMediaItem, InspirationPlaceItem } from '@/types/inspiration';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/providers/auth-provider';
import { useSaveLock } from '@/providers/save-lock-provider';
import { resolveCaptureDiaryId } from '@/lib/last-used-diary';
import { TAB_BAR_CONTENT_PADDING } from '@/constants/tab-bar';

const titleFor = (date: Date) => date.toDateString() === new Date().toDateString() ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

function ItemCard({ item, index, onMediaPress, onPlacePress }: { item: InspirationItem; index: number; onMediaPress: (item: InspirationMediaItem) => void; onPlacePress: (item: InspirationPlaceItem) => void }) {
  if (item.type === 'media') return <MediaMemoryCard item={item} large={index % 3 === 0} onPress={() => onMediaPress(item)} />;
  if (item.type === 'place') return <PlaceVisitCard item={item} onPress={() => onPlacePress(item)} />;
  return <NewContactCard item={item} wide={index % 3 === 0} />;
}

export function InspirationTimeline({ days, isLoading, error, placesError, onEnablePlaces, isPlacesEnabled, isPlacesUpdating }: { days: InspirationDay[]; isLoading: boolean; error: Error | null; placesError: Error | null; onEnablePlaces: () => void; isPlacesEnabled: boolean; isPlacesUpdating: boolean }) {
  const { user } = useAuthContext();
  const { unlockSave } = useSaveLock();
  const { toast } = useToast();
  const openingMedia = useRef(false);
  const requestGeneration = useRef(0);
  useFocusEffect(useCallback(() => () => {
    requestGeneration.current += 1;
    openingMedia.current = false;
  }, []));
  const handlePlacePress = (item: InspirationPlaceItem) => {
    try {
      const location = typeof item.name === 'string' ? item.name.trim() : '';
      if (!location) throw new Error('This place has no location name.');
      router.push({ pathname: '/capture', params: { locationAttachment: location } });
    } catch (error) {
      Alert.alert('Unable to open location', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  const handleMediaPress = async (item: InspirationMediaItem) => {
    if (openingMedia.current) return;
    openingMedia.current = true;
    const generation = requestGeneration.current;
    try {
      if (!item.id.startsWith('media-')) throw new Error('Media is not a library asset');
      const assetId = item.id.slice('media-'.length);
      const asset = await MediaLibrary.getAssetInfoAsync(assetId, { shouldDownloadFromNetwork: true });
      if (generation !== requestGeneration.current) return;
      const localUri = asset.localUri || (item.mediaType === 'video' && item.uri?.startsWith('content://') ? item.uri : undefined);
      if (!localUri || (!localUri.startsWith('file://') && !localUri.startsWith('content://'))) throw new Error('Media is unavailable');
      if (localUri.startsWith('file://')) {
        const info = await FileSystem.getInfoAsync(localUri);
        if (generation !== requestGeneration.current) return;
        if (!info.exists || info.isDirectory) throw new Error('Media file is unavailable');
      }
      const diaryId = await resolveCaptureDiaryId(undefined, user?.id);
      if (generation !== requestGeneration.current) return;
      unlockSave();
      router.push({
        pathname: '/capture/details',
        params: {
          captureId: Crypto.randomUUID(),
          type: item.mediaType,
          uri: encodeURIComponent(localUri),
          duration: item.durationMs !== undefined ? String(item.durationMs / 1000) : undefined,
          diary_id: diaryId,
        },
      });
    } catch {
      if (generation === requestGeneration.current) toast('Unable to open this media. Please try again.', 'error');
    } finally {
      if (generation === requestGeneration.current) openingMedia.current = false;
    }
  };
  if (isLoading) return <View style={styles.center}><ActivityIndicator color="#8B5CF6" /><Text style={styles.muted}>Gathering this week’s moments…</Text></View>;
  if (!days.length) return <ScrollView contentContainerStyle={styles.empty}>
    <View style={styles.emptyIcon}><Camera size={24} color="#7C3AED" /></View>
    <Text style={styles.emptyTitle}>Your week is waiting</Text>
    <Text style={styles.emptyCopy}>Photos with people, new contacts, and places you visit will collect here — privately on your device.</Text>
    <Pressable onPress={onEnablePlaces} disabled={isPlacesUpdating || isPlacesEnabled} style={[styles.enableButton, isPlacesEnabled && styles.enableButtonOn]}><MapPin size={16} color="#fff" /><Text style={styles.enableText}>{isPlacesUpdating ? 'Finding your place…' : isPlacesEnabled ? 'Places visited is on' : 'Turn on places visited'}</Text></Pressable>
    {placesError && <Text style={styles.error}>{placesError.message}</Text>}
    {error && <Text style={styles.error}>Some sources could not be loaded. Pull down to try again.</Text>}
  </ScrollView>;

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    {days.map((day) => <View key={day.key} style={styles.day}>
      <Text style={styles.date}>{titleFor(day.date)}</Text>
      <View style={styles.grid}>{day.items.map((item, index) => <View key={item.id} style={[styles.cell, index % 3 === 0 && styles.wide]}><ItemCard item={item} index={index} onMediaPress={handleMediaPress} onPlacePress={handlePlacePress} /></View>)}</View>
    </View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: TAB_BAR_CONTENT_PADDING },
  day: { marginBottom: 28 },
  date: { color: '#1E293B', fontFamily: 'Figtree-SemiBold', fontSize: 17, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.7%' },
  wide: { width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  muted: { fontFamily: 'Figtree-Regular', color: '#64748B', fontSize: 14 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: 'Figtree-SemiBold', color: '#1E293B', fontSize: 20 },
  emptyCopy: { fontFamily: 'Figtree-Regular', color: '#64748B', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 290 },
  enableButton: { marginTop: 22, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#7C3AED', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  enableButtonOn: { backgroundColor: '#0F766E' },
  enableText: { color: '#fff', fontFamily: 'Figtree-SemiBold', fontSize: 14 },
  error: { color: '#B45309', fontFamily: 'Figtree-Regular', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
