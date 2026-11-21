import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { LEGAL_DOCUMENTS, type LegalDocId } from '@/constants/legal';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface LegalBottomSheetProps {
  doc: LegalDocId | null;
  onClose: () => void;
}

export function LegalBottomSheet({ doc, onClose }: LegalBottomSheetProps) {
  const [displayedDoc, setDisplayedDoc] = useState<LegalDocId | null>(doc);

  useEffect(() => {
    if (doc) setDisplayedDoc(doc);
  }, [doc]);

  const document = displayedDoc ? LEGAL_DOCUMENTS[displayedDoc] : null;

  return (
    <BottomSheet visible={!!doc} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {document?.title}
        </Text>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <X color="#64748B" size={20} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.lastUpdated}>
          Last Updated: {document?.lastUpdated}
        </Text>

        {document?.sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionText}>{section.text}</Text>
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    flex: 1,
    fontSize: scale(17),
    fontFamily: 'Figtree-SemiBold',
    color: '#1E293B',
    marginRight: scale(12),
  },
  closeButton: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: scale(20),
  },
  scrollContent: {
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(24),
  },
  lastUpdated: {
    fontSize: scale(13),
    fontFamily: 'Figtree-Regular',
    color: '#94A3B8',
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: scale(15),
    fontFamily: 'Figtree-SemiBold',
    color: '#1E293B',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(6),
  },
  sectionText: {
    fontSize: scale(13.5),
    fontFamily: 'Figtree-Regular',
    color: '#475569',
    lineHeight: verticalScale(20),
  },
});
