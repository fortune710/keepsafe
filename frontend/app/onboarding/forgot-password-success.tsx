import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { CheckCircle, Mail } from 'lucide-react-native';
import { Colors } from '@/lib/constants';
import { scale, verticalScale } from 'react-native-size-matters';

export default function ForgotPasswordSuccessScreen() {
    const handleBackToLogin = () => {
        router.replace('/onboarding/auth?mode=signin');
    };

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.content}>
                {/* Success illustration */}
                <Animated.View entering={FadeInUp.delay(400).duration(800)} style={styles.illustrationContainer}>
                    <View style={styles.iconCircle}>
                        <Mail color="#8B5CF6" size={scale(40)} />
                    </View>
                    <View style={styles.checkBadge}>
                        <CheckCircle color="white" size={scale(18)} fill="#059669" />
                    </View>
                </Animated.View>

                {/* Text content */}
                <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.textContainer}>
                    <Text style={styles.title}>Check Your Email</Text>
                    <Text style={styles.subtitle}>
                        We've sent a password reset link to your email address. Please check your inbox and click the link to reset your password.
                    </Text>
                    <Text style={styles.hint}>
                        Didn't receive the email? Check your spam folder or try again.
                    </Text>
                </Animated.View>

                {/* Button */}
                <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.backToLoginButton}
                        onPress={handleBackToLogin}
                    >
                        <Text style={styles.backToLoginButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                </Animated.View>
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    illustrationContainer: {
        marginBottom: verticalScale(32),
        position: 'relative',
    },
    iconCircle: {
        width: scale(96),
        height: scale(96),
        borderRadius: scale(48),
        backgroundColor: '#F3E8FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: -4,
        width: scale(32),
        height: scale(32),
        borderRadius: scale(16),
        backgroundColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: Colors.background,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: verticalScale(40),
    },
    title: {
        fontSize: scale(24),
        fontFamily: 'Outfit-Bold',
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        fontFamily: 'Outfit-Regular',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    hint: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        fontFamily: 'Outfit-Regular',
    },
    buttonContainer: {
        width: '100%',
    },
    backToLoginButton: {
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
    },
    backToLoginButtonText: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'Outfit-SemiBold',
    },
});
