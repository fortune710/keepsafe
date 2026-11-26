import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

          <Text style={styles.fieldLabel}>Cover Color</Text>
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

          <Text style={[styles.fieldLabel, styles.nameFieldLabel]}>Diary Name</Text>
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
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: verticalScale(34), paddingHorizontal: scale(20), paddingTop: verticalScale(20) },
  fieldLabel: { color: '#334155', fontFamily: 'Figtree-SemiBold', fontSize: scale(14), marginBottom: verticalScale(8), marginTop: verticalScale(14) },
  nameFieldLabel: { marginBottom: 0 },
  input: { backgroundColor: 'transparent', borderWidth: 0, color: '#1E293B', fontFamily: 'Figtree-Regular', fontSize: scale(18), paddingHorizontal: 0, paddingVertical: verticalScale(4) },
  colourRow: { flexDirection: 'row', gap: scale(12) },
  colourSwatch: { borderColor: 'white', borderRadius: scale(16), borderWidth: 2, height: scale(32), width: scale(32) },
  colourSwatchSelected: { borderColor: '#8B5CF6', transform: [{ scale: 1.12 }] },
  saveButton: { marginTop: verticalScale(26) },
  saveButtonText: { color: 'white', fontFamily: 'Figtree-SemiBold', fontSize: scale(16) },
});
