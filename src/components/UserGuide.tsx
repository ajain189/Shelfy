import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, radius } from "../theme";
import { Card } from "./ui";

/**
 * A simple, friendly "how to use it" guide. Plain language, one step per row,
 * meant to be readable at a glance by a busy volunteer.
 */
const STEPS: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
  {
    icon: "camera",
    title: "1 · Scan a donation",
    body: "On the Intake tab, point the camera at a food label. ShelfSight reads the brand, ingredients, allergens, date, and checks for recalls.",
  },
  {
    icon: "layers",
    title: "2 · Review what it found",
    body: "New items land in Inventory. Items the app wasn't sure about are marked for review and show Clear and Remove buttons right on the card.",
  },
  {
    icon: "check-circle",
    title: "3 · Clear it to the shelf",
    body: "If the item looks right, tap “Clear to shelf.” Only cleared items become available to families. Tap any card to see the full details first.",
  },
  {
    icon: "alert-octagon",
    title: "Watch for federal recalls",
    body: "If an item matches an FDA recall, you'll see a big red FEDERAL RECALL notice with its class and reason. Never shelve a recalled item, remove it.",
  },
  {
    icon: "grid",
    title: "Families browse the Shelf",
    body: "The Shelf tab shows only cleared items. Use Filter to narrow by diet (vegan, halal, kosher…) or to hide common allergens (no peanuts, no milk…). Tap an item to see its ingredients.",
  },
];

export function UserGuide() {
  return (
    <Card style={{ gap: space.md }}>
      <Text style={type.heading}>How to use ShelfSight</Text>
      {STEPS.map((s) => (
        <View key={s.title} style={styles.row}>
          <View style={styles.iconWrap}>
            <Feather name={s.icon} size={16} color={colors.clay} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.bodyMedium, { color: colors.ink }]}>{s.title}</Text>
            <Text style={[type.caption, { color: colors.inkSoft }]}>{s.body}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.claySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
