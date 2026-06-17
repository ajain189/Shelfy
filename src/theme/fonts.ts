import { useFonts } from "expo-font";
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_600SemiBold_Italic,
} from "@expo-google-fonts/fraunces";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";

import { fonts } from "./index";

/**
 * Loads the app's font families and maps them to the family keys used in
 * `theme/index.ts`. Returns true once fonts are ready to render.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    [fonts.display]: Fraunces_600SemiBold,
    [fonts.displayItalic]: Fraunces_600SemiBold_Italic,
    FraunsesDisplayBold: Fraunces_700Bold,
    [fonts.body]: DMSans_400Regular,
    [fonts.bodyMedium]: DMSans_500Medium,
    [fonts.bodyBold]: DMSans_700Bold,
    [fonts.mono]: SpaceMono_400Regular,
  });
  return loaded;
}
