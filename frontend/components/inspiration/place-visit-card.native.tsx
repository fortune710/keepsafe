import MapView, { Marker } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { InspirationPlaceItem } from '@/types/inspiration';

export function PlaceVisitCard({ item }: { item: InspirationPlaceItem }) {
  const region = { latitude: item.latitude, longitude: item.longitude, latitudeDelta: 0.018, longitudeDelta: 0.018 };
  return <View accessible accessibilityLabel={`Visited ${item.name}`} style={styles.card}>
    <MapView style={styles.map} initialRegion={region} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false} pointerEvents="none">
      <Marker coordinate={region} />
    </MapView>
    <View style={styles.scrim} />
    <View style={styles.copy}><MapPin size={14} color="#fff" fill="#fff" /><Text numberOfLines={1} style={styles.name}>{item.name}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 136, borderRadius: 16, overflow: 'hidden', backgroundColor: '#DCEAF6' }, map: { ...StyleSheet.absoluteFillObject },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.18)' }, copy: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, color: '#fff', fontFamily: 'Figtree-SemiBold', fontSize: 14, textShadowColor: 'rgba(15,23,42,0.55)', textShadowRadius: 4 },
});
