import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { scale, verticalScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Colors } from '@/lib/constants';
import { signInSchema, type SignInValues } from '@/lib/validations/auth';
import {
    EmailNotVerifiedError,
    AccountDisabledError,
    TooManyAttemptsError,
    InvalidCredentialsError
} from '@/lib/errors';

interface SignInFormProps {
    onSwitchToSignUp: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onSwitchToSignUp }) => {
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuthContext();
    const { toast: showToast } = useToast();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInValues>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: SignInValues) => {
        setLoading(true);

        try {
            // Input sanitization is already handled by Zod in the schema (trim(), toLowerCase())
            const { error } = await signIn(data.email, data.password);

            if (error) {
                if (error instanceof EmailNotVerifiedError ||
                    error instanceof InvalidCredentialsError ||
                    error instanceof TooManyAttemptsError ||
                    error instanceof AccountDisabledError) {
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

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
                <View style={styles.header}>
                    <Image
                        style={styles.logo}
                        source={require('@/assets/images/keepsafe-logo-dark.png')}
                        contentFit="contain"
                    />
                    <Text style={styles.title}>Welcome Back to your Diary</Text>
                </View>

                <View style={styles.formContainer}>
                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.input, errors.email && styles.inputError]}
                                    placeholder="Email"
                                    placeholderTextColor="#94A3B8"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                {errors.email && (
                                    <Text style={styles.errorText}>{errors.email.message}</Text>
                                )}
                            </View>
                        )}
                    />

                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.input, errors.password && styles.inputError]}
                                    placeholder="Password"
                                    placeholderTextColor="#94A3B8"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    secureTextEntry
                                />
                                {errors.password && (
                                    <Text style={styles.errorText}>{errors.password.message}</Text>
                                )}
                            </View>
                        )}
                    />

                    <View style={styles.buttonActions}>
                        <TouchableOpacity
                            style={[styles.authButton, loading && styles.authButtonDisabled]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={loading}
                        >
                            <Text style={styles.authButtonText}>
                                {loading ? 'Please wait...' : 'Sign In'}
                                {loading && (
                                    <ActivityIndicator color="white" size="small" style={{ marginLeft: 10 }} />
                                )}
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
                        onPress={onSwitchToSignUp}
                    >
                        <Text style={styles.switchText}>
                            Don't have an account? <Text style={styles.switchLink}>Sign Up</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(80),
        height: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: verticalScale(20),
        paddingHorizontal: scale(40),
        gap: 16
    },
    logo: {
        width: scale(70),
        height: scale(70)
    },
    title: {
        fontSize: scale(24),
        fontFamily: 'Outfit-Bold',
        color: '#1E293B',
        marginBottom: verticalScale(8),
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        marginBottom: verticalScale(16),
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
    authButton: {
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        paddingVertical: verticalScale(12),
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    authButtonText: {
        color: 'white',
        fontSize: scale(18),
        fontFamily: 'Outfit-SemiBold',
    },
    authButtonDisabled: {
        opacity: 0.6,
    },
    forgotPasswordButton: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: verticalScale(16),
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
    buttonActions: {
        flexDirection: 'column',
        gap: verticalScale(8),
        marginTop: verticalScale(10),
    },
});
