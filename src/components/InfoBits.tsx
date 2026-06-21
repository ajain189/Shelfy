import React, { useState } from "react";
import { View, Text, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, radius, type } from "../theme";
import { PressableScale } from "./PressableScale";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * A generic collapsible section — used to tuck the technical "label details"
 * (verbatim ingredients, allergen basis, lot code, legibility notes) out of the
 * way so cards and the detail sheet stay calm, while keeping that grounding
 * evidence one tap away for a volunteer or judge who wants it.
 */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
    setOpen((o) => !o);
  };

  return (
    <View>
      <PressableScale onPress={toggle} scaleTo={0.99} style={styles.discHeader}>
        <Text style={[type.label, { color: colors.inkSoft }]}>{title}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.inkSoft} />
      </PressableScale>
      {open && <View style={{ marginTop: space.sm, gap: space.md }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  discHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.paperDeep,
    borderRadius: radius.sm,
    paddingHorizontal: space.md - 2,
    paddingVertical: space.sm + 2,
  },
});
