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
 * time from a gitignored .env — see app.config.ts) and the SDK runs in-app so
 * Expo Go can call Gemini directly. Production would proxy through a backend so
 * the key never ships to a device.
 *
 * STRUCTURED OUTPUT: Gemini returns JSON when given
 *   config.responseMimeType = "application/json"
 *   config.responseSchema   = <Gemini Schema>
 * The model's text is the JSON string; we parse + normalize it.
 */

export const MODEL = "gemini-2.5-pro";

const SYSTEM_PROMPT = `You are ShelfSight's intake reader for a food bank. A volunteer photographs a donated food item; you read the label and return a single structured record.

Rules:
- Transcribe what the label actually shows. Do not infer, complete, or invent text that is not visible.
- List an allergen ONLY when the ingredients or an allergen statement on the label support it, and record the supporting words in allergen_basis. When in doubt, leave it out and note the uncertainty in legibility_notes — a human will review.
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
  return vals.filter((v): v is T => typeof v === "string" && set.has(v));
};

/** Coerce/validate the model JSON into a clean IntakeExtraction. */
const normalize = (obj: Record<string, unknown>): IntakeExtraction => ({
  brand: String(obj.brand ?? ""),
  product_name: String(obj.product_name ?? ""),
  ingredients_text: String(obj.ingredients_text ?? ""),
  allergens: filterEnum<Allergen>(obj.allergens, ALLERGEN_ENUM),
  allergen_basis: String(obj.allergen_basis ?? ""),
  dietary_tags: filterEnum<DietaryTag>(obj.dietary_tags, DIETARY_TAG_ENUM),
  expiry_date: String(obj.expiry_date ?? ""),
  expiry_text_raw: String(obj.expiry_text_raw ?? ""),
  lot_code: String(obj.lot_code ?? ""),
  confidence: clampConfidence(Number(obj.confidence)),
  legibility_notes: String(obj.legibility_notes ?? ""),
});

/**
 * CALL 1 — vision intake. Sends a downscaled JPEG (base64) and gets back a
 * schema-validated extraction object plus token usage.
 *
 * @param base64Jpeg base64-encoded JPEG bytes (no data: prefix)
 */
export async function runIntake(base64Jpeg: string): Promise<IntakeResult> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    throw new Error(
      "No Gemini API key set. Add one in the Settings tab (free key at aistudio.google.com/apikey).",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Jpeg } },
          { text: USER_PROMPT },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: INTAKE_SCHEMA,
    },
  });

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
