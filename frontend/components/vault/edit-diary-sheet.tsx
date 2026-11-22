import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pencil, X } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { DiaryStyleCarousel } from '@/components/vault/diary-style-carousel';
import { DIARY_COLOR_PALETTE } from '@/lib/diary-colors';
import { DiaryStyleId, normalizeDiaryStyle } from '@/lib/diary-styles';
import { createDiarySchema } from '@/lib/validations/diaries';

interface EditDiarySheetProps {
  visible: boolean;
  diary: { id: string; name: string; color: string; cover_color: string; style: string } | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: { diaryId: string; name: string; coverColor: string; style: DiaryStyleId }) => Promise<unknown>;
}

export function EditDiarySheet({ visible, diary, isSaving, onClose, onSave }: EditDiarySheetProps) {
  const [name, setName] = useState('');
  const [coverColor, setCoverColor] = useState(DIARY_COLOR_PALETTE[0]);
  const [diaryStyle, setDiaryStyle] = useState<DiaryStyleId>('none');
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (!visible || !diary) return;
    setName(diary.name);
    setCoverColor(diary.color || diary.cover_color);
    setDiaryStyle(normalizeDiaryStyle(diary.style));
  }, [visible, diary]);

  const handleSave = async () => {
    if (!diary) return;
    const parsed = createDiarySchema.safeParse({ name, coverColor, style: diaryStyle });
    if (!parsed.success) {
      Alert.alert('Check your diary', parsed.error.issues[0]?.message ?? 'Please try again.');
      return;
    }

    try {
      const savePromise = onSave({ diaryId: diary.id, ...parsed.data });
      onClose();
      await savePromise;
    } catch (error) {
      Alert.alert('Could not update diary', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} height="90%" maxHeight="90%">
      <View style={styles.content}>
        <View
          style={styles.header}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        >
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <View style={styles.icon}><Pencil color="#7C3AED" size={19} /></View>
              <View style={styles.titleCopy}>
                <Text style={styles.title}>Edit diary</Text>
                <Text style={styles.subtitle}>Update your diary style</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton} accessibilityLabel="Close diary editor">
              <X color="#475569" size={22} strokeWidth={2.8} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <DiaryStyleCarousel
            color={coverColor}
            value={diaryStyle}
            visible={visible}
            onChange={setDiaryStyle}
          />

          <Text style={styles.fieldLabel}>Cover color</Text>
          <View style={styles.colourRow}>
            {DIARY_COLOR_PALETTE.map((color) => {
              const selected = color === coverColor;
              return (
                <Pressable
                  key={color}
                  onPress={() => setCoverColor(color)}
                  accessibilityLabel={`Use ${color} cover`}
                  accessibilityState={{ selected }}
                  style={[styles.colourSwatch, { backgroundColor: color }, selected && styles.colourSwatchSelected]}
                />
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, styles.nameFieldLabel]}>Diary name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            accessibilityLabel="Diary name"
          />

          <View style={styles.saveButton}>
            <Button onPress={handleSave} loading={isSaving}>
              <Text style={styles.saveButtonText}>Save changes</Text>
            </Button>
          </View>
        </ScrollView>
        {headerHeight > 0 && (
          <View
            pointerEvents="none"
            style={[styles.headerFade, { top: headerHeight }]}
          >
            <LinearGradient
              colors={['#FFFFFF', 'rgba(255, 255, 255, 0)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: { backgroundColor: 'white', paddingHorizontal: scale(20), zIndex: 1 },
  titleRow: { alignItems: 'stretch', flexDirection: 'row', paddingBottom: verticalScale(18) },
  titleGroup: { alignItems: 'stretch', flexDirection: 'row', paddingRight: scale(10), width: '85%' },
  titleCopy: { flex: 1, justifyContent: 'center', minHeight: scale(52) },
  headerFade: { height: verticalScale(28), left: 0, position: 'absolute', right: 0, zIndex: 2 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: verticalScale(34), paddingHorizontal: scale(20), paddingTop: verticalScale(20) },
  icon: { alignItems: 'center', backgroundColor: '#EDE9FE', borderRadius: scale(14), height: scale(52), justifyContent: 'center', marginRight: scale(10), width: scale(52) },
  title: { color: '#1E293B', fontFamily: 'Figtree-Bold', fontSize: scale(20), marginBottom: verticalScale(2) },
  subtitle: { color: '#64748B', fontFamily: 'Figtree-Regular', fontSize: scale(13), lineHeight: verticalScale(18) },
  closeButton: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 999, height: scale(52), justifyContent: 'center', width: '15%' },
  fieldLabel: { color: '#334155', fontFamily: 'Figtree-SemiBold', fontSize: scale(14), marginBottom: verticalScale(8), marginTop: verticalScale(14) },
  nameFieldLabel: { marginBottom: 0 },
  input: { backgroundColor: 'transparent', borderWidth: 0, color: '#1E293B', fontFamily: 'Figtree-Regular', fontSize: scale(18), paddingHorizontal: 0, paddingVertical: verticalScale(4) },
  colourRow: { flexDirection: 'row', gap: scale(12) },
  colourSwatch: { borderColor: 'white', borderRadius: scale(16), borderWidth: 3, height: scale(32), width: scale(32) },
  colourSwatchSelected: { borderColor: '#1E293B', transform: [{ scale: 1.12 }] },
  saveButton: { marginTop: verticalScale(26) },
  saveButtonText: { color: 'white', fontFamily: 'Figtree-SemiBold', fontSize: scale(16) },
});
