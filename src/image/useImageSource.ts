import { useCallback } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Provides two ways to get a label photo:
 *   - takePhoto():  live camera (real device; the "wave the can past the phone" moment)
 *   - pickPhoto():  photo library (works in the iOS simulator, which has no camera)
 *
 * Both return a local file URI, or null if the user cancelled / denied permission.
 */
export function useImageSource() {
  const takePhoto = useCallback(async (): Promise<string | null> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      // iOS only prompts once; if it was denied earlier, requesting again just
      // returns false. Point the user to Settings and offer to open it.
      Alert.alert(
        "Camera access is off",
        perm.canAskAgain
          ? "Enable camera access to scan a label."
          : "Camera access was denied. Turn it on in your phone's Settings → ShelfSight → Camera, then try again. (Or use “Choose a photo”.)",
        [{ text: "OK" }],
      );
      return null;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return null;
      return result.assets[0].uri;
    } catch (e: any) {
      // The most common cause is running on the iOS Simulator, which has no
      // camera. Tell the user plainly instead of failing silently.
      Alert.alert(
        "Can't open the camera",
        "This device may not have a camera available (the iOS Simulator has none). Use “Choose a photo” to pick a label image instead.",
      );
      return null;
    }
  }, []);

  const pickPhoto = useCallback(async (): Promise<string | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Enable photo access to choose a label image.");
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  }, []);

  return { takePhoto, pickPhoto };
}
