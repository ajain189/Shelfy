import React, { useState } from "react";
import { View, Text, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, radius, type } from "../theme";
import { Tag } from "./ui";
import { PressableScale } from "./PressableScale";
import { prettyTag } from "../db/itemView";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * A labelled group of uniform neutral chips (e.g. CONTAINS / DIETARY). All chips
 * share one calm style — no red/green — so the UI reads as human, not
 * AI-colored. The small label is what tells you which group matters.
 */
export function ChipGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={[type.overline, { color: colors.inkFaint }]}>{label}</Text>
      <View style={styles.row}>
        {items.map((it) => (
          <Tag key={it} label={prettyTag(it)} />
        ))}
      </View>
    </View>
  );
}

/**
 * An expandable ingredients dropdown — closed by default, tap to reveal the
 * verbatim ingredient text. Uses a simple LayoutAnimation so it feels light.
 */
export function IngredientsDisclosure({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
    setOpen((o) => !o);
  };

  return (
    <View>
      <PressableScale onPress={toggle} scaleTo={0.99} style={styles.discHeader}>
        <Text style={[type.label, { color: colors.inkSoft }]}>Ingredients</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.inkSoft} />
      </PressableScale>
      {open && (
        <Text style={[type.body, { color: colors.inkSoft, marginTop: space.xs }]}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm - 2 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm - 2 },
  discHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.paperDeep,
    borderRadius: radius.sm,
    paddingHorizontal: space.md - 2,
    paddingVertical: space.sm,
  },
});
