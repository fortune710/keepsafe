import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Camera, ImagePlus } from 'lucide-react-native';

interface GridImagePickerBottomTrayProps {
  bottomMargin: number;
  onOpenEntries: () => void;
  onOpenCamera: () => void;
}

export default function GridImagePickerBottomTray({
  bottomMargin,
  onOpenEntries,
  onOpenCamera,
}: GridImagePickerBottomTrayProps) {
  return (
    <View style={[styles.bottomTrayCollapsed, { marginBottom: bottomMargin }]}>
      <TouchableOpacity
        testID="monthly-dump-grid-open-entries-button"
        activeOpacity={0.85}
        onPress={onOpenEntries}
        style={styles.trayActionButton}
      >
        <ImagePlus size={22} color="#F8FAFC" strokeWidth={2.2} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="monthly-dump-grid-open-camera-button"
        activeOpacity={0.85}
        onPress={onOpenCamera}
        style={styles.trayActionButton}
      >
        <Camera size={20} color="#F8FAFC" strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTrayCollapsed: {
    display: 'flex',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  trayActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
