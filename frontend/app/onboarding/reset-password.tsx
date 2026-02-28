import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Colors } from '@/lib/constants';
import { scale, verticalScale } from 'react-native-size-matters';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordScreen() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { updatePassword } = useAuthContext();
    const { toast: showToast } = useToast();

    const validatePasswords = (): string | null => {
        if (!newPassword) {
            return 'Please enter a new password';
        }
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
        }
        if (!confirmPassword) {
            return 'Please confirm your password';
        }
        if (newPassword !== confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    };

    const handleResetPassword = async () => {
        const validationError = validatePasswords();
        if (validationError) {
            showToast(validationError, 'error');
            return;
        }

        setLoading(true);
        try {
            const { error } = await updatePassword(newPassword);

            if (error) {
                showToast(error.message || 'Failed to reset password. Please try again.', 'error');
                return;
            }

            showToast('Password reset successfully!', 'success');

            // Navigate to login, replacing the route stack
            setTimeout(() => {
                router.replace('/onboarding/auth?mode=signin');
            }, 500);
        } catch (error) {
            showToast('An unexpected error occurred. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = newPassword.length >= MIN_PASSWORD_LENGTH && confirmPassword.length > 0;

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
                    {/* Icon and title */}
                    <View style={styles.titleContainer}>
                        <View style={styles.iconCircle}>
                            <Lock color="#8B5CF6" size={scale(32)} />
                        </View>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>
                            Create a strong new password for your account. Make sure it's at least {MIN_PASSWORD_LENGTH} characters long.
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formContainer}>
                        {/* New Password */}
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="New password"
                                placeholderTextColor="#94A3B8"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNewPassword}
                                autoFocus
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? (
                                    <EyeOff color="#94A3B8" size={20} />
                                ) : (
                                    <Eye color="#94A3B8" size={20} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm new password"
                                placeholderTextColor="#94A3B8"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff color="#94A3B8" size={20} />
                                ) : (
                                    <Eye color="#94A3B8" size={20} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Password strength hint */}
                        {newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH && (
                            <Text style={styles.hintText}>
                                {MIN_PASSWORD_LENGTH - newPassword.length} more character{MIN_PASSWORD_LENGTH - newPassword.length !== 1 ? 's' : ''} needed
                            </Text>
                        )}

                        {/* Match indicator */}
                        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                            <Text style={styles.errorText}>Passwords do not match</Text>
                        )}

                        {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= MIN_PASSWORD_LENGTH && (
                            <Text style={styles.successText}>Passwords match ✓</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.resetButton, (!canSubmit || loading) && styles.resetButtonDisabled]}
                            onPress={handleResetPassword}
                            disabled={!canSubmit || loading}
                        >
                            <Text style={styles.resetButtonText}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: verticalScale(32),
    },
    iconCircle: {
        width: scale(72),
        height: scale(72),
        borderRadius: scale(36),
        backgroundColor: '#F3E8FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(20),
    },
    title: {
        fontSize: scale(24),
        fontFamily: 'Outfit-Bold',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        fontFamily: 'Outfit-Regular',
        paddingHorizontal: 16,
    },
    formContainer: {
        width: '100%',
        gap: verticalScale(12),
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingRight: 50,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontFamily: 'Outfit-Regular',
    },
    eyeButton: {
        position: 'absolute',
        right: 16,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    hintText: {
        fontSize: 13,
        color: '#F59E0B',
        fontFamily: 'Outfit-Regular',
        paddingHorizontal: 4,
    },
    errorText: {
        fontSize: 13,
        color: '#EF4444',
        fontFamily: 'Outfit-Regular',
        paddingHorizontal: 4,
    },
    successText: {
        fontSize: 13,
        color: '#059669',
        fontFamily: 'Outfit-Regular',
        paddingHorizontal: 4,
    },
    resetButton: {
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
        marginTop: verticalScale(8),
    },
    resetButtonDisabled: {
        opacity: 0.6,
    },
    resetButtonText: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'Outfit-SemiBold',
    },
});
