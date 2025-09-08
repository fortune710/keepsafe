import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Search, X } from 'lucide-react-native';

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
  const inputOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (isVisible) {
      inputOpacity.value = withTiming(1, { duration: 300 });
    } else {
      inputOpacity.value = withTiming(0, { duration: 200 });
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

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      opacity: inputOpacity.value,
    };
  });

  if (!isVisible) return null;

  return (
    <Animated.View 
      entering={FadeInDown.duration(300).springify().damping(20).stiffness(90)} 
      exiting={FadeOutUp.duration(200)}
      style={styles.container}
    >
      <Animated.View style={[styles.searchContainer, animatedInputStyle]}>
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
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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