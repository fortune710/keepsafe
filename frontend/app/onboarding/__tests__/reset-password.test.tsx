import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    router: {
        replace: (...args: any[]) => mockReplace(...args),
    },
}));

const mockUpdatePassword = jest.fn();
jest.mock('@/providers/auth-provider', () => ({
    useAuthContext: () => ({
        updatePassword: mockUpdatePassword,
    }),
}));

const mockShowToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: mockShowToast,
    }),
}));

import ResetPasswordScreen from '../reset-password';

describe('ResetPasswordScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const { getByText, getAllByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        expect(getAllByText('Reset Password')[1]).toBeTruthy();
        expect(getByPlaceholderText('New password')).toBeTruthy();
        expect(getByPlaceholderText('Confirm new password')).toBeTruthy();
    });

    it('validates password length', () => {
        const { getByText, getAllByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('New password'), 'short');
        fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'short');
        fireEvent.press(getAllByText('Reset Password')[1]);

        expect(getByText('3 more characters needed')).toBeTruthy();
        expect(mockShowToast).not.toHaveBeenCalled();
        expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('validates password mismatch', () => {
        const { getByText, getAllByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('New password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password456');
        fireEvent.press(getAllByText('Reset Password')[1]);

        expect(mockShowToast).toHaveBeenCalledWith('Passwords do not match', 'error');
        expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('calls updatePassword and navigates on success', async () => {
        mockUpdatePassword.mockResolvedValue({ error: null });
        const { getByText, getAllByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('New password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password123');
        fireEvent.press(getAllByText('Reset Password')[1]);

        await waitFor(() => {
            expect(mockUpdatePassword).toHaveBeenCalledWith('password123');
        });

        expect(mockShowToast).toHaveBeenCalledWith('Password reset successfully!', 'success');
        // Wait for setTimeout in component
        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/onboarding/auth?mode=signin');
        });
    });

    it('shows error toast on API failure', async () => {
        mockUpdatePassword.mockResolvedValue({ error: { message: 'Weak password' } });
        const { getByText, getAllByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('New password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password123');
        fireEvent.press(getAllByText('Reset Password')[1]);

        await waitFor(() => {
            expect(mockUpdatePassword).toHaveBeenCalledWith('password123');
        });

        expect(mockShowToast).toHaveBeenCalledWith('Weak password', 'error');
        expect(mockReplace).not.toHaveBeenCalled();
    });
});
