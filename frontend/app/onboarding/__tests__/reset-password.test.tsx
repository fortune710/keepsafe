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
        const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        expect(getByText('Reset Password')).toBeTruthy();
        expect(getByPlaceholderText('New password')).toBeTruthy();
        expect(getByPlaceholderText('Confirm new password')).toBeTruthy();
    });

    it('validates password length', () => {
        const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('New password'), 'short');
        fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'short');
        fireEvent.press(getByText('Reset Password'));

        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('at least 8 characters'), 'error');
        expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('validates password mismatch', () => {
        const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('New password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password456');
        fireEvent.press(getByText('Reset Password'));

        expect(mockShowToast).toHaveBeenCalledWith('Passwords do not match', 'error');
        expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('calls updatePassword and navigates on success', async () => {
        mockUpdatePassword.mockResolvedValue({ error: null });
        const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('New password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password123');
        fireEvent.press(getByText('Reset Password'));

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
        const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('New password'), 'password123');
        fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'password123');
        fireEvent.press(getByText('Reset Password'));

        await waitFor(() => {
            expect(mockUpdatePassword).toHaveBeenCalledWith('password123');
        });

        expect(mockShowToast).toHaveBeenCalledWith('Weak password', 'error');
        expect(mockReplace).not.toHaveBeenCalled();
    });
});
