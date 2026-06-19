import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors, space, type } from "../theme";
import { Card, Field } from "./ui";
import { StatusPill } from "./StatusPill";
import { ChipGroup } from "./InfoBits";
import type { IntakeExtraction } from "../ai/intakeSchema";

/**
 * Renders the real Call-1 structured output. No recall verdict yet at intake,
 * so confidence + legibility drive a calm "needs review" status — never an
 * automatic clear. Uses the same uniform chips/labels as the rest of the app.
 */
export function IntakeResultCard({
  extraction,
  usage,
}: {
  extraction: IntakeExtraction;
  usage?: { input_tokens: number; output_tokens: number };
}) {
  const lowConfidence = extraction.confidence < 0.7;
  const needsReview = lowConfidence || extraction.legibility_notes.trim().length > 0;

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>{extraction.product_name || "Unnamed item"}</Text>
          {!!extraction.brand && (
            <Text style={[type.body, { color: colors.inkSoft }]}>{extraction.brand}</Text>
          )}
        </View>
        <StatusPill
          kind={needsReview ? "review" : "pending"}
          label={needsReview ? "Needs review" : "Read clearly"}
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={[type.overline, { color: colors.inkFaint }]}>BEST BY</Text>
        <Text style={[type.bodyMedium, { color: colors.ink }]}>
          {extraction.expiry_date || extraction.expiry_text_raw || "Not on label"}
        </Text>
      </View>

      <ChipGroup label="CONTAINS" items={extraction.allergens} />
      {!!extraction.allergen_basis && (
        <Text style={[type.caption, { color: colors.inkFaint, marginTop: -space.xs }]}>
          Basis: {extraction.allergen_basis}
        </Text>
      )}
      <ChipGroup label="DIETARY (AS LABELED)" items={extraction.dietary_tags} />

      {!!extraction.lot_code && <Field label="Lot code" value={extraction.lot_code} />}

      {!!extraction.ingredients_text && (
        <Field label="Ingredients (verbatim)" value={extraction.ingredients_text} />
      )}

      {!!extraction.legibility_notes && (
        <View style={styles.notes}>
          <Text style={[type.overline, { color: colors.review }]}>COULD NOT READ CLEARLY</Text>
          <Text style={[type.body, { color: colors.inkSoft }]}>{extraction.legibility_notes}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[type.caption, { color: colors.inkFaint }]}>
          Confidence {Math.round(extraction.confidence * 100)}%
        </Text>
        {usage && (
          <Text style={[type.mono, { color: colors.inkFaint }]}>
            {usage.input_tokens} in / {usage.output_tokens} out tok
          </Text>
        )}
      </View>

      <Text style={[type.caption, styles.disclaimer]}>
        Here's what the label shows — check the physical label to confirm.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  notes: { gap: space.xs, backgroundColor: colors.reviewBg, borderRadius: 12, padding: space.md },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  disclaimer: {
    color: colors.inkSoft,
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.md,
  },
});
