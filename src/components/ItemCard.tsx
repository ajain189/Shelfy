import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, radius, shadow } from "../theme";
import { Button } from "./ui";
import { StatusPill } from "./StatusPill";
import { IngredientsDisclosure } from "./InfoBits";
import { PressableScale } from "./PressableScale";
import type { InventoryRow } from "../db/inventory";
import { statusFor, unwrapTags, parseDetail, isRecalled, prettyTag } from "../db/itemView";

/**
 * A compact-but-complete pantry item card. Zoomed-out scale so it can carry
 * everything at a glance without feeling cramped: name, quiet status, best-by,
 * allergens (chips), dietary claims (text), and — on the Shelf — an expandable
 * ingredients row. Inline Clear/Remove on AI-flagged items.
 */
export function ItemCard({
  row,
  onPress,
  onClear,
  onReject,
  showIngredients,
}: {
  row: InventoryRow;
  onPress?: () => void;
  onClear?: (id: number) => void;
  onReject?: (id: number) => void;
  showIngredients?: boolean;
}) {
  const status = statusFor(row);
  const detail = parseDetail(row);
  const allergens = unwrapTags(row.allergens);
  const dietary = unwrapTags(row.dietary_tags);
  const recalled = isRecalled(row);

  const needsReview = row.cleared === 0 && (row.routing === "flag" || row.routing === "escalate");
  const showClear = needsReview && !recalled && !!onClear;
  const showRemove = (needsReview || row.cleared === 1) && !!onReject;

  return (
    <View style={styles.card}>
      <PressableScale onPress={onPress} scaleTo={0.99} style={styles.body}>
        <View style={styles.top}>
          <Text style={[type.title, styles.name]} numberOfLines={1}>
            {row.product_name || "Unnamed item"}
          </Text>
          <StatusPill kind={status.kind} label={status.label} />
        </View>

        {/* best-by + brand/category — readable secondary text */}
        <Text style={[type.caption, { color: colors.inkSoft }]} numberOfLines={1}>
          {row.expiry_date ? `Best by ${row.expiry_date}` : "No date on label"}
          {row.brand ? `  ·  ${row.brand}` : ""}
          {detail.category ? `  ·  ${detail.category}` : ""}
        </Text>

        {recalled && (
          <View style={styles.recallRow}>
            <Feather name="alert-octagon" size={14} color={colors.danger} />
            <Text style={[type.label, { color: colors.danger }]}>Federal recall — do not shelve</Text>
          </View>
        )}

        {/* Allergens — the highest-stakes info, given the most contrast */}
        {allergens.length > 0 && (
          <View style={styles.tagLine}>
            <Text style={[type.label, styles.lead]}>Contains</Text>
            {allergens.map((a) => (
              <View key={a} style={styles.allergenChip}>
                <Text style={[type.tag, { color: colors.ink }]}>{prettyTag(a)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Dietary claims — quieter than allergens */}
        {dietary.length > 0 && (
          <View style={styles.tagLine}>
            {dietary.map((d) => (
              <View key={d} style={styles.dietChip}>
                <Text style={[type.tag, { color: colors.inkSoft }]}>{prettyTag(d)}</Text>
              </View>
            ))}
          </View>
        )}
      </PressableScale>

      {showIngredients && !!detail.ingredients_text && (
        <View style={styles.disclosure}>
          <IngredientsDisclosure text={detail.ingredients_text} />
        </View>
      )}

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
    borderRadius: radius.md,
    ...shadow.card,
  },
  body: { padding: space.md + 2, gap: space.sm },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm },
  name: { flex: 1, color: colors.ink },
  recallRow: { flexDirection: "row", alignItems: "center", gap: space.xs + 1 },
  tagLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.xs + 2 },
  lead: { color: colors.inkFaint, marginRight: 1 },
  allergenChip: {
    backgroundColor: colors.paperDeep,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm + 1,
    paddingVertical: 3,
  },
  dietChip: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm + 1,
    paddingVertical: 2,
  },
  disclosure: { paddingHorizontal: space.md + 2, paddingBottom: space.md + 2 },
  actions: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.md + 2,
    paddingBottom: space.md + 2,
  },
});
