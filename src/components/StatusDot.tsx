import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors, space, type } from "../theme";
import type { ItemState } from "../db/itemView";

/**
 * The ONE state signal on a card, a single colored dot + short phrase. Replaces
 * the old status-pill-plus-AI-tag pile-up so a card reads at a glance. Color is
 * meaning only: red = recall, amber = needs a human, green = good to go.
 */
const TONE: Record<ItemState, string> = {
  danger: colors.danger,
  caution: colors.caution,
  safe: colors.safe,
};

export function StatusDot({
  state,
  phrase,
  large = false,
}: {
  state: ItemState;
  phrase: string;
  large?: boolean;
}) {
  const color = TONE[state];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, large && styles.dotLg, { backgroundColor: color }]} />
      <Text style={[large ? type.heading : type.bodyMedium, { color }]}>{phrase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLg: { width: 13, height: 13, borderRadius: 6.5 },
});
