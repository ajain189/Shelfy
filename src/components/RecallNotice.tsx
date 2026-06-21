import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, space, radius, type } from "../theme";
import type { RecallResult } from "../recall/recallService";

/**
 * Shows the live recall-check result on the intake screen. A possible match is
 * the loud case (amber escalation, a human must verify the lot code); a clear
 * result is a quiet confirmation. Either way it reports WHICH data path ran
 * (live FDA query vs. cached snapshot), because a system that's honest about its
 * own degraded state is part of the Responsible-AI story.
 */
export function RecallNotice({ recall }: { recall: RecallResult }) {
  const flagged = recall.recall_state === "possible_match" || recall.recall_state === "confirmed_match";
  const unknown = recall.recall_state === "unknown";

  const pathLabel =
    recall.path === "live"
      ? "Live FDA query"
      : recall.path === "cached"
        ? "Offline, used cached recall snapshot"
        : "No recall data reached";

  if (flagged) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cautionBg }]}>
        <View style={styles.head}>
          <Feather name="alert-triangle" size={18} color={colors.caution} />
          <Text style={[type.heading, { color: colors.caution }]}>Possible recall match</Text>
        </View>
        <Text style={[type.body, { color: colors.ink }]}>
          {recall.recall_explanation ??
            "This item's brand/product matches an active FDA recall. A volunteer must verify before it is shelved."}
        </Text>
        {recall.citations[0] && (
          <Text style={[type.caption, { color: colors.inkSoft }]}>
            Source: {recall.citations[0].source} · {recall.citations[0].record_id}
          </Text>
        )}
        <PathBadge label={pathLabel} checked={recall.candidates_checked} tone={colors.caution} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.head}>
        <Feather
          name={unknown ? "help-circle" : "check-circle"}
          size={18}
          color={unknown ? colors.review : colors.safe}
        />
        <Text style={[type.heading, { color: unknown ? colors.review : colors.safe }]}>
          {unknown ? "Recall check inconclusive" : "No recall match found"}
        </Text>
      </View>
      <Text style={[type.body, { color: colors.inkSoft }]}>
        {unknown
          ? "Not enough was read from the label to check recalls, this item will be escalated to a human."
          : "Checked the FDA recall data we have; no match for this item. A volunteer still clears every item."}
      </Text>
      <PathBadge label={pathLabel} checked={recall.candidates_checked} tone={colors.inkFaint} />
    </View>
  );
}

function PathBadge({ label, checked, tone }: { label: string; checked: number; tone: string }) {
  return (
    <View style={styles.pathRow}>
      <Feather name="database" size={12} color={tone} />
      <Text style={[type.caption, { color: tone }]}>
        {label}
        {checked > 0 ? ` · ${checked} record${checked === 1 ? "" : "s"} compared` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, borderRadius: radius.md, padding: space.md + 2 },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  pathRow: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, marginTop: 2 },
});
