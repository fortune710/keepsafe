import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Custom error types for specific auth scenarios
export class EmailNotVerifiedError extends Error {
  constructor() {
    super('Please verify your email address before signing in. Check your inbox for a verification link.');
    this.name = 'EmailNotVerifiedError';
  }
}

export class AccountDisabledError extends Error {
  constructor() {
    super('Your account has been disabled. Please contact support for assistance.');
    this.name = 'AccountDisabledError';
  }
}

export class TooManyAttemptsError extends Error {
  constructor() {
    super('Too many sign-in attempts. Please wait a few minutes before trying again.');
    this.name = 'TooManyAttemptsError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password. Please check your credentials and try again.');
    this.name = 'InvalidCredentialsError';
  }
}

interface UseAuthResult {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: Partial<Profile>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Use ref to avoid circular dependency with updateProfile
  const updateProfileRef = useRef<((updates: Partial<Profile>) => Promise<{ error: Error | null }>) | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Add this auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    userData?: Partial<Profile>
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      console.log(data);
      // Wait for user to be authenticated and session to be established
      if (data.user) {
        // Create profile manually after successful signup
        try {
          const profileData = {
            id: data.user.id,
            email: data.user.email!,
            full_name: userData?.full_name || null,
            username: userData?.username || null,
            avatar_url: userData?.avatar_url || null,
            bio: userData?.bio || null,
          };

          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profileData as never, { onConflict: 'id' });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Don't return error here as signup was successful
          }
        } catch (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't return error here as signup was successful
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error cases
        switch (error.message) {
          case 'Email not confirmed':
            throw new EmailNotVerifiedError();
          case 'Invalid login credentials':
            throw new InvalidCredentialsError();
          case 'Too many requests':
            throw new TooManyAttemptsError();
          default:
            // Check for other specific error patterns
            if (error.message.includes('email not confirmed')) {
              throw new EmailNotVerifiedError();
            }
            if (error.message.includes('invalid') && error.message.includes('credentials')) {
              throw new InvalidCredentialsError();
            }
            if (error.message.includes('too many')) {
              throw new TooManyAttemptsError();
            }
            // Generic auth error
            throw new Error(error.message || 'Sign in failed. Please try again.');
        }
      }

      // Additional check for email verification status
      if (data.user && !data.user.email_confirmed_at) {
        // Sign out the user since they're not verified
        await supabase.auth.signOut();
        throw new EmailNotVerifiedError();
      }

      return { error: null };
    } catch (error) {
      if (error instanceof EmailNotVerifiedError || 
          error instanceof AccountDisabledError || 
          error instanceof TooManyAttemptsError || 
          error instanceof InvalidCredentialsError) {
        return { error };
      }
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        setUser(null);
        setSession(null);
      }

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}