import type { InventoryRow, RecallState, Routing } from "./inventory";

/** Parsed view of the raw_json record stored with each item. */
export interface ItemDetail {
  brand: string;
  product_name: string;
  category?: string;
  ingredients_text: string;
  allergens: string[];
  allergen_basis: string;
  dietary_tags: string[];
  expiry_date: string;
  expiry_text_raw: string;
  lot_code: string;
  confidence: number;
  legibility_notes: string;
  plain_language_summary?: string;
  recall_state?: RecallState;
  recall_class?: string;
  recall_explanation?: string;
  recall_citations?: { source: string; record_id: string; quoted_text: string; field: string }[];
  routing?: Routing;
}

export function parseDetail(row: InventoryRow): ItemDetail {
  try {
    return JSON.parse(row.raw_json) as ItemDetail;
  } catch {
    return {
      brand: row.brand,
      product_name: row.product_name,
      ingredients_text: "",
      allergens: [],
      allergen_basis: "",
      dietary_tags: [],
      expiry_date: row.expiry_date,
      expiry_text_raw: row.expiry_date,
      lot_code: "",
      confidence: row.confidence,
      legibility_notes: "",
    };
  }
}

/** Comma-wrapped tag string (",a,b,") → ["a","b"]. */
export const unwrapTags = (s: string): string[] =>
  s.replace(/^,|,$/g, "").split(",").filter(Boolean);

/** True when this item is under an active federal recall (the one loud case). */
export const isRecalled = (row: InventoryRow): boolean =>
  row.recall_state === "confirmed_match" || row.recall_state === "possible_match";

/**
 * A calm, uniform status label. Everyday statuses share ONE muted neutral
 * treatment (no rainbow of colors) — the only thing that ever shouts is an
 * active federal recall, handled separately with big red text.
 */
export type StatusKind = "recall" | "review" | "cleared" | "pending";

export function statusFor(row: InventoryRow): { kind: StatusKind; label: string } {
  if (isRecalled(row)) return { kind: "recall", label: "Federal recall" };
  if (row.cleared) return { kind: "cleared", label: "On the shelf" };
  if (row.routing === "escalate") return { kind: "review", label: "Needs review" };
  if (row.routing === "flag") return { kind: "review", label: "Pending review" };
  return { kind: "pending", label: "Awaiting clearance" };
}

/** Human label for an allergen/dietary enum value. */
export const prettyTag = (s: string): string =>
  s.replace(/_claim$/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// --- Shelf filtering (families / volunteers narrowing what's available) ---

/** Dietary claims a family can filter the shelf by (only honored if the label claims it). */
export const DIETARY_FILTERS = [
  { key: "vegan_claim", label: "Vegan" },
  { key: "vegetarian_claim", label: "Vegetarian" },
  { key: "gluten_free_claim", label: "Gluten-free" },
  { key: "halal_claim", label: "Halal" },
  { key: "kosher_claim", label: "Kosher" },
] as const;

/** Common "free from" allergen filters. */
export const ALLERGEN_FREE_FILTERS = [
  { key: "peanuts", label: "No peanuts" },
  { key: "tree_nuts", label: "No tree nuts" },
  { key: "milk", label: "No milk" },
  { key: "egg", label: "No egg" },
  { key: "wheat", label: "No wheat" },
  { key: "soybeans", label: "No soy" },
  { key: "fish", label: "No fish" },
  { key: "shellfish", label: "No shellfish" },
  { key: "sesame", label: "No sesame" },
] as const;

/** Does the item's label claim this dietary tag? */
export const hasDietary = (row: InventoryRow, tag: string): boolean =>
  unwrapTags(row.dietary_tags).includes(tag);

/** Confidence floor below which we don't trust the allergen reading. */
const ALLERGEN_TRUST_CONFIDENCE = 0.8;

/**
 * Whether we can TRUST the absence of an allergen on this item — i.e. the AI
 * read the label well enough to assert "this allergen is not present."
 *
 * Absence of an allergen tag is NOT the same as confirmed-absent: the model is
 * told to leave allergens out when it's unsure, so a missed/illegible reading
 * also looks "absent." We only treat absence as a real "free from" signal when
 * the reading is high-confidence, had no legibility problems, and actually saw
 * an ingredient list. Otherwise the item is excluded from "free from" results
 * (fail safe — never falsely promise an allergen isn't there).
 */
export function allergenDataTrustworthy(row: InventoryRow): boolean {
  const d = parseDetail(row);
  if (row.confidence < ALLERGEN_TRUST_CONFIDENCE) return false;
  if ((d.legibility_notes ?? "").trim().length > 0) return false;
  if ((d.ingredients_text ?? "").trim().length === 0) return false;
  return true;
}

/**
 * Is the item safe to show under a "free from <allergen>" filter? Requires BOTH
 * that the allergen isn't listed AND that we trust the allergen reading.
 */
export const isFreeOf = (row: InventoryRow, allergen: string): boolean =>
  allergenDataTrustworthy(row) && !unwrapTags(row.allergens).includes(allergen);
