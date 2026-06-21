import React, { useState, useCallback } from "react";
import { Text, StyleSheet, TextInput, Pressable, View, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { colors, space, type, radius } from "../theme";
import { CollapsingList } from "../components/CollapsingList";
import { ItemCard } from "../components/ItemCard";
import { ItemDetailSheet } from "../components/ItemDetailSheet";
import { getAllItems, clearItem, rejectItem, type InventoryRow } from "../db/inventory";
import { unwrapTags } from "../db/itemView";

type Filter = "all" | "review" | "shelf" | "recall";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "review", label: "Needs review" },
  { key: "shelf", label: "On shelf" },
  { key: "recall", label: "Recall" },
];

/**
 * Inventory, the volunteer workspace. Every item, searchable + filterable, with
 * inline Clear/Remove on the items the AI flagged for review.
 */
export function InventoryScreen() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<InventoryRow | null>(null);

  const load = useCallback(() => {
    getAllItems().then(setItems).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  const matchesFilter = (r: InventoryRow): boolean => {
    switch (filter) {
      case "review":
        return r.cleared === 0 && (r.routing === "flag" || r.routing === "escalate");
      case "shelf":
        return r.cleared === 1;
      case "recall":
        return r.recall_state === "possible_match" || r.recall_state === "confirmed_match";
      default:
        return true;
    }
  };

  const matchesQuery = (r: InventoryRow): boolean => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.product_name.toLowerCase().includes(q) ||
      r.brand.toLowerCase().includes(q) ||
      unwrapTags(r.allergens).some((a) => a.includes(q))
    );
  };

  const visible = items.filter((r) => matchesFilter(r) && matchesQuery(r));
  const reviewCount = items.filter(
    (r) => r.cleared === 0 && (r.routing === "flag" || r.routing === "escalate"),
  ).length;

  const onClear = useCallback(
    async (id: number) => {
      const ok = await clearItem(id);
      setSelected(null);
      load();
      if (!ok) {
        Alert.alert(
          "Can't clear this item",
          "This item is under an active federal recall and cannot be put on the shelf. Remove it instead.",
        );
      }
    },
    [load],
  );

  const onReject = useCallback(
    async (id: number) => {
      await rejectItem(id);
      setSelected(null);
      load();
    },
    [load],
  );

  const controls = (
    <>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search product, brand, or allergen…"
        placeholderTextColor={colors.inkFaint}
        style={styles.search}
      />
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[type.label, { color: active ? "#FFFFFF" : colors.inkSoft }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <>
      <CollapsingList
        title="Inventory"
        subtitle={`${items.length} items · ${reviewCount > 0 ? `${reviewCount} need review` : "all reviewed"}`}
        data={visible}
        keyExtractor={(r) => String(r.id)}
        controls={controls}
        renderItem={(item) => (
          <ItemCard
            row={item}
            onPress={() => setSelected(item)}
            onClear={onClear}
            onReject={onReject}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No items match.</Text>}
      />

      <ItemDetailSheet
        row={selected}
        visible={selected !== null}
        onClose={() => setSelected(null)}
        onClear={onClear}
        onReject={onReject}
      />
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.paperDeep,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 50,
    paddingVertical: space.sm + 4,
    ...type.body,
    color: colors.ink,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    backgroundColor: colors.paperDeep,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: space.sm,
  },
  chipActive: { backgroundColor: colors.clay },
  empty: { ...type.body, color: colors.inkFaint, textAlign: "center", marginTop: space.xl },
});
