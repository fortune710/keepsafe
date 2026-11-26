const { getPostHogExpoConfig } = require('posthog-react-native/metro');

// Local and development bundles use Expo's normal Metro configuration.
module.exports = getPostHogExpoConfig(__dirname, {
  enabled: process.env.POSTHOG_UPLOAD_SYMBOLS === '1',
});
