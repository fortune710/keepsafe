import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { scale, verticalScale } from 'react-native-size-matters';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Colors } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { getDefaultAvatarUrl } from '@/lib/utils';
import { signUpSchema, type SignUpValues } from '@/lib/validations/auth';

type SignUpStep = 'email' | 'password' | 'name' | 'username' | 'review';

interface SignUpFormProps {
    onSwitchToSignIn: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSwitchToSignIn }) => {
    const [currentStep, setCurrentStep] = useState<SignUpStep>('email');
    const [loading, setLoading] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const { signUp } = useAuthContext();
    const { toast: showToast } = useToast();

    const {
        control,
        handleSubmit,
        trigger,
        getValues,
        formState: { errors, isValid },
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
                avatar_url: getDefaultAvatarUrl(data.fullName)
            });

            if (error) {
                showToast(error.message || 'Sign up failed. Please try again.', 'error');
                return;
            }

            router.replace('/onboarding/sign-up-success');
        } catch (error) {
            showToast('An unexpected error occurred', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
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
                        showToast('This email is already registered. Please sign in instead.', 'error');
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

    const handleBack = () => {
        switch (currentStep) {
            case 'password': setCurrentStep('email'); break;
            case 'name': setCurrentStep('password'); break;
            case 'username': setCurrentStep('name'); break;
            case 'review': setCurrentStep('username'); break;
            default: onSwitchToSignIn(); break;
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

    const getButtonText = () => {
        if (loading || checkingEmail) return 'Please wait...';
        if (currentStep === 'review') return 'Create Account';
        return 'Continue';
    };

    const renderReviewStep = () => {
        const { fullName, email, username } = getValues();
        const details = [
            { label: 'Name', value: fullName },
            { label: 'Email', value: email },
            { label: 'Username', value: `@${username}` },
        ];

        return (
            <View style={styles.reviewContainer}>
                <Animated.View entering={FadeIn.duration(800)} style={styles.avatarContainer}>
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
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View>
                                        <TextInput
                                            style={[styles.input, errors.email && styles.inputError]}
                                            placeholder="Enter your email"
                                            placeholderTextColor="#94A3B8"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoFocus
                                        />
                                        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
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
                                            style={[styles.input, errors.password && styles.inputError]}
                                            placeholder="Enter your password"
                                            placeholderTextColor="#94A3B8"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            secureTextEntry
                                            autoFocus
                                        />
                                        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
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
                                            style={[styles.input, errors.fullName && styles.inputError]}
                                            placeholder="Full Name"
                                            placeholderTextColor="#94A3B8"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            autoCapitalize="words"
                                            autoFocus
                                        />
                                        {errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}
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
                                            style={[styles.input, errors.username && styles.inputError]}
                                            placeholder="Choose a username"
                                            placeholderTextColor="#94A3B8"
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            autoCapitalize="none"
                                            autoFocus
                                        />
                                        {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}
                                    </View>
                                )}
                            />
                        )}

                        {currentStep === 'review' && renderReviewStep()}
                    </View>

                    <TouchableOpacity
                        style={[styles.continueButton, (loading || checkingEmail) && styles.continueButtonDisabled]}
                        onPress={handleNext}
                        disabled={loading || checkingEmail}
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
                            {', '}
                            <Text
                                style={styles.termsLink}
                                onPress={() => router.push('/settings/legal?doc=eula')}
                            >
                                EULA
                            </Text>
                            {' and '}
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
        fontFamily: 'Outfit-Regular',
    },
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        color: '#EF4444',
        fontSize: scale(12),
        marginTop: 4,
        fontFamily: 'Outfit-Regular',
    },
    continueButton: {
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        paddingVertical: verticalScale(12),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: verticalScale(20),
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
