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
    title: "1 · Take a photo of the label",
    body: "On the Scan tab, point the camera at a food label. Shelfy reads the brand, ingredients, allergens, and date, and checks for recalls.",
  },
  {
    icon: "layers",
    title: "2 · See what it found",
    body: "New foods show up on the Sort tab. Anything the app wasn't sure about is marked “Needs a check,” with buttons right on the card.",
  },
  {
    icon: "check-circle",
    title: "3 · Put it on the shelf",
    body: "If the food looks right, tap “Put on the shelf.” Only foods you put out can reach a family. Tap any card to see the full details first.",
  },
  {
    icon: "alert-octagon",
    title: "Watch for recalls",
    body: "If a food matches a federal recall, you'll see a clear red recall notice with the reason. Never shelve a recalled food, remove it.",
  },
  {
    icon: "grid",
    title: "Families find food on the shelf",
    body: "The Find food tab shows only foods a volunteer has put out. Use Filter to narrow by diet (vegan, halal, kosher…) or to skip allergens (no peanuts, no milk…). Tap a food to see what's inside.",
  },
];

export function UserGuide() {
  return (
    <Card style={{ gap: space.md }}>
      <Text style={type.heading}>How to use Shelfy</Text>
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
