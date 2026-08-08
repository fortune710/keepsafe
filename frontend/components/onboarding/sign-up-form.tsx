import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOutLeft,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  Mail,
  Lock,
  User,
  AtSign,
  CheckCircle,
  X,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { scale, verticalScale } from 'react-native-size-matters';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Colors } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { signUpSchema, type SignUpValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { LegalBottomSheet } from '@/components/ui/legal-bottom-sheet';
import { type LegalDocId } from '@/constants/legal';

type SignUpStep = 'email' | 'password' | 'name' | 'username' | 'review';

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSwitchToSignIn }) => {
  const [currentStep, setCurrentStep] = useState<SignUpStep>('email');
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const { signUp } = useAuthContext();
  const { toast: showToast } = useToast();

  const {
    control,
    handleSubmit,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      username: '',
    },
  });

  const checkEmailExists = async (emailToCheck: string) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id')
        .eq('email', emailToCheck.toLowerCase().trim())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not check email existence:', error.message);
        return false;
      }

      return !!data;
    } catch (error) {
      console.warn('Error checking email:', error);
      return false;
    }
  };

  const onSubmit = async (data: SignUpValues) => {
    setLoading(true);

    try {
      const { error } = await signUp(data.email, data.password, {
        full_name: data.fullName,
        username: data.username,
        avatar_url: getDefaultAvatarUrl(data.fullName),
      });

      if (error) {
        showToast(
          error.message || 'Sign up failed. Please try again.',
          'error',
        );
        return;
      }

      router.replace('/onboarding/sign-up-success');
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAttemptedNext(false);
  }, [currentStep]);

  const handleNext = async () => {
    setAttemptedNext(true);
    let isValidStep = false;

    switch (currentStep) {
      case 'email':
        isValidStep = await trigger('email');
        if (isValidStep) {
          setCheckingEmail(true);
          const email = getValues('email');
          const exists = await checkEmailExists(email);
          setCheckingEmail(false);

          if (exists) {
            showToast(
              'This email is already registered. Please sign in instead.',
              'error',
            );
            return;
          }
          setCurrentStep('password');
        }
        break;
      case 'password':
        isValidStep = await trigger('password');
        if (isValidStep) setCurrentStep('name');
        break;
      case 'name':
        isValidStep = await trigger('fullName');
        if (isValidStep) setCurrentStep('username');
        break;
      case 'username':
        isValidStep = await trigger('username');
        if (isValidStep) setCurrentStep('review');
        break;
      case 'review':
        handleSubmit(onSubmit)();
        break;
    }
  };

  const handleClose = () => {
    router.replace('/');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'password':
        setCurrentStep('email');
        break;
      case 'name':
        setCurrentStep('password');
        break;
      case 'username':
        setCurrentStep('name');
        break;
      case 'review':
        setCurrentStep('username');
        break;
      default:
        onSwitchToSignIn();
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'email':
        return "What's your email?";
      case 'password':
        return 'Create a password';
      case 'name':
        return "What's your name?";
      case 'username':
        return 'Choose a username';
      case 'review':
        return 'Review your info';
      default:
        return '';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 'email':
        return "We'll use this to create your account";
      case 'password':
        return 'Make it secure and memorable';
      case 'name':
        return 'How should we address you?';
      case 'username':
        return 'This is how friends will find you';
      case 'review':
        return 'Make sure everything looks correct';
      default:
        return '';
    }
  };

  const getStepIcon = () => {
    const iconProps = { color: '#8B5CF6', size: 22 };
    switch (currentStep) {
      case 'email':
        return (
          <Image
            source={require('@/assets/images/mail.svg')}
            style={{ width: scale(22), height: scale(22) }}
          />
        );
      case 'password':
        return (
          <Image
            source={require('@/assets/images/password.svg')}
            style={{ width: scale(22), height: scale(24) }}
          />
        );
      case 'name':
        return (
          <Image
            source={require('@/assets/images/user.svg')}
            style={{ width: scale(22), height: scale(22) }}
          />
        );
      case 'username':
        return <AtSign strokeWidth={2.5} {...iconProps} />;
      case 'review':
        return <CheckCircle {...iconProps} />;
      default:
        return null;
    }
  };

  const getButtonText = () => {
    if (loading || checkingEmail) return 'Please wait...';
    if (currentStep === 'review') return 'Create Account';
    return 'Next';
  };

  const emailValue = watch('email');
  const passwordValue = watch('password');
  const fullNameValue = watch('fullName');
  const usernameValue = watch('username');

  const isStepInputInvalid = () => {
    switch (currentStep) {
      case 'email':
        return !emailValue?.trim() || !!errors.email;
      case 'password':
        return !passwordValue?.trim() || !!errors.password;
      case 'name':
        return !fullNameValue?.trim() || !!errors.fullName;
      case 'username':
        return !usernameValue?.trim() || !!errors.username;
      default:
        return false;
    }
  };

  const isNextDisabled = loading || checkingEmail || isStepInputInvalid();

  const renderReviewStep = () => {
    const { fullName, email, username } = getValues();
    const details = [
      { label: 'Name', value: fullName },
      { label: 'Email', value: email },
      { label: 'Username', value: `@${username}` },
    ];

    return (
      <View style={styles.reviewContainer}>
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

        <View style={styles.detailsContainer}>
          {details.map((item, index) => (
            <Animated.View
              key={item.label}
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

  const steps: SignUpStep[] = [
    'email',
    'password',
    'name',
    'username',
    'review',
  ];
  const currentStepIndex = steps.indexOf(currentStep);
  const getSegmentWidth = (index: number) => {
    if (index < currentStepIndex) return '100%';
    if (index === currentStepIndex) return '50%';
    return '0%';
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          {Platform.OS === 'ios' ? (
            <TouchableOpacity style={styles.backButtonIOS} onPress={handleBack}>
              <ChevronLeft color="#64748B" size={28} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={handleBack}
            >
              <ChevronLeft color="#64748B" size={22} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Create Account</Text>
          {Platform.OS === 'ios' ? (
            <TouchableOpacity style={styles.closeButtonIOS} onPress={handleClose}>
              <X color="#64748B" size={24} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.closeButtonCircle}
              onPress={handleClose}
            >
              <X color="#64748B" size={20} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.progressRow}>
          {steps.map((step, index) => (
            <View key={step} style={styles.progressSegmentBackground}>
              <View
                style={[
                  styles.progressSegmentFill,
                  { width: getSegmentWidth(index) },
                ]}
              />
            </View>
          ))}
        </View>

        <Animated.View
          key={currentStep}
          entering={FadeInRight}
          exiting={FadeOutLeft}
          style={styles.stepContent}
        >
          <View style={styles.stepIconBadge}>{getStepIcon()}</View>
          <Text style={styles.stepTitle}>{getStepTitle()}</Text>
          <Text style={styles.stepSubtitle}>{getStepSubtitle()}</Text>

          <View style={styles.inputContainer}>
            {currentStep === 'email' && (
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      style={[
                        styles.input,
                        attemptedNext && errors.email && styles.inputError,
                      ]}
                      placeholder="Enter your email"
                      placeholderTextColor="#94A3B8"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {attemptedNext && errors.email && (
                      <Text style={styles.errorText}>
                        {errors.email.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            )}

            {currentStep === 'password' && (
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      style={[
                        styles.input,
                        attemptedNext && errors.password && styles.inputError,
                      ]}
                      placeholder="Enter your password"
                      placeholderTextColor="#94A3B8"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry
                    />
                    {attemptedNext && errors.password && (
                      <Text style={styles.errorText}>
                        {errors.password.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            )}

            {currentStep === 'name' && (
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      style={[
                        styles.input,
                        attemptedNext && errors.fullName && styles.inputError,
                      ]}
                      placeholder="Full Name"
                      placeholderTextColor="#94A3B8"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                    />
                    {attemptedNext && errors.fullName && (
                      <Text style={styles.errorText}>
                        {errors.fullName.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            )}

            {currentStep === 'username' && (
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput
                      style={[
                        styles.input,
                        attemptedNext && errors.username && styles.inputError,
                      ]}
                      placeholder="Choose a username"
                      placeholderTextColor="#94A3B8"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="none"
                    />
                    {attemptedNext && errors.username && (
                      <Text style={styles.errorText}>
                        {errors.username.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            )}

            {currentStep === 'review' && renderReviewStep()}
          </View>
        </Animated.View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
        style={styles.buttonSection}
      >
        <Button
          onPress={handleNext}
          loading={loading || checkingEmail}
          disabled={isNextDisabled}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </Button>
      </KeyboardAvoidingView>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By signing up you accept our{' '}
          <Text style={styles.termsLink} onPress={() => setLegalDoc('terms')}>
            Terms of Service
          </Text>
          {', '}
          <Text style={styles.termsLink} onPress={() => setLegalDoc('eula')}>
            EULA
          </Text>
          {' and '}
          <Text style={styles.termsLink} onPress={() => setLegalDoc('privacy')}>
            Privacy Policy
          </Text>
        </Text>
      </View>

      <LegalBottomSheet doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </View>
  );
};

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
    paddingTop: verticalScale(46),
    paddingBottom: verticalScale(16),
  },
  backButtonIOS: {
    padding: scale(4),
    marginRight: scale(16),
  },
  backButtonCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: scale(18),
    fontFamily: 'Figtree-SemiBold',
    color: '#1E293B',
    textAlign: 'center',
  },
  closeButtonIOS: {
    padding: scale(4),
    marginLeft: scale(16),
  },
  closeButtonCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: scale(6),
    marginBottom: verticalScale(20),
  },
  progressSegmentBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressSegmentFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: verticalScale(24),
  },
  stepIconBadge: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: Colors.brandTranslucent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  buttonSection: {
    paddingHorizontal: scale(16),
  },
  stepTitle: {
    fontSize: scale(20),
    fontFamily: 'Figtree-Bold',
    color: '#1E293B',
    marginBottom: verticalScale(8),
    textAlign: 'left',
  },
  stepSubtitle: {
    fontSize: scale(14),
    color: '#64748B',
    textAlign: 'left',
    marginBottom: verticalScale(24),
    fontFamily: 'Figtree-Regular',
  },
  inputContainer: {
    marginBottom: verticalScale(20),
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    fontSize: scale(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontFamily: 'Figtree-Regular',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: scale(12),
    marginTop: 4,
    fontFamily: 'Figtree-Regular',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
  },
  termsContainer: {
    marginTop: verticalScale(24),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(36),
  },
  termsText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Figtree-Regular',
  },
  termsLink: {
    color: '#8B5CF6',
    fontFamily: 'Figtree-SemiBold',
  },
  reviewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    marginBottom: verticalScale(20),
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
    fontFamily: 'Figtree-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: scale(16),
    color: '#1E293B',
    fontFamily: 'Figtree-SemiBold',
  },
});
