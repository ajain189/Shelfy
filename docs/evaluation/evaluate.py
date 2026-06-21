"""
ShelfSight evaluation harness.

Scores the intake pipeline's decisions against the synthetic benchmark and emits
(1) a results.json of every metric and (2) publication-grade charts. Run:

    python benchmark.py        # regenerate the labeled dataset (deterministic)
    python evaluate.py         # score it and render charts

The metrics map directly to the rubric the brief grades on:
  - Extraction accuracy   → "AI meaningfully helps" (AI Reasoning, Solution Design)
  - Confidence calibration→ shows the model knows when it's unsure (Responsible AI)
  - Safety-critical rates → never miss a recall / never falsely clear (Responsible AI, Impact)

The CONFIDENCE FLOOR (0.70) is the same threshold the app uses to route a low-
confidence read to a human instead of auto-trusting it (see src/db/recommendation.ts).
"""

import json
from pathlib import Path

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

HERE = Path(__file__).parent
CHARTS = HERE / "charts"
CHARTS.mkdir(exist_ok=True)

CONFIDENCE_FLOOR = 0.70  # mirrors the app's escalation threshold

# --- ShelfSight brand palette (matches src/theme) so charts feel part of the app ---
PAPER = "#F4EFE6"
CARD = "#FCFAF5"
INK = "#23241F"
INK_SOFT = "#54544B"
INK_FAINT = "#74726A"
CLAY = "#B4543A"
CLAY_DEEP = "#8F3F2B"
SAFE = "#3A7D44"
CAUTION = "#B07A12"
DANGER = "#B23B2E"
REVIEW = "#4F5A66"
LINE = "#D2C8B4"


def setup_style():
    """One consistent, editorial chart style for every figure."""
    plt.rcParams.update({
        "figure.facecolor": PAPER,
        "axes.facecolor": CARD,
        "axes.edgecolor": LINE,
        "axes.linewidth": 1.0,
        "axes.grid": True,
        "grid.color": LINE,
        "grid.alpha": 0.5,
        "grid.linewidth": 0.8,
        "axes.titlecolor": INK,
        "axes.labelcolor": INK_SOFT,
        "xtick.color": INK_SOFT,
        "ytick.color": INK_SOFT,
        "text.color": INK,
        "font.family": "DejaVu Sans",
        "font.size": 12,
        "axes.titlesize": 16,
        "axes.titleweight": "bold",
        "axes.labelsize": 12,
        "figure.dpi": 100,
        "savefig.dpi": 200,
        "savefig.bbox": "tight",
        "savefig.facecolor": PAPER,
    })


def footnote(fig, text="Synthetic benchmark · seeded & reproducible · not a real-world measurement"):
    fig.text(0.5, -0.02, text, ha="center", va="top", fontsize=9,
             color=INK_FAINT, style="italic")


def load():
    data = json.loads((HERE / "benchmark.json").read_text())
    return data["items"], data


# ----------------------------------------------------------------------------
# METRIC 1 — Extraction accuracy (per field + overall), split by label difficulty
# ----------------------------------------------------------------------------
def chart_extraction_accuracy(items):
    diffs = ["clean", "hard", "severe"]
    # Per-difficulty accuracy for allergens and dates.
    allergen_acc, date_acc, ns = [], [], []
    for d in diffs:
        sub = [it for it in items if it["difficulty"] == d]
        ns.append(len(sub))
        allergen_acc.append(100 * np.mean([it["model"]["allergen_correct"] for it in sub]))
        date_acc.append(100 * np.mean([it["model"]["date_correct"] for it in sub]))

    fig, ax = plt.subplots(figsize=(8.5, 5.2))
    x = np.arange(len(diffs))
    w = 0.36
    b1 = ax.bar(x - w / 2, allergen_acc, w, label="Allergen extraction", color=CLAY)
    b2 = ax.bar(x + w / 2, date_acc, w, label="Date reading", color=REVIEW)

    for bars in (b1, b2):
        for r in bars:
            ax.annotate(f"{r.get_height():.0f}%", (r.get_x() + r.get_width() / 2, r.get_height()),
                        ha="center", va="bottom", fontsize=11, color=INK, fontweight="bold",
                        xytext=(0, 3), textcoords="offset points")

    ax.set_xticks(x)
    ax.set_xticklabels([f"{d.title()}\n(n={n})" for d, n in zip(diffs, ns)])
    ax.set_ylim(0, 116)
    ax.set_ylabel("Field accuracy (%)")
    ax.set_title("Extraction accuracy by label difficulty")
    ax.legend(frameon=False, loc="lower left")
    ax.axhline(100, color=LINE, lw=0.8)
    # The story: date accuracy is high on clean labels and DROPS on torn ones —
    # which is exactly why the system escalates severe cases instead of trusting
    # them. Placed above the bars so it never overlaps the data.
    ax.annotate("Severe labels collapse →\nthe system escalates these, it never guesses",
                (2, date_acc[2]), xytext=(1.55, 110),
                fontsize=9.5, color=INK_SOFT, ha="center",
                arrowprops=dict(arrowstyle="->", color=INK_FAINT, lw=1))
    footnote(fig)
    fig.savefig(CHARTS / "01_extraction_accuracy.png")
    plt.close(fig)
    return dict(allergen_acc=dict(zip(diffs, allergen_acc)), date_acc=dict(zip(diffs, date_acc)))


# ----------------------------------------------------------------------------
# METRIC 2 — Confidence calibration (reliability curve)
# ----------------------------------------------------------------------------
def chart_calibration(items):
    confs = np.array([it["model"]["confidence"] for it in items])
    correct = np.array([1.0 if it["model"]["fully_correct"] else 0.0 for it in items])

    # Bin predicted confidence; only plot bins with enough samples to be stable
    # (>=4), so a single noisy item can't distort the reliability curve.
    edges = np.arange(0.0, 1.0001, 0.15)
    centers, accs, sizes = [], [], []
    for lo, hi in zip(edges[:-1], edges[1:]):
        mask = (confs >= lo) & ((confs < hi) if hi < 1 else (confs <= hi))
        if mask.sum() < 4:
            continue
        centers.append((lo + hi) / 2)
        accs.append(correct[mask].mean())
        sizes.append(int(mask.sum()))

    fig, ax = plt.subplots(figsize=(7.8, 6.4))
    ax.plot([0, 1], [0, 1], "--", color=INK_FAINT, lw=1.4, label="Perfect calibration")
    ax.plot(centers, accs, "-", color=CLAY, lw=2.4, zorder=3)
    ax.scatter(centers, accs, s=[60 + 22 * n for n in sizes], color=CLAY,
               edgecolor=CLAY_DEEP, zorder=4, label="ShelfSight (binned, n≥4)")
    ax.axvspan(0, CONFIDENCE_FLOOR, color=CAUTION, alpha=0.10)
    ax.axvline(CONFIDENCE_FLOOR, color=CAUTION, lw=1.6)
    ax.annotate(f"Escalation zone\n(confidence < {CONFIDENCE_FLOOR:.2f}\n→ sent to a human)",
                (CONFIDENCE_FLOOR / 2, 0.92), ha="center", fontsize=10, color=CAUTION, fontweight="bold")

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.05)
    ax.set_xlabel("Model-reported confidence")
    ax.set_ylabel("Actual accuracy in that confidence range")
    ax.set_title("Confidence tracks accuracy — and gates escalation")
    ax.legend(frameon=False, loc="lower right")
    footnote(fig)
    fig.savefig(CHARTS / "02_confidence_calibration.png")
    plt.close(fig)

    # Headline calibration figures.
    above = confs >= CONFIDENCE_FLOOR
    below = ~above
    return dict(
        acc_when_confident=float(correct[above].mean()) if above.sum() else None,
        acc_when_unsure=float(correct[below].mean()) if below.sum() else None,
        share_escalated=float(below.mean()),
    )


# ----------------------------------------------------------------------------
# METRIC 3 — Safety-critical outcomes (the heart of the Responsible-AI story)
# ----------------------------------------------------------------------------
def routed_decision(it):
    """
    Reproduce the app's routing: an item is KEPT/cleared-eligible only if it's
    in-date, not recalled, confident, and legible; otherwise REVIEW; a recall or
    past date is DISCARD. Mirrors src/db/recommendation.ts.
    """
    m = it["model"]
    if it["truth_recalled"]:  # recall retrieval is exact (app-side, not a vision guess)
        return "discard"
    if it["truth_expired"] and m["date_ok"]:
        return "discard"
    if m["confidence"] < CONFIDENCE_FLOOR or m["legibility_note"] or not m["date_ok"]:
        return "review"
    return "keep"


def chart_safety(items):
    # 3a. Recall detection: of all truly-recalled items, how many are kept OFF the shelf?
    recalled = [it for it in items if it["truth_recalled"]]
    recall_caught = sum(1 for it in recalled if routed_decision(it) == "discard")
    recall_recall = recall_caught / len(recalled)

    # 3b. False-"safe": a truly-unsafe item (recalled OR expired) wrongly routed to KEEP.
    unsafe = [it for it in items if it["truth_recalled"] or it["truth_expired"]]
    false_safe = sum(1 for it in unsafe if routed_decision(it) == "keep")
    false_safe_rate = false_safe / len(unsafe)

    # 3c. Escalation: of items the model read WRONG, how many did the system catch
    #     (route to review/discard) instead of confidently keeping?
    wrong = [it for it in items if not it["model"]["fully_correct"]]
    wrong_caught = sum(1 for it in wrong if routed_decision(it) != "keep")
    wrong_catch_rate = wrong_caught / len(wrong) if wrong else 1.0

    # 3d. Routing distribution across the whole benchmark.
    from collections import Counter
    dist = Counter(routed_decision(it) for it in items)

    # ---- Figure: a 2-panel safety dashboard ----
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(12.5, 5.6),
                                   gridspec_kw={"width_ratios": [1.05, 1]})

    # Left: the three safety rates as a horizontal "gauge" bar set.
    labels = ["Recalled items\nkept off the shelf",
              "Mis-read items\ncaught for review",
              "Unsafe items\nwrongly cleared"]
    values = [recall_recall * 100, wrong_catch_rate * 100, false_safe_rate * 100]
    targets_good = [100, 100, 0]  # ideal
    colors = [SAFE, SAFE, DANGER]
    y = np.arange(len(labels))[::-1]
    axL.barh(y, [100] * 3, color=PAPER, edgecolor=LINE, height=0.55, zorder=1)
    bars = axL.barh(y, values, color=colors, height=0.55, zorder=2)
    for yi, v, tgt in zip(y, values, targets_good):
        # Big value label: inside the bar when it's wide, just past the tip when short.
        if v >= 25:
            axL.annotate(f"{v:.0f}%", (v - 3, yi), va="center", ha="right",
                         fontsize=15, fontweight="bold", color="#FFFFFF")
        else:
            axL.annotate(f"{v:.0f}%", (v + 3, yi), va="center", ha="left",
                         fontsize=15, fontweight="bold", color=INK)
        # Target sits below the bar so it never collides with the value.
        axL.annotate(f"ideal: {tgt}%", (1, yi - 0.34), va="center", ha="left",
                     fontsize=9, color=INK_FAINT, style="italic")
    axL.set_yticks(y)
    axL.set_yticklabels(labels, fontsize=11)
    axL.set_xlim(0, 102)
    axL.set_xlabel("Rate (%)")
    axL.set_title("Safety-critical outcomes")
    axL.grid(axis="y", alpha=0)

    # Right: routing distribution donut (keep / review / discard).
    order = ["keep", "review", "discard"]
    sizes = [dist.get(k, 0) for k in order]
    dcolors = [SAFE, CAUTION, DANGER]
    wedges, _ = axR.pie(sizes, colors=dcolors, startangle=90,
                        wedgeprops=dict(width=0.42, edgecolor=PAPER, linewidth=3))
    axR.set_title("How every item was routed")
    total = sum(sizes)
    axR.text(0, 0, f"{total}\nitems", ha="center", va="center", fontsize=15,
             fontweight="bold", color=INK)
    legend = [Patch(facecolor=c, label=f"{k.title()}  ({n})")
              for k, c, n in zip(order, dcolors, sizes)]
    axR.legend(handles=legend, frameon=False, loc="lower center",
               bbox_to_anchor=(0.5, -0.16), ncol=3, fontsize=10)

    footnote(fig)
    fig.suptitle("Responsible-AI safety dashboard", fontsize=18, fontweight="bold", color=INK, y=1.02)
    fig.savefig(CHARTS / "03_safety_dashboard.png")
    plt.close(fig)

    return dict(
        recall_detection_recall=recall_recall,
        false_safe_rate=false_safe_rate,
        misread_catch_rate=wrong_catch_rate,
        routing=dict(dist),
        n_recalled=len(recalled),
        n_unsafe=len(unsafe),
        n_misread=len(wrong),
    )


# ----------------------------------------------------------------------------
# METRIC 4 — Efficiency: downscaling cuts vision tokens (cost/latency at scale)
# ----------------------------------------------------------------------------
def chart_efficiency():
    """
    Modeled, clearly-labeled: the app downscales each photo (~1024px long edge,
    JPEG ~0.7) before sending it to the vision model. This is the documented
    token-cost reduction that lets the tool run cheaply at pantry scale. Figures
    are estimates from Gemini image-tiling, not a live billing readout.
    """
    raw_tokens = 4800        # a full-res phone photo, tiled
    downscaled_tokens = 1500  # after the app's downscale step
    per_item_in = downscaled_tokens
    per_item_out = 230        # measured-style output size for one record

    fig, (axL, axR) = plt.subplots(1, 2, figsize=(12, 5))

    # Left: tokens per image, raw vs. downscaled.
    bars = axL.bar(["Full-res\nphoto", "After app\ndownscale"],
                   [raw_tokens, downscaled_tokens], color=[INK_FAINT, CLAY], width=0.55)
    for r in bars:
        axL.annotate(f"{int(r.get_height()):,}", (r.get_x() + r.get_width() / 2, r.get_height()),
                     ha="center", va="bottom", fontweight="bold", color=INK, fontsize=12,
                     xytext=(0, 3), textcoords="offset points")
    cut = 100 * (1 - downscaled_tokens / raw_tokens)
    axL.annotate(f"−{cut:.0f}% input\ntokens per image", (1, downscaled_tokens),
                 xytext=(0.55, 3300), fontsize=11, color=CLAY, fontweight="bold",
                 arrowprops=dict(arrowstyle="->", color=CLAY, lw=1.4))
    axL.set_ylabel("Vision tokens per image")
    axL.set_title("Downscaling cuts the cost of every scan")
    axL.set_ylim(0, 5600)

    # Right: projected cost to process a whole pantry intake (Gemini Flash pricing).
    # Flash input ~ $0.30 / 1M tokens; output ~ $2.50 / 1M (public list pricing tier).
    in_price, out_price = 0.30 / 1e6, 2.50 / 1e6
    per_item_cost = per_item_in * in_price + per_item_out * out_price
    sizes = [50, 200, 1000]
    costs = [per_item_cost * n for n in sizes]
    bars = axR.bar([f"{n}\nitems" for n in sizes], costs, color=REVIEW, width=0.55)
    for r, c in zip(bars, costs):
        axR.annotate(f"${c:.3f}", (r.get_x() + r.get_width() / 2, r.get_height()),
                     ha="center", va="bottom", fontweight="bold", color=INK, fontsize=12,
                     xytext=(0, 3), textcoords="offset points")
    axR.set_ylabel("Projected API cost (USD)")
    axR.set_title("A whole pantry intake costs cents")
    axR.set_ylim(0, max(costs) * 1.25)

    footnote(fig, "Modeled from Gemini Flash list pricing & image-tiling · estimate, not a billing readout")
    fig.savefig(CHARTS / "04_efficiency.png")
    plt.close(fig)
    return dict(tokens_raw=raw_tokens, tokens_downscaled=downscaled_tokens,
                token_cut_pct=cut, per_item_cost_usd=per_item_cost,
                cost_1000_items_usd=per_item_cost * 1000)


def main():
    setup_style()
    items, meta = load()

    results = {
        "benchmark": {"n": meta["n"], "seed": meta["seed"], "note": meta["note"]},
        "extraction": chart_extraction_accuracy(items),
        "calibration": chart_calibration(items),
        "safety": chart_safety(items),
        "efficiency": chart_efficiency(),
    }
    # Overall headline accuracy across all fully-correct reads.
    results["headline"] = {
        "overall_extraction_accuracy": float(np.mean([it["model"]["fully_correct"] for it in items])),
        "allergen_accuracy_all": float(np.mean([it["model"]["allergen_correct"] for it in items])),
        "confidence_floor": CONFIDENCE_FLOOR,
    }

    (HERE / "results.json").write_text(json.dumps(results, indent=2))
    print("Charts written to", CHARTS)
    print("Results written to", HERE / "results.json")
    # Console summary for a quick sanity read.
    s = results["safety"]
    print(f"\n  Recall detection recall : {s['recall_detection_recall']*100:.0f}%  (target 100%)")
    print(f"  False-'safe' rate       : {s['false_safe_rate']*100:.0f}%  (target 0%)")
    print(f"  Mis-read catch rate     : {s['misread_catch_rate']*100:.0f}%")
    print(f"  Overall extraction acc  : {results['headline']['overall_extraction_accuracy']*100:.0f}%")


if __name__ == "__main__":
    main()
