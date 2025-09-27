// Fix missing env var (expo-modules-core expects this)
process.env.EXPO_OS = process.env.EXPO_OS || "ios";

// Mock native Expo packages that don’t work in Jest
jest.mock("expo-image", () => ({
  Image: "Image",
  ImageBackground: "ImageBackground",
  default: {
    Image: "Image",
    ImageBackground: "ImageBackground",
  },
}));


jest.mock("expo", () => {
  return {
    // mock only the parts of Expo you actually use in your components
    Constants: { platform: { ios: {}, android: {} } },
    // You can expand this if your components rely on other Expo APIs
  };
});
