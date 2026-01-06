import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';
import { Plus, Users } from 'lucide-react-native';
import { useResponsive } from '@/hooks/use-responsive';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  hasShared: boolean;
}

interface MemoryBox {
  id: string;
  name: string;
  image: string;
  contributors: number;
  lastActivity: string;
}

const mockFriends: Friend[] = [
  { id: '1', name: 'Sarah', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100', hasShared: true },
  { id: '2', name: 'Mike', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100', hasShared: true },
  { id: '3', name: 'Emma', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100', hasShared: false },
];

const mockMemoryBoxes: MemoryBox[] = [
  {
    id: '1',
    name: 'Europe Trip 2024',
    image: 'https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg?auto=compress&cs=tinysrgb&w=400',
    contributors: 4,
    lastActivity: '2 hours ago',
  },
  {
    id: '2',
    name: 'Family Reunion',
    image: 'https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=400',
    contributors: 8,
    lastActivity: '1 day ago',
  },
];

export default function SocialScreen() {
  const responsive = useResponsive();
  const friendsWithShares = mockFriends.filter(friend => friend.hasShared);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={responsive.isTablet ? {
          maxWidth: responsive.maxContentWidth,
          alignSelf: 'center',
          width: '100%',
          paddingHorizontal: responsive.contentPadding,
        } : undefined}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared Moments</Text>
          {friendsWithShares.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsRow}>
              {friendsWithShares.map((friend) => (
                <TouchableOpacity key={friend.id} style={styles.friendCircle}>
                  <Image source={{ uri: friend.avatar }} style={styles.friendAvatar} />
                  <View style={styles.shareIndicator} />
                  <Text style={styles.friendName}>{friend.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Users color="#94A3B8" size={48} />
              <Text style={styles.emptyText}>No shared moments yet</Text>
              <Text style={styles.emptySubtext}>Friends' shared moments will appear here</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Memory Boxes</Text>
            <TouchableOpacity style={styles.createButton}>
              <Plus color="#8B5CF6" size={20} />
              <Text style={styles.createButtonText}>New Box</Text>
            </TouchableOpacity>
          </View>

          {mockMemoryBoxes.map((box) => (
            <TouchableOpacity key={box.id} style={styles.memoryBoxCard}>
              <Image source={{ uri: box.image }} style={styles.memoryBoxImage} />
              <View style={styles.memoryBoxContent}>
                <Text style={styles.memoryBoxName}>{box.name}</Text>
                <Text style={styles.memoryBoxMeta}>
                  {box.contributors} contributors • {box.lastActivity}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F0F9FF',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    // Ensure minimum touch target (iOS guideline: 44pt)
    minHeight: 44,
  },
  createButtonText: {
    color: '#8B5CF6',
    marginLeft: 4,
    fontWeight: '500',
  },
  friendsRow: {
    paddingVertical: 8,
  },
  friendCircle: {
    alignItems: 'center',
    marginRight: 20,
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  shareIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: 'white',
  },
  friendName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  memoryBoxCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memoryBoxImage: {
    width: 80,
    height: 80,
  },
  memoryBoxContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  memoryBoxName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  memoryBoxMeta: {
    fontSize: 14,
    color: '#64748B',
  },
});