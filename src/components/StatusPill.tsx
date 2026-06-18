import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors, space, radius, type, statusStyle, StatusKind } from "../theme";

/**
 * Status indicator. Everyday statuses (cleared / review / pending) render as
 * plain quiet text — no filled pill — to keep cards calm. Only a federal recall
 * gets a filled red pill, so the one thing that should shout, does.
 */
export function StatusPill({ kind, label }: { kind: StatusKind; label: string }) {
  if (kind === "recall") {
    const { fg, bg } = statusStyle(kind);
    return (
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[type.overline, { color: fg }]}>{label.toUpperCase()}</Text>
      </View>
    );
  }
  return <Text style={[type.label, { color: colors.inkSoft }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.sm,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs + 1,
    alignSelf: "flex-start",
  },
});
