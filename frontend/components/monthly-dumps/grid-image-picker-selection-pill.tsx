import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface GridImagePickerSelectionPillProps {
  selectedCount: number;
  requiredPhotos: number;
  style?: StyleProp<ViewStyle>;
}

export default function GridImagePickerSelectionPill({
  selectedCount,
  requiredPhotos,
  style,
}: GridImagePickerSelectionPillProps) {
  return (
    <View style={[styles.selectionPill, style]}>
      <Text style={styles.selectionPillText}>
        {selectedCount}/{requiredPhotos}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selectionPill: {
    position: 'absolute',
    top: 96,
    right: 16,
    zIndex: 30,
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(7,17,31,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionPillText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
  },
});
