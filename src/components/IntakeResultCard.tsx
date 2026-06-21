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
import type { RecallResult } from "../recall/recallService";

/**
 * Derive the recommendation + the agentic-pipeline trace from a fresh scan,
 * including the LIVE recall verdict. A possible recall match always escalates
 * (discard); otherwise the verdict turns on date + read confidence, always
 * erring toward REVIEW when the AI is unsure, never a guess.
 */
function deriveIntake(
  e: IntakeExtraction,
  recall?: RecallResult | null,
): { rec: Recommendation; steps: TraceStep[] } {
  const lowConfidence = e.confidence < 0.7;
  const illegible = e.legibility_notes.trim().length > 0;
  const recallFlagged = recall?.recall_state === "possible_match" || recall?.recall_state === "confirmed_match";
  const needsReview = lowConfidence || illegible;
  const conf = Math.round(e.confidence * 100);

  const rec: Recommendation = recallFlagged
    ? {
        verdict: "discard",
        label: "Discard",
        reason: "Matches an active FDA recall, escalated, do not shelve.",
        factors: [
          recall?.citations[0]
            ? `Matched ${recall.citations[0].source} record ${recall.citations[0].record_id}.`
            : "Matched an active recall record.",
          "A volunteer must verify the lot code against the official notice.",
        ],
      }
    : needsReview
      ? {
          verdict: "review",
          label: "Review",
          reason: "The AI wasn't sure, a volunteer should check before shelving.",
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
              ? "No recall, label read clearly. Note the allergens below."
              : "No recall found and the label read clearly.",
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
      detail: recallFlagged
        ? `Matched an active FDA recall (${recall?.citations[0]?.record_id ?? "record"}).`
        : recall
          ? `${recall.path === "cached" ? "Offline, checked cached snapshot" : "Queried live FDA records"}; no match (${recall.candidates_checked} compared).`
          : "Querying live FDA recall records…",
    },
    {
      icon: recallFlagged ? "x-octagon" : needsReview ? "help-circle" : "check-circle",
      label: "Reached a verdict",
      detail: recallFlagged
        ? "Recall match, escalated to a human, not shelved."
        : needsReview
          ? `Unsure (confidence ${conf}%), routed to a human.`
          : `Read clearly (confidence ${conf}%), recommends keeping.`,
    },
  ];

  return { rec, steps };
}

/**
 * Renders the real Call-1 structured output plus the live recall verdict. The
 * agentic-pipeline trace (scan → read → classify → recall-check → verdict)
 * reflects this scan's actual outcome. Confidence + legibility + the recall
 * match drive the status, never an automatic clear.
 */
export function IntakeResultCard({
  extraction,
  usage,
  recall,
}: {
  extraction: IntakeExtraction;
  usage?: { input_tokens: number; output_tokens: number };
  recall?: RecallResult | null;
}) {
  const recallFlagged =
    recall?.recall_state === "possible_match" || recall?.recall_state === "confirmed_match";
  const lowConfidence = extraction.confidence < 0.7;
  const needsReview = lowConfidence || extraction.legibility_notes.trim().length > 0;
  const { rec, steps } = deriveIntake(extraction, recall);

  const dotState = recallFlagged ? "danger" : needsReview ? "caution" : "safe";
  const dotPhrase = recallFlagged ? "Recall match" : needsReview ? "Needs review" : "Read clearly";

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.header}>
        <Text style={type.title}>{extraction.product_name || "Unnamed item"}</Text>
        {!!extraction.brand && (
          <Text style={[type.body, { color: colors.inkSoft }]}>{extraction.brand}</Text>
        )}
      </View>

      {/* One state, big, then the AI's plain reason */}
      <View style={styles.recRow}>
        <StatusDot state={dotState} phrase={dotPhrase} large />
        <Text style={[type.body, { color: colors.inkSoft }]}>{rec.reason}</Text>
      </View>

      {/* Plain essentials, what the label says, in plain words */}
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

      {/* The agentic pipeline, made visible, the AI showcase for the demo */}
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
        Here's what the label shows, check the physical label to confirm.
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
