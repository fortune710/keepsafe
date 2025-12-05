import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, User, Bell, Shield, HardDrive, Info, LogOut } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { useAuthContext } from '@/providers/auth-provider';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  route: string;
  color: string;
}

const settingsItems: SettingsItem[] = [
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Edit your personal information',
    icon: User,
    route: '/settings/profile',
    color: '#8B5CF6',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Manage your notification preferences',
    icon: Bell,
    route: '/settings/notifications',
    color: '#059669',
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    subtitle: 'Control your privacy settings',
    icon: Shield,
    route: '/settings/privacy',
    color: '#DC2626',
  },
  {
    id: 'storage',
    title: 'Storage & Data',
    subtitle: 'Manage your data and storage',
    icon: HardDrive,
    route: '/settings/storage',
    color: '#7C2D12',
  },
  {
    id: 'about',
    title: 'About',
    subtitle: 'App version and information',
    icon: Info,
    route: '/settings/about',
    color: '#1E40AF',
  },
];

export default function SettingsScreen() {
  const { profile } = useAuthContext();
  
  // Swipe down from top to close settings
  const swipeDownGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow downward swipes from the top area
      if (event.translationY > 0 && event.absoluteY < 100) {
        // Handle swipe down animation here if needed
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 && event.velocityY > 500 && event.absoluteY < 200) {
        router.back();
      }
    });

  const handleLogout = () => {
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <ChevronRight color="#64748B" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.profileSection}
            onPress={() => router.push('/settings/profile')}
          >
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.full_name || 'Add your name'}
              </Text>
              <Text style={styles.profileUsername}>
                @{profile?.username || 'username'}
              </Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
            </View>
            <Image 
              source={{ 
                uri: profile?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200' 
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>

          <View style={styles.settingsSection}>
            {settingsItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.settingsItem}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                    <IconComponent color={item.color} size={20} />
                  </View>
                  
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.subtitle && (
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  
                  <ChevronRight color="#CBD5E1" size={20} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.settingsSection}>
            <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
              <View style={[styles.iconContainer, { backgroundColor: '#DC262615' }]}>
                <LogOut color="#DC2626" size={20} />
              </View>
              
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, { color: '#DC2626' }]}>Sign Out</Text>
                <Text style={styles.itemSubtitle}>Sign out of your account</Text>
              </View>
              
              <View style={{ width: 20 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 16,
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
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  settingsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
});