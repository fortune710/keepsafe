import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/lib/constants';
import { SignInForm } from '@/components/onboarding/sign-in-form';
import { SignUpForm } from '@/components/onboarding/sign-up-form';

export default function AuthScreen() {
  const { mode } = useLocalSearchParams();
  const [isSignUp, setIsSignUp] = useState<boolean>(
    (mode as string) !== "signin" && mode !== "sign-in"
  );

  return (
    <View style={styles.container}>
      {isSignUp ? (
        <SignUpForm onSwitchToSignIn={() => setIsSignUp(false)} />
      ) : (
        <SignInForm onSwitchToSignUp={() => setIsSignUp(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
