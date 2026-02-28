import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CircleAlert as AlertCircle } from 'lucide-react-native';
import { verticalScale } from 'react-native-size-matters';

interface ErrorStateProps {
    title: string;
    message: string;
    onRetry: () => void;
}

/**
 * Centered error state component with retry button.
 */
export function ErrorState(props: ErrorStateProps) {

    const { title, message, onRetry } = props;

    return (
        <View style={styles.centeredContainer}>
            <AlertCircle color="#EF4444" size={48} />
            <Text style={styles.errorTitle}>{title}</Text>
            <Text style={styles.errorMessage}>{message}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: verticalScale(300),
    },
    errorTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-SemiBold',
        fontWeight: '600',
        color: '#1E293B',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 16,
        fontFamily: 'Jost-Regular',
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Outfit-SemiBold',
        fontWeight: '600',
    },
});
