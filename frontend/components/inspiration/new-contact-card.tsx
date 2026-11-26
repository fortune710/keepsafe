import { Image, StyleSheet, Text, View } from 'react-native';
import { InspirationBirthdayItem, InspirationContactItem } from '@/types/inspiration';

export function NewContactCard({ item, wide = false }: { item: InspirationContactItem | InspirationBirthdayItem; wide?: boolean }) {
  const isBirthday = item.type === 'birthday';
  return <View accessible accessibilityLabel={isBirthday ? `${item.name}, birthday celebration` : `${item.name}, added to contacts`} style={[styles.card, wide && styles.wideCard]}>
    {isBirthday ? <Image source={require('@/assets/illustrations/birthday-cake.png')} style={styles.birthdayImage} resizeMode="contain" accessible={false} /> : <View style={styles.avatar}><Text style={styles.initials}>{item.initials}</Text></View>}
    <View style={[styles.copy, wide && styles.wideCopy]}><Text style={[styles.label, !wide && styles.centeredText]}>{isBirthday ? 'Birthday celebration' : 'New connection'}</Text><Text numberOfLines={1} style={[styles.name, !wide && styles.centeredText]}>{item.name}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 104, borderRadius: 16, padding: 14, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', gap: 10 },
  wideCard: { flexDirection: 'row', justifyContent: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  birthdayImage: { width: 48, height: 48 },
  initials: { color: '#fff', fontFamily: 'Figtree-SemiBold', fontSize: 14 },
  copy: { alignSelf: 'stretch' },
  wideCopy: { flex: 1, alignSelf: 'center' },
  centeredText: { textAlign: 'center' },
  label: { color: '#7C3AED', fontFamily: 'Figtree-Medium', fontSize: 12 },
  name: { color: '#312E81', fontFamily: 'Figtree-SemiBold', fontSize: 15, marginTop: 2 },
});
