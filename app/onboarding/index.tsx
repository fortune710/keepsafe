import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.delay(300)} style={styles.logoContainer}>
        <Text style={styles.logo}>Keepsafe</Text>
        <Text style={styles.tagline}>Your most treasured moments, all in one place.</Text>
      </Animated.View>
      
      <Animated.View entering={FadeInDown.delay(600)} style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={() => router.push('/onboarding/value-props')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => router.push('/onboarding/auth?mode=signin')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: height * 0.2,
    paddingBottom: 60,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: width * 0.8,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 25,
    width: width * 0.7,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: width * 0.4,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 0,
  },
  signInButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
});