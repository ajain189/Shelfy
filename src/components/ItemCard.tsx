import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, radius, shadow } from "../theme";
import { StatusDot } from "./StatusDot";
import { ItemImage } from "./ItemImage";
import { PressableScale } from "./PressableScale";
import { unwrapImageUris, type InventoryRow } from "../db/inventory";
import { unwrapTags, parseDetail, categoryIcon, allergenLine, itemState, formatDate } from "../db/itemView";

const THUMB = 60;

/**
 * One clean, tappable pantry row: photo, name, one meta line, one status. No
 * inline buttons, the whole card opens the detail sheet, where the big
 * "Put on the shelf" / "Remove" actions live. Keeps long lists calm and quick
 * to scan for a tired volunteer or a family member.
 */
export function ItemCard({ row, onPress }: { row: InventoryRow; onPress?: () => void }) {
  const detail = parseDetail(row);
  const allergens = unwrapTags(row.allergens);
  const photo = unwrapImageUris(row.image_uris)[0];
  const { state, phrase } = itemState(row);

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.card}>
      <ItemImage uri={photo} size={THUMB} icon={categoryIcon(detail.category) as any} />
      <View style={styles.text}>
        <Text style={[type.title, { color: colors.ink }]} numberOfLines={2}>
          {row.product_name || "Unnamed item"}
        </Text>
        <Text style={[type.caption, { color: colors.inkSoft }]} numberOfLines={1}>
          {row.expiry_date ? `Best by ${formatDate(row.expiry_date)}` : "No date on label"}
          {row.brand ? `  ·  ${row.brand}` : ""}
        </Text>
        <View style={styles.metaRow}>
          <StatusDot state={state} phrase={phrase} />
        </View>
        {allergens.length > 0 && (
          <Text style={[type.caption, { color: colors.inkFaint }]} numberOfLines={1}>
            {allergenLine(allergens)}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={22} color={colors.inkFaint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md + 2,
    ...shadow.card,
  },
  text: { flex: 1, gap: 4 },
  metaRow: { marginTop: 2 },
});
