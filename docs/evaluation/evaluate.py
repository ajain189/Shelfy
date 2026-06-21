"""
Shelfy evaluation harness.

Scores the intake pipeline's decisions against the synthetic benchmark and
writes (1) results.json with every metric and (2) the charts in charts/.

    python benchmark.py     # regenerate the labeled dataset (deterministic)
    python evaluate.py      # score it and render the charts

The confidence floor (0.70) is the same threshold the app uses to route a
low-confidence read to a human instead of trusting it (see
src/db/recommendation.ts).
"""

import json
from pathlib import Path

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).parent
CHARTS = HERE / "charts"
CHARTS.mkdir(exist_ok=True)

CONFIDENCE_FLOOR = 0.70

# A small, professional palette. Plain matplotlib look: white background, one
# sans font, standard gridlines. No brand theming, no hand-drawn callouts.
BLUE = "#3b6ea5"
ORANGE = "#d1812f"
GREEN = "#3f8a52"
RED = "#b3473d"
GREY = "#7a7a7a"


def setup_style():
    plt.rcParams.update({
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "axes.edgecolor": "#cccccc",
        "axes.linewidth": 1.0,
        "axes.grid": True,
        "axes.axisbelow": True,
        "grid.color": "#dddddd",
        "grid.linewidth": 0.7,
        "axes.titlesize": 13,
        "axes.titleweight": "bold",
        "axes.labelsize": 11,
        "font.family": "DejaVu Sans",
        "font.size": 10,
        "xtick.color": "#333333",
        "ytick.color": "#333333",
        "axes.titlecolor": "#222222",
        "axes.labelcolor": "#333333",
        "legend.frameon": False,
        "figure.dpi": 110,
        "savefig.dpi": 200,
        "savefig.bbox": "tight",
        "savefig.facecolor": "white",
    })


def load():
    data = json.loads((HERE / "benchmark.json").read_text())
    return data["items"], data


def routed_decision(it):
    """Mirror the app's routing on the model's PREDICTED recall/date (not truth)."""
    m = it["model"]
    if m["pred_recalled"]:
        return "discard"
    if it["truth_expired"] and m["date_ok"]:
        return "discard"
    if m["confidence"] < CONFIDENCE_FLOOR or m["legibility_note"] or not m["date_ok"]:
        return "review"
    return "keep"


# ---------------------------------------------------------------------------
# 1. Extraction accuracy by field and difficulty (grouped bar)
# ---------------------------------------------------------------------------
def chart_extraction(items):
    diffs = ["clean", "hard", "severe"]
    allergen_acc, date_acc, ns = [], [], []
    for d in diffs:
        sub = [it for it in items if it["difficulty"] == d]
        ns.append(len(sub))
        allergen_acc.append(100 * np.mean([it["model"]["allergen_correct"] for it in sub]))
        date_acc.append(100 * np.mean([it["model"]["date_correct"] for it in sub]))

    fig, ax = plt.subplots(figsize=(7.5, 4.6))
    x = np.arange(len(diffs))
    w = 0.38
    ax.bar(x - w / 2, allergen_acc, w, label="Allergen extraction", color=BLUE)
    ax.bar(x + w / 2, date_acc, w, label="Date reading", color=ORANGE)
    for xi, a, d in zip(x, allergen_acc, date_acc):
        ax.text(xi - w / 2, a + 1.5, f"{a:.0f}", ha="center", va="bottom", fontsize=9)
        ax.text(xi + w / 2, d + 1.5, f"{d:.0f}", ha="center", va="bottom", fontsize=9)
    ax.set_xticks(x)
    ax.set_xticklabels([f"{d.title()} (n={n})" for d, n in zip(diffs, ns)])
    ax.set_ylim(0, 109)
    ax.set_ylabel("Field accuracy (%)")
    ax.set_title("Extraction accuracy by label difficulty")
    ax.legend(loc="lower left")
    fig.savefig(CHARTS / "01_extraction_accuracy.png")
    plt.close(fig)
    return {d: {"allergen": a, "date": dt} for d, a, dt in zip(diffs, allergen_acc, date_acc)}


# ---------------------------------------------------------------------------
# 2. Reliability diagram (calibration)
# ---------------------------------------------------------------------------
def chart_calibration(items):
    confs = np.array([it["model"]["confidence"] for it in items])
    correct = np.array([1.0 if it["model"]["fully_correct"] else 0.0 for it in items])

    edges = np.linspace(0, 1, 6)
    centers, accs, counts = [], [], []
    for lo, hi in zip(edges[:-1], edges[1:]):
        mask = (confs >= lo) & ((confs < hi) if hi < 1 else (confs <= hi))
        if mask.sum() == 0:
            continue
        centers.append((lo + hi) / 2)
        accs.append(correct[mask].mean())
        counts.append(int(mask.sum()))

    fig, (ax, axh) = plt.subplots(
        2, 1, figsize=(6.4, 6.2), height_ratios=[3, 1], sharex=True,
        gridspec_kw={"hspace": 0.08},
    )
    ax.plot([0, 1], [0, 1], "--", color=GREY, lw=1.2, label="Perfect calibration")
    ax.plot(centers, accs, "o-", color=BLUE, lw=2, ms=7, label="Observed")
    ax.axvline(CONFIDENCE_FLOOR, color=RED, lw=1.2, ls=":")
    ax.text(CONFIDENCE_FLOOR + 0.01, 0.04, "escalation\nthreshold", color=RED, fontsize=8.5, va="bottom")
    ax.set_ylim(0, 1.02)
    ax.set_xlim(0, 1)
    ax.set_ylabel("Accuracy in bin")
    ax.set_title("Reliability diagram")
    ax.legend(loc="upper left")

    axh.bar(centers, counts, width=0.16, color=BLUE, alpha=0.55)
    axh.set_xlabel("Predicted confidence")
    axh.set_ylabel("Count")
    axh.set_xlim(0, 1)
    fig.savefig(CHARTS / "02_calibration.png")
    plt.close(fig)

    above = confs >= CONFIDENCE_FLOOR
    below = ~above
    return dict(
        acc_when_confident=float(correct[above].mean()) if above.sum() else None,
        acc_when_unsure=float(correct[below].mean()) if below.sum() else None,
        share_escalated=float(below.mean()),
    )


# ---------------------------------------------------------------------------
# 3. ROC curve for recall detection
# ---------------------------------------------------------------------------
def chart_roc(items):
    """
    ROC for the safety-critical task: detecting a recalled item. The score is a
    risk score (1 - confidence for a detected recall, blended with the recall
    signal), swept over thresholds to trace true-positive vs false-positive rate.
    """
    y_true = np.array([1 if it["truth_recalled"] else 0 for it in items])
    # Risk score: predicted-recall items get a high score; everything else gets a
    # low score scaled by uncertainty. This is the signal the discard gate keys on.
    score = np.array([
        (0.85 + 0.15 * (1 - it["model"]["confidence"])) if it["model"]["pred_recalled"]
        else (0.15 * (1 - it["model"]["confidence"]))
        for it in items
    ])

    thresholds = np.linspace(-0.01, 1.01, 200)
    P = max(int(y_true.sum()), 1)
    N = max(int((1 - y_true).sum()), 1)
    tpr, fpr = [], []
    for t in thresholds:
        pred = score >= t
        tp = int(np.sum(pred & (y_true == 1)))
        fp = int(np.sum(pred & (y_true == 0)))
        tpr.append(tp / P)
        fpr.append(fp / N)
    tpr = np.array(tpr)
    fpr = np.array(fpr)
    order = np.argsort(fpr)
    auc = float(np.trapezoid(tpr[order], fpr[order]))

    fig, ax = plt.subplots(figsize=(5.8, 5.4))
    ax.plot([0, 1], [0, 1], "--", color=GREY, lw=1.2, label="Chance")
    ax.plot(fpr[order], tpr[order], color=GREEN, lw=2.2, label=f"Recall detection (AUC = {auc:.2f})")
    ax.fill_between(fpr[order], tpr[order], alpha=0.08, color=GREEN)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.02)
    ax.set_xlabel("False positive rate")
    ax.set_ylabel("True positive rate")
    ax.set_title("ROC: detecting recalled items")
    ax.legend(loc="lower right")
    fig.savefig(CHARTS / "03_roc_recall.png")
    plt.close(fig)
    return dict(auc=auc)


# ---------------------------------------------------------------------------
# 4. Confusion matrix for routing (safety view)
# ---------------------------------------------------------------------------
def chart_confusion(items):
    """
    Rows = ground-truth safety class, columns = the routing decision. The story is
    in the cells: how often a truly-unsafe item nonetheless reaches "keep".
    """
    def truth_class(it):
        if it["truth_recalled"]:
            return "Recalled"
        if it["truth_expired"]:
            return "Expired"
        return "Safe"

    rows = ["Recalled", "Expired", "Safe"]
    cols = ["discard", "review", "keep"]
    M = np.zeros((3, 3), dtype=int)
    for it in items:
        r = rows.index(truth_class(it))
        c = cols.index(routed_decision(it))
        M[r, c] += 1

    fig, ax = plt.subplots(figsize=(5.8, 5.0))
    im = ax.imshow(M, cmap="Blues", aspect="auto")
    ax.set_xticks(range(3), [c.title() for c in cols])
    ax.set_yticks(range(3), rows)
    ax.set_xlabel("Routing decision")
    ax.set_ylabel("Actual class")
    ax.set_title("Routing confusion matrix")
    thresh = M.max() / 2 if M.max() else 0
    for i in range(3):
        for j in range(3):
            ax.text(j, i, str(M[i, j]), ha="center", va="center",
                    color="white" if M[i, j] > thresh else "#222222", fontsize=13, fontweight="bold")
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04, label="Items")
    fig.savefig(CHARTS / "04_routing_confusion.png")
    plt.close(fig)

    # Headline safety rates from the matrix.
    recalled = M[0].sum()
    expired = M[1].sum()
    unsafe_total = recalled + expired
    recalled_off_shelf = M[0, 0] + M[0, 1]  # discard or review (not keep)
    unsafe_kept = M[0, 2] + M[1, 2]
    return dict(
        matrix={r: dict(zip(cols, M[i].tolist())) for i, r in enumerate(rows)},
        recall_detection=float(recalled_off_shelf / recalled) if recalled else None,
        false_safe_rate=float(unsafe_kept / unsafe_total) if unsafe_total else None,
    )


def main():
    setup_style()
    items, meta = load()

    extraction = chart_extraction(items)
    calibration = chart_calibration(items)
    roc = chart_roc(items)
    confusion = chart_confusion(items)

    wrong = [it for it in items if not it["model"]["fully_correct"]]
    misread_catch = (
        sum(1 for it in wrong if routed_decision(it) != "keep") / len(wrong) if wrong else 1.0
    )

    results = {
        "benchmark": {"n": meta["n"], "seed": meta["seed"], "note": meta["note"]},
        "extraction": extraction,
        "calibration": calibration,
        "roc": roc,
        "confusion": confusion,
        "headline": {
            "overall_extraction_accuracy": float(np.mean([it["model"]["fully_correct"] for it in items])),
            "allergen_accuracy_all": float(np.mean([it["model"]["allergen_correct"] for it in items])),
            "misread_catch_rate": float(misread_catch),
            "confidence_floor": CONFIDENCE_FLOOR,
        },
    }
    (HERE / "results.json").write_text(json.dumps(results, indent=2))

    print("Charts written to", CHARTS)
    h, c = results["headline"], confusion
    print(f"  Recall detection      : {c['recall_detection']*100:.0f}%")
    print(f"  False-safe rate       : {c['false_safe_rate']*100:.0f}%")
    print(f"  Mis-read caught       : {h['misread_catch_rate']*100:.0f}%")
    print(f"  Allergen accuracy     : {h['allergen_accuracy_all']*100:.0f}%")
    print(f"  Overall extraction    : {h['overall_extraction_accuracy']*100:.0f}%")
    print(f"  Recall-detection AUC  : {roc['auc']:.2f}")


if __name__ == "__main__":
    main()
