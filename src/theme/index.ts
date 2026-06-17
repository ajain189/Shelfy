/**
 * ShelfSight design tokens — warm editorial, not "AI teal-on-white."
 *
 * Direction: a warm-paper base, deep warm ink, and a single sophisticated clay
 * accent for chrome (buttons, the active tab, links). The accent is deliberately
 * NOT a generic SaaS teal/blue/green — green is reserved entirely for safety.
 *
 * THE SAFETY STATES ARE THE VISUAL IDENTITY. Green / amber / red / slate map to
 * safety verdicts and NOTHING decorative. The brand/chrome accent (clay) is a
 * separate hue precisely so green only ever means "safe" — never "primary
 * button." Never use a safety color as chrome, and never use clay as a status.
 */

export const colors = {
  // Surfaces — warm paper, layered
  paper: "#F4EFE6", // warm paper base
  paperDeep: "#EBE4D6", // recessed surface (search fields, chips)
  card: "#FCFAF5", // card surface, a hair off paper for depth
  ink900: "#20211D", // darkest surface (the glass tab bar tint)

  // Text — warm near-blacks
  ink: "#23241F", // primary text
  inkSoft: "#5C5C53", // secondary
  inkFaint: "#9A988C", // tertiary / captions

  // Brand / chrome accent — clay (NOT a status color)
  clay: "#B4543A", // primary buttons, active tab, emphasis
  clayDeep: "#8F3F2B", // pressed / darker
  claySoft: "#F0E0D6", // tinted fills behind clay content

  // --- Safety semantic system (meaning only, never chrome) ---
  // clear / released
  safe: "#3A7D44",
  safeBg: "#E6EFE2",
  // flag / possible match (caution)
  caution: "#B07A12",
  cautionBg: "#F4EAD4",
  // confirmed recall / expired (danger)
  danger: "#B23B2E",
  dangerBg: "#F3DFDA",
  // escalate / unknown (needs a human)
  review: "#4F5A66",
  reviewBg: "#E4E7EA",

  // Hairlines (used sparingly; shadows do most of the depth work)
  line: "#E4DCCB",
  lineStrong: "#D2C8B4",
} as const;

/**
 * Spacing scale — a strict 4pt rhythm. Use ONLY these values; no arbitrary
 * numbers. Tightened for higher information density (more fits per screen).
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12, // was 16 — tightened for density
  lg: 18, // was 24
  xl: 28, // was 32
  xxl: 44,
} as const;

/** Bottom inset so scroll content clears the floating glass tab bar. */
export const TAB_BAR_SPACE = 100;

/** Horizontal screen gutter — one value everywhere for alignment. */
export const GUTTER = 18;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 30,
  pill: 999,
} as const;

/**
 * Typography. Display font is characterful (serif), body is a clean readable
 * sans — deliberately NOT Inter/Roboto/system. Fonts are loaded at runtime via
 * the font loader; these names match the loaded family keys.
 */
export const fonts = {
  display: "FraunsesDisplay", // headers, verdicts — characterful serif
  displayItalic: "FraunsesDisplayItalic",
  body: "DMSans", // body copy — readable
  bodyMedium: "DMSansMedium",
  bodyBold: "DMSansBold",
  mono: "SpaceMono", // codes, ids, citations
} as const;

/**
 * Type scale — ONE typeface (DM Sans), hierarchy from size + weight only.
 * No serif on data UI; that clash was the main source of visual noise.
 * Sizes are deliberately small and calm. Every text element uses exactly one of
 * these tokens — no ad-hoc fontSize anywhere.
 *
 *   hero   26  large page title (collapsing-header expanded state)
 *   title  17  card/section titles, item names
 *   heading 15 sub-headings
 *   body   14  primary reading text
 *   caption 12.5 secondary text, metadata
 *   label  12  small UI labels, chips
 *   overline 10.5 letter-spaced all-caps section labels
 *   mono   12  codes / ids / token counts
 */
export const type = {
  hero: { fontFamily: fonts.bodyBold, fontSize: 25, lineHeight: 30, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16.5, lineHeight: 21, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 14.5, lineHeight: 20, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 16 },
  // Chip text (allergen / dietary tags on cards) — readable, not tiny.
  tag: { fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 16 },
  overline: { fontFamily: fonts.bodyBold, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.8 },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16 },
} as const;

/**
 * Multi-layer soft shadows (Jakub) — depth without solid borders, which adapt
 * to the warm background better than a hard 1px line. `card` for resting
 * surfaces, `raised` for pressed/active/floating elements.
 */
const SHADOW_COLOR = "#3A2C1F"; // warm shadow, not pure black

export const shadow = {
  card: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  raised: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  float: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 14,
  },
} as const;

/**
 * Motion tokens. Spring with no bounce is the production default (Jakub).
 * Durations stay short for this daily-use tool (Emil). Consumers gate against
 * `useReducedMotion()` from reanimated.
 */
export const motion = {
  // Standard production spring — smooth deceleration, no overshoot.
  spring: { damping: 22, stiffness: 220, mass: 0.9 },
  // Slightly snappier for small UI (chips, icons, the tab indicator).
  springSnappy: { damping: 26, stiffness: 320, mass: 0.8 },
  // Enter timing for staggered lists.
  enterDuration: 380,
  stagger: 55,
} as const;

/** Maps an AI safety verdict to its semantic color set. */
export type SafetyTone = "safe" | "caution" | "danger" | "review";

export const safetyTone = (tone: SafetyTone) => {
  switch (tone) {
    case "safe":
      return { fg: colors.safe, bg: colors.safeBg };
    case "caution":
      return { fg: colors.caution, bg: colors.cautionBg };
    case "danger":
      return { fg: colors.danger, bg: colors.dangerBg };
    case "review":
      return { fg: colors.review, bg: colors.reviewBg };
  }
};

/**
 * Calm, uniform status pill styling. Everyday statuses (cleared / review /
 * pending) all share ONE muted ink-on-paper treatment — deliberately NO rainbow
 * of colors. Only an active federal recall is loud (red). This is what keeps the
 * UI looking human rather than "AI-colored."
 */
export type StatusKind = "recall" | "review" | "cleared" | "pending";

export const statusStyle = (kind: StatusKind): { fg: string; bg: string } => {
  if (kind === "recall") return { fg: colors.danger, bg: colors.dangerBg };
  // Everything else: one quiet neutral.
  return { fg: colors.inkSoft, bg: colors.paperDeep };
};
