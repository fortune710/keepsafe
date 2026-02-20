import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Check if we're in development mode
const isDev =
  process.env.EXPO_PUBLIC_NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'development' ||
  (typeof __DEV__ !== 'undefined' && __DEV__);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth:
    Platform.OS === 'web'
      ? {
        // On web, let Supabase use its built-in localStorage handling
        autoRefreshToken: true,
        persistSession: true,
        // Enable so Supabase can detect password recovery tokens from URL hash
        detectSessionInUrl: true,
      }
      : {
        // On native, use AsyncStorage so sessions persist between app launches
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
  realtime: {
    // Enable heartbeat to detect silent disconnections
    heartbeatIntervalMs: 30000, // 30 seconds
    // Add logger for debugging (can be disabled in production)
    logger: (kind: string, msg: string, data: any) => {
      if (isDev) {
        console.log(`[Realtime ${kind}]`, msg, data);
      }
    },
    logLevel: isDev ? 'info' : 'error',
    // Enable automatic reconnection with exponential backoff
    reconnectAfterMs: (tries: number) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      return Math.min(1000 * Math.pow(2, tries), 30000);
    },
  },
});

