import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Archive } from "lucide-react-native";
import { router } from 'expo-router';
import { scale } from 'react-native-size-matters';

export const VaultButton = () => {
    return (
        <View style={styles.vaultButtonContainer}>
            <TouchableOpacity style={styles.vaultButton} onPress={() => router.push('/vault')}>
                <Archive color="#8B5CF6" size={20} />
                <Text style={styles.vaultButtonText}>Vault</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    vaultButtonContainer: {
        alignItems: 'center',
        marginVertical: scale(30),
    },
    vaultButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    vaultButtonText: {
        color: '#8B5CF6',
        fontSize: 16,
        fontFamily: 'Outfit-SemiBold',
        marginLeft: 8,
    },
});
