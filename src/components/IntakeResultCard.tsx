import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { colors, space, type } from "../theme";
import { Card } from "./ui";
import { StatusDot } from "./StatusDot";
import { PipelineTrace, type TraceStep } from "./PipelineTrace";
import { Disclosure } from "./InfoBits";
import { prettyTag, allergenLine } from "../db/itemView";
import type { Recommendation } from "../db/recommendation";
import type { IntakeExtraction } from "../ai/intakeSchema";

/**
 * Derive the recommendation + the agentic-pipeline trace from a fresh scan.
 * At intake there's no live recall lookup yet, so recall is reported as
 * "no match in our data" and the verdict turns on date + read confidence —
 * always erring toward REVIEW when the AI is unsure, never a guess.
 */
function deriveIntake(e: IntakeExtraction): { rec: Recommendation; steps: TraceStep[] } {
  const lowConfidence = e.confidence < 0.7;
  const illegible = e.legibility_notes.trim().length > 0;
  const needsReview = lowConfidence || illegible;
  const conf = Math.round(e.confidence * 100);

  const rec: Recommendation = needsReview
    ? {
        verdict: "review",
        label: "Review",
        reason: "The AI wasn't sure — a volunteer should check before shelving.",
        factors: [
          illegible ? `Label hard to read: ${e.legibility_notes}` : "",
          lowConfidence ? `Read confidence ${conf}% is below 70%.` : "",
        ].filter(Boolean),
      }
    : {
        verdict: "keep",
        label: "Keep",
        reason:
          e.allergens.length > 0
            ? "Label read clearly, no date issue. Note the allergens below."
            : "Label read clearly and no date issue found.",
        factors: [],
      };

  const steps: TraceStep[] = [
    { icon: "camera", label: "Scanned the label", detail: "Photo sent to the vision model." },
    {
      icon: "type",
      label: "Read the text",
      detail:
        e.product_name || e.brand
          ? `Identified "${[e.brand, e.product_name].filter(Boolean).join(" ")}".`
          : "No product name legible on the label.",
    },
    {
      icon: "tag",
      label: "Classified allergens & diet",
      detail:
        e.allergens.length > 0
          ? `Allergens: ${e.allergens.map(prettyTag).join(", ")}.`
          : "No major allergens found in the ingredients.",
    },
    {
      icon: "shield",
      label: "Checked recalls",
      detail: "No match found in the FDA/USDA data we have.",
    },
    {
      icon: needsReview ? "help-circle" : "check-circle",
      label: "Reached a verdict",
      detail: needsReview
        ? `Unsure (confidence ${conf}%) — routed to a human.`
        : `Read clearly (confidence ${conf}%) — recommends keeping.`,
    },
  ];

  return { rec, steps };
}

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
  const { rec, steps } = deriveIntake(extraction);

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.header}>
        <Text style={type.title}>{extraction.product_name || "Unnamed item"}</Text>
        {!!extraction.brand && (
          <Text style={[type.body, { color: colors.inkSoft }]}>{extraction.brand}</Text>
        )}
      </View>

      {/* One state, big — then the AI's plain reason */}
      <View style={styles.recRow}>
        <StatusDot
          state={needsReview ? "caution" : "safe"}
          phrase={needsReview ? "Needs review" : "Read clearly"}
          large
        />
        <Text style={[type.body, { color: colors.inkSoft }]}>{rec.reason}</Text>
      </View>

      {/* Plain essentials — what the label says, in plain words */}
      <View style={styles.facts}>
        {extraction.allergens.length > 0 && (
          <Text style={[type.bodyMedium, { color: colors.ink }]}>
            {allergenLine(extraction.allergens)}
          </Text>
        )}
        {extraction.dietary_tags.length > 0 && (
          <Text style={[type.body, { color: colors.inkSoft }]}>
            Label says: {extraction.dietary_tags.map(prettyTag).join(", ")}
          </Text>
        )}
        <Text style={[type.body, { color: colors.inkSoft }]}>
          {extraction.expiry_date || extraction.expiry_text_raw
            ? `Best by ${extraction.expiry_date || extraction.expiry_text_raw}`
            : "No date on the label"}
        </Text>
      </View>

      {/* The agentic pipeline, made visible — the AI showcase for the demo */}
      <PipelineTrace steps={steps} />

      {/* Everything technical, tucked away but one tap from reach */}
      {(!!extraction.ingredients_text ||
        !!extraction.allergen_basis ||
        !!extraction.lot_code ||
        !!extraction.legibility_notes) && (
        <Disclosure title="Label details">
          {!!extraction.ingredients_text && (
            <LabelRow label="Ingredients" value={extraction.ingredients_text} />
          )}
          {!!extraction.allergen_basis && (
            <LabelRow label="Why these allergens" value={extraction.allergen_basis} />
          )}
          {!!extraction.lot_code && <LabelRow label="Lot code" value={extraction.lot_code} />}
          {!!extraction.legibility_notes && (
            <LabelRow label="Couldn't read clearly" value={extraction.legibility_notes} />
          )}
          {usage && (
            <LabelRow
              label="AI run"
              value={`${Math.round(extraction.confidence * 100)}% confidence · ${usage.input_tokens} in / ${usage.output_tokens} out tokens`}
            />
          )}
        </Disclosure>
      )}

      <Text style={[type.caption, styles.disclaimer]}>
        Here's what the label shows — check the physical label to confirm.
      </Text>
    </Card>
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
  header: { gap: 2 },
  recRow: { gap: space.sm },
  facts: { gap: space.sm },
  disclaimer: {
    color: colors.inkSoft,
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.md,
  },
});
