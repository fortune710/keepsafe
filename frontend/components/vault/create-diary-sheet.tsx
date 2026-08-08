import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BookOpen, Clock3, X } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { DIARY_COLOR_PALETTE } from '@/lib/diary-colors';
import { createDiarySchema } from '@/lib/validations/diaries';

type SheetStep = 'choice' | 'create';

interface CreateDiarySheetProps {
  visible: boolean;
  isCreating: boolean;
  onClose: () => void;
  onCreateDiary: (input: { name: string; coverColor: string }) => Promise<unknown>;
  onCreateTimeCapsule: () => void;
}

export function CreateDiarySheet({
  visible,
  isCreating,
  onClose,
  onCreateDiary,
  onCreateTimeCapsule,
}: CreateDiarySheetProps) {
  const [step, setStep] = useState<SheetStep>('choice');
  const [name, setName] = useState('');
  const [coverColor, setCoverColor] = useState(DIARY_COLOR_PALETTE[0]);

  useEffect(() => {
    if (!visible) return;
    setStep('choice');
    setName('');
    setCoverColor(DIARY_COLOR_PALETTE[0]);
  }, [visible]);

  const handleCreateDiary = async () => {
    const parsed = createDiarySchema.safeParse({ name, coverColor });
    if (!parsed.success) {
      Alert.alert('Check your diary', parsed.error.issues[0]?.message ?? 'Please try again.');
      return;
    }

    try {
      await onCreateDiary(parsed.data);
      onClose();
    } catch (error) {
      Alert.alert('Could not create diary', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="68%">
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>{step === 'choice' ? 'Make space for a memory' : 'Create a diary'}</Text>
            <Text style={styles.subtitle}>
              {step === 'choice' ? 'Choose what you want to begin.' : 'Give it a name and a cover that feels like yours.'}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton} accessibilityLabel="Close create menu">
            <X color="#64748B" size={19} />
          </Pressable>
        </View>

        {step === 'choice' ? (
          <View style={styles.options}>
            <Pressable style={styles.option} onPress={() => setStep('create')} accessibilityRole="button">
              <View style={[styles.optionIcon, styles.diaryIcon]}><BookOpen color="#7C3AED" size={22} /></View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>New diary</Text>
                <Text style={styles.optionDescription}>A fresh place for the moments you want to keep together.</Text>
              </View>
            </Pressable>
            <Pressable style={styles.option} onPress={onCreateTimeCapsule} accessibilityRole="button">
              <View style={[styles.optionIcon, styles.capsuleIcon]}><Clock3 color="#0F766E" size={22} /></View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>New time capsule</Text>
                <Text style={styles.optionDescription}>Capture something now and choose when it returns to you.</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.fieldLabel}>Diary name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Summer in the city"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              maxLength={60}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateDiary}
            />
            <Text style={styles.fieldLabel}>Cover colour</Text>
            <View style={styles.colourRow}>
              {DIARY_COLOR_PALETTE.map((color) => {
                const selected = color === coverColor;
                return <Pressable key={color} onPress={() => setCoverColor(color)} accessibilityLabel={`Use ${color} cover`} accessibilityState={{ selected }} style={[styles.colourSwatch, { backgroundColor: color }, selected && styles.colourSwatchSelected]} />;
              })}
            </View>
            <View style={[styles.coverPreview, { backgroundColor: coverColor }]}>
              <View style={styles.previewSpine} />
              <Text numberOfLines={2} style={styles.previewTitle}>{name.trim() || 'Your new diary'}</Text>
            </View>
            <Button onPress={handleCreateDiary} loading={isCreating} style={styles.createButton}>
              <Text style={styles.createButtonText}>Create diary</Text>
            </Button>
            <Pressable onPress={() => setStep('choice')} style={styles.backButton}><Text style={styles.backButtonText}>Back</Text></Pressable>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: scale(20), paddingBottom: verticalScale(28) },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: scale(16), marginBottom: verticalScale(22) },
  title: { color: '#1E293B', fontFamily: 'Figtree-Bold', fontSize: scale(21), marginBottom: verticalScale(4) },
  subtitle: { color: '#64748B', fontFamily: 'Figtree-Regular', fontSize: scale(14), lineHeight: verticalScale(20), maxWidth: '88%' },
  closeButton: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: scale(16), height: scale(32), justifyContent: 'center', width: scale(32) },
  options: { gap: verticalScale(12) },
  option: { alignItems: 'center', backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: scale(16), borderWidth: 1, flexDirection: 'row', gap: scale(14), minHeight: verticalScale(92), padding: scale(15) },
  optionIcon: { alignItems: 'center', borderRadius: scale(14), height: scale(48), justifyContent: 'center', width: scale(48) },
  diaryIcon: { backgroundColor: '#EDE9FE' }, capsuleIcon: { backgroundColor: '#CCFBF1' }, optionCopy: { flex: 1 },
  optionTitle: { color: '#1E293B', fontFamily: 'Figtree-SemiBold', fontSize: scale(16), marginBottom: verticalScale(3) },
  optionDescription: { color: '#64748B', fontFamily: 'Figtree-Regular', fontSize: scale(13), lineHeight: verticalScale(18) },
  fieldLabel: { color: '#334155', fontFamily: 'Figtree-SemiBold', fontSize: scale(14), marginBottom: verticalScale(8), marginTop: verticalScale(14) },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: scale(14), borderWidth: 1, color: '#1E293B', fontFamily: 'Figtree-Regular', fontSize: scale(16), paddingHorizontal: scale(14), paddingVertical: verticalScale(13) },
  colourRow: { flexDirection: 'row', gap: scale(12) },
  colourSwatch: { borderColor: 'white', borderRadius: scale(16), borderWidth: 3, height: scale(32), width: scale(32) },
  colourSwatchSelected: { borderColor: '#1E293B', transform: [{ scale: 1.12 }] },
  coverPreview: { alignItems: 'center', borderRadius: scale(12), height: verticalScale(118), justifyContent: 'center', marginTop: verticalScale(20), overflow: 'hidden' },
  previewSpine: { backgroundColor: 'rgba(0, 0, 0, 0.16)', bottom: 0, left: 0, position: 'absolute', top: 0, width: '13%' },
  previewTitle: { color: 'white', fontFamily: 'Figtree-Bold', fontSize: scale(18), maxWidth: '66%', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.22)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  createButton: { borderRadius: scale(16), marginTop: verticalScale(22) }, createButtonText: { color: 'white', fontFamily: 'Figtree-SemiBold', fontSize: scale(16) },
  backButton: { alignItems: 'center', paddingTop: verticalScale(15) }, backButtonText: { color: '#64748B', fontFamily: 'Figtree-SemiBold', fontSize: scale(14) },
});
