import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, Pressable } from "react-native";

import { colors, space, type, radius } from "../theme";
import { Button } from "./ui";
import { StatusDot } from "./StatusDot";
import { ItemImage } from "./ItemImage";
import { ImageViewer } from "./ImageViewer";
import { FederalRecallBanner } from "./FederalRecallBanner";
import { Disclosure } from "./InfoBits";
import { unwrapImageUris, type InventoryRow } from "../db/inventory";
import {
  parseDetail,
  itemState,
  unwrapTags,
  isRecalled,
  categoryIcon,
  allergenLine,
  prettyTag,
} from "../db/itemView";
import { recommendFor } from "../db/recommendation";

const PHOTO_SIZE = 200;

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
  const [viewerOpen, setViewerOpen] = useState(false);
  if (!row) return null;
  const d = parseDetail(row);
  const { state, phrase } = itemState(row);
  const allergens = unwrapTags(row.allergens);
  const dietary = unwrapTags(row.dietary_tags);
  const recalled = isRecalled(row);
  const photos = unwrapImageUris(row.image_uris);
  const rec = recommendFor(row);
  const canReview = !row.cleared && (onClear || onReject);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView contentContainerStyle={{ gap: space.lg, paddingBottom: space.xl }}>
            {/* Lead: photo + name + status — the identity, big and calm */}
            <Pressable
              onPress={() => photos.length > 0 && setViewerOpen(true)}
              disabled={photos.length === 0}
              style={styles.hero}
            >
              <ItemImage
                uri={photos[0]}
                size={PHOTO_SIZE}
                icon={categoryIcon(d.category) as any}
              />
              {photos.length > 0 && (
                <View style={styles.photoHint}>
                  <Text style={[type.label, { color: "#FFFFFF" }]}>
                    Tap to enlarge{photos.length > 1 ? ` · ${photos.length} photos` : ""}
                  </Text>
                </View>
              )}
            </Pressable>

            <View style={styles.titleRow}>
              <Text style={type.title}>{d.product_name || "Unnamed item"}</Text>
              {!!d.brand && <Text style={[type.body, { color: colors.inkSoft }]}>{d.brand}</Text>}
            </View>

            {/* The ONE state, big — then the AI's plain reason and its evidence */}
            <View style={styles.recCard}>
              <StatusDot state={state} phrase={phrase} large />
              <Text style={[type.body, { color: colors.ink }]}>{rec.reason}</Text>
              {rec.factors.length > 0 && (
                <View style={styles.factors}>
                  {rec.factors.map((f, i) => (
                    <View key={i} style={styles.factorRow}>
                      <Text style={[type.body, { color: colors.inkFaint }]}>•</Text>
                      <Text style={[type.caption, { color: colors.inkSoft, flex: 1 }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={[type.caption, { color: colors.inkFaint, fontStyle: "italic" }]}>
                The AI's read — a volunteer makes the final call.
              </Text>
            </View>

            {/* Federal recall — the loud case, with full explanation */}
            {recalled && (
              <FederalRecallBanner
                recallClass={d.recall_class}
                explanation={d.recall_explanation}
                reason={d.recall_citations?.[0]?.quoted_text}
              />
            )}

            {/* Plain essentials — the few things that matter, in plain words */}
            <View style={styles.facts}>
              {allergens.length > 0 && (
                <Text style={[type.bodyMedium, { color: colors.ink }]}>{allergenLine(allergens)}</Text>
              )}
              {dietary.length > 0 && (
                <Text style={[type.body, { color: colors.inkSoft }]}>
                  Label says: {dietary.map(prettyTag).join(", ")}
                </Text>
              )}
              <Text style={[type.body, { color: colors.inkSoft }]}>
                {d.expiry_date || d.expiry_text_raw
                  ? `Best by ${d.expiry_date || d.expiry_text_raw}`
                  : "No date on the label"}
              </Text>
            </View>

            {/* Everything technical, folded away but one tap from reach */}
            {(!!d.ingredients_text || !!d.allergen_basis || !!d.lot_code || !!d.legibility_notes) && (
              <Disclosure title="Label details">
                {!!d.ingredients_text && (
                  <LabelRow label="Ingredients" value={d.ingredients_text} />
                )}
                {!!d.allergen_basis && (
                  <LabelRow label="Why these allergens" value={d.allergen_basis} />
                )}
                {!!d.lot_code && <LabelRow label="Lot code" value={d.lot_code} />}
                {!!d.legibility_notes && (
                  <LabelRow label="Couldn't read clearly" value={d.legibility_notes} />
                )}
                {recalled && d.recall_citations && d.recall_citations.length > 0 && (
                  <LabelRow
                    label="Recall source"
                    value={`${d.recall_citations[0].source}${d.recall_citations[0].record_id ? ` · ${d.recall_citations[0].record_id}` : ""}`}
                  />
                )}
              </Disclosure>
            )}

            <Text style={[type.caption, styles.disclaimer]}>
              Here's what the label shows — check the physical label to confirm.
            </Text>

            {canReview && (
              <View style={{ gap: space.sm }}>
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

      <ImageViewer uris={photos} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
    </Modal>
  );
}

/** One labeled line inside the "Label details" disclosure. */
function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[type.overline, { color: colors.inkFaint }]}>{label.toUpperCase()}</Text>
      <Text style={[type.body, { color: colors.inkSoft }]}>{value}</Text>
    </View>
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
  hero: { alignSelf: "center" },
  titleRow: { gap: 2 },
  photoHint: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  facts: { gap: space.sm },
  recCard: {
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md + 2,
  },
  factors: { gap: space.xs + 1 },
  factorRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  disclaimer: {
    color: colors.inkSoft,
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.md,
  },
  closeBtn: { alignItems: "center", paddingTop: space.md },
});
