import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Colors } from '@/lib/constants';
import { scale, verticalScale } from 'react-native-size-matters';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';

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
            <View style={styles.content}>
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
                        <Image source={require('@/assets/images/mail.svg')} style={styles.icon} />
                    </View>
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>
                        Enter your email and we'll send you a reset link.
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

                </View>
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={12}
                style={styles.buttonSection}
            >
                <Button onPress={handleSendResetLink} disabled={!email.trim() || loading} loading={loading}>
                    <Text style={styles.sendButtonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
                </Button>
            </KeyboardAvoidingView>
            <View style={styles.bottomContainer}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backToLoginText}>
                        Remember your password? <Text style={styles.backToLoginLink}>Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </View>
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
        paddingHorizontal: scale(16),
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
        paddingTop: verticalScale(24),
    },
    iconCircle: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(24),
        backgroundColor: Colors.brandTranslucent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(16),
    },
    icon: {
        width: scale(22),
        height: scale(22),
    },
    title: {
        fontSize: scale(20),
        fontFamily: 'Figtree-Bold',
        color: '#1E293B',
        marginBottom: verticalScale(8),
        textAlign: 'left',
    },
    subtitle: {
        fontSize: scale(14),
        color: '#64748B',
        textAlign: 'left',
        marginBottom: verticalScale(24),
        fontFamily: 'Figtree-Regular',
    },
    formContainer: {
        width: '100%',
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
    buttonSection: {
        paddingHorizontal: scale(16),
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Figtree-SemiBold',
    },
    bottomContainer: {
        marginTop: verticalScale(24),
        paddingHorizontal: scale(16),
        paddingBottom: verticalScale(36),
    },
    backToLoginText: {
        fontSize: 13,
        color: '#64748B',
        fontFamily: 'Figtree-Regular',
        textAlign: 'center',
        lineHeight: 18,
    },
    backToLoginLink: {
        color: '#8B5CF6',
        fontFamily: 'Figtree-SemiBold',
    },
});
