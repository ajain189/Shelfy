import {
  countItems,
  insertSeedRow,
  type SeedRow,
  type RecallState,
  type Routing,
} from "./inventory";
import type { Allergen, DietaryTag } from "../ai/intakeSchema";

/**
 * Seamless realistic demo inventory for a small food pantry (~3 weeks of mock
 * intake). Seeded silently on first launch so every screen looks like a real
 * pantry immediately. No real or private pantry data is used.
 *
 * The mix is deliberately seeded to demonstrate the safety logic:
 *   - most items: cleared and on the shelf
 *   - 1 peanut-allergen flag awaiting review
 *   - 1 item matching a real-style FDA recall (never auto-cleared)
 *   - 1 low-confidence / illegible escalation
 */

interface SeedSpec {
  brand: string;
  product: string;
  category: string;
  allergens: Allergen[];
  dietary: DietaryTag[];
  ingredients: string;
  expiry: string; // YYYY-MM-DD or ""
  lot: string;
  confidence: number;
  recall_state: RecallState;
  routing: Routing;
  cleared: boolean;
  // optional fields for richer detail views
  allergen_basis?: string;
  legibility_notes?: string;
  plain_language_summary?: string;
  recall_reason?: string; // present when recall_state != "clear"
  recall_source?: "openFDA" | "FSIS";
  recall_id?: string;
  recall_class?: "Class I" | "Class II" | "Class III";
  recall_explanation?: string; // full plain-language explanation for the red banner
}

const SEED: SeedSpec[] = [
  // --- Cleared, on the shelf (the bulk of the pantry) ---
  {
    brand: "Bush's Best",
    product: "Black Beans (15 oz)",
    category: "Canned goods",
    allergens: [],
    dietary: ["vegan_claim", "gluten_free_claim"],
    ingredients: "Prepared black beans, water, salt.",
    expiry: "2027-03-01",
    lot: "BB7421",
    confidence: 0.97,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    plain_language_summary:
      "Canned black beans. No major allergens in the ingredients. Label states vegan and gluten-free.",
  },
  {
    brand: "Barilla",
    product: "Penne Pasta (16 oz)",
    category: "Dry pasta",
    allergens: ["wheat"],
    dietary: ["vegan_claim"],
    ingredients: "Semolina (wheat), durum wheat flour.",
    expiry: "2027-09-01",
    lot: "L3290A",
    confidence: 0.98,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    allergen_basis: "wheat: semolina (wheat), durum wheat flour",
    plain_language_summary:
      "Dry penne pasta. Contains wheat. Label states vegan (no egg).",
  },
  {
    brand: "Quaker",
    product: "Old Fashioned Oats (18 oz)",
    category: "Cereal & grains",
    allergens: [],
    dietary: ["vegan_claim"],
    ingredients: "100% whole grain rolled oats.",
    expiry: "2026-12-01",
    lot: "Q1180",
    confidence: 0.95,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    plain_language_summary:
      "Rolled oats. No major allergens listed. (Oats can carry gluten from processing — label makes no gluten-free claim.)",
  },
  {
    brand: "Chicken of the Sea",
    product: "Chunk Light Tuna in Water (5 oz)",
    category: "Canned protein",
    allergens: ["fish"],
    dietary: [],
    ingredients: "Light tuna, water, vegetable broth, salt.",
    expiry: "2028-01-01",
    lot: "CT5519",
    confidence: 0.96,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    allergen_basis: "fish: light tuna",
    plain_language_summary: "Canned tuna in water. Contains fish.",
  },
  {
    brand: "Skippy",
    product: "Creamy Peanut Butter (16 oz)",
    category: "Spreads",
    allergens: ["peanuts"],
    dietary: ["gluten_free_claim"],
    ingredients: "Roasted peanuts, sugar, palm oil, salt.",
    expiry: "2027-05-01",
    lot: "SK2207",
    confidence: 0.97,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    allergen_basis: "peanuts: roasted peanuts",
    plain_language_summary:
      "Creamy peanut butter. Contains PEANUTS. Keep away from anyone with a peanut allergy.",
  },
  {
    brand: "Campbell's",
    product: "Tomato Soup (10.75 oz)",
    category: "Canned goods",
    allergens: ["wheat"],
    dietary: [],
    ingredients: "Tomato puree, water, wheat flour, salt, natural flavoring.",
    expiry: "2027-02-01",
    lot: "CB1075",
    confidence: 0.94,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    allergen_basis: "wheat: wheat flour",
    plain_language_summary: "Condensed tomato soup. Contains wheat.",
  },
  {
    brand: "Uncle Ben's",
    product: "Original Long Grain Rice (32 oz)",
    category: "Cereal & grains",
    allergens: [],
    dietary: ["vegan_claim", "gluten_free_claim"],
    ingredients: "Parboiled long grain rice.",
    expiry: "2028-06-01",
    lot: "UB3201",
    confidence: 0.96,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    plain_language_summary: "Long grain white rice. No major allergens.",
  },
  {
    brand: "Goya",
    product: "Chickpeas / Garbanzos (15.5 oz)",
    category: "Canned goods",
    allergens: [],
    dietary: ["vegan_claim", "gluten_free_claim"],
    ingredients: "Chickpeas, water, salt, calcium chloride, EDTA.",
    expiry: "2027-08-01",
    lot: "GY1555",
    confidence: 0.95,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    plain_language_summary: "Canned chickpeas. No major allergens.",
  },
  {
    brand: "Kellogg's",
    product: "Corn Flakes (12 oz)",
    category: "Cereal & grains",
    allergens: [],
    dietary: [],
    ingredients: "Milled corn, sugar, malt flavor, salt.",
    expiry: "2026-11-01",
    lot: "KF1200",
    confidence: 0.9,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    plain_language_summary:
      "Corn flakes cereal. No major allergens in the listed ingredients.",
  },
  {
    brand: "Hunt's",
    product: "Diced Tomatoes (14.5 oz)",
    category: "Canned goods",
    allergens: [],
    dietary: ["vegan_claim", "gluten_free_claim"],
    ingredients: "Tomatoes, tomato juice, calcium chloride, citric acid.",
    expiry: "2027-04-01",
    lot: "HT1450",
    confidence: 0.96,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    plain_language_summary: "Canned diced tomatoes. No major allergens.",
  },
  {
    brand: "Jif",
    product: "Squeeze Honey (12 oz)",
    category: "Spreads",
    allergens: [],
    dietary: ["gluten_free_claim"],
    ingredients: "Honey.",
    expiry: "2029-01-01",
    lot: "JH1200",
    confidence: 0.93,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    plain_language_summary: "Pure honey. No major allergens. (Not for infants under 1 year.)",
  },
  {
    brand: "Mott's",
    product: "Unsweetened Applesauce (24 oz)",
    category: "Fruit",
    allergens: [],
    dietary: ["vegan_claim", "gluten_free_claim", "no_sugar_added_claim"],
    ingredients: "Apples, water, ascorbic acid (vitamin C).",
    expiry: "2026-10-01",
    lot: "MT2400",
    confidence: 0.95,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    plain_language_summary: "Unsweetened applesauce. No major allergens. No sugar added.",
  },
  {
    brand: "Carnation",
    product: "Evaporated Milk (12 oz)",
    category: "Shelf-stable dairy",
    allergens: ["milk"],
    dietary: [],
    ingredients: "Milk, vitamin D3, carrageenan.",
    expiry: "2027-07-01",
    lot: "CN1200",
    confidence: 0.94,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    allergen_basis: "milk: milk",
    plain_language_summary: "Evaporated milk. Contains MILK.",
  },
  {
    brand: "Annie's",
    product: "Macaroni & Cheese (6 oz)",
    category: "Boxed meals",
    allergens: ["milk", "wheat"],
    dietary: [],
    ingredients: "Wheat pasta, cheddar cheese (milk), whey (milk), salt.",
    expiry: "2026-09-01",
    lot: "AN0600",
    confidence: 0.92,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    allergen_basis: "wheat: wheat pasta; milk: cheddar cheese, whey",
    plain_language_summary: "Boxed mac & cheese. Contains MILK and WHEAT.",
  },
  {
    brand: "Nature Valley",
    product: "Crunchy Granola Bars (12 ct)",
    category: "Snacks",
    allergens: ["peanuts", "soybeans"],
    dietary: [],
    ingredients:
      "Whole grain oats, sugar, canola oil, peanut butter, soy lecithin, salt.",
    expiry: "2026-08-15",
    lot: "NV1212",
    confidence: 0.91,
    recall_state: "clear",
    routing: "release",
    cleared: true,
    allergen_basis: "peanuts: peanut butter; soybeans: soy lecithin",
    plain_language_summary:
      "Granola bars. Contains PEANUTS and SOY. (Also lists wheat-containing oats; no wheat-free claim.)",
  },

  // --- 1 CONFIRMED Class I federal recall (the big-red treatment) ---
  {
    brand: "Jif",
    product: "Creamy Peanut Butter (40 oz)",
    category: "Spreads",
    allergens: ["peanuts"],
    dietary: [],
    ingredients: "Roasted peanuts, sugar, palm oil, salt.",
    expiry: "2026-10-01",
    lot: "1274425 (code 425)",
    confidence: 0.93,
    recall_state: "confirmed_match",
    routing: "escalate",
    cleared: false,
    allergen_basis: "peanuts: roasted peanuts",
    plain_language_summary:
      "Creamy peanut butter. This jar's lot code matches an active federal recall. Do NOT shelve — remove it from the pantry.",
    recall_reason: "Recalled for potential Salmonella contamination.",
    recall_explanation:
      "This jar's lot code matches an active FDA recall for possible Salmonella contamination. Salmonella can cause serious and sometimes fatal infections. This item must not be given to any family — remove it from the pantry and follow your pantry's recall-disposal procedure.",
    recall_class: "Class I",
    recall_source: "openFDA",
    recall_id: "F-0859-2022",
  },

  // --- 1 peanut-allergen flag awaiting volunteer review ---
  {
    brand: "Lance",
    product: "Toasty Peanut Butter Crackers (8 ct)",
    category: "Snacks",
    allergens: ["peanuts", "wheat", "soybeans"],
    dietary: [],
    ingredients:
      "Enriched wheat flour, peanut butter (peanuts), vegetable oil, soy lecithin, salt.",
    expiry: "2026-07-01",
    lot: "LN0800",
    confidence: 0.89,
    recall_state: "clear",
    routing: "flag",
    cleared: false,
    allergen_basis: "peanuts: peanut butter; wheat: enriched wheat flour; soybeans: soy lecithin",
    plain_language_summary:
      "Peanut butter crackers. Contains PEANUTS, WHEAT, and SOY. Flagged for a volunteer to confirm the allergen tags before shelving — a missed peanut tag is the highest-risk error.",
  },

  // --- 1 item matching a real-style FDA recall (never auto-cleared) ---
  {
    brand: "Similac",
    product: "Advance Infant Formula (12.4 oz)",
    category: "Baby food",
    allergens: ["milk", "soybeans"],
    dietary: [],
    ingredients: "Nonfat milk, lactose, soy oil, whey protein, vitamins, minerals.",
    expiry: "2026-09-01",
    lot: "K8 (lot 12345K8)",
    confidence: 0.9,
    recall_state: "possible_match",
    routing: "escalate",
    cleared: false,
    allergen_basis: "milk: nonfat milk, whey; soybeans: soy oil",
    plain_language_summary:
      "Powdered infant formula. The lot code on this can falls within a recalled range reported to the FDA. NOT cleared — escalated to a human. Do not give to a family until the lot code is verified against the recall notice.",
    recall_reason:
      "Powdered infant formula recalled over potential Cronobacter sakazakii contamination; check lot codes.",
    recall_explanation:
      "This product's lot code appears to fall within a recalled range. The FDA recalled certain lots of this powdered infant formula due to possible Cronobacter sakazakii contamination, which can cause life-threatening infections in infants. Verify the exact lot code against the official recall notice before this can leaves the pantry.",
    recall_class: "Class II",
    recall_source: "openFDA",
    recall_id: "F-0421-2022",
  },

  // --- 1 low-confidence / illegible escalation ---
  {
    brand: "(unreadable)",
    product: "Canned vegetable — label damaged",
    category: "Canned goods",
    allergens: [],
    dietary: [],
    ingredients: "",
    expiry: "",
    lot: "",
    confidence: 0.34,
    recall_state: "unknown",
    routing: "escalate",
    cleared: false,
    legibility_notes:
      "Front label torn; brand and product name not readable. No ingredient panel visible. Date and lot code missing.",
    plain_language_summary:
      "Could not read this label confidently — brand, ingredients, and date were not legible. Escalated to a human rather than guessing.",
  },
];

/** Build the IntakeExtraction-shaped record stored in raw_json for detail views. */
const toRawJson = (s: SeedSpec): string =>
  JSON.stringify({
    brand: s.brand,
    product_name: s.product,
    category: s.category,
    ingredients_text: s.ingredients,
    allergens: s.allergens,
    allergen_basis: s.allergen_basis ?? "",
    dietary_tags: s.dietary,
    expiry_date: s.expiry,
    expiry_text_raw: s.expiry,
    lot_code: s.lot,
    confidence: s.confidence,
    legibility_notes: s.legibility_notes ?? "",
    // Call-2-style fields for the detail view
    plain_language_summary: s.plain_language_summary ?? "",
    recall_state: s.recall_state,
    recall_class: s.recall_class ?? "",
    recall_explanation: s.recall_explanation ?? "",
    recall_citations:
      s.recall_reason && s.recall_source
        ? [
            {
              source: s.recall_source,
              record_id: s.recall_id ?? "",
              quoted_text: s.recall_reason,
              field: "reason_for_recall",
            },
          ]
        : [],
    routing: s.routing,
  });

const toSeedRow = (s: SeedSpec): SeedRow => ({
  brand: s.brand,
  product_name: s.product,
  allergens: s.allergens,
  dietary_tags: s.dietary,
  expiry_date: s.expiry,
  confidence: s.confidence,
  recall_state: s.recall_state,
  routing: s.routing,
  cleared: s.cleared,
  raw_json: toRawJson(s),
});

/** Seed the demo inventory only if the table is empty (silent on first launch). */
export async function seedIfEmpty(): Promise<number> {
  const existing = await countItems();
  if (existing > 0) return existing;
  for (const spec of SEED) {
    await insertSeedRow(toSeedRow(spec));
  }
  return SEED.length;
}

/** Force-reseed (Settings → reset demo data). Caller wipes first. */
export async function seedAll(): Promise<number> {
  for (const spec of SEED) {
    await insertSeedRow(toSeedRow(spec));
  }
  return SEED.length;
}
