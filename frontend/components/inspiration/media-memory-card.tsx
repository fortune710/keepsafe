import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { InspirationMediaItem } from '@/types/inspiration';

export function MediaMemoryCard({ item, large = false, onPress }: { item: InspirationMediaItem; large?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.mediaType === 'video' ? 'Video' : 'Photo'} memory from ${new Date(item.occurredAt).toLocaleDateString()}`}
      onPress={onPress}
      style={[styles.card, large && styles.large]}
    >
      <Image source={{ uri: item.uri }} style={styles.image} contentFit="cover" transition={180} />
      {item.mediaType === 'video' && <View style={styles.play}><Play size={15} color="#fff" fill="#fff" /></View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  large: { aspectRatio: 1.48 },
  image: { width: '100%', height: '100%' },
  play: { position: 'absolute', right: 10, bottom: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(15,23,42,0.62)', alignItems: 'center', justifyContent: 'center' },
});
