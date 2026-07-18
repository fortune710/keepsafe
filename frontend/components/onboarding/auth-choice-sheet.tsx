import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';

interface AuthChoiceSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthChoiceSheet({ visible, onClose }: AuthChoiceSheetProps) {
  const handleSignUp = () => {
    onClose();
    router.push('/onboarding/auth?mode=signup');
  };

  const handleSignIn = () => {
    onClose();
    router.push('/onboarding/auth?mode=signin');
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="55%">
      <View style={styles.header}>
        <Image
          style={styles.logo}
          source={require('@/assets/images/keepsafe-logo-dark.png')}
          contentFit="contain"
        />
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <X color="#64748B" size={20} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Let's get started</Text>
        <Text style={styles.subtitle}>
          Create an account to start saving your moments, or sign in if you
          already have one.
        </Text>

        <View style={styles.buttonGroup}>
          <Button onPress={handleSignUp} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Create my Account</Text>
          </Button>

          <Pressable style={styles.secondaryButton} onPress={handleSignIn}>
            <Text style={styles.secondaryButtonText}>
              Already have an account
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(16),
  },
  logo: {
    width: scale(36),
    height: scale(36),
  },
  closeButton: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(28),
  },
  title: {
    fontSize: scale(22),
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: scale(14),
    fontFamily: 'Outfit-Regular',
    color: '#64748B',
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(28),
  },
  buttonGroup: {
    gap: verticalScale(12),
  },
  primaryButton: {
    borderRadius: 18,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
  },
});
