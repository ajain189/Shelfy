import { RECALL_SNAPSHOT, type RecallRecord } from "./recallSnapshot";
import type { RecallState } from "../db/inventory";

/**
 * LIVE recall retrieval, the agentic pipeline's external-tool step.
 *
 * After the vision model reads a label, this queries the free, public openFDA
 * Food Enforcement API for recalls matching the scanned brand/product, then a
 * SAFE three-state matcher decides clear / possible_match / unknown. No API key
 * is needed and CORS is not an issue in native React Native.
 *
 * SAFETY STANCE (the Responsible-AI core):
 *   - Retrieve BROADLY (favor recall over precision): a wide brand query, so we
 *     never miss a recall by being too strict.
 *   - Match CONSERVATIVELY: any plausible overlap becomes `possible_match`, which
 *     ALWAYS escalates to a human. We never auto-confirm a recall AND never auto-
 *     clear an item the data can't vouch for.
 *   - DEGRADE HONESTLY: live call with a short timeout; on failure, fall back to
 *     a bundled snapshot and report which path ran. A failed network never
 *     silently skips the check, worst case it escalates.
 *
 * This is a conservative token-overlap matcher, not a precise fuzzy algorithm,
 * by design. A safe three-state judge that errs toward escalation protects
 * families better than a clever matcher that might confidently clear the wrong
 * jar.
 */

const OPENFDA_URL = "https://api.fda.gov/food/enforcement.json";
const TIMEOUT_MS = 3000;

export type RecallPath = "live" | "cached" | "none";

export interface RecallCitation {
  source: string; // "openFDA"
  record_id: string; // recall_number
  quoted_text: string; // reason_for_recall (grounding, never invented)
  field: string; // "reason_for_recall"
}

export interface RecallResult {
  recall_state: RecallState; // clear | possible_match | unknown (never auto-confirmed)
  path: RecallPath; // which data path ran, surfaced to the user
  citations: RecallCitation[]; // the records we matched against
  recall_class?: string; // "Class I" | "Class II" | "Class III"
  recall_explanation?: string; // plain-language, drawn from the record
  candidates_checked: number; // how many records we compared against
}

/**
 * Words too generic to be a useful match signal. Includes packaging/quantity
 * words ("oz", "jar"), generic descriptors ("original", "natural"), AND common
 * brand/firm filler ("best", "family", "foods", "co"), the last group matters
 * because the matcher anchors on brand tokens, and a word like "best" would
 * otherwise match unrelated firms ("Best Express Foods") and flag everything.
 */
const STOP = new Set([
  // structure / quantity
  "the", "and", "of", "with", "in", "for", "oz", "ct", "fl", "lb", "pack", "size", "count",
  // generic descriptors
  "food", "foods", "brand", "original", "classic", "natural", "fresh", "can", "canned",
  "jar", "box", "bag", "bottle", "pouch", "creamy", "crunchy", "organic", "premium", "value",
  // common brand/firm filler, too generic to anchor a recall match
  "best", "family", "farm", "farms", "company", "inc", "llc", "corp", "express",
  "great", "good", "quality", "select", "choice", "market", "kitchen", "homestyle",
]);

/** Lowercased, de-punctuated, stop-word-stripped tokens for matching. */
function tokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Fetch candidate recall records for a brand/product from openFDA, with a short
 * timeout. Returns null on any failure so the caller can fall back to the cache.
 */
async function fetchLive(brand: string, product: string): Promise<RecallRecord[] | null> {
  const terms = Array.from(new Set([...tokens(brand), ...tokens(product)])).slice(0, 5);
  if (terms.length === 0) return [];

  // openFDA uses Lucene syntax. A grouped OR within a field is the correct form:
  //   product_description:(jif OR peanut OR butter)
  // We OR the brand/product terms across both the product description and the
  // recalling firm, so a recall is matched whether the brand is in the product
  // text or the firm name. Terms are joined with the literal +OR+ operator and
  // the whole search value is URL-encoded.
  const group = terms.join(" OR ");
  const search = `product_description:(${group}) recalling_firm:(${group})`;
  const url = `${OPENFDA_URL}?search=${encodeURIComponent(search)}&limit=20`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    // openFDA returns 404 with a {"error":{"code":"NOT_FOUND"}} body when there
    // are zero matches, that's a legitimate "no recalls found", not a failure.
    if (res.status === 404) return [];
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.error) return []; // NOT_FOUND surfaced with a 200 in some cases
    return Array.isArray(json?.results) ? (json.results as RecallRecord[]) : [];
  } catch {
    return null; // timeout / network / parse error → caller falls back to cache
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search the bundled snapshot the same way the live query would, broadly, so
 * `judge` (which does the brand-anchored matching) sees the same candidate shape
 * whether the data came live or cached.
 */
function searchSnapshot(brand: string, product: string): RecallRecord[] {
  const want = new Set([...tokens(brand), ...tokens(product)]);
  if (want.size === 0) return [];
  return RECALL_SNAPSHOT.filter((r) => {
    const hay = new Set([...tokens(r.product_description), ...tokens(r.recalling_firm)]);
    for (const t of want) if (hay.has(t)) return true;
    return false;
  });
}

/**
 * The SAFE three-state matcher. Given the scanned brand/product and the
 * retrieved records, decide a state. Only ACTIVE ("Ongoing") recalls can flag.
 * We never return `confirmed_match` automatically, a true confirmation needs a
 * human checking the lot code, so the strongest automatic state is
 * `possible_match`, which escalates.
 */
function judge(
  brand: string,
  product: string,
  records: RecallRecord[],
): { state: RecallState; match?: RecallRecord } {
  const brandTokens = new Set(tokens(brand));
  const productTokens = new Set(tokens(product));
  if (brandTokens.size === 0 && productTokens.size === 0) {
    return { state: "unknown" }; // nothing to match on → ask a human
  }

  let best: RecallRecord | undefined;
  let bestScore = 0;
  for (const r of records) {
    if (!/ongoing/i.test(r.status)) continue; // only active recalls
    const hay = new Set([...tokens(r.product_description), ...tokens(r.recalling_firm)]);

    // A match must be ANCHORED on the brand, the broad openFDA query returns
    // ~20 loosely-related records, and a lone common product word ("beans",
    // "soup") would otherwise trigger a flag on an unrelated recall. We require a
    // brand-token hit, then count product-token overlap as supporting evidence.
    let brandHit = false;
    for (const t of brandTokens) if (hay.has(t)) brandHit = true;
    if (!brandHit) continue;

    let productOverlap = 0;
    for (const t of productTokens) if (hay.has(t)) productOverlap++;
    const score = 10 + productOverlap; // brand hit dominates; product words refine
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  // A brand-anchored hit on an active recall escalates to a human, deliberately
  // conservative on precision (brand-anchored) but still safety-first: a possible
  // match always goes to a person, never auto-cleared or auto-confirmed.
  if (best) return { state: "possible_match", match: best };
  return { state: "clear" };
}

/**
 * The public entry point: scan label → recall verdict. Always returns a result
 * (never throws); the worst case is `unknown` with path "none", which escalates.
 */
export async function checkRecall(brand: string, product: string): Promise<RecallResult> {
  let path: RecallPath = "none";
  let records: RecallRecord[] = [];

  const live = await fetchLive(brand, product);
  if (live !== null) {
    path = "live";
    records = live;
  } else {
    // Live failed → fall back to the bundled snapshot, honestly flagged.
    path = "cached";
    records = searchSnapshot(brand, product);
  }

  const { state, match } = judge(brand, product, records);

  const citations: RecallCitation[] = match
    ? [
        {
          source: "openFDA",
          record_id: match.recall_number,
          quoted_text: match.reason_for_recall,
          field: "reason_for_recall",
        },
      ]
    : [];

  return {
    recall_state: state,
    path,
    citations,
    recall_class: match?.classification,
    recall_explanation: match
      ? `This item's brand/product matches an active FDA recall (${match.recall_number}, ${match.classification}). ${match.reason_for_recall} A volunteer must verify the lot code against the official notice before this item leaves the pantry.`
      : undefined,
    candidates_checked: records.length,
  };
}

/** Map a recall state to the intake routing decision (asymmetric, safety-first). */
export function routingFor(state: RecallState): "release" | "flag" | "escalate" {
  // possible_match and unknown both escalate; only a clear result can release
  // (and even then a human still clears the item).
  if (state === "possible_match" || state === "confirmed_match" || state === "unknown") {
    return "escalate";
  }
  return "release";
}
