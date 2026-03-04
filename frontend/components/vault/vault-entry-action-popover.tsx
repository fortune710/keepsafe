import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';

interface VaultEntryActionPopoverProps {
  isVisible: boolean;
  creatorName: string;
  onClose: () => void;
  onSave: () => void;
  onReport: () => void;
}

export default function VaultEntryActionPopover({
  isVisible,
  creatorName,
  onClose,
  onSave,
  onReport,
}: VaultEntryActionPopoverProps) {
  const swipeDownGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationY > 100 && event.velocityY > 500) {
        onClose();
      }
    });

  if (!isVisible) return null;

  return (
    <Animated.View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />

      <GestureDetector gesture={swipeDownGesture}>
        <Animated.View
          style={styles.popover}
          entering={SlideInDown.duration(300).springify().damping(27).stiffness(90)}
          exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>Take Action</Text>
          <Text style={styles.description}>
            What do you want to do with this diary entry from {creatorName}?
          </Text>

          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reportButton} onPress={onReport}>
            <Text style={styles.reportButtonText}>Report</Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: verticalScale(-50),
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  popover: {
    position: 'absolute',
    bottom: verticalScale(-40),
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(80),
    gap: verticalScale(12),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: verticalScale(12),
  },
  title: {
    fontSize: 20,
    color: Colors.text,
    fontFamily: 'Jost-SemiBold',
  },
  description: {
    fontSize: 15,
    color: '#475569',
    marginBottom: verticalScale(8),
    fontFamily: 'Jost-Regular',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: verticalScale(14),
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'Jost-SemiBold',
  },
  reportButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: verticalScale(14),
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontFamily: 'Jost-SemiBold',
  },
});
