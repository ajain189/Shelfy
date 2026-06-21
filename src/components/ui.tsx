import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";

import { colors, space, radius, type, shadow, safetyTone, SafetyTone } from "../theme";
import { PressableScale } from "./PressableScale";

/** A soft card surface, depth via layered shadow, no hard border. */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * A safety badge. Color is meaning, never decoration, `tone` maps to the
 * traffic-light system (safe/caution/danger/review).
 */
export function SafetyBadge({ tone, label }: { tone: SafetyTone; label: string }) {
  const { fg, bg } = safetyTone(tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[type.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Primary action button, clay fill (or ghost), with spring press-scale. */
export function Button({
  label,
  onPress,
  tone = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const isGhost = tone === "ghost";
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        isGhost ? styles.buttonGhost : styles.buttonPrimary,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <Text style={[type.bodyMedium, { color: isGhost ? colors.clay : "#FFFFFF" }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md + 2,
    ...shadow.card,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm - 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.md - 2,
    paddingVertical: space.xs + 3,
    alignSelf: "flex-start",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  button: {
    borderRadius: radius.md,
    // Tall, finger-obvious target, ~56pt, comfortably above the 44pt minimum
    // for the gloved/tired hands this is built for.
    minHeight: 56,
    paddingVertical: space.md + 3,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: colors.clay, ...shadow.card },
  buttonGhost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.lineStrong },
});
