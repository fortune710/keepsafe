import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Eye, Lock, Trash2, Download } from 'lucide-react-native';
import { PrivacySettings } from '@/types/privacy';
import { usePrivacySettings } from '@/hooks/use-privacy-settings';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';

interface PrivacySetting {
  id: PrivacySettings;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
  color: string;
}

const DEFAULT_SETTINGS: PrivacySetting[] = [
  {
    id: PrivacySettings.AUTO_SHARE,
    title: 'Auto-Share New Moments',
    description: 'Automatically share new captures with friends',
    icon: Shield,
    enabled: false,
    color: '#059669',
  },
  {
    id: PrivacySettings.LOCATION_SHARE,
    title: 'Location Sharing',
    description: 'Include location data in your moments',
    icon: Lock,
    enabled: true,
    color: '#F59E0B',
  },
];

export default function PrivacyScreen() {
  const { settings: settingsMap, toggleSetting } = usePrivacySettings();

  const settings: PrivacySetting[] = DEFAULT_SETTINGS.map((setting) => ({
    ...setting,
    enabled: settingsMap[setting.id] ?? setting.enabled,
  }));

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Your data will be prepared for download. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('Exporting data...') }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deleted', 'Your account has been deleted.');
            router.replace('/onboarding');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <View style={styles.settingsContainer}>
            {settings.map((setting) => {
              const IconComponent = setting.icon;
              return (
                <View key={setting.id} style={styles.settingItem}>
                  <View style={[styles.iconContainer, { backgroundColor: `${setting.color}15` }]}>
                    <IconComponent color={setting.color} size={20} />
                  </View>
                  
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{setting.title}</Text>
                    <Text style={styles.settingDescription}>{setting.description}</Text>
                  </View>
                  
                  <Switch
                    value={setting.enabled}
                    onValueChange={() => toggleSetting(setting.id)}
                    trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                    thumbColor={setting.enabled ? '#8B5CF6' : '#F3F4F6'}
                  />
                </View>
              );
            })}

            <Pressable 
              style={styles.settingItem}
              onPress={() => router.push('/settings/blocked-users')}
            >
              <View style={[styles.iconContainer, { backgroundColor: `#DC262615` }]}>
                <Trash2 color="#DC2626" size={20} />
              </View>
              
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Blocked Users</Text>
                <Text style={styles.settingDescription}>Manage users you have blocked</Text>
              </View>
            </Pressable>
          </View>
        </View>


        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <View style={[styles.iconContainer, { backgroundColor: '#0EA5E915' }]}>
              <Download color="#0EA5E9" size={20} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Export My Data</Text>
              <Text style={styles.actionDescription}>Download all your moments and data</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDeleteAccount}>
            <View style={[styles.iconContainer, { backgroundColor: '#DC262615' }]}>
              <Trash2 color="#DC2626" size={20} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: '#DC2626' }]}>Delete Account</Text>
              <Text style={styles.actionDescription}>Permanently delete your account and data</Text>
            </View>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    paddingTop: verticalScale(20),
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  settingsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
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
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  dataSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748B',
  },
});