import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, Modal, SafeAreaView } from 'react-native';
import { Check, Users, X } from 'lucide-react-native';
import { verticalScale } from 'react-native-size-matters';

interface FilterFriend {
  id: string;
  label: string;
  avatar: React.ReactNode;
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
  const handleSelect = (friendId?: string) => {
    onSelect(friendId);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
        data={[{
          id: '', label: 'All friends', avatar: (
            <View accessible={false}>
              <Users color="#64748B" size={24} />
            </View>
          )
        }, ...options]}
        keyExtractor={(item) => item.id || 'all'}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isAll = item.id === '';
          const isSelected = isAll ? !selectedFriendId : selectedFriendId === item.id;
          return (
            <TouchableOpacity style={styles.optionRow} onPress={() => handleSelect(isAll ? undefined : item.id)}>
              <View style={styles.optionRowInner}>
                {item.avatar}
                <Text style={styles.optionLabel}>{item.label}</Text>
              </View>
              {isSelected && <Check color="#8B5CF6" size={18} />}
            </TouchableOpacity>
          );
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Outfit-SemiBold'
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
  optionRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionLabel: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium'
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
});
