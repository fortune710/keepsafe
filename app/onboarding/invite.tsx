import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Share } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Copy, Share as ShareIcon, Users, ArrowRight } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

export default function InviteScreen() {
  const [inviteLink, setInviteLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateInviteLink();
  }, []);

  const generateInviteLink = async () => {
    setIsGenerating(true);
    
    // Simulate generating invite link
    setTimeout(() => {
      const mockCode = Math.random().toString(36).substring(2, 10);
      setInviteLink(`https://keepsafe.app/invite/${mockCode}`);
      setIsGenerating(false);
    }, 1500);
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert('Copied!', 'Invite link copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        title: 'Join me on Keepsafe',
        message: `I'd love to share moments with you on Keepsafe! Join me using this link: ${inviteLink}`,
        url: inviteLink,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share link');
    }
  };

  const handleSkip = () => {
    router.replace('/capture');
  };

  const handleContinue = () => {
    router.replace('/capture');
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.content}>
        <View style={styles.iconContainer}>
          <Users size={64} color="#8B5CF6" strokeWidth={1.5} />
        </View>
        
        <Text style={styles.title}>Invite Your Friends</Text>
        <Text style={styles.subtitle}>
          Share moments with the people who matter most. Send them your invite link to get started.
        </Text>

        {isGenerating ? (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Generating your invite link...</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(600)} style={styles.linkContainer}>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {inviteLink}
              </Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                <Copy color="#8B5CF6" size={20} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.linkInfo}>
              This link can be used 10 times
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.shareButton} onPress={handleShareLink}>
                <ShareIcon color="white" size={20} />
                <Text style={styles.shareButtonText}>Share Link</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                <Text style={styles.continueButtonText}>Continue to App</Text>
                <ArrowRight color="#8B5CF6" size={20} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(800)} style={styles.footer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  linkContainer: {
    width: '100%',
    alignItems: 'center',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  linkInfo: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  actionButtons: {
    width: '100%',
    gap: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  continueButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
});