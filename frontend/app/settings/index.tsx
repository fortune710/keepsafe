import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, User, Bell, Shield, HardDrive, Info, LogOut, Trash2, DownloadIcon } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { useAuthContext } from '@/providers/auth-provider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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
  const { profile, session } = useAuthContext();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/onboarding');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleExportData = async () => {
    Alert.alert(
      "Export Data",
      "Choose a format for your data export:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "JSON (Raw Data)",
          onPress: () => performExport('json'),
        },
        {
          text: "HTML (Readable)",
          onPress: () => performExport('html'),
        },
      ]
    );
  };

  const performExport = async (format: 'json' | 'html') => {
    if (!profile?.id || !session?.access_token) {
      Alert.alert('Error', 'Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setIsExporting(true);
      
      const extension = format === 'html' ? 'html' : 'json';
      const fileUri = `${FileSystem.documentDirectory}keepsafe_export_${profile.id}.${extension}`;
      const downloadUrl = `${BACKEND_URL}/user/${profile.id}/export?format=${format}`;

      console.log(`Exporting ${format} data for user:`, profile.id);

      const result = await FileSystem.downloadAsync(
        downloadUrl,
        fileUri,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      console.log('Download result:', result);

      if (result.status !== 200) {
        throw new Error('Failed to download export file');
      }

      // Success Alert
      Alert.alert(
        'Export Complete',
        'Your data has been successfully exported.',
        [
          {
            text: 'Share / Save',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(result.uri, {
                  mimeType: format === 'html' ? 'text/html' : 'application/json',
                  dialogTitle: 'Export User Data'
                });
              } else {
                Alert.alert('Success', 'File downloaded to: ' + result.uri);
              }
            }
          },
          { text: 'Close', style: 'cancel' }
        ]
      );

    } catch (error: any) {
      console.error('❌ Export Data Error:', error);
      Alert.alert('Error', error.message || 'Failed to export account data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!profile?.id) return;
            
            // Guard clause for missing session/token
            if (!session?.access_token) {
              Alert.alert('Error', 'Authentication token missing. Please sign in again.');
              return;
            }

            try {
              setIsDeleting(true);
              
              // 1. Call backend to delete user data (Pinecone, etc.)
              const response = await fetch(`${BACKEND_URL}/user/${profile.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete account data');
              }
              
              // 2. Sign out (Supabase auth session)
              await supabase.auth.signOut();
              Alert.alert(
                'Account Deleted',
                'Account deleted successfully, we hate to see you go',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/onboarding')
                  }
                ]
              );
            } catch (error: any) {
              console.error('❌ Delete Account Error:', error);
              Alert.alert('Error', error.message || 'Failed to delete account');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
            
            <TouchableOpacity style={styles.settingsItem} onPress={handleExportData} disabled={isExporting}>
              <View style={[styles.iconContainer, { backgroundColor: '#64748B15' }]}>
                {isExporting ? (
                  <ActivityIndicator color="#64748B" size="small" />
                ) : (
                  <DownloadIcon color="#64748B" size={20} />
                )}
              </View>
              
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{isExporting ? 'Exporting Data...' : 'Export Data'}</Text>
                <Text style={styles.itemSubtitle}>Export your account data</Text>
              </View>
              
              <View style={{ width: 20 }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem} onPress={handleDeleteAccount} disabled={isDeleting}>
              <View style={[styles.iconContainer, { backgroundColor: '#DC262615' }]}>
                <Trash2 color="#DC2626" size={20} />
              </View>
              
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, { color: '#DC2626' }]}>
                  {isDeleting ? 'Deleting Account...' : 'Delete Account'}
                </Text>
                <Text style={styles.itemSubtitle}>Permanently delete your data</Text>
              </View>
              
              <View style={{ width: 20 }} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingsItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
              <View style={[styles.iconContainer, { backgroundColor: '#64748B15' }]}>
                <LogOut color="#64748B" size={20} />
              </View>
              
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>Sign Out</Text>
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
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
});