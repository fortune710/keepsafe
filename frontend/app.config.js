module.exports = ({ config }) => {
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
