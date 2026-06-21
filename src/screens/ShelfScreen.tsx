import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, radius, shadow } from "../theme";
import { CollapsingList } from "../components/CollapsingList";
import { ItemCard } from "../components/ItemCard";
import { ItemDetailSheet } from "../components/ItemDetailSheet";
import { PressableScale } from "../components/PressableScale";
import { getShelfItems, rejectItem, type InventoryRow } from "../db/inventory";
import { DIETARY_FILTERS, ALLERGEN_FREE_FILTERS, hasDietary, isFreeOf } from "../db/itemView";
import { parseFoodNeeds } from "../ai/geminiClient";

/**
 * Find food, the shelf families browse. Two ways to narrow it: describe who the
 * food is for in plain words (typed or dictated) and let Gemini set the filters,
 * or tap the filters by hand. Shows only items a volunteer has put on the shelf.
 */
export function ShelfScreen() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dietary, setDietary] = useState<Set<string>>(new Set());
  const [allergenFree, setAllergenFree] = useState<Set<string>>(new Set());

  // Smart (Gemini) filter state.
  const [needsText, setNeedsText] = useState("");
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartNote, setSmartNote] = useState("");
  const [smartError, setSmartError] = useState("");
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(() => {
    getShelfItems().then(setItems).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  const onReject = useCallback(
    async (id: number) => {
      await rejectItem(id);
      setSelected(null);
      load();
    },
    [load],
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const runSmartFilter = useCallback(async () => {
    if (!needsText.trim()) return;
    setSmartError("");
    setSmartLoading(true);
    try {
      const r = await parseFoodNeeds(needsText);
      setDietary(new Set(r.dietary));
      setAllergenFree(new Set(r.avoidAllergens));
      setSmartNote(r.note || "Filters updated.");
    } catch (e: any) {
      setSmartError(e?.message ?? String(e));
    } finally {
      setSmartLoading(false);
    }
  }, [needsText]);

  const clearAllFilters = useCallback(() => {
    setNeedsText("");
    setSmartNote("");
    setSmartError("");
    setDietary(new Set());
    setAllergenFree(new Set());
  }, []);

  const visible = items.filter((r) => {
    for (const d of dietary) if (!hasDietary(r, d)) return false;
    for (const a of allergenFree) if (!isFreeOf(r, a)) return false;
    return true;
  });
  const activeCount = dietary.size + allergenFree.size;

  const controls = (
    <View style={{ gap: space.md }}>
      {/* Smart filter, the headline. Describe who the food is for. */}
      <View style={styles.smart}>
        <Text style={[type.heading, { color: colors.ink }]}>Who is this food for?</Text>
        <Text style={[type.caption, { color: colors.inkSoft }]}>
          Say it in plain words, like “allergic to peanuts and vegetarian.”
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={needsText}
            onChangeText={setNeedsText}
            placeholder="Tell us about the person…"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            multiline
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={runSmartFilter}
          />
          <Pressable style={styles.mic} onPress={() => inputRef.current?.focus()} hitSlop={8}>
            <Feather name="mic" size={20} color={colors.clay} />
          </Pressable>
        </View>
        <PressableScale
          onPress={runSmartFilter}
          disabled={smartLoading || !needsText.trim()}
          style={[styles.findBtn, (smartLoading || !needsText.trim()) && { opacity: 0.4 }]}
        >
          {smartLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="search" size={18} color="#FFFFFF" />
              <Text style={[type.bodyMedium, { color: "#FFFFFF" }]}>Find matches</Text>
            </>
          )}
        </PressableScale>
        <Text style={[type.label, { color: colors.inkFaint }]}>
          Tip: tap the box, then the microphone on your keyboard to speak.
        </Text>
        {!!smartNote && (
          <View style={styles.noteRow}>
            <Feather name="check-circle" size={16} color={colors.safe} />
            <Text style={[type.caption, { color: colors.inkSoft, flex: 1 }]}>{smartNote}</Text>
          </View>
        )}
        {!!smartError && (
          <Text style={[type.caption, { color: colors.danger }]}>{smartError}</Text>
        )}
        {(activeCount > 0 || smartNote) && (
          <Pressable onPress={clearAllFilters}>
            <Text style={[type.label, { color: colors.clay }]}>Clear and start over</Text>
          </Pressable>
        )}
      </View>

      {/* Manual filter, the fallback, tucked behind a toggle. */}
      <Pressable style={styles.filterToggle} onPress={() => setFiltersOpen((o) => !o)}>
        <Feather name="sliders" size={16} color={colors.ink} />
        <Text style={[type.bodyMedium, { color: colors.ink, flex: 1 }]}>
          Or pick filters by hand {activeCount > 0 ? `· ${activeCount} on` : ""}
        </Text>
        <Feather name={filtersOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.inkFaint} />
      </Pressable>

      {filtersOpen && (
        <View style={styles.panel}>
          <Text style={[type.overline, styles.filterLabel]}>DIET (WHAT THE LABEL SAYS)</Text>
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
          <Text style={[type.overline, styles.filterLabel]}>SKIP THESE</Text>
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
        </View>
      )}
    </View>
  );

  return (
    <>
      <CollapsingList
        title="Find food"
        subtitle={`${visible.length} food${visible.length === 1 ? "" : "s"} you can take home`}
        data={visible}
        keyExtractor={(r) => String(r.id)}
        controls={controls}
        renderItem={(item) => <ItemCard row={item} onPress={() => setSelected(item)} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {items.length === 0
              ? "Nothing on the shelf yet. Volunteers add foods from the Sort tab."
              : "No foods match. Try “Clear and start over.”"}
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
  smart: {
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md + 2,
    ...shadow.card,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: space.xs },
  input: {
    flex: 1,
    backgroundColor: colors.paperDeep,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    minHeight: 52,
    ...type.body,
    color: colors.ink,
  },
  mic: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.claySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  findBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.clay,
    marginTop: space.xs,
  },
  noteRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", marginTop: space.xs },
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
  panel: { gap: space.sm },
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
