import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { FutureDatePicker } from '@/components/capture/future-date-picker';
import { Colors } from '@/lib/constants';
import { TimeCapsuleDraft } from '@/types/time-capsule';
import { CalendarDays, Sparkles, Check } from 'lucide-react-native';

export type { TimeCapsuleDraft };

interface TimeCapsuleConfigProps {
  value: TimeCapsuleDraft | null;
  onChange: (value: TimeCapsuleDraft | null) => void;
  onCustomInputLayout?: () => void;
  startUnselected?: boolean;
  onSelectRevealType?: () => void;
}

const CONDITION_PRESETS = [
  'Graduation',
  'Feeling down',
  'Feeling happy',
  'Birthday',
  'New Year',
  'Anniversary',
];
const CONDITION_LABEL_MAX_LENGTH = 40;

export function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TimeCapsuleConfig({ value, onChange, onCustomInputLayout, startUnselected = false, onSelectRevealType }: TimeCapsuleConfigProps) {
  const [selectedStep, setSelectedStep] = useState<'date' | 'condition' | null>(startUnselected ? null : value?.revealType ?? null);
  useEffect(() => { if (!value) setSelectedStep(null); }, [value]);
  const revealType = value?.revealType ?? 'date';
  const conditionLabel = value?.revealType === 'condition' ? value.conditionLabel : '';
  const isCustomCondition = revealType === 'condition' && !CONDITION_PRESETS.includes(conditionLabel);
  const [customText, setCustomText] = useState(isCustomCondition ? conditionLabel : '');

  const handleRevealTypeChange = (nextType: 'date' | 'condition') => {
    setSelectedStep(nextType);
    onSelectRevealType?.();
    if (value?.revealType === nextType) return;
    onChange(
      nextType === 'date'
        ? { revealType: 'date', unlockAt: tomorrowIso() }
        : { revealType: 'condition', conditionLabel: CONDITION_PRESETS[0] },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepRow}>
        <View style={styles.stepMarkerColumn}><View style={styles.stepMarker}><Text style={styles.stepNumber}>1</Text></View><View style={styles.stepLine} /></View>
        <View style={styles.stepContent}>
          <Text style={styles.question}>When should this memory be revealed?</Text>
          {(['date', 'condition'] as const).map((option) => (
            <TouchableOpacity key={option} style={[styles.radioRow, selectedStep === option && styles.radioRowSelected]} accessibilityRole="radio" accessibilityState={{ selected: selectedStep === option }} onPress={() => handleRevealTypeChange(option)}>
              <View style={[styles.choiceIcon, selectedStep === option && styles.choiceIconSelected]}>
                {option === 'date' ? <CalendarDays color="#7C3AED" size={19} /> : <Sparkles color="#7C3AED" size={19} />}
              </View>
              <View style={styles.choiceCopy}>
                <Text style={styles.radioText}>{option === 'date' ? 'On a date' : 'When a condition is met'}</Text>
                <Text style={styles.choiceDescription}>{option === 'date' ? 'Choose a day in the future' : 'Choose a moment that matters'}</Text>
              </View>
              <View style={[styles.radio, selectedStep === option && styles.radioSelected]}>{selectedStep === option && <Check size={13} color="white" strokeWidth={3} />}</View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
        <View style={styles.stepRow}>
          <View style={styles.stepMarkerColumn}><View style={styles.stepMarker}><Text style={styles.stepNumber}>2</Text></View></View>
          <View style={styles.stepContent}>
            <Text style={styles.question}>{!selectedStep || !value ? 'Choose the details' : selectedStep === 'date' ? 'Choose a date' : 'Choose a condition'}</Text>
          {!selectedStep || !value ? null : revealType === 'date' ? (
            <FutureDatePicker
              value={value?.revealType === 'date' ? value.unlockAt : tomorrowIso()}
              onChange={(iso) => onChange({ revealType: 'date', unlockAt: iso })}
            />
          ) : (
            <View style={styles.conditionSection}>
              <View style={styles.chipRow}>
                {CONDITION_PRESETS.map((preset) => {
                  const selected = conditionLabel === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => onChange({ revealType: 'condition', conditionLabel: preset })}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.chip, isCustomCondition && styles.chipSelected]}
                  onPress={() => onChange({ revealType: 'condition', conditionLabel: customText })}
                >
                  <Text style={[styles.chipText, isCustomCondition && styles.chipTextSelected]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomCondition && (
                <TextInput
                  style={styles.customInput}
                  onLayout={onCustomInputLayout}
                  onFocus={onCustomInputLayout}
                  placeholder="Describe the condition..."
                  placeholderTextColor="#94A3B8"
                  value={customText}
                  maxLength={CONDITION_LABEL_MAX_LENGTH}
                  onChangeText={(text) => {
                    setCustomText(text);
                    onChange({ revealType: 'condition', conditionLabel: text });
                  }}
                />
              )}
            </View>
          )}
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: verticalScale(16),
  },
  stepRow: { flexDirection: 'row', alignItems: 'stretch' },
  stepMarkerColumn: { alignItems: 'center', width: scale(28), marginRight: scale(10) },
  stepMarker: { width: scale(24), height: scale(24), borderRadius: scale(12), backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  stepNumber: { color: '#7C3AED', fontFamily: 'Figtree-SemiBold', fontSize: scale(12) },
  stepLine: { flex: 1, width: 1, backgroundColor: '#DDD6FE', marginVertical: verticalScale(4) },
  stepContent: { flex: 1, paddingBottom: verticalScale(14) },
  question: { color: Colors.text, fontFamily: 'Figtree-SemiBold', fontSize: scale(15), marginBottom: verticalScale(8) },
  radioRow: { flexDirection: 'row', alignItems: 'center', padding: scale(10), gap: scale(10), borderRadius: scale(14), borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FAFAFC', marginBottom: verticalScale(7) },
  radioRowSelected: { borderColor: '#A78BFA', backgroundColor: '#F5F1FF' },
  choiceIcon: { width: scale(36), height: scale(36), borderRadius: scale(11), backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  choiceIconSelected: { backgroundColor: '#E4D9FF' },
  choiceCopy: { flex: 1 },
  choiceDescription: { color: '#64748B', fontFamily: 'Figtree-Regular', fontSize: scale(12), marginTop: verticalScale(2) },
  radio: { width: scale(20), height: scale(20), borderRadius: scale(10), borderWidth: 1.5, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' },
  radioText: { color: Colors.text, fontFamily: 'Figtree-Medium', fontSize: scale(14) },
  conditionSection: {
    marginTop: verticalScale(4),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  chip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'white',
  },
  chipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  chipText: {
    fontSize: scale(13),
    fontFamily: 'Figtree-Medium',
    color: Colors.textMuted,
  },
  chipTextSelected: {
    color: 'white',
    fontFamily: 'Figtree-SemiBold',
  },
  customInput: {
    marginTop: verticalScale(12),
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: scale(14),
    borderWidth: 1,
    borderColor: Colors.border,
    fontFamily: 'Figtree-Regular',
  },
});
