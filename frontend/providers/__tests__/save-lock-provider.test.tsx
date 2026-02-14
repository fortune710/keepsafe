import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SaveLockProvider, useSaveLock } from '../save-lock-provider';
import { View, Text, Button } from 'react-native';

describe('SaveLockProvider', () => {
    const TestComponent = () => {
        const { isSaveLocked, lockSave, unlockSave } = useSaveLock();
        return (
            <View>
                <Text testID="lock-status">{isSaveLocked ? 'LOCKED' : 'UNLOCKED'}</Text>
                <Button title="Lock" onPress={lockSave} />
                <Button title="Unlock" onPress={unlockSave} />
            </View>
        );
    };

    test('initial state handles isSaveLocked as false', () => {
        const { getByTestId } = render(
            <SaveLockProvider>
                <TestComponent />
            </SaveLockProvider>
        );
        expect(getByTestId('lock-status').props.children).toBe('UNLOCKED');
    });

    test('lockSave sets isSaveLocked to true', () => {
        const { getByTestId, getByText } = render(
            <SaveLockProvider>
                <TestComponent />
            </SaveLockProvider>
        );

        fireEvent.press(getByText('Lock'));

        expect(getByTestId('lock-status').props.children).toBe('LOCKED');
    });

    test('unlockSave releases the lock', () => {
        const { getByTestId, getByText } = render(
            <SaveLockProvider>
                <TestComponent />
            </SaveLockProvider>
        );

        // Initial lock
        fireEvent.press(getByText('Lock'));
        expect(getByTestId('lock-status').props.children).toBe('LOCKED');

        // Unlock
        fireEvent.press(getByText('Unlock'));
        expect(getByTestId('lock-status').props.children).toBe('UNLOCKED');
    });
});
