import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Heart, ExternalLink, Mail, Shield, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';

export default function AboutScreen() {
  const appVersion = '1.0.0';
  const buildNumber = '2025.01.15';

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@keepsafe.app?subject=Keepsafe Support');
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
        <Text style={styles.title}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.appSection}>
          <Text style={styles.appName}>Keepsafe</Text>
          <Text style={styles.appTagline}>Your most treasured moments, all in one place</Text>
          
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Version {appVersion}</Text>
            <Text style={styles.buildText}>Build {buildNumber}</Text>
          </View>
        </View>

        <View style={styles.linksSection}>
          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => router.push('/settings/legal')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Shield color="#8B5CF6" size={20} />
            </View>
            <Text style={styles.linkText}>Legal Documents</Text>
            <ChevronRight color="#CBD5E1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkItem}
            onPress={handleContactSupport}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B15' }]}>
              <Mail color="#F59E0B" size={20} />
            </View>
            <Text style={styles.linkText}>Contact Support</Text>
            <ExternalLink color="#CBD5E1" size={16} />
          </TouchableOpacity>
        </View>

        <View style={styles.creditsSection}>
          <Text style={styles.creditsTitle}>Made with</Text>
          <View style={styles.creditsRow}>
            <Heart color="#EF4444" size={16} fill="#EF4444" />
            <Text style={styles.creditsText}>by the Keepsafe team</Text>
          </View>
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
  },
  appSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    paddingVertical: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  versionInfo: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  linksSection: {
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
  linkItem: {
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
  linkText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  creditsSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  creditsTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
});