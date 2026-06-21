import * as SQLite from "expo-sqlite";

import type { IntakeExtraction } from "../ai/intakeSchema";

/**
 * On-device inventory (expo-sqlite).
 *
 * WHY SQLite over AsyncStorage: family pickup mode IS a filtered query
 * ("cleared items with no peanuts"). SQL expresses that directly; a blob store
 * would force loading everything and filtering in JS.
 *
 * The schema carries queryable columns (for family-mode filters and the review
 * queue) PLUS a `raw_json` column holding the full AI record, so we never have
 * to migrate when later sprints read more fields.
 *
 * Allergens/dietary tags are stored as comma-delimited strings wrapped in
 * commas (", peanuts, milk, ") so a `LIKE '%, peanuts, %'` match is exact at the
 * token level, simpler than a join table and fine at pantry scale.
 */

export type RecallState = "clear" | "possible_match" | "confirmed_match" | "unknown";
export type Routing = "release" | "flag" | "escalate";

export interface InventoryRow {
  id: number;
  brand: string;
  product_name: string;
  allergens: string; // ", peanuts, milk, " form
  dietary_tags: string; // ", vegan_claim, " form
  expiry_date: string;
  confidence: number;
  recall_state: RecallState;
  routing: Routing;
  cleared: number; // 0 until a volunteer clears it onto the shelf
  created_at: string;
  raw_json: string; // full AI record(s) for detail views
  image_uris: string; // comma-joined local file URIs of the photos taken at intake
}

/** Split the stored comma-joined image URIs into an array. "" → []. */
export const unwrapImageUris = (s: string): string[] =>
  s ? s.split(", ").filter(Boolean) : [];

/** Wrap a tag list as ", a, b, c, " for exact LIKE matching. "" → "". */
export const wrapTags = (tags: string[]): string =>
  tags.length ? `, ${tags.join(", ")}, ` : "";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDb = (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("shelfsight.db");
  }
  return dbPromise;
};

/** Create the table if needed. Safe to call on every app start. */
export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS inventory (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      brand         TEXT NOT NULL DEFAULT '',
      product_name  TEXT NOT NULL DEFAULT '',
      allergens     TEXT NOT NULL DEFAULT '',
      dietary_tags  TEXT NOT NULL DEFAULT '',
      expiry_date   TEXT NOT NULL DEFAULT '',
      confidence    REAL NOT NULL DEFAULT 0,
      recall_state  TEXT NOT NULL DEFAULT 'unknown',
      routing       TEXT NOT NULL DEFAULT 'escalate',
      cleared       INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT '',
      raw_json      TEXT NOT NULL DEFAULT '{}',
      image_uris    TEXT NOT NULL DEFAULT ''
    );
  `);
  // Migration for installs created before image_uris existed: add the column if
  // it's missing. (ADD COLUMN ... IF NOT EXISTS isn't supported in SQLite, so we
  // check the table_info and add conditionally.)
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(inventory)`);
  if (!cols.some((c) => c.name === "image_uris")) {
    await db.execAsync(`ALTER TABLE inventory ADD COLUMN image_uris TEXT NOT NULL DEFAULT ''`);
  }
}

export interface AddIntakeInput {
  extraction: IntakeExtraction;
  recall_state?: RecallState;
  routing?: Routing;
  raw_json: string;
  image_uris?: string[]; // local file URIs of the intake photos (shown on the card)
}

/**
 * Write a new intake row. In Sprint 1 there is no recall step yet, so callers
 * default recall_state to "unknown" and routing to "escalate", i.e. nothing is
 * cleared automatically; a human decides later.
 */
export async function addIntake(input: AddIntakeInput): Promise<number> {
  const db = await getDb();
  const { extraction, raw_json } = input;
  const recall_state: RecallState = input.recall_state ?? "unknown";
  const routing: Routing = input.routing ?? "escalate";

  const result = await db.runAsync(
    `INSERT INTO inventory
       (brand, product_name, allergens, dietary_tags, expiry_date, confidence,
        recall_state, routing, cleared, created_at, raw_json, image_uris)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    extraction.brand,
    extraction.product_name,
    wrapTags(extraction.allergens),
    wrapTags(extraction.dietary_tags),
    extraction.expiry_date,
    extraction.confidence,
    recall_state,
    routing,
    new Date().toISOString(),
    raw_json,
    (input.image_uris ?? []).join(", "),
  );
  return result.lastInsertRowId;
}

/** All rows, newest first (the Inventory screen, every item). */
export async function getAllItems(): Promise<InventoryRow[]> {
  const db = await getDb();
  return db.getAllAsync<InventoryRow>(`SELECT * FROM inventory ORDER BY id DESC`);
}

/**
 * Cleared items only (the Shelf screen, what's actually available to families).
 * A volunteer must have cleared each one; nothing reaches here automatically.
 */
export async function getShelfItems(): Promise<InventoryRow[]> {
  const db = await getDb();
  return db.getAllAsync<InventoryRow>(
    `SELECT * FROM inventory WHERE cleared = 1 ORDER BY product_name COLLATE NOCASE ASC`,
  );
}

/** Items awaiting a human decision (flagged/escalated and not yet cleared). */
export async function getReviewQueue(): Promise<InventoryRow[]> {
  const db = await getDb();
  return db.getAllAsync<InventoryRow>(
    `SELECT * FROM inventory
       WHERE cleared = 0 AND routing IN ('flag', 'escalate')
       ORDER BY id DESC`,
  );
}

/** One row by id (detail view). */
export async function getItem(id: number): Promise<InventoryRow | null> {
  const db = await getDb();
  return db.getFirstAsync<InventoryRow>(`SELECT * FROM inventory WHERE id = ?`, id);
}

/** Count of rows. */
export async function countItems(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM inventory`);
  return row?.n ?? 0;
}

/**
 * A volunteer clears an item onto the shelf. This is the human-in-the-loop
 * gate: only after this does an item become visible to families (Shelf screen).
 *
 * SAFETY INVARIANT (enforced in SQL, not just the UI): an item under an active
 * federal recall can NEVER be cleared, no matter which code path calls this.
 * The `WHERE` clause makes a recalled row impossible to clear even if a UI guard
 * is missed. Returns true if the item was actually cleared.
 */
export async function clearItem(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.runAsync(
    `UPDATE inventory
       SET cleared = 1
     WHERE id = ? AND recall_state NOT IN ('possible_match', 'confirmed_match')`,
    id,
  );
  return result.changes > 0;
}

/** A volunteer rejects an item, it's removed from the pantry entirely. */
export async function rejectItem(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM inventory WHERE id = ?`, id);
}

/** DEV/RESET: wipe the table (Settings → reset demo data). */
export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`DELETE FROM inventory;`);
}

/** Insert a fully-specified row (used by the demo seeder). */
export interface SeedRow {
  brand: string;
  product_name: string;
  allergens: string[];
  dietary_tags: string[];
  expiry_date: string;
  confidence: number;
  recall_state: RecallState;
  routing: Routing;
  cleared: boolean;
  raw_json: string;
}

export async function insertSeedRow(row: SeedRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO inventory
       (brand, product_name, allergens, dietary_tags, expiry_date, confidence,
        recall_state, routing, cleared, created_at, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.brand,
    row.product_name,
    wrapTags(row.allergens),
    wrapTags(row.dietary_tags),
    row.expiry_date,
    row.confidence,
    row.recall_state,
    row.routing,
    row.cleared ? 1 : 0,
    new Date().toISOString(),
    row.raw_json,
  );
}
