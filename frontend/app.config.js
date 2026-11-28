const { withPodfile } = require('expo/config-plugins');
const { version } = require('./package.json');

module.exports = ({ config }) => {
  // The native push-open hook runs before JavaScript and bypasses before_send.
  config = {
    ...config,
    version,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        'com.posthog.posthog.CAPTURE_PUSH_NOTIFICATION_OPENED': false,
      },
    },
  };
  // Opt in on release builders after configuring PostHog CLI credentials.
  if (process.env.POSTHOG_UPLOAD_SYMBOLS === '1') {
    config = {
      ...config,
      plugins: [
        ...(config.plugins || []),
        ['posthog-react-native/expo', { uploadNativeSymbols: true, disableSandboxing: false, skipOnConflict: true }],
      ],
    };
  }

  if (process.env.KEEPSAFE_IOS_SIMULATOR === '1') {
    config = withPodfile(config, (podfileConfig) => {
      const autolinking = '  use_expo_modules!';
      const simulatorAutolinking = '  use_expo_modules!(exclude: %w[@infinitered/react-native-mlkit-face-detection @infinitered/react-native-mlkit-core])';
      const podfile = podfileConfig.modResults.contents;
      const lines = podfile.split('\n');
      if (lines.includes(simulatorAutolinking)) return podfileConfig;
      if (!lines.includes(autolinking)) {
        throw new Error('Could not locate Expo autolinking in the generated Podfile');
      }

      // ML Kit ships an Intel simulator slice and a separate ARM device slice.
      podfileConfig.modResults.contents = podfile.replace(autolinking, simulatorAutolinking);
      return podfileConfig;
    });
  }

  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) return config;

  return {
    ...config,
    android: {
      ...config.android,
      config: { ...(config.android?.config || {}), googleMaps: { apiKey: mapsApiKey } },
    },
    ios: {
      ...config.ios,
      config: { ...(config.ios?.config || {}), googleMapsApiKey: mapsApiKey },
    },
  };
};
