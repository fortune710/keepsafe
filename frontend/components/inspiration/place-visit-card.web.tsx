import { MapPin } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { InspirationPlaceItem } from '@/types/inspiration';

export function PlaceVisitCard({ item }: { item: InspirationPlaceItem }) {
  return <View accessible accessibilityLabel={`Visited ${item.name}`} style={styles.card}>
    <MapPin size={22} color="#0F766E" fill="#CCFBF1" />
    <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
    <Text numberOfLines={1} style={styles.address}>{item.address || 'Location saved on your phone'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 136, borderRadius: 16, padding: 16, justifyContent: 'flex-end', backgroundColor: '#CCFBF1' },
  name: { color: '#134E4A', fontFamily: 'Figtree-SemiBold', fontSize: 16, marginTop: 16 },
  address: { color: '#0F766E', fontFamily: 'Figtree-Regular', fontSize: 12, marginTop: 3 },
});
