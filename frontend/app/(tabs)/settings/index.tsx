import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, Bell, Shield, HardDrive, Info, LogOut } from 'lucide-react-native';
import { UserIcon } from '@/components/icons/user-icon';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAuthContext } from '@/providers/auth-provider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { verticalScale } from 'react-native-size-matters';
import { logger } from '@/lib/logger';
import { Colors } from '@/lib/constants';

// Every settings icon/row shares the Sign Out row's neutral slate color.
const SETTINGS_ICON_COLOR = '#64748B';

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  route: string;
}

const accountSettingsItems: SettingsItem[] = [
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Edit your personal information',
    icon: UserIcon,
    route: '/settings/profile',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Manage your notification preferences',
    icon: Bell,
    route: '/settings/notifications',
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    subtitle: 'Control your privacy settings',
    icon: Shield,
    route: '/settings/privacy',
  },
  // {
  //   id: 'storage',
  //   title: 'Storage & Data',
  //   subtitle: 'Manage your data and storage',
  //   icon: HardDrive,
  //   route: '/settings/storage',
  // },
];

const helpItems: SettingsItem[] = [
  {
    id: 'about',
    title: 'About',
    subtitle: 'App version and information',
    icon: Info,
    route: '/settings/about',
  },
];

export default function SettingsScreen() {
  const { profile } = useAuthContext();

  const { height: screenHeight } = Dimensions.get('window');
  const SWIPE_THRESHOLD = screenHeight * 0.15; // 15% of screen height
  const startY = useRef(0);

  // Swipe down from top to close settings
  const swipeDownGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart((event) => {
      startY.current = event.absoluteY;
    })
    .onUpdate((event) => {
      // Optional: Add visual feedback logic here if needed
    })
    .onEnd((event) => {
      // Check if swipe started at the top area and moved down rapidly
      if (startY.current < SWIPE_THRESHOLD && event.translationY > 100 && event.velocityY > 500) {
        router.back();
      }
    });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/onboarding');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const renderSettingsItem = (item: SettingsItem) => {
    const IconComponent = item.icon;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingsItem}
        onPress={() => router.push(item.route as any)}
      >
        <View style={styles.iconContainer}>
          <IconComponent color={SETTINGS_ICON_COLOR} size={20} />
        </View>

        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
          )}
        </View>

        <ChevronRight color="#94A3B8" size={20} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <StatusBar style="dark" />
      <GestureDetector gesture={swipeDownGesture}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
          </View>

          <View style={styles.content}>
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
              </View>
              <Image
                source={{
                  uri: profile?.avatar_url || getDefaultAvatarUrl(profile?.full_name || 'Unknown User')
                }}
                style={styles.profileImage}
              />
            </TouchableOpacity>

            <Text style={styles.groupLabel}>Account Settings</Text>
            <View style={styles.settingsSection}>
              {accountSettingsItems.map(renderSettingsItem)}
            </View>

            <Text style={styles.groupLabel}>Help</Text>
            <View style={styles.settingsSection}>
              {helpItems.map(renderSettingsItem)}
            </View>

            <View style={styles.settingsSection}>
              <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
                <View style={styles.iconContainer}>
                  <LogOut color={SETTINGS_ICON_COLOR} size={20} />
                </View>

                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>Sign Out</Text>
                  <Text style={styles.itemSubtitle}>Sign out of your account</Text>
                </View>

                <View style={{ width: 20 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    paddingVertical: verticalScale(12),
  },
  profileInfo: {
    flex: 1,
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
  },
  groupLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
    color: '#64748B',
    marginHorizontal: 20,
    marginBottom: 4,
  },
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${SETTINGS_ICON_COLOR}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
  },
});