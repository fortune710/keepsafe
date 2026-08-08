import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { FutureDatePicker } from '@/components/capture/future-date-picker';
import { Colors } from '@/lib/constants';
import { TimeCapsuleDraft } from '@/types/time-capsule';

export type { TimeCapsuleDraft };

interface TimeCapsuleConfigProps {
  value: TimeCapsuleDraft | null;
  onChange: (value: TimeCapsuleDraft | null) => void;
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

export default function TimeCapsuleConfig({ value, onChange }: TimeCapsuleConfigProps) {
  const isEnabled = value !== null;
  const revealType = value?.revealType ?? 'date';
  const conditionLabel = value?.revealType === 'condition' ? value.conditionLabel : '';
  const isCustomCondition = revealType === 'condition' && !CONDITION_PRESETS.includes(conditionLabel);
  const [customText, setCustomText] = useState(isCustomCondition ? conditionLabel : '');

  const handleToggle = (next: boolean) => {
    onChange(next ? { revealType: 'date', unlockAt: tomorrowIso() } : null);
  };

  const handleRevealTypeChange = (nextType: 'date' | 'condition') => {
    onChange(
      nextType === 'date'
        ? { revealType: 'date', unlockAt: tomorrowIso() }
        : { revealType: 'condition', conditionLabel: CONDITION_PRESETS[0] },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Save as a Time Capsule</Text>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ true: '#8B5CF6', false: Colors.border }}
        />
      </View>

      {isEnabled && (
        <>
          <SegmentedControl
            options={[
              { value: 'date', label: 'Date' },
              { value: 'condition', label: 'Condition' },
            ]}
            value={revealType}
            onChange={handleRevealTypeChange}
            style={styles.segmentedControl}
          />

          {revealType === 'date' ? (
            <FutureDatePicker
              value={value!.revealType === 'date' ? value!.unlockAt : tomorrowIso()}
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: verticalScale(16),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
  },
  toggleLabel: {
    fontSize: scale(15),
    fontFamily: 'Figtree-SemiBold',
    color: Colors.text,
  },
  segmentedControl: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(16),
  },
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
