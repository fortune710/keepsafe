import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { EmailNotVerifiedError, AccountDisabledError, TooManyAttemptsError, InvalidCredentialsError } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';
import { Colors } from '@/lib/constants';
import { scale, verticalScale } from 'react-native-size-matters';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { TABLES } from '@/constants/supabase';

type SignUpStep = 'email' | 'password' | 'name' | 'username' | 'review';

export default function AuthScreen() {
  const { mode } = useLocalSearchParams();
  const [isSignUp, setIsSignUp] = useState<boolean>(
    (mode as string) !== "signin" && mode !== "sign-in"
  );
  const [currentStep, setCurrentStep] = useState<SignUpStep>('email');
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
        console.log(error, "errorrr")
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

  const checkEmailExists = async (emailToCheck: string) => {
    try {
      // Check if email exists in profiles
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id')
        .eq('email', emailToCheck.toLowerCase().trim())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means not found
        console.warn('Could not check email existence:', error.message);
        return false;
      }

      return !!data;
    } catch (error) {
      console.warn('Error checking email:', error);
      return false;
    }
  };

  const handleSignUp = async () => {
    setLoading(true);

    try {
      const { error } = await signUp(email.toLowerCase().trim(), password, {
        full_name: fullName.trim(),
        username: username.trim(),
        avatar_url: getDefaultAvatarUrl(fullName.trim())
      });

      if (error) {
        showToast(error.message || 'Sign up failed. Please try again.', 'error');
        return;
      }

      return router.replace('/onboarding/sign-up-success');
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
      case 'review': return 'Review your info';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 'email': return 'We\'ll use this to create your account';
      case 'password': return 'Make it secure and memorable';
      case 'name': return 'How should we address you?';
      case 'username': return 'This is how friends will find you';
      case 'review': return 'Make sure everything looks correct';
      default: return '';
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'email': return email.trim().length > 0;
      case 'password': return password.length > 0;
      case 'name': return fullName.trim().length > 0;
      case 'username': return username.trim().length > 0;
      case 'review': return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'email':
        if (!email.includes('@')) {
          showToast('Please enter a valid email address', 'error');
          return;
        }

        setCheckingEmail(true);
        const exists = await checkEmailExists(email);
        setCheckingEmail(false);

        if (exists) {
          showToast('This email is already registered. Please sign in instead.', 'error');
          return;
        }

        setCurrentStep('password');
        break;
      case 'password':
        if (password.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          return;
        }
        setCurrentStep('name');
        break;
      case 'name': setCurrentStep('username'); break;
      case 'username': setCurrentStep('review'); break;
      case 'review': handleSignUp(); break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'password': setCurrentStep('email'); break;
      case 'name': setCurrentStep('password'); break;
      case 'username': setCurrentStep('name'); break;
      case 'review': setCurrentStep('username'); break;
    }
  };

  const getButtonText = () => {
    if (loading || checkingEmail) return 'Please wait...';
    if (currentStep === 'review') return 'Create Account';
    return 'Continue';
  };

  const renderReviewStep = () => {
    const details = [
      { label: 'Name', value: fullName },
      { label: 'Email', value: email },
      { label: 'Username', value: `@${username}` },
    ];

    return (
      <View style={styles.reviewContainer}>
        {/* Avatar Animation - Appears First */}
        <Animated.View
          entering={FadeIn.duration(800)}
          style={styles.avatarContainer}
        >
          <Image
            source={{ uri: getDefaultAvatarUrl(fullName, 'svg') }}
            style={styles.reviewAvatar}
            contentFit="cover"
          />
        </Animated.View>

        {/* Details Animation - Cascades from top to bottom, fading in beneath each other */}
        <View style={styles.detailsContainer}>
          {details.map((item, index) => (
            <Animated.View
              key={item.label}
              // delay(600 + index * 200) ensures it starts after the avatar begins appearing
              entering={FadeIn.delay(600 + index * 250).duration(500)}
              style={styles.detailItem}
            >
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.value}
              </Text>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  };

  const renderSignUpStep = () => {
    const steps: SignUpStep[] = ['email', 'password', 'name', 'username', 'review'];
    const progressIndex = steps.indexOf(currentStep) + 1;
    const progressWidth = (progressIndex / steps.length) * 100;

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
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${progressWidth}%` }
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
                  returnKeyType='done'
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
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoFocus
                />
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

              {currentStep === 'review' && renderReviewStep()}
            </View>

            <TouchableOpacity
              style={[styles.continueButton, (!canProceed() || loading || checkingEmail) && styles.continueButtonDisabled]}
              onPress={handleNext}
              disabled={!canProceed() || loading || checkingEmail}
            >
              <Text style={styles.continueButtonText}>{getButtonText()}</Text>
              {!loading && !checkingEmail && currentStep !== 'review' && (
                <ArrowRight color="white" size={20} style={styles.arrowIcon} />
              )}
              {(loading || checkingEmail) && (
                <ActivityIndicator color="white" size="small" style={{ marginLeft: 10 }} />
              )}
            </TouchableOpacity>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By signing up you accept our{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => router.push('/settings/legal?doc=terms')}
                >
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => router.push('/settings/legal?doc=privacy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
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
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'column',
              marginBottom: verticalScale(20),
              paddingHorizontal: scale(40),
              gap: 16
            }}
          >
            <Image
              style={{ width: scale(70), height: scale(70) }}
              source={require('@/assets/images/keepsafe-logo-dark.png')}
              contentFit="contain"
            />
            <Text style={styles.title}>Welcome Back to your Diary</Text>
          </View>

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


            <View style={styles.buttonActions}>
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
                style={styles.forgotPasswordButton}
                onPress={() => router.push('/onboarding/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomContainer}>
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
    backgroundColor: Colors.background,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(20),
  },
  backButton: {
    padding: scale(8),
    marginRight: scale(16),
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
    justifyContent: 'flex-start',
  },
  termsContainer: {
    marginTop: verticalScale(24),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(20),
  },
  termsText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Outfit-Regular',
  },
  termsLink: {
    color: '#8B5CF6',
    fontFamily: 'Outfit-SemiBold',
  },
  stepTitle: {
    fontSize: scale(24),
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: scale(16),
    color: '#64748B',
    textAlign: 'center',
    marginBottom: verticalScale(40),
    fontFamily: 'Outfit-Regular',
  },
  inputContainer: {
    marginBottom: verticalScale(40),
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    fontSize: scale(16),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontFamily: 'Outfit-Regular',
  },
  continueButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: scale(18),
    fontFamily: 'Outfit-SemiBold',
  },
  arrowIcon: {
    marginLeft: scale(8),
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: scale(24),
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scale(16),
    color: '#64748B',
    textAlign: 'center',
    marginBottom: verticalScale(40),
    fontFamily: 'Outfit-Regular',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  authButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: verticalScale(16),
    alignItems: 'center',
  },
  authButtonText: {
    color: 'white',
    fontSize: scale(18),
    fontFamily: 'Outfit-SemiBold',
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: scale(16),
    color: '#64748B',
    fontFamily: 'Outfit-Regular',
  },
  switchLink: {
    color: '#8B5CF6',
    fontFamily: 'Outfit-SemiBold',
  },
  forgotPasswordButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  forgotPasswordText: {
    color: '#8B5CF6',
    fontSize: scale(16),
    fontFamily: 'Outfit-SemiBold',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: verticalScale(50),
    alignSelf: 'center',
  },
  buttonActions: {
    flexDirection: 'column',
    gap: verticalScale(8),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(30),
  },
  reviewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    marginBottom: verticalScale(30),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  reviewAvatar: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  detailsContainer: {
    width: '100%',
    gap: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  detailItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: scale(11),
    color: '#94A3B8',
    marginBottom: verticalScale(4),
    fontFamily: 'Outfit-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: scale(16),
    color: '#1E293B',
    fontFamily: 'Outfit-SemiBold',
  },
});