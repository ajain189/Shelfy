import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, type, radius, safetyTone } from "../theme";
import { Button } from "./ui";
import { ItemImage } from "./ItemImage";
import { ImageViewer } from "./ImageViewer";
import { unwrapImageUris, type InventoryRow } from "../db/inventory";
import {
  parseDetail,
  itemState,
  isExpired,
  unwrapTags,
  isRecalled,
  categoryIcon,
  allergenLine,
  prettyTag,
  formatDate,
  type ItemState,
} from "../db/itemView";

const PHOTO_SIZE = 140;

type FeatherName = keyof typeof Feather.glyphMap;

/** A big, color-coded headline for the item's status. */
function statusBanner(row: InventoryRow): { tone: ItemState; icon: FeatherName; title: string; sub: string } {
  if (isRecalled(row))
    return {
      tone: "danger",
      icon: "alert-octagon",
      title: "Do not put on the shelf",
      sub: "This food is under a federal recall.",
    };
  if (isExpired(row))
    return {
      tone: "danger",
      icon: "alert-octagon",
      title: "Past its date",
      sub: "This is past the date printed on the label.",
    };
  if (row.cleared === 1)
    return {
      tone: "safe",
      icon: "check-circle",
      title: "On the shelf",
      sub: "A volunteer checked this. It's ready for a family.",
    };
  if (row.routing === "flag" || row.routing === "escalate")
    return {
      tone: "caution",
      icon: "alert-circle",
      title: "Needs a quick check",
      sub: "A volunteer should look before it goes out.",
    };
  return {
    tone: "safe",
    icon: "check-circle",
    title: "Ready for the shelf",
    sub: "Looks good. Put it out whenever you're ready.",
  };
}

/** The 3-step "how Shelfy checked this" reasoning a worker can follow at a glance. */
function reasoningSteps(row: InventoryRow): { icon: FeatherName; text: string }[] {
  const d = parseDetail(row);
  const hardToRead = (d.legibility_notes || "").trim().length > 0;
  const recalled = isRecalled(row);
  const { phrase } = itemState(row);
  return [
    { icon: "camera", text: hardToRead ? "Read the label (some parts unclear)" : "Read the label clearly" },
    { icon: "shield", text: recalled ? "Matched a federal recall record" : "No recall match found" },
    { icon: "flag", text: phrase },
  ];
}

/**
 * One food, shown the way a busy worker can read in seconds: a big status
 * banner, a short step-by-step of how Shelfy checked it, the recall facts split
 * into "why" and "what to do" (not a wall of red), then the plain facts and big
 * action buttons.
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
  const allergens = unwrapTags(row.allergens);
  const dietary = unwrapTags(row.dietary_tags);
  const recalled = isRecalled(row);
  const photos = unwrapImageUris(row.image_uris);
  const dateText = d.expiry_date || d.expiry_text_raw;
  const banner = statusBanner(row);
  const tone = safetyTone(banner.tone);
  const steps = reasoningSteps(row);

  const showClear = !row.cleared && !recalled && !!onClear;
  const showRemove = !!onReject;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: space.lg, paddingBottom: space.lg }}
          >
            {/* Identity */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => photos.length > 0 && setViewerOpen(true)}
                disabled={photos.length === 0}
              >
                <ItemImage uri={photos[0]} size={PHOTO_SIZE} icon={categoryIcon(d.category) as any} />
              </Pressable>
              <View style={styles.headerText}>
                <Text style={type.title}>{d.product_name || "Unnamed item"}</Text>
                {!!d.brand && <Text style={[type.body, { color: colors.inkSoft }]}>{d.brand}</Text>}
                {photos.length > 1 && (
                  <Text style={[type.label, { color: colors.clay, marginTop: 4 }]}>
                    {photos.length} photos
                  </Text>
                )}
              </View>
            </View>

            {/* Big color-coded status banner */}
            <View style={[styles.banner, { backgroundColor: tone.bg }]}>
              <Feather name={banner.icon} size={24} color={tone.fg} />
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { color: tone.fg }]}>{banner.title}</Text>
                <Text style={[type.caption, { color: tone.fg }]}>{banner.sub}</Text>
              </View>
            </View>

            {/* Recall: why + what to do, readable (not a wall of red) */}
            {recalled && (
              <View style={styles.recallCard}>
                {!!d.recall_class && (
                  <View style={styles.classPill}>
                    <Text style={[type.label, { color: colors.danger }]}>
                      Federal recall · {d.recall_class}
                    </Text>
                  </View>
                )}
                {!!d.recall_explanation && (
                  <Section label="Why it was flagged" value={d.recall_explanation} />
                )}
                <Section
                  label="What to do"
                  value="Check the lot code against the recall notice, then remove it from the pantry."
                  emphasize
                />
              </View>
            )}

            {/* How Shelfy checked this, the step-by-step reasoning */}
            <View style={styles.steps}>
              <Text style={[type.overline, { color: colors.inkFaint }]}>HOW SHELFY CHECKED THIS</Text>
              {steps.map((s, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepRail}>
                    <View style={styles.stepNode}>
                      <Feather name={s.icon} size={14} color={colors.clay} />
                    </View>
                    {i < steps.length - 1 && <View style={styles.stepLine} />}
                  </View>
                  <Text style={[type.body, { color: colors.ink, flex: 1, paddingTop: 4 }]}>{s.text}</Text>
                </View>
              ))}
            </View>

            {/* Plain facts */}
            <View style={styles.facts}>
              <Fact label="What's inside" value={d.ingredients_text || "Not listed on the label"} />
              {allergens.length > 0 && <Fact label="Allergens" value={allergenLine(allergens)} />}
              {dietary.length > 0 && <Fact label="Diet" value={dietary.map(prettyTag).join(", ")} />}
              <Fact label="Best by" value={dateText ? formatDate(dateText) : "No date on the label"} />
            </View>

            {/* Gentle reminder */}
            <View style={styles.reminder}>
              <Feather name="info" size={16} color={colors.inkFaint} />
              <Text style={[type.caption, { color: colors.inkSoft, flex: 1 }]}>
                Always check the printed label before eating.
              </Text>
            </View>

            {(showClear || showRemove) && (
              <View style={{ gap: space.sm }}>
                {showClear && <Button label="Put on the shelf" onPress={() => onClear!(row.id)} />}
                {showRemove && (
                  <Button label="Remove" tone="ghost" onPress={() => onReject!(row.id)} />
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

/** A labeled section with a short value. `emphasize` bolds the value (e.g. "what to do"). */
function Section({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[type.label, { color: colors.danger }]}>{label}</Text>
      <Text style={[emphasize ? type.bodyMedium : type.body, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

/** One plain "Label / value" fact. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[type.label, { color: colors.inkFaint }]}>{label}</Text>
      <Text style={[type.body, { color: colors.ink }]}>{value}</Text>
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
    maxHeight: "92%",
  },
  scroll: { flexShrink: 1 },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: space.md,
  },
  headerRow: { flexDirection: "row", gap: space.md, alignItems: "center" },
  headerText: { flex: 1, gap: 2 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.md,
    padding: space.md,
  },
  recallCard: {
    gap: space.md,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: space.md,
  },
  classPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: space.md - 2,
    paddingVertical: space.xs + 2,
  },
  steps: {
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
  },
  step: { flexDirection: "row", gap: space.md },
  stepRail: { alignItems: "center", width: 28 },
  stepNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.claySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: { flex: 1, width: 2, backgroundColor: colors.lineStrong, marginVertical: 2, minHeight: 10 },
  facts: { gap: space.md },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.paperDeep,
    borderRadius: radius.md,
    padding: space.md,
  },
  closeBtn: { alignItems: "center", paddingTop: space.md },
});
