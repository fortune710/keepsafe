import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Eye, Lock, Trash2, Download } from 'lucide-react-native';
import { PrivacySettings } from '@/types/privacy';
import { usePrivacySettings } from '@/hooks/use-privacy-settings';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';
import { useAuthContext } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { logger } from '@/lib/logger';

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
  const { settings: settingsMap, toggleSetting, isLoading, isSaving } = usePrivacySettings();
  const { profile, session } = useAuthContext();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusMessage, setExportStatusMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const exportPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (exportPollTimeoutRef.current) {
        clearTimeout(exportPollTimeoutRef.current);
        exportPollTimeoutRef.current = null;
      }
    };
  }, []);

  const settings: PrivacySetting[] = DEFAULT_SETTINGS.map((setting) => ({
    ...setting,
    enabled: settingsMap[setting.id] ?? setting.enabled,
  }));

  const handleExportData = async () => {
    Alert.alert(
      'Export Data',
      'Choose a format for your data export:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'JSON (Raw Data)',
          onPress: () => performExport('json'),
        },
        {
          text: 'HTML (Readable)',
          onPress: () => performExport('html'),
        },
      ]
    );
  };

  const pollExportStatus = async (
    jobId: string,
    format: 'json' | 'html',
    attempt = 0
  ) => {
    if (!isMountedRef.current) {
      return;
    }

    if (!profile?.id || !session?.access_token) {
      if (!isMountedRef.current) {
        return;
      }
      Alert.alert('Error', 'Authentication token missing. Please sign in again.');
      return;
    }

    if (attempt > 30) {
      if (!isMountedRef.current) {
        return;
      }
      setIsExporting(false);
      setExportStatusMessage(null);
      Alert.alert('Error', 'Export is taking longer than expected. Please try again later.');
      return;
    }

    try {
      const statusResponse = await fetch(
        `${BACKEND_URL}/user/${profile.id}/export/${encodeURIComponent(jobId)}/status`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to check export status');
      }

      const statusJson = await statusResponse.json();

      if (statusJson.status === 'completed') {
        if (!isMountedRef.current) {
          return;
        }
        setExportStatusMessage('Export ready. Downloading your data...');
        await downloadExport(jobId, format);
        return;
      }

      if (statusJson.status === 'failed') {
        if (!isMountedRef.current) {
          return;
        }
        setIsExporting(false);
        setExportStatusMessage(null);
        Alert.alert('Error', statusJson.error || 'Export failed. Please try again.');
        return;
      }

      if (attempt === 0) {
        setExportStatusMessage('Preparing your export. This may take a few moments...');
      } else {
        setExportStatusMessage('Still preparing your export...');
      }

      if (!isMountedRef.current) {
        return;
      }

      exportPollTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }
        void pollExportStatus(jobId, format, attempt + 1);
      }, 2000);
    } catch (error: any) {
      if (!isMountedRef.current) {
        return;
      }
      setIsExporting(false);
      logger.error('Export Status Error', error);
      setExportStatusMessage(null);
      Alert.alert('Error', error.message || 'Failed to check export status');
    }
  };

  const downloadExport = async (jobId: string, format: 'json' | 'html') => {
    if (!profile?.id || !session?.access_token) {
      Alert.alert('Error', 'Authentication token missing. Please sign in again.');
      return;
    }

    const extension = format === 'html' ? 'html' : 'json';
    const fileUri = `${FileSystem.documentDirectory}keepsafe_export_${profile.id}.${extension}`;
    const downloadUrl = `${BACKEND_URL}/user/${profile.id}/export/${encodeURIComponent(
      jobId
    )}/download`;

    try {
      logger.info(`Downloading completed export ${jobId} for user: ${profile.id}`);

      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      logger.info('Download result:', result);

      if (result.status !== 200) {
        throw new Error('Failed to download export file');
      }

      if (isMountedRef.current) {
        setIsExporting(false);
        setExportStatusMessage(null);

        Alert.alert(
          'Export Complete',
          'Your data has been successfully exported.',
          [
            {
              text: 'Share / Save',
              onPress: async () => {
                if (!isMountedRef.current) return;
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(result.uri, {
                    mimeType: format === 'html' ? 'text/html' : 'application/json',
                    dialogTitle: 'Export User Data',
                  });
                } else {
                  if (isMountedRef.current) {
                    Alert.alert('Success', 'File downloaded to: ' + result.uri);
                  }
                }
              },
            },
            { text: 'Close', style: 'cancel' },
          ]
        );
      }
    } catch (error: any) {
      logger.error('Export Download Error', error);
      if (isMountedRef.current) {
        setIsExporting(false);
        setExportStatusMessage(null);
        Alert.alert('Error', error.message || 'Failed to download export file');
      }
    }
  };

  const performExport = async (format: 'json' | 'html') => {
    if (!profile?.id || !session?.access_token) {
      Alert.alert('Error', 'Authentication token missing. Please sign in again.');
      return;
    }

    try {
      setIsExporting(true);
      setExportStatusMessage('Starting your export...');

      logger.info(`Starting async ${format} export for user: ${profile.id}`);

      const response = await fetch(
        `${BACKEND_URL}/user/${profile.id}/export?format=${format}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to start export');
      }

      const json = await response.json();
      const jobId = json.job_id as string | undefined;

      if (!jobId) {
        throw new Error('Missing export job id from server');
      }

      void pollExportStatus(jobId, format);
    } catch (error: any) {
      if (isMountedRef.current) {
        setIsExporting(false);
        setExportStatusMessage(null);
        logger.error('Export Data Error', error);
        Alert.alert('Error', error.message || 'Failed to export account data');
      }
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

            if (!session?.access_token) {
              Alert.alert('Error', 'You need to be signed in to delete your account.');
              return;
            }

            try {
              setIsDeleting(true);

              const response = await fetch(`${BACKEND_URL}/user/${profile.id}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to delete account data');
              }

              try {
                await supabase.auth.signOut();
              } catch (signOutError: any) {
                logger.error('Delete Account: signOut failed after backend delete', signOutError);
              }

              Alert.alert(
                'Account Deleted',
                'Account deleted successfully, we hate to see you go',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/onboarding'),
                  },
                ]
              );
            } catch (error: any) {
              logger.error('Delete Account Error', error);
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
                    disabled={isSaving || isLoading}
                    value={setting.enabled}
                    onValueChange={() => toggleSetting(setting.id)}
                    trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                    thumbColor={setting.enabled ? '#8B5CF6' : '#F3F4F6'}
                  />
                </View>
              );
            })}

            <Pressable
              accessibilityRole='button' 
              accessibilityLabel='Blocked Users'
              accessibilityHint='Manage users you have blocked'
              testID='blocked-users-button'
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
          
          <TouchableOpacity
            style={[styles.actionButton, isExporting && { opacity: 0.5 }]}
            onPress={handleExportData}
            disabled={isExporting}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#0EA5E915' }]}>
              <Download color="#0EA5E9" size={20} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                {isExporting ? 'Exporting Data...' : 'Export My Data'}
              </Text>
              <Text style={styles.actionDescription}>Download all your moments and data</Text>
            </View>
          </TouchableOpacity>

          {isExporting && (
            <View style={styles.exportStatusRow}>
              <ActivityIndicator size="small" color="#0EA5E9" style={styles.exportStatusSpinner} />
              <Text style={styles.exportStatusText}>
                {exportStatusMessage || 'Preparing your export...'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, isDeleting && { opacity: 0.5 }]}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#DC262615' }]}>
              <Trash2 color="#DC2626" size={20} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: '#DC2626' }]}>
                {isDeleting ? 'Deleting Account...' : 'Delete Account'}
              </Text>
              <Text style={styles.actionDescription}>
                Permanently delete your account and data
              </Text>
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
    fontFamily: 'Outfit-SemiBold',
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
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
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
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
  },
  dataSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  exportStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
  },
  exportStatusSpinner: {
    marginRight: 8,
  },
  exportStatusText: {
    fontSize: 13,
    color: '#64748B',
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
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
  },
});