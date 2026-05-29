import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import GridImagePickerLayoutPopover from '@/components/monthly-dumps/grid-image-picker-layout-popover';
import { Colors } from '@/lib/constants';
import { MonthlyDumpGridLayout } from '@/services/monthly-dump-service';

interface GridImagePickerRightActionsProps {
  gridLayout: MonthlyDumpGridLayout;
  selectionComplete: boolean;
  isSubmitting: boolean;
  onLayoutChange: (layout: MonthlyDumpGridLayout) => void;
  onDone: () => void;
}

export default function GridImagePickerRightActions({
  gridLayout,
  selectionComplete,
  isSubmitting,
  onLayoutChange,
  onDone,
}: GridImagePickerRightActionsProps) {
  return (
    <View style={styles.rightActions}>
      <GridImagePickerLayoutPopover
        currentLayout={gridLayout}
        isSubmitting={isSubmitting}
        onLayoutChange={onLayoutChange}
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onDone}
        disabled={!selectionComplete || isSubmitting}
        style={styles.doneButton}
      >
        <LinearGradient
          colors={
            selectionComplete && !isSubmitting
              ? [`${Colors.primary}F5`, `${Colors.primaryDark}EA`]
              : [Colors.primary, Colors.primaryDark]
          }
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={styles.doneButtonFill}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#F8FAFC" />
          ) : (
            <Check size={20} color="#F8FAFC" strokeWidth={2.8} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneButton: {
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.primary,
  },
  doneButtonFill: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});
