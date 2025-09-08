import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthContext } from '@/providers/auth-provider';

export default function RootScreen() {
  const { user, loading, session } = useAuthContext();

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect to onboarding if not authenticated
  if (!user) {
    return <Redirect href="/onboarding" />;
  }

  // Redirect to capture screen if authenticated
  return <Redirect href="/capture" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
});