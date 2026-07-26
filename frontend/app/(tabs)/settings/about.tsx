import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { Heart, ExternalLink, Mail, Shield, ChevronRight } from 'lucide-react-native';
import { BackButton } from '@/components/back-button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/lib/constants';

// Every option icon shares this neutral slate color, matching the main
// settings screen.
const OPTION_ICON_COLOR = '#64748B';

export default function AboutScreen() {
  const appVersion = '1.0.0';
  const buildNumber = '2025.01.15';

  const handleContactSupport = () => {
    Linking.openURL('mailto:contact@fortunealebiosu.dev?subject=Keepsafe Support');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
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
            <View style={styles.iconContainer}>
              <Shield color={OPTION_ICON_COLOR} size={20} />
            </View>
            <Text style={styles.linkText}>Legal Documents</Text>
            <ChevronRight color="#94A3B8" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={handleContactSupport}
          >
            <View style={styles.iconContainer}>
              <Mail color={OPTION_ICON_COLOR} size={20} />
            </View>
            <Text style={styles.linkText}>Contact Support</Text>
            <ExternalLink color="#94A3B8" size={16} />
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
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    fontFamily: 'Jost-Regular',
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
    fontFamily: 'Outfit-SemiBold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#94A3B8',
  },
  linksSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${OPTION_ICON_COLOR}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: '#1E293B',
  },
  creditsSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  creditsTitle: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#94A3B8',
    marginBottom: 8,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsText: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
    marginLeft: 6,
  },
});