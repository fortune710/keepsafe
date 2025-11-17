import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { EmailNotVerifiedError, AccountDisabledError, TooManyAttemptsError, InvalidCredentialsError } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';


type SignUpStep = 'email' | 'password' | 'name' | 'username';

export default function AuthScreen() {
  const { mode } = useLocalSearchParams();
  const [isSignUp, setIsSignUp] = useState<boolean>(
    (mode as string) !== "signin" && mode !== "sign-in"
  );
  const [currentStep, setCurrentStep] = useState<SignUpStep>('email');
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const { toast: showToast } = useToast();
  
  const { signUp, signIn } = useAuthContext();
  
  const handleSignIn = async () => {
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.log(error,"errorrr")
        // Handle custom error types with specific messages
        if (error instanceof EmailNotVerifiedError) {
          showToast(error.message, 'error');
        } else if (error instanceof InvalidCredentialsError) {
          showToast(error.message, 'error');
        } else if (error instanceof TooManyAttemptsError) {
          showToast(error.message, 'error');
        } else if (error instanceof AccountDisabledError) {
          showToast(error.message, 'error');
        } else {
          showToast(error.message || 'Sign in failed. Please try again.', 'error');
        }
        return;
      }
      router.replace('/capture');
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { error } = await signUp(email, password, { 
        full_name: fullName,
        username: username.trim()
      });
      
      if (error) {
        showToast(error.message || 'Sign up failed. Please try again.', 'error');
        return;
      }
      
      // Navigate to invite page after successful signup
      router.push('/onboarding/invite');
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'email': return 'What\'s your email?';
      case 'password': return 'Create a password';
      case 'name': return 'What\'s your name?';
      case 'username': return 'Choose a username';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 'email': return 'We\'ll use this to create your account';
      case 'password': return 'Make it secure and memorable';
      case 'name': return 'How should we address you?';
      case 'username': return 'This is how friends will find you';
      default: return '';
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'email': return email.trim().length > 0;
      case 'password': return password.length > 0;
      case 'name': return firstName.trim().length > 0 && lastName.trim().length > 0;
      case 'username': return username.trim().length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'email': setCurrentStep('password'); break;
      case 'password': setCurrentStep('name'); break;
      case 'name': setCurrentStep('username'); break;
      case 'username': handleSignUp(); break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'password': setCurrentStep('email'); break;
      case 'name': setCurrentStep('password'); break;
      case 'username': setCurrentStep('name'); break;
    }
  };

  const getButtonText = () => {
    if (loading) return 'Please wait...';
    if (currentStep === 'username') return 'Create Account';
    return 'Continue';
  };

  const renderSignUpStep = () => {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          key={currentStep}
          entering={FadeInRight}
          exiting={FadeOutLeft}
          style={styles.stepContainer}
        >
          <View style={styles.stepHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft color="#64748B" size={24} />
            </TouchableOpacity>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(Object.keys({email: 1, password: 2, name: 3, username: 4}).indexOf(currentStep) + 1) * 25}%` }
                  ]} 
                />
              </View>
            </View>
          </View>

          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{getStepTitle()}</Text>
            <Text style={styles.stepSubtitle}>{getStepSubtitle()}</Text>

            <View style={styles.inputContainer}>
              {currentStep === 'email' && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              )}

              {currentStep === 'password' && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoFocus
                />
              )}

              {currentStep === 'name' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    placeholderTextColor="#94A3B8"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoFocus
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Last name"
                    placeholderTextColor="#94A3B8"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </>
              )}

              {currentStep === 'username' && (
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username"
                  placeholderTextColor="#94A3B8"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoFocus
                />
              )}
            </View>

            <TouchableOpacity 
              style={[styles.continueButton, !canProceed() && styles.continueButtonDisabled]} 
              onPress={handleNext}
              disabled={!canProceed() || loading}
            >
              <Text style={styles.continueButtonText}>{getButtonText()}</Text>
              {!loading && currentStep !== 'username' && (
                <ArrowRight color="white" size={20} style={styles.arrowIcon} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  };

  const renderSignIn = () => {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={[styles.authButton, (!email || !password || loading) && styles.authButtonDisabled]} 
              onPress={handleSignIn}
              disabled={!email || !password || loading}
            >
              <Text style={styles.authButtonText}>
                {loading ? 'Please wait...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => setIsSignUp(true)}
            >
              <Text style={styles.switchText}>
                Don't have an account? <Text style={styles.switchLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={styles.container}>
      {isSignUp ? renderSignUpStep() : renderSignIn()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 32,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 40,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  continueButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  authButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 16,
    color: '#64748B',
  },
  switchLink: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
});