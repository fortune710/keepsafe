import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronRight,
  User,
  Bell,
  Shield,
  HardDrive,
  Info,
  LogOut,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAuthContext } from '@/providers/auth-provider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { verticalScale } from 'react-native-size-matters';

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
    id: 'about',
    title: 'About',
    subtitle: 'App version and information',
    icon: Info,
    route: '/settings/about',
    color: '#1E40AF',
  },
];

export default function SettingsScreen() {
  const { profile, session } = useAuthContext();

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
      if (
        startY.current < SWIPE_THRESHOLD &&
        event.translationY > 100 &&
        event.velocityY > 500
      ) {
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

  return (
    <SafeAreaView style={styles.container}>
      <GestureDetector gesture={swipeDownGesture}>
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

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
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
                  uri:
                    profile?.avatar_url ||
                    getDefaultAvatarUrl(profile?.full_name || 'Unknown User'),
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
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
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
              <TouchableOpacity
                style={[styles.settingsItem, { borderBottomWidth: 0 }]}
                onPress={handleLogout}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: '#64748B15' },
                  ]}
                >
                  <LogOut color="#64748B" size={20} />
                </View>

                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>Sign Out</Text>
                  <Text style={styles.itemSubtitle}>
                    Sign out of your account
                  </Text>
                </View>

                <View style={{ width: 20 }} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </GestureDetector>
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
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    paddingVertical: verticalScale(12),
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
    overflow: 'hidden',
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
