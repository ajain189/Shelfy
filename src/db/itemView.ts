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

/** Comma-wrapped tag string (", a, b, ") → ["a", "b"]. */
export const unwrapTags = (s: string): string[] =>
  s.replace(/^, |, $/g, "").split(", ").filter(Boolean);

/** True when this item is under an active federal recall (the one loud case). */
export const isRecalled = (row: InventoryRow): boolean =>
  row.recall_state === "confirmed_match" || row.recall_state === "possible_match";

/**
 * Is the printed best/use-by date in the past? Only decides when the date is a
 * real ISO date; a missing/unparseable date is "no date" (handled elsewhere by
 * lowering confidence). Compares on the calendar day, an item expiring "today"
 * is still fine.
 */
export function isExpired(row: InventoryRow, today: Date = new Date()): boolean {
  const iso = (row.expiry_date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date < t;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Turn an ISO date ("2028-01-01") into a friendly "Jan 1, 2028". Anything that
 * isn't a clean ISO date (e.g. raw label text) is returned unchanged, so we
 * never show a normal person a techy "2028-01-01".
 */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || "").trim());
  if (!m) return iso;
  const monthIndex = parseInt(m[2], 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return iso;
  return `${MONTHS[monthIndex]} ${parseInt(m[3], 10)}, ${m[1]}`;
}

/** Human label for an allergen/dietary enum value. */
export const prettyTag = (s: string): string =>
  s.replace(/_claim$/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * ONE state per item for the cards, the workflow status and the AI verdict
 * merged into a single colored dot + short phrase, so a card never shows two
 * competing signals. Calm shows one thing at a time; so do we. The full AI
 * reasoning still lives in the detail sheet for anyone who taps in.
 *
 *   danger (red), active federal recall: the one loud case.
 *   caution (amber), needs a volunteer's review before it can go out.
 *   safe (green), on the shelf, or read clean and ready to be cleared.
 */
export type ItemState = "danger" | "caution" | "safe";

export function itemState(row: InventoryRow): { state: ItemState; phrase: string } {
  if (isRecalled(row)) return { state: "danger", phrase: "Recalled, remove" };
  // Past-date items never read green, even if a volunteer already shelved one.
  // This keeps the card's state in step with the AI's "discard (expired)" call.
  if (isExpired(row)) return { state: "danger", phrase: "Past date, remove" };
  if (row.cleared === 1) return { state: "safe", phrase: "On the shelf" };
  const needsReview = row.routing === "flag" || row.routing === "escalate";
  if (needsReview) return { state: "caution", phrase: "Needs a check" };
  return { state: "safe", phrase: "Ready for the shelf" };
}

/**
 * A Feather icon for a food category, so an item with no photo still reads
 * visually (a soft icon tile, never a gray broken-image box). Falls back to a
 * generic package icon for anything unmapped.
 */
export function categoryIcon(category?: string): string {
  const c = (category || "").toLowerCase();
  if (c.includes("pasta") || c.includes("grain") || c.includes("cereal") || c.includes("rice")) return "align-justify";
  if (c.includes("can")) return "archive";
  if (c.includes("dairy") || c.includes("milk")) return "droplet";
  if (c.includes("spread") || c.includes("sauce")) return "circle";
  if (c.includes("fruit") || c.includes("veg")) return "feather";
  if (c.includes("snack")) return "grid";
  if (c.includes("baby")) return "smile";
  if (c.includes("protein") || c.includes("meat") || c.includes("fish")) return "anchor";
  if (c.includes("box") || c.includes("meal")) return "box";
  return "package";
}

/** Plain-English "Contains X, Y" line for a card, no chips, no raw enums. */
export function allergenLine(allergens: string[]): string {
  if (allergens.length === 0) return "";
  return `Contains ${allergens.map(prettyTag).join(", ")}`;
}

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
 * Whether we can TRUST the absence of an allergen on this item, i.e. the AI
 * read the label well enough to assert "this allergen is not present."
 *
 * Absence of an allergen tag is NOT the same as confirmed-absent: the model is
 * told to leave allergens out when it's unsure, so a missed/illegible reading
 * also looks "absent." We only treat absence as a real "free from" signal when
 * the reading is high-confidence, had no legibility problems, and actually saw
 * an ingredient list. Otherwise the item is excluded from "free from" results
 * (fail safe, never falsely promise an allergen isn't there).
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
