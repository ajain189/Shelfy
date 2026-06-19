import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/**
 * Resolves the Gemini API key, preferring a key the user entered in Settings
 * (persisted in AsyncStorage) over the one bundled at build time via .env.
 *
 * This lets a judge or volunteer paste a key in-app without touching files.
 */

const STORAGE_KEY = "shelfsight.geminiApiKey";

const bundledKey =
  (Constants.expoConfig?.extra?.geminiApiKey as string | undefined) ?? "";

let cached: string | null = null;

/** Load the active key (user-set if present, else the bundled key). */
export async function loadApiKey(): Promise<string> {
  if (cached !== null) return cached;
  const stored = (await AsyncStorage.getItem(STORAGE_KEY)) ?? "";
  cached = stored.length > 0 ? stored : bundledKey;
  return cached;
}

/** Persist a user-entered key and update the cache. Empty string clears it. */
export async function setApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed.length > 0) {
    await AsyncStorage.setItem(STORAGE_KEY, trimmed);
    cached = trimmed;
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
    cached = bundledKey;
  }
}

/** True if there's a bundled key (so Settings can show where the key came from). */
export const hasBundledKey = bundledKey.length > 0;

/** A masked preview like "AIza…7d2" for display. */
export const maskKey = (key: string): string =>
  key.length <= 8 ? "•".repeat(key.length) : `${key.slice(0, 4)}…${key.slice(-3)}`;
