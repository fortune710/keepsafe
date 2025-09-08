import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell, MessageCircle, Users, Calendar } from 'lucide-react-native';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
  color: string;
}

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'push',
      title: 'Push Notifications',
      description: 'Receive notifications on your device',
      icon: Bell,
      enabled: true,
      color: '#8B5CF6',
    },
    {
      id: 'friends',
      title: 'Friend Activity',
      description: 'When friends share moments with you',
      icon: Users,
      enabled: true,
      color: '#059669',
    },
    {
      id: 'memories',
      title: 'Memory Reminders',
      description: 'Daily prompts to capture moments',
      icon: Calendar,
      enabled: false,
      color: '#F59E0B',
    },
    {
      id: 'comments',
      title: 'Comments & Reactions',
      description: 'When someone reacts to your moments',
      icon: MessageCircle,
      enabled: true,
      color: '#EF4444',
    },
  ]);

  const toggleSetting = (id: string) => {
    setSettings(prev => {
      if (id === 'push') {
        // If turning off push notifications, turn off all others
        const pushEnabled = !prev.find(s => s.id === 'push')?.enabled;
        if (!pushEnabled) {
          return prev.map(setting => ({ ...setting, enabled: false }));
        } else {
          return prev.map(setting => 
            setting.id === 'push' ? { ...setting, enabled: true } : setting
          );
        }
      } else {
        // For other settings, only allow toggle if push is enabled
        const pushEnabled = prev.find(s => s.id === 'push')?.enabled;
        if (!pushEnabled) {
          return prev; // Don't allow changes if push is disabled
        }
        
        return prev.map(setting => 
          setting.id === id 
            ? { ...setting, enabled: !setting.enabled }
            : setting
        );
      }
    });
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
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <Text style={styles.sectionDescription}>
            Choose what notifications you'd like to receive
          </Text>
        </View>

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
                  disabled={setting.id !== 'push' && !settings.find(s => s.id === 'push')?.enabled}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
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
    marginHorizontal: 20,
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
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },
});