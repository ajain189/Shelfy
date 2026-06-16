import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config.
 *
 * The Gemini API key is read from the environment at bundle time and exposed to
 * the app through `expo-constants` (`Constants.expoConfig.extra.geminiApiKey`).
 *
 * DEMO-ONLY KEY HANDLING:
 *   For the hackathon demo the key ships inside the app bundle so Expo Go on a
 *   physical phone can call Gemini directly. This is acceptable because the
 *   bundle only ever runs on our own device.
 *
 * PRODUCTION:
 *   A real deployment would NOT ship the key in the client. It would route model
 *   calls through a thin backend proxy that holds the key server-side, so the
 *   secret never reaches a user's device. See README / plan for details.
 *
 * The key comes from a gitignored `.env` file (see `.env.example`). It is never
 * committed.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "ShelfSight",
  slug: "shelfsight",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  backgroundColor: "#F5F1E8",
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription:
        "ShelfSight uses the camera to read food-donation labels during intake.",
      NSPhotoLibraryUsageDescription:
        "ShelfSight can read a label from a photo you select.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#F5F1E8",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: ["CAMERA"],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-camera", "expo-image-picker", "expo-sqlite", "expo-font"],
  extra: {
    // Injected from the environment at bundle time; empty string if unset.
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  },
});
