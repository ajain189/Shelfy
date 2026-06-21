import type { InventoryRow } from "./inventory";
import { parseDetail, isRecalled, isExpired } from "./itemView";

/**
 * The AI's KEEP / DISCARD / REVIEW recommendation for an item.
 *
 * This is ADVICE to the volunteer, never a safety certification. A human still
 * clears every item onto the shelf — the recommendation just tells them what the
 * AI would do and why, so they don't have to open the item to find out. It's
 * computed from the same signals the agentic pipeline already produced (recall
 * match, expiry date, read confidence, legibility), so seeded demo items and
 * freshly-scanned items get an identical, consistent verdict.
 *
 *   discard — a hard reason not to shelve it: active recall, or past its date.
 *   review  — the AI isn't sure (low confidence or an unreadable label); a human
 *             should look before it goes out. Never a guess.
 *   keep    — nothing blocking; the AI would shelve it. The volunteer still must
 *             click "Clear to shelf" — keep ≠ "safe to eat."
 */
export type Verdict = "keep" | "discard" | "review";

export interface Recommendation {
  verdict: Verdict;
  /** One short line a volunteer reads at a glance. */
  reason: string;
  /** The deciding signals, shown in the detail sheet as the "why". */
  factors: string[];
  /** Short verb shown on the tag: "Keep" / "Discard" / "Review". */
  label: string;
}

/** Confidence floor below which we ask a human rather than recommend keeping. */
const CONFIDENCE_FLOOR = 0.7;

/** Compute the AI recommendation for a row. Pure — same input, same output. */
export function recommendFor(row: InventoryRow, today: Date = new Date()): Recommendation {
  const d = parseDetail(row);
  const factors: string[] = [];

  // 1) Active recall — the hardest stop. (possible_match also discards: an
  //    unverified recall is never shelved.)
  if (isRecalled(row)) {
    const cls = d.recall_class ? ` (${d.recall_class})` : "";
    return {
      verdict: "discard",
      label: "Discard",
      reason: `Matches an active federal recall${cls} — do not shelve.`,
      factors: [
        `Lot/product matched a recall in ${d.recall_citations?.[0]?.source ?? "FDA/USDA"} data`,
        d.recall_explanation || d.recall_citations?.[0]?.quoted_text || "Flagged by the recall check.",
      ].filter(Boolean),
    };
  }

  // 2) Past its printed date.
  if (isExpired(row, today)) {
    return {
      verdict: "discard",
      label: "Discard",
      reason: `Past its date (${row.expiry_date}) — do not shelve.`,
      factors: [`Best/use-by date ${row.expiry_date} is in the past.`],
    };
  }

  // 3) The AI isn't confident enough to vouch for the reading — or the pipeline
  //    itself routed the item for human review (e.g. an allergen tag it wants a
  //    person to confirm). Respect that routing so the tag never contradicts the
  //    pipeline's own decision.
  const legibility = (d.legibility_notes || "").trim();
  if (legibility.length > 0) factors.push(`Label hard to read: ${legibility}`);
  if (row.confidence < CONFIDENCE_FLOOR) {
    factors.push(`Read confidence ${Math.round(row.confidence * 100)}% is below ${Math.round(CONFIDENCE_FLOOR * 100)}%.`);
  }
  const pipelineWantsReview = row.cleared === 0 && (row.routing === "flag" || row.routing === "escalate");
  if (pipelineWantsReview && factors.length === 0) {
    const allergenCount = (d.allergens ?? []).length;
    factors.push(
      allergenCount > 0
        ? "Flagged for a volunteer to confirm the allergen tags before shelving."
        : "Flagged by the pipeline for a volunteer to review before shelving.",
    );
  }
  if (factors.length > 0) {
    return {
      verdict: "review",
      label: "Review",
      reason: "The AI wasn't sure — a volunteer should check before shelving.",
      factors,
    };
  }

  // 4) Nothing blocking — the AI would shelve it (a human still confirms).
  const allergens = d.allergens ?? [];
  return {
    verdict: "keep",
    label: "Keep",
    reason:
      allergens.length > 0
        ? "No recall, in-date, label read clearly. Note the allergens below."
        : "No recall, in-date, and the label read clearly.",
    factors: [
      "No recall match found in the data we have.",
      row.expiry_date ? `In-date (best by ${row.expiry_date}).` : "No date issue found.",
      `Label read with ${Math.round(row.confidence * 100)}% confidence.`,
    ],
  };
}
