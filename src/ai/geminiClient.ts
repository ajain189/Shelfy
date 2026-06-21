import { GoogleGenAI } from "@google/genai";

import {
  INTAKE_SCHEMA,
  IntakeExtraction,
  clampConfidence,
  ALLERGEN_ENUM,
  DIETARY_TAG_ENUM,
  type Allergen,
  type DietaryTag,
} from "./intakeSchema";
import { loadApiKey } from "./apiKeyStore";

/**
 * The Gemini client and Call 1 (vision intake).
 *
 * KEY HANDLING (demo): the key is read from `expo-constants` (injected at bundle
 * time from a gitignored .env, see app.config.ts) and the SDK runs in-app so
 * Expo Go can call Gemini directly. Production would proxy through a backend so
 * the key never ships to a device.
 *
 * STRUCTURED OUTPUT: Gemini returns JSON when given
 *   config.responseMimeType = "application/json"
 *   config.responseSchema   = <Gemini Schema>
 * The model's text is the JSON string; we parse + normalize it.
 */

// gemini-2.5-flash has a real free tier (10 RPM / ~250 RPD); gemini-2.5-pro's
// free tier is now 0, so a free key returns 429 RESOURCE_EXHAUSTED on Pro.
// Flash is plenty for label OCR + structured extraction.
export const MODEL = "gemini-2.5-flash";

/** Turn a raw Gemini API error into a short, human-readable message. */
function friendlyApiError(e: any): string {
  const msg = String(e?.message ?? e ?? "");
  // Pull a retry-after hint if present ("Please retry in 39.5s").
  const retry = msg.match(/retry in ([\d.]+)s/i)?.[1];

  if (/RESOURCE_EXHAUSTED|"?code"?:\s*429|quota/i.test(msg)) {
    const wait = retry ? ` Try again in about ${Math.ceil(Number(retry))} seconds.` : "";
    return `Gemini's free limit was hit for now.${wait} The free tier allows a few scans per minute, wait a moment and try again.`;
  }
  if (/API key not valid|API_KEY_INVALID|"?code"?:\s*400.*key/i.test(msg)) {
    return "That Gemini API key isn't valid. Check it in the Settings tab (get a free key at aistudio.google.com/apikey).";
  }
  if (/PERMISSION_DENIED|"?code"?:\s*403/i.test(msg)) {
    return "Gemini denied the request. Make sure the Generative Language API is enabled for your key's project.";
  }
  if (/fetch|network|timeout|ENOTFOUND|Failed to fetch/i.test(msg)) {
    return "Couldn't reach Gemini. Check your internet connection and try again.";
  }
  // Fallback: a trimmed version, not the giant raw JSON blob.
  return `Couldn't read the label: ${msg.slice(0, 140)}`;
}

const SYSTEM_PROMPT = `You are Shelfy's intake reader for a food bank. A volunteer photographs a donated food item; you read the label and return a single structured record.

Rules:
- Transcribe what the label actually shows. Do not infer, complete, or invent text that is not visible.
- List an allergen ONLY when the ingredients or an allergen statement on the label support it, and record the supporting words in allergen_basis. When in doubt, leave it out and note the uncertainty in legibility_notes, a human will review.
- Dietary tags describe what the LABEL CLAIMS (hence the _claim suffix). Only include a tag if the label explicitly makes that claim.
- Be honest about legibility. If the date, ingredients, or brand are blurry, cut off, or obscured, say so specifically in legibility_notes and lower your confidence. Honest uncertainty routes the item to a human; a confident wrong reading could harm someone.
- You never decide whether a food is safe to eat. You report what the label shows.`;

const USER_PROMPT = `Read this food-donation label and return the structured record. Transcribe ingredients verbatim, identify allergens only from the controlled list with their basis, capture any date and lot code, and be specific in legibility_notes about anything you could not read clearly.`;

export interface IntakeResult {
  extraction: IntakeExtraction;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  raw: string;
}

/** Keep only values that belong to the controlled enum (defends against drift). */
const filterEnum = <T extends string>(vals: unknown, allowed: readonly T[]): T[] => {
  if (!Array.isArray(vals)) return [];
  const set = new Set<string>(allowed);
  // De-dupe too, the model occasionally repeats an allergen.
  const seen = new Set<string>();
  return vals.filter((v): v is T => {
    if (typeof v !== "string" || !set.has(v) || seen.has(v)) return false;
    seen.add(v);
    return true;
  });
};

/** Trim, collapse runs of whitespace, and drop empty placeholders the model emits. */
const cleanText = (v: unknown): string => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  // The model sometimes fills unknowns with literal "N/A"/"none"/"unknown",
  // those aren't data, so normalize them to empty so the UI shows the right
  // "not on label" state instead of the word "N/A".
  if (/^(n\/?a|none|unknown|not visible|not legible|--?)$/i.test(s)) return "";
  return s;
};

/** A printed date is only stored in expiry_date if it's a real ISO date. */
const cleanIsoDate = (v: unknown): string => {
  const s = cleanText(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

/**
 * Coerce/validate the model JSON into a clean IntakeExtraction. This is the
 * "format everything that goes in" gate: every field is trimmed, enums are
 * filtered to the controlled lists, dates are validated, and junk placeholders
 * are dropped, so the inventory never stores raw model noise.
 */
const normalize = (obj: Record<string, unknown>): IntakeExtraction => ({
  brand: cleanText(obj.brand),
  product_name: cleanText(obj.product_name),
  ingredients_text: cleanText(obj.ingredients_text),
  allergens: filterEnum<Allergen>(obj.allergens, ALLERGEN_ENUM),
  allergen_basis: cleanText(obj.allergen_basis),
  dietary_tags: filterEnum<DietaryTag>(obj.dietary_tags, DIETARY_TAG_ENUM),
  expiry_date: cleanIsoDate(obj.expiry_date),
  expiry_text_raw: cleanText(obj.expiry_text_raw),
  lot_code: cleanText(obj.lot_code),
  confidence: clampConfidence(Number(obj.confidence)),
  legibility_notes: cleanText(obj.legibility_notes),
});

/**
 * CALL 1, vision intake. Sends one or more downscaled JPEGs (base64) of the
 * SAME item and gets back a single schema-validated record. Multiple photos let
 * the volunteer capture different faces (front, ingredients panel, date/lot
 * code), useful for big or curved labels that won't fit one shot. Gemini reads
 * across all of them to build one combined reading.
 *
 * @param base64Jpegs one or more base64-encoded JPEGs (no data: prefix)
 */
export async function runIntake(base64Jpegs: string | string[]): Promise<IntakeResult> {
  const images = Array.isArray(base64Jpegs) ? base64Jpegs : [base64Jpegs];
  if (images.length === 0) {
    throw new Error("No photo to analyze. Take or choose at least one photo of the item.");
  }

  const apiKey = await loadApiKey();
  if (!apiKey) {
    throw new Error(
      "No Gemini API key set. Add one in the Settings tab (free key at aistudio.google.com/apikey).",
    );
  }

  const userText =
    images.length > 1
      ? `${USER_PROMPT}\n\nThese ${images.length} photos are all of the SAME item (e.g. different sides, or sections of a large or curved label). Combine what you can read across ALL of them into one record.`
      : USER_PROMPT;

  const ai = new GoogleGenAI({ apiKey });
  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            ...images.map((data) => ({ inlineData: { mimeType: "image/jpeg", data } })),
            { text: userText },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: INTAKE_SCHEMA,
      },
    });
  } catch (e: any) {
    throw new Error(friendlyApiError(e));
  }

  const raw = response.text ?? "";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const finishReason = response.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(
      `Model did not return valid JSON. finishReason=${finishReason}. First 200 chars: ${raw.slice(0, 200)}`,
    );
  }

  return {
    extraction: normalize(parsed),
    usage: {
      input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    },
    raw,
  };
}

// --- Smart filter: plain-language "who is this food for" -> pantry filters ---

const DIET_FILTER_KEYS = [
  "vegan_claim",
  "vegetarian_claim",
  "gluten_free_claim",
  "halal_claim",
  "kosher_claim",
] as const;

const ALLERGEN_FILTER_KEYS = [
  "peanuts",
  "tree_nuts",
  "milk",
  "egg",
  "wheat",
  "soybeans",
  "fish",
  "shellfish",
  "sesame",
] as const;

const FOOD_NEEDS_SCHEMA = {
  type: "OBJECT",
  properties: {
    dietary: { type: "ARRAY", items: { type: "STRING", enum: [...DIET_FILTER_KEYS] } },
    avoid_allergens: { type: "ARRAY", items: { type: "STRING", enum: [...ALLERGEN_FILTER_KEYS] } },
    note: { type: "STRING" },
  },
  required: ["dietary", "avoid_allergens", "note"],
} as const;

const FOOD_NEEDS_PROMPT = `You help a food-pantry visitor narrow the shelf by describing who the food is for. Convert their plain words into pantry filters.
- dietary: diets the food MUST match, ONLY from the allowed list.
- avoid_allergens: allergens the food must NOT contain, ONLY from the allowed list.
- note: ONE short, warm sentence saying what you filtered for. If they mention something you cannot filter (e.g. diabetic, low sugar, low sodium, calories), say plainly that you can't filter by that yet and that they should check the label. Never invent a filter that isn't in the lists.
Allowed diets: vegan_claim, vegetarian_claim, gluten_free_claim, halal_claim, kosher_claim.
Allowed allergens: peanuts, tree_nuts, milk, egg, wheat, soybeans, fish, shellfish, sesame.
Examples: "allergic to peanuts and dairy" -> avoid ["peanuts","milk"]. "he's Muslim and vegetarian" -> dietary ["halal_claim","vegetarian_claim"]. "the person is diabetic" -> empty filters, note that you can't filter by sugar yet.`;

export interface FoodNeeds {
  dietary: string[];
  avoidAllergens: string[];
  note: string;
}

/**
 * Read a plain-language (typed or dictated) description of who needs food and
 * return the pantry filters to apply. Honest by design: anything outside the
 * allowed lists (e.g. "diabetic") is NOT guessed, it's explained in `note`.
 */
export async function parseFoodNeeds(text: string): Promise<FoodNeeds> {
  const trimmed = text.trim();
  if (!trimmed) return { dietary: [], avoidAllergens: [], note: "" };

  const apiKey = await loadApiKey();
  if (!apiKey) {
    throw new Error(
      "Turn on label reading in the Settings tab first (free key at aistudio.google.com/apikey).",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: `Who the food is for: ${trimmed}` }] }],
      config: {
        systemInstruction: FOOD_NEEDS_PROMPT,
        responseMimeType: "application/json",
        responseSchema: FOOD_NEEDS_SCHEMA,
      },
    });
  } catch (e: any) {
    throw new Error(friendlyApiError(e));
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(response.text ?? "{}");
  } catch {
    throw new Error("Couldn't understand that. Try describing the person again in a few words.");
  }

  return {
    dietary: filterEnum<string>(parsed.dietary, DIET_FILTER_KEYS),
    avoidAllergens: filterEnum<string>(parsed.avoid_allergens, ALLERGEN_FILTER_KEYS),
    note: cleanText(parsed.note),
  };
}
