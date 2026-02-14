
import React, { useEffect, useState } from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { SaveLockProvider, useSaveLock } from '../../../providers/save-lock-provider';
import { View, Text, Button } from 'react-native';

// Verify the provider is exported correctly
// Depending on how checking works, we might need absolute path or relative

const MockDetailsScreen = ({ onSaveSuccess }: { onSaveSuccess: () => void }) => {
    const { isSaveLocked, lockSave } = useSaveLock();

    const handleSave = () => {
        // Simulate async save
        setTimeout(() => {
            lockSave();
            onSaveSuccess();
        }, 100);
    };

    return (
        <View>
            <Text testID="details-lock-status">{isSaveLocked ? 'LOCKED' : 'UNLOCKED'}</Text>
            <Button
                testID="save-button"
                title={isSaveLocked ? 'Entry Saved' : 'Save Entry'}
                onPress={handleSave}
                disabled={isSaveLocked}
            />
        </View>
    );
};

const MockCaptureScreen = () => {
    const { unlockSave, isSaveLocked } = useSaveLock();

    useEffect(() => {
        unlockSave();
    }, [unlockSave]);

    return <Text testID="capture-lock-status">{isSaveLocked ? 'LOCKED' : 'UNLOCKED'}</Text>;
};

const AppSimulator = () => {
    const [screen, setScreen] = useState('details');
    // We expose global lock status here to check context state
    // But strictly speaking, we check component rendering

    const navigateToCapture = () => setScreen('capture');
    const navigateToDetails = () => setScreen('details');

    return (
        <View>
            {screen === 'details' && (
                <MockDetailsScreen onSaveSuccess={navigateToCapture} />
            )}
            {screen === 'capture' && (
                <View>
                    <MockCaptureScreen />
                    <Button title="Go to Details" onPress={navigateToDetails} />
                </View>
            )}
        </View>
    );
};

describe('Save Lock Integration Flow (Full Simulation)', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('user workflow: save on details locks -> navigate to capture unlocks -> return to details is unlocked', async () => {
        const { getByTestId, getByText, queryByTestId, queryByText } = render(
            <SaveLockProvider>
                <AppSimulator />
            </SaveLockProvider>
        );

        // 1. Initial State: Details Screen, Unlocked
        expect(getByTestId('details-lock-status').props.children).toBe('UNLOCKED');
        expect(getByText('Save Entry')).toBeTruthy();

        // 2. Click Save on Details Screen
        act(() => {
            fireEvent.press(getByText('Save Entry'));
        });

        // Fast forward timers for the setTimeout in handleSave
        act(() => {
            jest.advanceTimersByTime(200);
        });

        // 3. Should have navigated to Capture Screen (via onSaveSuccess prop)
        // Capture Screen unlocks on mount.

        // Assert: We are now on Capture Screen
        await waitFor(() => expect(queryByTestId('capture-lock-status')).toBeTruthy());

        // The unlock happens in useEffect, so run pending effects/timers if needed
        // However, create (mount) effects run synchronously in test renderer usually.
        expect(getByTestId('capture-lock-status').props.children).toBe('UNLOCKED');

        // 4. Navigate back to Details
        act(() => {
            fireEvent.press(getByText('Go to Details'));
        });

        // 5. Assert Details is UNLOCKED
        await waitFor(() => expect(queryByTestId('details-lock-status')).toBeTruthy());
        expect(getByTestId('details-lock-status').props.children).toBe('UNLOCKED');
        expect(getByText('Save Entry')).toBeTruthy();
    });
});
