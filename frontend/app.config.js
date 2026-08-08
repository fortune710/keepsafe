const app = require('./app.json');

const config = app.expo;
const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

if (mapsApiKey) {
  config.android = {
    ...config.android,
    config: { ...(config.android.config || {}), googleMaps: { apiKey: mapsApiKey } },
  };
  config.ios = {
    ...config.ios,
    config: { ...(config.ios.config || {}), googleMapsApiKey: mapsApiKey },
  };
}

module.exports = { expo: config };
