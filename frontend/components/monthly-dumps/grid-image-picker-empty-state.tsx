import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/lib/constants';

type GridPickerTab = 'entries' | 'gallery';

interface GridImagePickerEmptyStateProps {
  activeSource: GridPickerTab;
  permissionGranted: boolean;
  onRequestPermission: () => void;
}

export default function GridImagePickerEmptyState({
  activeSource,
  permissionGranted,
  onRequestPermission,
}: GridImagePickerEmptyStateProps) {
  if (activeSource === 'gallery' && !permissionGranted) {
    return (
      <View style={styles.sourceEmptyState}>
        <Text style={styles.sourceEmptyTitle}>Gallery access needed.</Text>
        <Text style={styles.sourceEmptySubtitle}>Allow access to use photos from this month.</Text>
        <TouchableOpacity activeOpacity={0.88} onPress={onRequestPermission} style={styles.sourceActionButton}>
          <LinearGradient
            colors={[`${Colors.primary}E6`, `${Colors.primaryDark}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sourceActionButtonFill}
          >
            <Text style={styles.sourceActionButtonText}>Allow access</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.sourceEmptyState}>
      <Text style={styles.sourceEmptyTitle}>
        {activeSource === 'entries' ? 'No entries for this month.' : 'No gallery photos yet.'}
      </Text>
      <Text style={styles.sourceEmptySubtitle}>
        {activeSource === 'entries'
          ? 'Check your gallery instead.'
          : 'Photos from this month will appear here automatically.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sourceEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },
  sourceEmptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontFamily: 'Figtree-SemiBold',
    textAlign: 'center',
  },
  sourceEmptySubtitle: {
    color: '#C7D2E1',
    fontSize: 13,
    fontFamily: 'Figtree-Regular',
    textAlign: 'center',
    lineHeight: 19,
  },
  sourceActionButton: {
    marginTop: 4,
  },
  sourceActionButtonFill: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sourceActionButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'Figtree-SemiBold',
    textAlign: 'center',
  },
});
