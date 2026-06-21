import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

import { colors, space, type, fonts } from "../theme";

const LOGO = require("../../assets/brandmark.png");

/**
 * The Shelfy logo, a pantry shelf with a watching eye and a check. Used for
 * in-app branding (the Settings header, the intake start screen). `showWordmark`
 * pairs it with the name; omit for the mark alone.
 */
export function BrandMark({
  size = 56,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" />
      {showWordmark && (
        <View>
          <Text style={[type.title, { fontFamily: fonts.bodyBold, color: colors.ink }]}>
            Shelfy
          </Text>
          <Text style={[type.caption, { color: colors.inkSoft }]}>
            The shelf, read for you
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
});
