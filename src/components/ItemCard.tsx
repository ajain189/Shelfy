import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors, space, type, radius, shadow } from "../theme";
import { Button } from "./ui";
import { StatusDot } from "./StatusDot";
import { ItemImage } from "./ItemImage";
import { PressableScale } from "./PressableScale";
import { unwrapImageUris, type InventoryRow } from "../db/inventory";
import { unwrapTags, parseDetail, isRecalled, categoryIcon, allergenLine, itemState } from "../db/itemView";

const THUMB = 64;

/**
 * A calm, scannable pantry card — one photo, one name, one line, ONE state, one
 * action. No competing pills or tags. Everything else (the AI's reasoning, the
 * label detail) lives one tap away in the detail sheet.
 */
export function ItemCard({
  row,
  onPress,
  onClear,
  onReject,
}: {
  row: InventoryRow;
  onPress?: () => void;
  onClear?: (id: number) => void;
  onReject?: (id: number) => void;
}) {
  const detail = parseDetail(row);
  const allergens = unwrapTags(row.allergens);
  const recalled = isRecalled(row);
  const photo = unwrapImageUris(row.image_uris)[0];
  const { state, phrase } = itemState(row);

  const needsReview = row.cleared === 0 && (row.routing === "flag" || row.routing === "escalate");
  const showClear = needsReview && !recalled && !!onClear;
  const showRemove = (needsReview || row.cleared === 1) && !!onReject;

  return (
    <View style={styles.card}>
      <PressableScale onPress={onPress} scaleTo={0.985} style={styles.body}>
        <View style={styles.row}>
          <ItemImage uri={photo} size={THUMB} icon={categoryIcon(detail.category) as any} />
          <View style={styles.text}>
            <Text style={[type.title, { color: colors.ink }]} numberOfLines={2}>
              {row.product_name || "Unnamed item"}
            </Text>
            <Text style={[type.caption, { color: colors.inkSoft }]} numberOfLines={1}>
              {row.expiry_date ? `Best by ${row.expiry_date}` : "No date on label"}
              {row.brand ? `  ·  ${row.brand}` : ""}
            </Text>
            <View style={styles.stateRow}>
              <StatusDot state={state} phrase={phrase} />
            </View>
          </View>
        </View>

        {allergens.length > 0 && (
          <Text style={[type.body, { color: colors.inkSoft }]}>{allergenLine(allergens)}</Text>
        )}
      </PressableScale>

      {(showClear || showRemove) && (
        <View style={styles.actions}>
          {showClear && (
            <View style={{ flex: 1 }}>
              <Button label="Clear to shelf" onPress={() => onClear!(row.id)} />
            </View>
          )}
          {showRemove && (
            <View style={showClear ? undefined : { flex: 1 }}>
              <Button label="Remove" tone="ghost" onPress={() => onReject!(row.id)} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  body: { padding: space.md + 4, gap: space.sm + 2 },
  row: { flexDirection: "row", gap: space.md, alignItems: "center" },
  text: { flex: 1, gap: 5 },
  stateRow: { marginTop: 3 },
  actions: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.md + 4,
    paddingBottom: space.md + 4,
  },
});
