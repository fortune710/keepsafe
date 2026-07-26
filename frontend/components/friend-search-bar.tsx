import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Colors } from '@/lib/constants';

const { width } = Dimensions.get('window');

interface FriendSearchBarProps {
  isVisible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function FriendSearchBar({
  isVisible,
  onClose,
  onSearch,
  placeholder = "Search friends by name or email..."
}: FriendSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (!isVisible) {
      setSearchQuery('');
    }
  }, [isVisible]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onSearch(text);
  };

  const handleClose = () => {
    setSearchQuery('');
    onSearch('');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search color="#94A3B8" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoFocus
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X color="#64748B" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});