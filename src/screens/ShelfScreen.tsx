import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, radius } from "../theme";
import { CollapsingList } from "../components/CollapsingList";
import { ItemCard } from "../components/ItemCard";
import { ItemDetailSheet } from "../components/ItemDetailSheet";
import { getShelfItems, rejectItem, type InventoryRow } from "../db/inventory";
import { DIETARY_FILTERS, ALLERGEN_FREE_FILTERS, hasDietary, isFreeOf } from "../db/itemView";

/**
 * Shelf — cleared items only, what families can get. Filter by dietary claim
 * (only when the label claims it) or by "free from" common allergens. Each card
 * reveals its ingredients.
 */
export function ShelfScreen() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dietary, setDietary] = useState<Set<string>>(new Set());
  const [allergenFree, setAllergenFree] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    getShelfItems().then(setItems).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const visible = items.filter((r) => {
    for (const d of dietary) if (!hasDietary(r, d)) return false;
    for (const a of allergenFree) if (!isFreeOf(r, a)) return false;
    return true;
  });
  const activeCount = dietary.size + allergenFree.size;

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
      <Pressable style={styles.filterToggle} onPress={() => setFiltersOpen((o) => !o)}>
        <Feather name="sliders" size={16} color={colors.ink} />
        <Text style={[type.bodyMedium, { color: colors.ink, flex: 1 }]}>
          Filter {activeCount > 0 ? `· ${activeCount} on` : ""}
        </Text>
        <Feather name={filtersOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.inkFaint} />
      </Pressable>

      {filtersOpen && (
        <View style={styles.panel}>
          <Text style={[type.overline, styles.filterLabel]}>DIETARY (AS LABELED)</Text>
          <View style={styles.chipWrap}>
            {DIETARY_FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                active={dietary.has(f.key)}
                onPress={() => toggle(dietary, setDietary, f.key)}
              />
            ))}
          </View>
          <Text style={[type.overline, styles.filterLabel]}>FREE FROM</Text>
          <View style={styles.chipWrap}>
            {ALLERGEN_FREE_FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                active={allergenFree.has(f.key)}
                onPress={() => toggle(allergenFree, setAllergenFree, f.key)}
              />
            ))}
          </View>
          {activeCount > 0 && (
            <Pressable
              onPress={() => {
                setDietary(new Set());
                setAllergenFree(new Set());
              }}
            >
              <Text style={[type.label, { color: colors.clay, paddingTop: space.xs }]}>
                Clear all filters
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </>
  );

  return (
    <>
      <CollapsingList
        title="Shelf"
        subtitle={`${visible.length} of ${items.length} item${items.length === 1 ? "" : "s"} · ready for families`}
        data={visible}
        keyExtractor={(r) => String(r.id)}
        controls={controls}
        renderItem={(item) => (
          <ItemCard row={item} onPress={() => setSelected(item)} onReject={onReject} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {items.length === 0
              ? "Nothing on the shelf yet. Volunteers clear items from the Inventory tab."
              : "No cleared items match these filters."}
          </Text>
        }
      />

      <ItemDetailSheet
        row={selected}
        visible={selected !== null}
        onClose={() => setSelected(null)}
        onReject={onReject}
      />
    </>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[type.label, { color: active ? "#FFFFFF" : colors.inkSoft }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.paperDeep,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 50,
    paddingVertical: space.sm + 2,
  },
  panel: { gap: space.sm, paddingTop: space.xs },
  filterLabel: { color: colors.inkFaint, marginTop: space.xs },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
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
