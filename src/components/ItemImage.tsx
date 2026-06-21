import React, { useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, radius } from "../theme";

/**
 * The photo a volunteer took at intake, shown on cards (thumbnail) and in the
 * detail sheet (full). When there's no photo (seeded items, library uploads, or
 * a purged cache URI), it falls back to a soft category-colored icon tile —
 * never a gray broken-image box — so every card still reads visually and a
 * missing photo is never alarming.
 */
export function ItemImage({
  uri,
  size,
  icon = "package",
  style,
}: {
  uri?: string;
  size: number;
  /** Feather icon name for the no-photo fallback tile (derived from category). */
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ImageStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;
  // Shared dimensions, valid for both Image and View. The radius scales: tiny on
  // thumbnails, larger on the detail-sheet photo.
  const box = {
    width: size,
    height: size,
    borderRadius: size >= 120 ? radius.md : radius.md - 2,
  };

  if (showImage) {
    return (
      <Image
        source={{ uri }}
        style={[box, { backgroundColor: colors.paperDeep }, style]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[box, styles.tile, style as StyleProp<ViewStyle>]}>
      <Feather name={icon} size={Math.round(size * 0.4)} color={colors.clay} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.claySoft, alignItems: "center", justifyContent: "center" },
});
