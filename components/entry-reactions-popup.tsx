import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useEntryReactions, ReactionType } from '@/hooks/use-entry-reactions';
import ToastMessage from './toast-message';

const { height, width: screenWidth } = Dimensions.get('window');

interface EntryReactionsPopupProps {
  isVisible: boolean;
  entryId: string;
  onClose: () => void;
}

const reactionEmojis = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

const reactionLabels = {
  like: 'Like',
  love: 'Love',
  laugh: 'Laugh',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry',
};

export default function EntryReactionsPopup({ isVisible, entryId, onClose }: EntryReactionsPopupProps) {
  const { reactions, reactionSummary, userReaction, isLoading, toggleReaction } = useEntryReactions(entryId);
  const [selectedTab, setSelectedTab] = useState<ReactionType | 'all'>('all');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleReactionToggle = async (reactionType: ReactionType) => {
    const result = await toggleReaction(reactionType);
    if (!result.success) {
      showToast(result.error || 'Failed to update reaction', 'error');
    }
  };

  const filteredReactions = selectedTab === 'all' 
    ? reactions 
    : reactions.filter(r => r.reaction_type === selectedTab);

  const totalReactions = Object.values(reactionSummary).reduce((sum, count) => sum + count, 0);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <ToastMessage 
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />

      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      
      <Animated.View 
        entering={SlideInDown.duration(300).springify().damping(20).stiffness(90)} 
        exiting={SlideOutDown.duration(300).springify().damping(20).stiffness(90)}
        style={styles.popup}
      >
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <Text style={styles.title}>Reactions</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color="#64748B" size={20} />
          </TouchableOpacity>
        </View>

        {/* Reaction Selector */}
        <View style={styles.reactionSelector}>
          {Object.entries(reactionEmojis).map(([type, emoji]) => {
            const reactionType = type as ReactionType;
            const isSelected = userReaction?.reaction_type === reactionType;
            const count = reactionSummary[reactionType] || 0;
            
            return (
              <TouchableOpacity
                key={type}
                style={[styles.reactionButton, isSelected && styles.selectedReactionButton]}
                onPress={() => handleReactionToggle(reactionType)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 0 && (
                  <Text style={[styles.reactionCount, isSelected && styles.selectedReactionCount]}>
                    {count}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reaction Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'all' && styles.activeTab]}
            onPress={() => setSelectedTab('all')}
          >
            <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>
              All {totalReactions > 0 && `(${totalReactions})`}
            </Text>
          </TouchableOpacity>
          
          {Object.entries(reactionSummary).map(([type, count]) => {
            if (count === 0) return null;
            const reactionType = type as ReactionType;
            const emoji = reactionEmojis[reactionType];
            
            return (
              <TouchableOpacity
                key={type}
                style={[styles.tab, selectedTab === reactionType && styles.activeTab]}
                onPress={() => setSelectedTab(reactionType)}
              >
                <Text style={styles.tabEmoji}>{emoji}</Text>
                <Text style={[styles.tabText, selectedTab === reactionType && styles.activeTabText]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Reactions List */}
        <ScrollView style={styles.reactionsList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#8B5CF6" size="small" />
              <Text style={styles.loadingText}>Loading reactions...</Text>
            </View>
          ) : filteredReactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>😊</Text>
              <Text style={styles.emptyText}>No reactions yet</Text>
              <Text style={styles.emptySubtext}>Be the first to react to this entry</Text>
            </View>
          ) : (
            filteredReactions.map((reaction) => {
              const emoji = reactionEmojis[reaction.reaction_type];
              return (
                <View key={reaction.id} style={styles.reactionItem}>
                  <Image 
                    source={{ 
                      uri: reaction.user_profile.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100' 
                    }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.reactionInfo}>
                    <Text style={styles.userName}>
                      {reaction.user_profile.full_name || 'Unknown User'}
                    </Text>
                    <Text style={styles.reactionTime}>
                      {formatTime(reaction.created_at)}
                    </Text>
                  </View>
                  <View style={styles.reactionIcon}>
                    <Text style={styles.reactionEmojiLarge}>{emoji}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popup: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: height * 0.8,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  reactionSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  reactionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedReactionButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#8B5CF6',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  reactionCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  selectedReactionCount: {
    color: '#8B5CF6',
  },
  tabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#8B5CF6',
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: 'white',
  },
  reactionsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reactionInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  reactionTime: {
    fontSize: 12,
    color: '#64748B',
  },
  reactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  reactionEmojiLarge: {
    fontSize: 20,
  },
});