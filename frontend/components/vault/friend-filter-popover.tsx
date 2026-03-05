import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Check, X } from 'lucide-react-native';
import { verticalScale } from 'react-native-size-matters';

interface FilterFriend {
  id: string;
  label: string;
}

interface FriendFilterPopoverProps {
  isVisible: boolean;
  onClose: () => void;
  options: FilterFriend[];
  selectedFriendId?: string;
  onSelect: (friendId?: string) => void;
}

const { height } = Dimensions.get('window');

export default function FriendFilterPopover({
  isVisible,
  onClose,
  options,
  selectedFriendId,
  onSelect,
}: FriendFilterPopoverProps) {
  const swipeDownGesture = Gesture.Pan().onEnd((event) => {
    if (event.translationY > 100 && event.velocityY > 500) {
      runOnJS(onClose)();
    }
  });

  const handleSelect = (friendId?: string) => {
    onSelect(friendId);
    onClose();
  };

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
          <View style={styles.header}>
            <Text style={styles.title}>Filter by friend</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close"
              accessibilityHint="Closes the filter popover"
            >
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={[{ id: '', label: 'All friends' }, ...options]}
            keyExtractor={(item) => item.id || 'all'}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isAll = item.id === '';
              const isSelected = isAll ? !selectedFriendId : selectedFriendId === item.id;
              return (
                <TouchableOpacity style={styles.optionRow} onPress={() => handleSelect(isAll ? undefined : item.id)}>
                  <Text style={styles.optionLabel}>{item.label}</Text>
                  {isSelected && <Check color="#8B5CF6" size={18} />}
                </TouchableOpacity>
              );
            }}
          />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popover: {
    position: 'absolute',
    bottom: verticalScale(-40),
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: verticalScale(80),
    maxHeight: height * 0.65,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '500',
  },
});
