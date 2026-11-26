import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Clock3 } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { DIARY_COLOR_PALETTE } from '@/lib/diary-colors';
import { createDiarySchema } from '@/lib/validations/diaries';
import { DiaryIcon } from '@/components/icons/diary-icon';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

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
      <Animated.View style={styles.content} layout={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)}>
        {step === 'choice' ? (
          <Animated.View key="choice" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <Pressable style={styles.option} onPress={() => setStep('create')} accessibilityRole="button">
              <View style={styles.optionIcon}><DiaryIcon color="#64748B" size={20} /></View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>New Diary</Text>
                <Text style={styles.optionDescription}>Organize your memories in one place.</Text>
              </View>
            </Pressable>
            <Pressable style={styles.option} onPress={onCreateTimeCapsule} accessibilityRole="button">
              <View style={styles.optionIcon}><Clock3 color="#64748B" size={20} /></View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>New Time Capsule</Text>
                <Text style={styles.optionDescription}>Save a memory for your future self.</Text>
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View key="create" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <Text style={styles.fieldLabel}>Diary Name</Text>
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
            <Text style={styles.fieldLabel}>Cover Colour</Text>
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
              <Text style={styles.createButtonText}>Create Diary</Text>
            </Button>
            <Pressable onPress={() => setStep('choice')} style={styles.backButton}><Text style={styles.backButtonText}>Back</Text></Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: scale(20), paddingBottom: verticalScale(44) },
  option: { alignItems: 'center', flexDirection: 'row', paddingVertical: 10, marginBottom: 2 },
  optionIcon: { alignItems: 'center', backgroundColor: '#64748B15', borderRadius: 22, height: 44, justifyContent: 'center', marginRight: 16, width: 44 },
  optionCopy: { flex: 1 },
  optionTitle: { color: '#1E293B', fontFamily: 'Figtree-SemiBold', fontSize: 16, marginBottom: 2 },
  optionDescription: { color: '#64748B', fontFamily: 'Figtree-Regular', fontSize: 14 },
  fieldLabel: { color: '#334155', fontFamily: 'Figtree-SemiBold', fontSize: scale(14), marginBottom: verticalScale(8), marginTop: verticalScale(14) },
  input: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: scale(14), borderWidth: 1, color: '#1E293B', fontFamily: 'Figtree-Regular', fontSize: scale(16), paddingHorizontal: scale(14), paddingVertical: verticalScale(13) },
  colourRow: { flexDirection: 'row', gap: scale(12) },
  colourSwatch: { borderColor: 'white', borderRadius: scale(16), borderWidth: 2, height: scale(32), width: scale(32) },
  colourSwatchSelected: { borderColor: '#8B5CF6', transform: [{ scale: 1.12 }] },
  coverPreview: { alignItems: 'center', borderRadius: scale(12), height: verticalScale(118), justifyContent: 'center', marginTop: verticalScale(20), overflow: 'hidden' },
  previewSpine: { backgroundColor: 'rgba(0, 0, 0, 0.16)', bottom: 0, left: 0, position: 'absolute', top: 0, width: '13%' },
  previewTitle: { color: 'white', fontFamily: 'Figtree-Bold', fontSize: scale(18), maxWidth: '66%', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.22)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  createButton: { marginTop: verticalScale(22) }, createButtonText: { color: 'white', fontFamily: 'Figtree-SemiBold', fontSize: scale(16) },
  backButton: { alignItems: 'center', paddingTop: verticalScale(15) }, backButtonText: { color: '#64748B', fontFamily: 'Figtree-SemiBold', fontSize: scale(14) },
});
