import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, MapPin } from 'lucide-react-native';
import { InspirationDay, InspirationItem } from '@/types/inspiration';
import { MediaMemoryCard } from './media-memory-card';
import { NewContactCard } from './new-contact-card';
import { PlaceVisitCard } from './place-visit-card';

const titleFor = (date: Date) => date.toDateString() === new Date().toDateString() ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

function ItemCard({ item, index }: { item: InspirationItem; index: number }) {
  if (item.type === 'media') return <MediaMemoryCard item={item} large={index % 3 === 0} />;
  if (item.type === 'place') return <PlaceVisitCard item={item} />;
  return <NewContactCard item={item} />;
}

export function InspirationTimeline({ days, isLoading, error, placesError, onEnablePlaces, isPlacesEnabled, isPlacesUpdating }: { days: InspirationDay[]; isLoading: boolean; error: Error | null; placesError: Error | null; onEnablePlaces: () => void; isPlacesEnabled: boolean; isPlacesUpdating: boolean }) {
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
      <View style={styles.grid}>{day.items.map((item, index) => <View key={item.id} style={[styles.cell, index % 3 === 0 && styles.wide]}><ItemCard item={item} index={index} /></View>)}</View>
    </View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
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
