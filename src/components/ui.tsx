import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";

import { colors, space, radius, type, shadow, safetyTone, SafetyTone } from "../theme";
import { PressableScale } from "./PressableScale";

/** A soft card surface — depth via layered shadow, no hard border. */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A small neutral chip — used for allergens, dietary claims, codes. */
export function Tag({ label, mono }: { label: string; mono?: boolean }) {
  return (
    <View style={styles.tag}>
      <Text style={[mono ? type.mono : type.tag, { color: colors.inkSoft }]}>{label}</Text>
    </View>
  );
}

/**
 * A safety badge. Color is meaning, never decoration — `tone` maps to the
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

/** A labelled field row used in detail/result views. */
export function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={[type.overline, styles.fieldLabel]}>{label.toUpperCase()}</Text>
      <Text style={[type.body, { color: colors.ink }]}>{value || "—"}</Text>
    </View>
  );
}

/** Primary action button — clay fill (or ghost), with spring press-scale. */
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
  tag: {
    backgroundColor: colors.paperDeep,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs + 1,
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
  field: { gap: space.xs },
  fieldLabel: { color: colors.inkFaint },
  button: {
    borderRadius: radius.md,
    paddingVertical: space.md + 1,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: colors.clay, ...shadow.card },
  buttonGhost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.lineStrong },
});
