import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { router } from 'expo-router';
import { Bell, Users, Calendar, UserPlus } from 'lucide-react-native';
import { BackButton } from '@/components/back-button';
import { NotificationSettings } from '@/types/notifications';
import { useNotificationSettings } from '@/hooks/use-notification-settings';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';

interface NotificationSetting {
  id: NotificationSettings;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
}

// Every setting icon shares this neutral slate color, matching the main
// settings screen.
const SETTING_ICON_COLOR = '#64748B';

const DEFAULT_SETTINGS: NotificationSetting[] = [
  {
    id: NotificationSettings.PUSH_NOTIFICATIONS,
    title: 'Push Notifications',
    description: 'Receive notifications on your device',
    icon: Bell,
    enabled: true,
  },
  {
    id: NotificationSettings.FRIEND_ACTIVITY,
    title: 'Friend Activity',
    description: 'When friends share moments with you',
    icon: Users,
    enabled: true,
  },
  {
    id: NotificationSettings.ENTRY_REMINDER,
    title: 'Memory Reminders',
    description: 'Daily prompts to capture moments',
    icon: Calendar,
    enabled: false,
  },
  {
    id: NotificationSettings.FRIEND_REQUESTS,
    title: 'Friend Requests',
    description: 'When someone sends you a friend request or accepts your request',
    icon: UserPlus,
    enabled: true,
  },
];

export default function NotificationsScreen() {
  const { settings: settingsMap, toggleSetting } = useNotificationSettings();

  const settings: NotificationSetting[] = DEFAULT_SETTINGS.map((setting) => ({
    ...setting,
    enabled: settingsMap[setting.id] ?? setting.enabled,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <Text style={styles.sectionDescription}>
            Choose what notifications you'd like to receive
          </Text>
        </View>

        <View style={styles.settingsContainer}>
          {settings.map((setting) => {
            const IconComponent = setting.icon;
            const pushEnabled = settingsMap[NotificationSettings.PUSH_NOTIFICATIONS];

            return (
              <View key={setting.id} style={styles.settingItem}>
                <View style={styles.iconContainer}>
                  <IconComponent color={SETTING_ICON_COLOR} size={20} />
                </View>
                
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{setting.title}</Text>
                  <Text style={styles.settingDescription}>{setting.description}</Text>
                </View>
                
                <Switch
                  value={setting.enabled}
                  onValueChange={() => toggleSetting(setting.id)}
                  disabled={setting.id !== NotificationSettings.PUSH_NOTIFICATIONS && !pushEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                  thumbColor={setting.enabled ? '#8B5CF6' : '#F3F4F6'}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            You can change these settings anytime. Some notifications may still appear for important account security updates.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
  },
  content: {
    flex: 1,
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
    marginHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${SETTING_ICON_COLOR}15`,
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
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },
});