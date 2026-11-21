import { UserPlus } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { InspirationContactItem } from '@/types/inspiration';

export function NewContactCard({ item }: { item: InspirationContactItem }) {
  return <View accessible accessibilityLabel={`${item.name}, added to contacts`} style={styles.card}>
    <View style={styles.avatar}><Text style={styles.initials}>{item.initials}</Text></View>
    <View style={styles.copy}><Text style={styles.label}>New connection</Text><Text numberOfLines={1} style={styles.name}>{item.name}</Text></View>
    <UserPlus size={17} color="#6D28D9" />
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 104, borderRadius: 16, padding: 14, backgroundColor: '#F3E8FF', flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontFamily: 'Figtree-SemiBold', fontSize: 14 },
  copy: { flex: 1 },
  label: { color: '#7C3AED', fontFamily: 'Figtree-Medium', fontSize: 12 },
  name: { color: '#312E81', fontFamily: 'Figtree-SemiBold', fontSize: 15, marginTop: 2 },
});
