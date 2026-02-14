import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Colors } from '@/lib/constants';
import { scale, verticalScale } from 'react-native-size-matters';
import { Image } from 'expo-image';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPasswordForEmail } = useAuthContext();
    const { toast: showToast } = useToast();

    const handleSendResetLink = async () => {
        if (!email.trim()) {
            showToast('Please enter your email address', 'error');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        setLoading(true);
        try {
            const { error } = await resetPasswordForEmail(email.trim());

            if (error) {
                showToast(error.message || 'Failed to send reset link. Please try again.', 'error');
                return;
            }

            // Navigate to success screen
            router.push('/onboarding/forgot-password-success');
        } catch (error) {
            showToast('An unexpected error occurred. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Animated.View style={styles.content}>
                {/* Header with back button */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft color="#64748B" size={24} />
                    </TouchableOpacity>
                </View>

                {/* Icon and title */}
                <View style={styles.titleContainer}>
                    <View style={styles.iconCircle}>
                        <Mail color="#8B5CF6" size={scale(32)} />
                    </View>
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>
                        No worries! Enter the email address associated with your account and we'll send you a link to reset your password.
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        returnKeyType='done'
                        autoCapitalize="none"
                        autoFocus
                    />

                    <TouchableOpacity
                        style={[styles.sendButton, (!email.trim() || loading) && styles.sendButtonDisabled]}
                        onPress={handleSendResetLink}
                        disabled={!email.trim() || loading}
                    >
                        <Text style={styles.sendButtonText}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Back to login */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backToLoginText}>
                            Remember your password? <Text style={styles.backToLoginLink}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
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
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
        alignSelf: 'flex-start',
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
        gap: verticalScale(16),
    },
    input: {
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontFamily: 'Outfit-Regular',
    },
    sendButton: {
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendButtonText: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'Outfit-SemiBold',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
    },
    backToLoginText: {
        fontSize: 16,
        color: '#64748B',
        fontFamily: 'Outfit-Regular',
    },
    backToLoginLink: {
        color: '#8B5CF6',
        fontFamily: 'Outfit-SemiBold',
    },
});
