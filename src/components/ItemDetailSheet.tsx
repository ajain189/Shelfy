import React from "react";
import { View, Text, StyleSheet, ScrollView, Modal, Pressable } from "react-native";

import { colors, space, type, radius } from "../theme";
import { Field, Button } from "./ui";
import { StatusPill } from "./StatusPill";
import { FederalRecallBanner } from "./FederalRecallBanner";
import { ChipGroup, IngredientsDisclosure } from "./InfoBits";
import type { InventoryRow } from "../db/inventory";
import { parseDetail, statusFor, unwrapTags, isRecalled } from "../db/itemView";

/**
 * Full item detail with the AI's grounding evidence — the volunteer's review
 * surface. Federal recalls show the big red banner + full explanation; allergens
 * and dietary claims use the same uniform neutral chips as the cards.
 */
export function ItemDetailSheet({
  row,
  visible,
  onClose,
  onClear,
  onReject,
}: {
  row: InventoryRow | null;
  visible: boolean;
  onClose: () => void;
  onClear?: (id: number) => void;
  onReject?: (id: number) => void;
}) {
  if (!row) return null;
  const d = parseDetail(row);
  const status = statusFor(row);
  const allergens = unwrapTags(row.allergens);
  const dietary = unwrapTags(row.dietary_tags);
  const recalled = isRecalled(row);
  const canReview = !row.cleared && (onClear || onReject);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView contentContainerStyle={{ gap: space.lg, paddingBottom: space.xl }}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={type.title}>{d.product_name || "Unnamed item"}</Text>
                {!!d.brand && (
                  <Text style={[type.body, { color: colors.inkSoft }]}>{d.brand}</Text>
                )}
              </View>
              <StatusPill kind={status.kind} label={status.label} />
            </View>

            {/* Federal recall — the loud case, with full explanation */}
            {recalled && (
              <FederalRecallBanner
                recallClass={d.recall_class}
                explanation={d.recall_explanation}
                reason={d.recall_citations?.[0]?.quoted_text}
              />
            )}

            {/* Recall source citation — grounding, never invented */}
            {recalled && d.recall_citations && d.recall_citations.length > 0 && (
              <Text style={[type.caption, { color: colors.inkFaint }]}>
                Source: {d.recall_citations[0].source}
                {d.recall_citations[0].record_id ? ` · ${d.recall_citations[0].record_id}` : ""}
              </Text>
            )}

            {!recalled && !!d.plain_language_summary && (
              <Text style={[type.body, { color: colors.ink }]}>{d.plain_language_summary}</Text>
            )}

            <ChipGroup label="CONTAINS" items={allergens} />
            {!!d.allergen_basis && (
              <Text style={[type.caption, { color: colors.inkFaint, marginTop: -space.sm }]}>
                Basis: {d.allergen_basis}
              </Text>
            )}
            <ChipGroup label="DIETARY (AS LABELED)" items={dietary} />

            <View style={styles.grid}>
              <Field label="Best / use by" value={d.expiry_date || d.expiry_text_raw} />
              <Field label="Lot code" value={d.lot_code} />
            </View>

            {!!d.ingredients_text && <IngredientsDisclosure text={d.ingredients_text} />}

            {!!d.legibility_notes && (
              <View style={styles.notes}>
                <Text style={[type.overline, { color: colors.review }]}>COULD NOT READ CLEARLY</Text>
                <Text style={[type.body, { color: colors.inkSoft }]}>{d.legibility_notes}</Text>
              </View>
            )}

            <Text style={[type.caption, styles.disclaimer]}>
              Here's what the label shows — check the physical label to confirm.
            </Text>

            {canReview && (
              <View style={{ gap: space.sm }}>
                <Text style={[type.overline, { color: colors.inkFaint }]}>VOLUNTEER DECISION</Text>
                {onClear && !recalled && (
                  <Button label="Clear to shelf" onPress={() => onClear(row.id)} />
                )}
                {onReject && (
                  <Button label="Remove" tone="ghost" onPress={() => onReject(row.id)} />
                )}
              </View>
            )}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={[type.bodyMedium, { color: colors.clay }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(26,29,26,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    maxHeight: "90%",
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: space.md,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  grid: { flexDirection: "row", gap: space.xl },
  notes: { gap: space.xs, backgroundColor: colors.reviewBg, borderRadius: 12, padding: space.md },
  disclaimer: {
    color: colors.inkSoft,
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.md,
  },
  closeBtn: { alignItems: "center", paddingTop: space.md },
});
