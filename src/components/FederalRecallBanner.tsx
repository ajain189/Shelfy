import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, radius, type, fonts } from "../theme";

/**
 * The one place the UI is allowed to shout. When an item is under an active
 * federal recall, this shows big bold red "FEDERAL RECALL", the class
 * (Class I / II / III), and the full plain-language explanation.
 *
 * `compact` is used on list cards (headline + class only); the full explanation
 * shows in the detail view.
 */
export function FederalRecallBanner({
  recallClass,
  explanation,
  reason,
  compact,
}: {
  recallClass?: string;
  explanation?: string;
  reason?: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.box, compact && styles.boxCompact]}>
      <View style={styles.headRow}>
        <Feather name="alert-octagon" size={compact ? 18 : 22} color={colors.danger} />
        <Text style={[compact ? styles.titleCompact : styles.title]}>FEDERAL RECALL</Text>
      </View>

      {!!recallClass && (
        <Text style={[type.heading, styles.class]}>
          {recallClass}
          {recallClass === "Class I" ? " — most serious" : ""}
        </Text>
      )}

      {!compact && !!(explanation || reason) && (
        <Text style={styles.explanation}>{explanation || reason}</Text>
      )}

      {compact && (
        <Text style={[type.caption, { color: colors.danger }]}>
          Do not shelve. Tap for the full recall notice.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm - 2,
  },
  boxCompact: { padding: space.sm + 2, gap: space.xs },
  headRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.5,
    color: colors.danger,
  },
  titleCompact: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.5,
    color: colors.danger,
  },
  class: { color: colors.danger },
  explanation: {
    ...type.body,
    color: colors.danger,
  },
});
