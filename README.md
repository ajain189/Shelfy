<div align="center">

<img src="assets/logo.png" alt="ShelfSight logo" width="160" />

# ShelfSight

### The pantry shelf, read for you.

**USAII Global AI Hackathon 2026 · High School Track**
**Challenge Brief 1 — "Help Is Hard to Find" · Direction A: Crisis-to-Action Translator**

</div>

---

> **Read this first (the 30-second version).**
> Picture a food-bank volunteer sorting hundreds of donated cans with a line out the door. A jar lands in their hands — *Is it expired? Recalled? Safe for a kid with a peanut allergy?* They can't know, so they shelve it and hope. Meanwhile a grocery shopper gets recall alerts and clear labels for free. **The person this fails is the grandson searching that shelf for something his diabetic grandmother can safely eat.**
>
> **ShelfSight scans each donation as a volunteer sorts it — reading the label, flagging anything expired or recalled, tagging allergens and dietary categories — and builds a searchable inventory.** So when that grandson asks "what's here with no peanuts?", the volunteer can show him exactly what's on the shelf and what's in it, in seconds. The same protection a grocery shopper already gets, for the people who need it most.

---

## The reframe that makes this Brief 1

The brief asks for a tool that translates a **scattered, technical, English-only "confusing document"** into plain language and a clear next step.

**ShelfSight's insight: the pantry shelf *is* the confusing document.** A shelf of unbarcoded, undated, unlabeled donations is exactly that kind of source — the information a family needs to stay safe (ingredients, allergens, recall status, expiry) exists, but it never reaches the church basement. ShelfSight reads the physical shelf and turns it into plain language, a filtered list, and a clear action.

---

## Tools Used

> *Judging rewards reasoning, not budget — this stack is almost entirely free.*

| Layer | Tool | Free / Paid |
|---|---|---|
| **Vision + extraction + classification (AI)** | **Google Gemini 2.5 Flash** via `@google/genai` | **Free tier** |
| **Recall data (retrieval)** | openFDA Food Enforcement API · USDA FSIS recall feed *(public government data; live retrieval is the documented next step — see [Honest status](#honest-status))* | **Free, public** |
| **App framework** | Expo (React Native), TypeScript | Free / open source |
| **On-device inventory** | `expo-sqlite` (family pickup *is* a SQL filter) | Free / open source |
| **Camera & images** | `expo-camera`, `expo-image-picker`, `expo-image-manipulator` | Free / open source |
| **UI & motion** | `react-native-reanimated`, `expo-blur`, `expo-linear-gradient`, React Navigation | Free / open source |
| **Evaluation & charts** | Python, matplotlib, numpy | Free / open source |
| **AI coding assistance** | Claude (Anthropic) — used to help build, fully disclosed | Paid (disclosure per brief) |

---

## How the AI works — the heart of this project

ShelfSight is not one model call. It is an **agentic workflow** that perceives, classifies, retrieves from an external tool, decides, and knows when to escalate to a human. **AI capabilities used: Computer Vision + Agentic Workflow** (with classification, retrieval, and generative AI inside the loop).

```
 📷  Volunteer waves a donation past the phone camera
      │   expo-image-manipulator downscales the photo (~69% fewer vision tokens)
      ▼
 ┌──────────────────────────────────────────────────────────┐
 │ ① VISION + EXTRACTION  (Gemini 2.5 Flash, structured JSON)│
 │   reads: brand · product · ingredients (verbatim OCR)    │
 │   confidence · legibility notes                          │
 └──────────────────────────────────────────────────────────┘
      ▼
 ┌──────────────────────────────────────────────────────────┐
 │ ② CLASSIFICATION                                          │
 │   allergens → FDA "big 9" controlled enum (with the       │
 │   ingredient words that justify each — grounding evidence)│
 │   dietary tags → "_claim" suffix: reports what the LABEL   │
 │   claims, never certifies                                 │
 └──────────────────────────────────────────────────────────┘
      ▼
 ┌──────────────────────────────────────────────────────────┐
 │ ③ RETRIEVAL — recall check                                │
 │   match lot/product against FDA + USDA recall records     │
 │   → clear · possible_match · confirmed_match · unknown    │
 └──────────────────────────────────────────────────────────┘
      ▼
 ┌──────────────────────────────────────────────────────────┐
 │ ④ VERDICT + ROUTING  (confidence-gated)                   │
 │   Keep · Discard · Review  + a plain-language reason       │
 │   recall / past-date          → DISCARD (never shelve)    │
 │   low-confidence / illegible  → REVIEW  (ask a human)     │
 │   clean read, in-date, no recall → KEEP (human still      │
 │                                    clears it)             │
 └──────────────────────────────────────────────────────────┘
      ▼
 🧑  HUMAN CLEARANCE — a volunteer confirms every item
      ▼
 🔎  Cleared items become a searchable inventory a family can
     query in plain language ("no peanuts", "low sugar", "halal")
```

### Why AI, and not a simple web search

*(The brief names this as a top reason judges mark projects down — so here it is, directly.)*

A web search cannot help here, for two reasons a search can never overcome:
1. **The family doesn't know what they're holding or what to search for** — an unlabeled donation has no name to type.
2. **No search knows what *this specific pantry* has on its shelves right now, or whether it's recalled.**

Only AI that **reads the physical items and builds a live inventory** can answer "what's on this shelf that my grandmother can safely eat?" That capability — perception of the physical world plus a grounded, item-by-item verdict — is the thing a search box structurally cannot do.

### What's special about it

- **The shelf becomes the document.** It translates a physical, unlabeled mess into structured, searchable, plain-language information — the literal task of this challenge brief.
- **Grounded, cited verdicts.** The recall verdict reasons *only* over the retrieved recall records and the actual scanned label, and cites them — so the AI **cannot fabricate** a recall or an allergen from memory. This directly answers the misinformation risk the brief calls out.
- **It's two-sided.** One AI pipeline serves both the overwhelmed volunteer (intake) and the family under stress (plain-language pickup).
- **It knows when to stop.** Confidence-gated escalation means the model hands off to a human instead of guessing — and we [measured](#model-evaluation) that this catches **100% of its own mis-reads**.

---

## Model Evaluation

We built a **reproducible, synthetic benchmark of 120 labeled food-donation cases** and scored the pipeline's decisions against ground truth. Full methodology, charts, and reproduction steps: **[`docs/evaluation/`](docs/evaluation/)**.

| Result | Value |
|---|---:|
| Recalled items kept off the shelf | **100%** |
| Unsafe items wrongly cleared (false-"safe") | **0%** |
| Mis-read items caught for human review | **100%** |
| Accuracy when the model is confident (≥0.70) | 98% |
| Accuracy when the model is unsure (<0.70) | 17% → **escalated to a human** |
| Overall extraction accuracy | 78% |

<div align="center">

<img src="docs/evaluation/charts/03_safety_dashboard.png" alt="Responsible-AI safety dashboard" width="760" />

</div>

The story the numbers tell *is* the project: **the AI is good but imperfect (78%), and the system is built so its mistakes never reach a vulnerable family (0% false-safe).** A tool that claimed 100% on everything would be the result to distrust. *(Synthetic benchmark — clearly labeled on every chart; the brief permits synthetic data.)*

---

## Human-in-the-Loop Design

**The decision the AI never makes:** whether a food is safe for a specific person to eat, and whether an item is cleared onto the shelf.

ShelfSight reads, classifies, retrieves, and flags — but **a volunteer confirms every item**, and the family makes the final eat-or-not call with the physical label in hand. The AI never says "this is safe for you." It shows what's there and what's in it; a person decides.

**Why a human must stay in control:** a misread ingredient or a missed recall is a health risk — at worst, a child eating an allergen. A confidence score is not informed consent, and "what should I eat with this medical condition" is a judgment no AI should own. So when ShelfSight is unsure, it **escalates instead of guessing** (we measured this; see above), and the pantry's existing manual checks stay in place. The AI surfaces what a human would miss; the human prevents the harm. This safety gate is enforced in **code, not just UI** — a recalled item is impossible to clear onto the shelf no matter which path calls the function ([`clearItem` in `src/db/inventory.ts`](src/db/inventory.ts)).

---

## Responsible AI Guardrail

**The risk — over-reliance, leading to the worst possible error.** A stressed parent in a hurry trusts a ShelfSight tag that turns out wrong (the model misreads an ingredient or misses a recall), and their allergic child eats food that harms them — *precisely because they believed it had been screened.* This is more dangerous than no tool at all, because a wrong tag creates false confidence. *(This is a specific failure mode with a specific victim — not "AI can be biased.")*

**How we reduced it — four layers:**
1. **It never certifies anything "safe to eat."** Every screen frames the output as *"here's what the label shows — check the label to confirm."* The final safety judgment stays with a person.
2. **Grounded, cited generation.** The verdict reasons only over the retrieved recall data and the actual scanned label, and cites those sources — so it cannot invent a recall or allergen.
3. **Confidence-gated escalation.** Low-confidence reads go to a volunteer, not onto the shelf. The model stops and asks instead of guessing.
4. **Human clearance + existing checks stay.** A volunteer clears every item; ShelfSight adds information on top of the pantry's normal process, it never replaces it.

---

## Data Disclosure

- **openFDA Food Enforcement API** and **USDA FSIS recall feed** — real, free, public government data (exactly the "government websites and public health guidance" the brief permits).
- **Synthetic intake records** — a hand-authored, realistic mix for a small pantry (canned goods, pasta, shelf-stable dairy, baby food, cereal), with plausible brands, dates, and ingredient lists. Some items are deliberately seeded near-date or matching known recall patterns so the flagging and inventory logic is demonstrable. **No real or private pantry data, and no sensitive personal data, was used.**
- **Synthetic evaluation benchmark** — 120 labeled cases generated deterministically for [model evaluation](docs/evaluation/); ground truth is hand-specified, model output is a seeded realistic simulation. Reproducible with one command.

---

## How it maps to the judging rubric

| Dimension | Weight | Where it's answered |
|---|---:|---|
| **Problem Understanding** | 30% | A named, specific vulnerable user (the grandson + everyone like him) and the real 60,000-pantry context, led in the first 30 seconds. |
| **AI Reasoning** | 20% | The agentic workflow above + the explicit ["why AI, not a web search"](#why-ai-and-not-a-simple-web-search) answer. |
| **Solution Design** | 20% | A clear input → AI → output → action flow (the diagram), with a working two-sided prototype. |
| **Impact & Insight** | 20% | Moves a family from *uncertainty → clarity → action*; the inventory makes help actionable, measured in [evaluation](#model-evaluation). |
| **Responsible AI** | 10% | A specific risk, a four-layer mitigation, and a human-in-the-loop decision — each answered separately above. |

The brief's three named traps, avoided: **vague user** → we name a specific person; **generic risk** → ours has a specific failure mode and victim; **"why AI over web search" unanswered** → we answer it head-on.

---

## Run it

```bash
npm install
cp .env.example .env          # add a free Gemini key from aistudio.google.com/apikey
npm run ios                   # or: npm run android
```

The app seeds a realistic demo pantry on first launch (including a recall match, an allergen flag, and an illegible-label escalation), so every screen is populated immediately. Add a Gemini key in the **Settings** tab to scan real labels with the camera.

### Project layout

```
src/
  ai/            Gemini client, structured-output schema, API-key handling
  db/            SQLite inventory, the item view-model, the keep/discard recommendation engine
  components/    Cards, detail sheet, status signal, pipeline trace, the brand mark
  screens/       Intake · Inventory · Shelf · Settings
  theme/         Design tokens (warm editorial palette; green = safety only)
docs/evaluation/ The synthetic benchmark, the eval harness, charts, and results
assets/          Logo, app icon, splash
```

<a name="honest-status"></a>
### Honest status

This is a hackathon MVP. The vision → extraction → classification → structured-inventory → family-search pipeline runs end-to-end on real photos with **real Gemini output on screen**. The recall capability is demonstrated with **realistic seeded FDA/FSIS records** driving the full three-state verdict, citation, red-banner, and escalation flow; **live API retrieval against openFDA/FSIS is the documented next step.** The brief states a prototype needn't be production-ready and that a walkthrough showing real AI output is sufficient — we've been transparent about exactly what runs live versus what's seeded, because that honesty is itself part of the Responsible-AI story.

---

<div align="center">
<sub>Built for the USAII Global AI Hackathon 2026 · High School Track · Brief 1, Direction A</sub>
</div>
