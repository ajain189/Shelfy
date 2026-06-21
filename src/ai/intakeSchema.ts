/**
 * The AI ↔ app contract for Call 1 (vision intake).
 *
 * Gemini reads a label photo and returns a single schema-validated object.
 * This file defines that schema (in Gemini's `Schema` dialect) plus the
 * TypeScript type.
 *
 * GEMINI SCHEMA DIALECT NOTES (differs from plain JSON Schema):
 *   - `type` is the `Type` enum (Type.STRING, Type.ARRAY, …), not "string".
 *   - To restrict to a fixed set, set `format: "enum"` AND list the values in
 *     `enum`, Gemini requires both.
 *   - `propertyOrdering` controls field order in the output (we list every
 *     property so the model emits them deterministically).
 *   - There is NO `additionalProperties` keyword, `required` + a closed
 *     `properties` set is how we constrain the object.
 *   - No numeric bounds keyword we rely on → `confidence` is clamped 0..1 in
 *     CODE, not in the schema.
 *
 * DESIGN INTENT:
 *   - `allergens` is a CONTROLLED enum (the FDA "big 9"). Free text would be
 *     unsafe and unqueryable.
 *   - `dietary_tags` use a `_claim` suffix on purpose: the app reports what the
 *     LABEL CLAIMS, it never certifies. This is the Responsible-AI stance made
 *     literal in the data model.
 *   - `allergen_basis` + `legibility_notes` are grounding evidence and drive
 *     human escalation.
 */

import { Type, type Schema } from "@google/genai";

/** FDA "big 9" major allergens. The only values `allergens[]` may contain. */
export const ALLERGEN_ENUM = [
  "milk",
  "egg",
  "fish",
  "shellfish",
  "tree_nuts",
  "peanuts",
  "wheat",
  "soybeans",
  "sesame",
] as const;
export type Allergen = (typeof ALLERGEN_ENUM)[number];

/** Dietary claims a label may make. `_claim` = "the label says", not "we certify". */
export const DIETARY_TAG_ENUM = [
  "halal_claim",
  "kosher_claim",
  "vegan_claim",
  "vegetarian_claim",
  "gluten_free_claim",
  "low_sugar_claim",
  "no_sugar_added_claim",
  "low_sodium_claim",
  "organic_claim",
] as const;
export type DietaryTag = (typeof DIETARY_TAG_ENUM)[number];

/** The validated object Call 1 returns. */
export interface IntakeExtraction {
  brand: string;
  product_name: string;
  /** Verbatim OCR of the ingredient list ("" if none visible). */
  ingredients_text: string;
  allergens: Allergen[];
  /** Which ingredient words triggered each allergen, grounding evidence. */
  allergen_basis: string;
  dietary_tags: DietaryTag[];
  /** ISO date (YYYY-MM-DD), or "" if no legible date. */
  expiry_date: string;
  /** Verbatim printed date text, however it appeared. */
  expiry_text_raw: string;
  /** Lot/batch code if visible ("" otherwise), used for recall matching. */
  lot_code: string;
  /** Model's self-rated extraction confidence, 0..1. Validated in code. */
  confidence: number;
  /** What was blurry, occluded, or unreadable, drives escalation. */
  legibility_notes: string;
}

/** Field order for deterministic output (must list every property). */
const INTAKE_FIELD_ORDER = [
  "brand",
  "product_name",
  "ingredients_text",
  "allergens",
  "allergen_basis",
  "dietary_tags",
  "expiry_date",
  "expiry_text_raw",
  "lot_code",
  "confidence",
  "legibility_notes",
] as const;

/**
 * The Gemini `Schema` passed to `config.responseSchema`. Kept in lockstep with
 * `IntakeExtraction` above.
 */
export const INTAKE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    brand: { type: Type.STRING, description: "Brand/manufacturer name, or empty string if not visible." },
    product_name: { type: Type.STRING, description: "Product name, or empty string if not visible." },
    ingredients_text: {
      type: Type.STRING,
      description: "Verbatim transcription of the ingredient list. Empty string if no ingredient list is visible.",
    },
    allergens: {
      type: Type.ARRAY,
      items: { type: Type.STRING, format: "enum", enum: [...ALLERGEN_ENUM] },
      description:
        "Major allergens present, drawn ONLY from the controlled list. Include an allergen only if the ingredients or an allergen statement on the label indicate it. Do not guess.",
    },
    allergen_basis: {
      type: Type.STRING,
      description:
        "Brief grounding: which ingredient words or label statements justify each listed allergen (e.g. 'peanuts: contains peanut oil; milk: contains whey'). Empty string if none.",
    },
    dietary_tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING, format: "enum", enum: [...DIETARY_TAG_ENUM] },
      description:
        "Dietary claims the LABEL makes, drawn ONLY from the controlled list. Include a tag only if the label explicitly makes that claim. These describe what the label says, not a certification.",
    },
    expiry_date: {
      type: Type.STRING,
      description: "Best/use-by/expiration date as YYYY-MM-DD. Empty string if no legible date.",
    },
    expiry_text_raw: {
      type: Type.STRING,
      description: "The date exactly as printed (e.g. 'BEST BY 09 2026'). Empty string if none.",
    },
    lot_code: {
      type: Type.STRING,
      description: "Lot/batch code if visible, verbatim. Empty string if none.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Your confidence that this extraction is accurate, from 0.0 (guessing) to 1.0 (certain).",
    },
    legibility_notes: {
      type: Type.STRING,
      description:
        "What on the label was blurry, cut off, glare-obscured, or unreadable. Empty string if the label was fully legible. Be specific, this decides whether a human reviews the item.",
    },
  },
  propertyOrdering: [...INTAKE_FIELD_ORDER],
  required: [...INTAKE_FIELD_ORDER],
};

/** Clamp a model-supplied confidence into 0..1 (schema can't enforce bounds). */
export const clampConfidence = (c: number): number =>
  Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0;
