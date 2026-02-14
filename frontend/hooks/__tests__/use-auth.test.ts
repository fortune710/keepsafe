import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../use-auth';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
            resetPasswordForEmail: jest.fn(),
            updateUser: jest.fn(),
            signUp: jest.fn(),
            signInWithPassword: jest.fn(),
            signOut: jest.fn(),
        },
    },
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'ios',
    select: jest.fn(),
}));

describe('useAuth Hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('resetPasswordForEmail', () => {
        it('calls supabase.auth.resetPasswordForEmail with correct params', async () => {
            const { result } = renderHook(() => useAuth());

            // Wait for initial loading to finish
            await waitFor(() => expect(result.current.loading).toBe(false));

            const email = 'test@example.com';
            (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });

            await act(async () => {
                await result.current.resetPasswordForEmail(email);
            });

            expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
                redirectTo: expect.stringContaining('/reset-password'),
            });
        });

        it('returns error when supabase call fails', async () => {
            const { result } = renderHook(() => useAuth());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const error = { message: 'Network error' };
            (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error });

            let response;
            await act(async () => {
                response = await result.current.resetPasswordForEmail('test@example.com');
            });

            expect(response).toEqual({ error: expect.any(Error) });
            expect(response.error.message).toBe('Network error');
        });
    });

    describe('updatePassword', () => {
        it('calls supabase.auth.updateUser with new password', async () => {
            const { result } = renderHook(() => useAuth());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const newPassword = 'new-password-123';
            (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null, data: { user: {} } });

            await act(async () => {
                await result.current.updatePassword(newPassword);
            });

            expect(supabase.auth.updateUser).toHaveBeenCalledWith({
                password: newPassword,
            });
        });

        it('returns error when supabase call fails', async () => {
            const { result } = renderHook(() => useAuth());
            await waitFor(() => expect(result.current.loading).toBe(false));

            const error = { message: 'Weak password' };
            (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error });

            let response;
            await act(async () => {
                response = await result.current.updatePassword('weak');
            });

            expect(response).toEqual({ error: expect.any(Error) });
            expect(response.error.message).toBe('Weak password');
        });
    });
});
