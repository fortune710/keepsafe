import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
// Mock necessary dependencies before importing component
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
    router: {
        push: (...args: any[]) => mockPush(...args),
        back: () => mockBack(),
    },
}));

// Mock auth context
const mockResetPasswordForEmail = jest.fn();
jest.mock('@/providers/auth-provider', () => ({
    useAuthContext: () => ({
        resetPasswordForEmail: mockResetPasswordForEmail,
    }),
}));

// Mock toast
const mockShowToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: mockShowToast,
    }),
}));

import ForgotPasswordScreen from '../forgot-password';

describe('ForgotPasswordScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);

        expect(getByText('Forgot Password?')).toBeTruthy();
        expect(getByPlaceholderText('Enter your email')).toBeTruthy();
        expect(getByText('Send Reset Link')).toBeTruthy();
    });

    it('shows error toast if email is empty', () => {
        const { getByText } = render(<ForgotPasswordScreen />);

        fireEvent.press(getByText('Send Reset Link'));

        expect(mockShowToast).toHaveBeenCalledWith('Please enter your email address', 'error');
        expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });

    it('shows error toast if email is invalid', () => {
        const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
        fireEvent.press(getByText('Send Reset Link'));

        expect(mockShowToast).toHaveBeenCalledWith('Please enter a valid email address', 'error');
        expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });

    it('calls resetPasswordForEmail and navigates on success', async () => {
        mockResetPasswordForEmail.mockResolvedValue({ error: null });
        const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
        fireEvent.press(getByText('Send Reset Link'));

        await waitFor(() => {
            expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
        });
        expect(mockPush).toHaveBeenCalledWith('/onboarding/forgot-password-success');
    });

    it('shows error toast on API failure', async () => {
        mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } });
        const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);

        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
        fireEvent.press(getByText('Send Reset Link'));

        await waitFor(() => {
            expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
        });
        expect(mockShowToast).toHaveBeenCalledWith('User not found', 'error');
        expect(mockPush).not.toHaveBeenCalled();
    });
});
