import React, { useState, useCallback } from "react";
import { Text, StyleSheet, TextInput, Pressable, View, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { colors, space, type, radius } from "../theme";
import { CollapsingList } from "../components/CollapsingList";
import { ItemCard } from "../components/ItemCard";
import { ItemDetailSheet } from "../components/ItemDetailSheet";
import { getAllItems, clearItem, rejectItem, type InventoryRow } from "../db/inventory";
import { unwrapTags } from "../db/itemView";

type Filter = "all" | "review" | "recall";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "review", label: "Needs a check" },
  { key: "recall", label: "Recalled" },
];

/**
 * Sort, the volunteer workspace. Shows ONLY items that aren't on the shelf yet,
 * the pile still to be sorted. The moment a volunteer puts an item on the shelf
 * it leaves this screen and lives on the Shelf tab. Tap a card to review it and
 * put it on the shelf or remove it.
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
        return r.routing === "flag" || r.routing === "escalate";
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

  // Sort only shows items that aren't on the shelf yet. Once an item is put on
  // the shelf (cleared === 1) it disappears from here and lives on the Shelf tab.
  const pending = items.filter((r) => r.cleared === 0);
  const visible = pending.filter((r) => matchesFilter(r) && matchesQuery(r));
  const reviewCount = pending.filter(
    (r) => r.routing === "flag" || r.routing === "escalate",
  ).length;

  const onClear = useCallback(
    async (id: number) => {
      const ok = await clearItem(id);
      setSelected(null);
      load();
      if (!ok) {
        Alert.alert(
          "This one can't go on the shelf",
          "It's under an active federal recall, so it can't be put out for families. Remove it instead.",
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
        placeholder="Search food, brand, or allergen…"
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
        title="Sort donations"
        subtitle={
          pending.length === 0
            ? "All sorted, nothing waiting"
            : `${pending.length} to sort${reviewCount > 0 ? ` · ${reviewCount} need a check` : ""}`
        }
        data={visible}
        keyExtractor={(r) => String(r.id)}
        controls={controls}
        renderItem={(item) => <ItemCard row={item} onPress={() => setSelected(item)} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {pending.length === 0
              ? "Everything has been sorted. New donations show up here after you scan them."
              : "Nothing matches that."}
          </Text>
        }
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
