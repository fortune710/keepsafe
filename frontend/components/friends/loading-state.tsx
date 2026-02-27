import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { verticalScale } from 'react-native-size-matters';

interface LoadingStateProps {
    message?: string;
}

/**
 * Centered loading state component.
 */
export function LoadingState(props: LoadingStateProps) {
    const { message } = props;

    return (
        <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>{message}</Text>
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
    loadingText: {
        fontSize: 16,
        fontFamily: 'Outfit-Regular',
        color: '#64748B',
        marginTop: 16,
    },
});
