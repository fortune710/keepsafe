import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const Colors = {
  // Brand
  primary: '#8B5CF6', // purple-500
  primaryDark: '#6D28D9',
  accent: '#8B5CF6', // same as primary for now

  // UI Surfaces
  background: '#F0F9FF', // light blue background seen across screens
  surface: '#F8FAFC', // slate-50
  card: '#F1F5F9', // slate-100
  mutedSurface: '#F3F4F6', // gray-100
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Text
  text: '#1E293B', // slate-800
  textMuted: '#64748B', // slate-500
  textSubtle: '#94A3B8', // slate-400
  textInverse: 'white',

  // Borders & Lines
  border: '#E2E8F0', // gray-200

  // Status
  success: '#059669', // green-600
  danger: '#EF4444', // red-500
  dangerDark: '#DC2626', // red-600
  warning: '#F59E0B', // amber-500
  info: '#60A5FA', // blue-400 (approx; used in gradients)
  positive: '#10B981', // emerald-500 (used in social)

  // Neutrals
  white: 'white',
  black: '#000',
  neutral200: '#E5E7EB',
  neutral300: '#CBD5E1',

  // Special cases used in styles
  cameraBackdrop: 'rgba(255, 255, 255, 0.3)',
  brandTranslucent: '#8B5CF615',
  successTranslucent: '#05966915',
  warningTranslucent: '#F59E0B15',
};

export type AppColors = typeof Colors;



const getBackendUrl = () => {
  // Use environment variable for production
  const prodUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (prodUrl) {
    return prodUrl;
  }

  // Attempt to get the IP address of the machine running the Expo server
  // This is critical for physical devices to connect to the backend running on the same dev machine
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8000`;
  }

  // Fallback for emulators or when hostUri is not available
  return Platform.select({
    android: 'http://10.0.2.2:8000',
    ios: 'http://localhost:8000',
    default: 'http://localhost:8000',
  });
};

export const BACKEND_URL = getBackendUrl();
if (__DEV__) {
  console.log('🔗 Configured Backend URL:', BACKEND_URL);
}



