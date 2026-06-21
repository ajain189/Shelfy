/**
 * Bundled cached snapshot of a few real-style openFDA food-enforcement records.
 *
 * WHY THIS EXISTS: a food bank's wifi is unreliable ("works when the church-
 * basement wifi doesn't"). When the live openFDA call times out or fails, the
 * recall service falls back to this snapshot so the safety check still runs,
 * degraded, but never silently skipped. The service logs which path ran (live vs
 * cached) and surfaces it, because a system that knows its own degraded state is
 * itself a Responsible-AI signal.
 *
 * These mirror the shape openFDA returns (api.fda.gov/food/enforcement.json).
 * They are a tiny illustrative subset, not the full database.
 */

export interface RecallRecord {
  recall_number: string;
  recalling_firm: string;
  product_description: string;
  reason_for_recall: string;
  classification: string; // "Class I" | "Class II" | "Class III"
  status: string; // "Ongoing" | "Completed" | "Terminated"
  distribution_pattern?: string;
  report_date?: string;
}

export const RECALL_SNAPSHOT: RecallRecord[] = [
  {
    recall_number: "F-0859-2022",
    recalling_firm: "The J.M. Smucker Co.",
    product_description: "Jif Creamy Peanut Butter, 40 oz jar",
    reason_for_recall:
      "Product may be contaminated with Salmonella. Recalled lot codes have the first seven digits 1274425 through 2140425 ending in 425.",
    classification: "Class I",
    status: "Ongoing",
    distribution_pattern: "Nationwide (US)",
    report_date: "20220520",
  },
  {
    recall_number: "F-0421-2022",
    recalling_firm: "Abbott Nutrition",
    product_description: "Similac Advance powdered infant formula",
    reason_for_recall:
      "Powdered infant formula recalled due to potential Cronobacter sakazakii contamination. Check lot codes against the recall notice.",
    classification: "Class II",
    status: "Ongoing",
    distribution_pattern: "Nationwide (US)",
    report_date: "20220217",
  },
  {
    recall_number: "F-1180-2024",
    recalling_firm: "Gills Onions",
    product_description: "Diced yellow onions, fresh-cut",
    reason_for_recall:
      "Recalled due to potential Listeria monocytogenes contamination identified in routine testing.",
    classification: "Class I",
    status: "Ongoing",
    distribution_pattern: "CA, AZ, NV",
    report_date: "20241101",
  },
];
