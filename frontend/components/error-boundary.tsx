import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import RNErrorBoundary from 'react-native-error-boundary';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { posthog } from '@/constants/posthog';
import { logger } from '@/lib/logger';
import { AlertCircle } from 'lucide-react-native';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  // Collect device information
  const deviceInfo = getDeviceInfo();

  // Capture error to PostHog
  React.useEffect(() => {
    try {
      const errorProperties: Record<string, string> = {
        error_name: error.name || 'Unknown',
        error_message: error.message || 'Unknown error',
        error_stack: error.stack || 'No stack trace',
        ...deviceInfo,
      };

      posthog.capture('app_error', errorProperties);

      // Also capture as exception for PostHog's exception tracking
      const exceptionProperties: Record<string, string> = {
        $exception_message: error.message || 'Unknown error',
        $exception_type: error.name || 'Unknown',
        $exception_stack_trace_raw: error.stack || 'No stack trace',
        ...deviceInfo,
      };

      posthog.capture('$exception', exceptionProperties);
    } catch (posthogError) {
      logger.error('Failed to capture error to PostHog:', posthogError);
    }

    // Log error locally
    logger.error('ErrorBoundary caught an error:', {
      error,
      deviceInfo,
    });
  }, [error]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <AlertCircle size={64} color="#EF4444" />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          We're sorry, but something unexpected happened. The error has been reported and we'll look into it.
        </Text>
        
        {__DEV__ && error && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
            <Text style={styles.errorText}>{error.toString()}</Text>
            {error.stack && (
              <Text style={styles.stackText}>{error.stack}</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={resetError}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function getDeviceInfo(): Record<string, string> {
  try {
    const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode;
    const appPlatform = Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : Constants.platform?.web ? 'web' : 'unknown';
    const runtimeVersion = Constants.expoConfig?.runtimeVersion;
    const runtimeVersionStr = typeof runtimeVersion === 'string' 
      ? runtimeVersion 
      : typeof runtimeVersion === 'object' && runtimeVersion !== null
      ? JSON.stringify(runtimeVersion)
      : 'unknown';
    
    return {
      device_manufacturer: Device.manufacturer || 'unknown',
      device_model_name: Device.modelName || 'unknown',
      device_brand: Device.brand || 'unknown',
      device_model_id: String(Device.modelId || 'unknown'),
      device_os_name: Device.osName || 'unknown',
      device_os_version: Device.osVersion || 'unknown',
      device_platform_os: Device.osName || 'unknown',
      device_supported_cpu_archs: Device.supportedCpuArchitectures?.join(',') || 'unknown',
      device_total_memory: Device.totalMemory ? `${Device.totalMemory} bytes` : 'unknown',
      device_is_device: Device.isDevice ? 'true' : 'false',
      app_version: Constants.expoConfig?.version || 'unknown',
      app_build_number: buildNumber ? String(buildNumber) : 'unknown',
      app_runtime_version: runtimeVersionStr,
      app_platform: appPlatform,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get device info:', error);
    return {
      device_info_error: 'Failed to collect device information',
      timestamp: new Date().toISOString(),
    };
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: ErrorFallbackProps) => ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <RNErrorBoundary
      FallbackComponent={fallback || ErrorFallback}
      onError={(error, stackTrace) => {
        // Additional error handling if needed
        logger.error('ErrorBoundary onError callback:', { error, stackTrace });
      }}
    >
      {children}
    </RNErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Outfit-SemiBold',
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    fontFamily: 'Outfit-SemiBold',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Outfit-SemiBold',
  },
});
