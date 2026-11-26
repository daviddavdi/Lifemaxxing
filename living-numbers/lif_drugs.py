"""
lif_drugs.py - Experiment 2: testing the Living Interaction Formula (LIF) on REAL drug data.

Data: O'Neil et al. 2016 (Merck), via DrugComb. Each experiment ("block") is a 5x5 grid:
drug A at 5 doses x drug B at 5 doses, measuring % of cancer cells inhibited.
Get it first with:  python3 fetch_oneil.py

THE IDEA (from LIF, Version 2):
  Each drug changes the OTHER drug, and not equally (Principle 3 + asymmetry):

      dose_B_effective = dose_B * exp( gamma_AB * presence_A )     # what A does to B
      dose_A_effective = dose_A * exp( gamma_BA * presence_B )     # what B does to A

  gamma_AB = k_AB * power_A * openness_B   (from the LIF formula; with this data only the
  product can be measured, so we fit gamma directly). A drug can boost another even if it
  does nothing by itself (like ritonavir), so "presence" is the dose, not the drug's own effect.

  Then the two (changed) drugs act independently (Bliss):
      effect = 1 - (1 - E_A(dose_A_eff)) * (1 - E_B(dose_B_eff))

MODELS COMPARED (all use the same single-drug curves):
  bliss        0 interaction parameters   - the standard "no interaction" reference
  sym-1        1 parameter                - both drugs boost each other equally
  sym-2        2 parameters               - equal boosting + an extra synergy term (fair rival to LIF)
  LIF          2 parameters               - uneven, directional boosting  (gamma_AB != gamma_BA)

TESTS:
  1. Prediction: fit on half of the 16 combination points, predict the other half.
  2. Reproducibility: is the direction of the interaction the same in repeated experiments?
     If LIF's asymmetry were just noise, repeats would not agree.

Run:  python3 lif_drugs.py            (about 6,000 experiments, a few minutes)
      python3 lif_drugs.py --n 20000  (more)
"""

import argparse
import csv
import math
import os
import random
from collections import defaultdict

import numpy as np
from scipy.optimize import curve_fit

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "oneil.csv")
GRID = np.round(np.arange(-4.0, 4.01, 0.2), 2)          # values of gamma we try


# ---------------------------------------------------------------- data
def load_blocks():
    blocks = defaultdict(list)
    meta = {}
    with open(DATA) as f:
        for r in csv.DictReader(f):
            b = int(r["block"])
            blocks[b].append((float(r["dose_a"]), float(r["dose_b"]), float(r["inhibition"])))
            meta[b] = (r["drug_a"], r["drug_b"], r["cell_line"])
    return blocks, meta


# ---------------------------------------------------------------- single drug curve
def hill(d, emax, logc, h):
    d = np.asarray(d, dtype=float)
    c = np.exp(logc)
    return emax * d ** h / (c ** h + d ** h)


def fit_hill(doses, effects):
    doses, effects = np.asarray(doses), np.asarray(effects)
    pos = doses[doses > 0]
    lo, hi = math.log(pos.min() / 100), math.log(pos.max() * 100)
    try:
        p, _ = curve_fit(hill, doses, effects, p0=[max(10, effects.max()), math.log(np.median(pos)), 1.0],
                         bounds=([0, lo, 0.5], [100, hi, 4.0]), maxfev=2000)
    except Exception:
        p = [max(0.0, effects.max()), math.log(np.median(pos)), 1.0]
    return p


# ---------------------------------------------------------------- the models
def presence(d, dmin, dmax):
    """How 'present' a drug is, 0 (absent) .. 1 (highest dose), on a log-like scale."""
    return np.log1p(d / dmin) / math.log1p(dmax / dmin)


def surfaces(da, db, pa, pb, ua, ub):
    """Predicted effect for every (gamma_BA, gamma_AB) pair in GRID x GRID, at each point.
    Returns array [len(GRID), len(GRID), n_points] (in % inhibition)."""
    # A's effect when B changes it:  dose_A * exp(gamma_BA * ub)
    ea = hill(da[None, :] * np.exp(GRID[:, None] * ub[None, :]), *pa) / 100      # [g_ba, pts]
    eb = hill(db[None, :] * np.exp(GRID[:, None] * ua[None, :]), *pb) / 100      # [g_ab, pts]
    ea, eb = np.clip(ea, 0, 1), np.clip(eb, 0, 1)
    return 100 * (1 - (1 - ea[:, None, :]) * (1 - eb[None, :, :])), ea, eb


def fit_and_score(da, db, y, pa, pb, ua, ub, train, test):
    S, ea, eb = surfaces(da, db, pa, pb, ua, ub)
    z = len(GRID) // 2                                           # index of gamma = 0
    res = {}
    sse = ((S[:, :, train] - y[train]) ** 2).sum(-1)

    def rmse(pred):
        return float(np.sqrt(np.mean((pred[test] - y[test]) ** 2)))

    res["bliss"] = rmse(S[z, z])
    i = int(np.argmin(np.diag(sse)))
    res["sym-1"] = rmse(S[i, i])
    # sym-2: equal boosting + synergy term delta * ea*eb (delta solved exactly for each gamma)
    best = None
    for i in range(len(GRID)):
        base = S[i, i]
        f = 100 * ea[i] * eb[i]
        r = y - base
        denom = (f[train] ** 2).sum()
        delta = (r[train] * f[train]).sum() / denom if denom > 1e-9 else 0.0
        delta = float(np.clip(delta, -2, 2))
        err = ((base[train] + delta * f[train] - y[train]) ** 2).sum()
        if best is None or err < best[0]:
            best = (err, base + delta * f)
    res["sym-2"] = rmse(best[1])
    i, j = np.unravel_index(int(np.argmin(sse)), sse.shape)     # i = gamma_BA, j = gamma_AB
    res["LIF"] = rmse(S[i, j])
    return res


def fit_gammas(da, db, y, pa, pb, ua, ub):
    """Fit LIF on all combination points; return (gamma_AB, gamma_BA)."""
    S, _, _ = surfaces(da, db, pa, pb, ua, ub)
    sse = ((S - y) ** 2).sum(-1)
    i, j = np.unravel_index(int(np.argmin(sse)), sse.shape)
    return float(GRID[j]), float(GRID[i])


def prepare(points):
    P = np.array(points)
    da, db, y = P[:, 0], P[:, 1], P[:, 2]
    mono_a, mono_b = db == 0, da == 0
    pa = fit_hill(da[mono_a], y[mono_a])
    pb = fit_hill(db[mono_b], y[mono_b])
    combo = (da > 0) & (db > 0)
    da, db, y = da[combo], db[combo], y[combo]
    ua = presence(da, da.min(), da.max())
    ub = presence(db, db.min(), db.max())
    return da, db, y, pa, pb, ua, ub


def artifact_check(points, seed):
    """TEST 3: make two fake repeats from a SYMMETRIC truth (gamma_AB = gamma_BA), with the same
    doses, curve shapes and noise level as the real experiment. Refit everything from scratch.
    If LIF still finds a direction that repeats, the direction in real data could be an artifact."""
    da, db, y, pa, pb, ua, ub = prepare(points)
    S, _, _ = surfaces(da, db, pa, pb, ua, ub)
    i = int(np.argmin(np.diag(((S - y) ** 2).sum(-1))))
    noise = max(3.0, float(np.std(S[i, i] - y)))
    P = np.array(points)
    A, B = P[:, 0], P[:, 1]
    # symmetric truth on the full 5x5 grid
    uA = np.where(A > 0, presence(np.maximum(A, 1e-12), A[A > 0].min(), A.max()), 0)
    uB = np.where(B > 0, presence(np.maximum(B, 1e-12), B[B > 0].min(), B.max()), 0)
    g = GRID[i]
    ea = np.clip(hill(A * np.exp(g * uB), *pa) / 100, 0, 1)
    eb = np.clip(hill(B * np.exp(g * uA), *pb) / 100, 0, 1)
    truth = 100 * (1 - (1 - ea) * (1 - eb))
    out = []
    rng = np.random.default_rng(seed)
    for _ in range(2):
        fake = [(a, b, t + rng.normal(0, noise)) for a, b, t in zip(A, B, truth)]
        gab, gba = fit_gammas(*prepare(fake))
        out.append(gab - gba)
    return tuple(out)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=6000, help="approximate number of experiments to use")
    args = ap.parse_args()

    print("loading real data...")
    blocks, meta = load_blocks()
    groups = defaultdict(list)                      # same drugs (same order) + same cell line
    for b, m in meta.items():
        groups[m].append(b)
    rng = random.Random(0)
    keys = [k for k, v in groups.items() if len(v) >= 2]
    rng.shuffle(keys)
    chosen, total = [], 0
    for k in keys:
        if total >= args.n:
            break
        chosen.append(k)
        total += len(groups[k])
    print(f"{len(blocks):,} experiments in the data; using {total:,} "
          f"({len(chosen):,} drug-pair/cell-line combinations, each repeated)\n")

    scores = defaultdict(list)
    wins = defaultdict(int)
    rep_pairs = []                                 # (asym in repeat 1, asym in repeat 2)
    sym_pairs = []
    null_pairs = []                                # same, on fake data with NO direction built in
    for n_done, k in enumerate(chosen, 1):
        gam = []
        for b in groups[k]:
            da, db, y, pa, pb, ua, ub = prepare(blocks[b])
            idx = np.arange(len(y))
            np.random.default_rng(b).shuffle(idx)
            train, test = idx[: len(y) // 2], idx[len(y) // 2:]
            s = fit_and_score(da, db, y, pa, pb, ua, ub, train, test)
            for m, v in s.items():
                scores[m].append(v)
            wins["LIF beats sym-2"] += s["LIF"] < s["sym-2"]
            wins["n"] += 1
            gam.append(fit_gammas(da, db, y, pa, pb, ua, ub))
        rep_pairs.append((gam[0][0] - gam[0][1], gam[1][0] - gam[1][1]))
        null_pairs.append(artifact_check(blocks[groups[k][0]], seed=n_done))
        sym_pairs.append((gam[0][0] + gam[0][1], gam[1][0] + gam[1][1]))
        if n_done % 300 == 0:
            print(f"  ...{n_done:,}/{len(chosen):,}")

    print("\n=== TEST 1: predicting unseen dose combinations (lower error = better) ===")
    print(f"{'model':<8} {'params':>6} {'avg error (% inhibition)':>26}")
    for m, p in (("bliss", 0), ("sym-1", 1), ("sym-2", 2), ("LIF", 2)):
        print(f"{m:<8} {p:>6} {np.mean(scores[m]):>26.2f}")
    print(f"LIF beat its fair rival sym-2 in {wins['LIF beats sym-2']:,} of {wins['n']:,} experiments "
          f"({wins['LIF beats sym-2'] / wins['n']:.0%})")

    a = np.array(rep_pairs)
    sy = np.array(sym_pairs)
    r_asym = float(np.corrcoef(a[:, 0], a[:, 1])[0, 1])
    r_sym = float(np.corrcoef(sy[:, 0], sy[:, 1])[0, 1])
    strong = (np.abs(a[:, 0]) >= 1) & (np.abs(a[:, 1]) >= 1)
    agree = float(np.mean(np.sign(a[strong, 0]) == np.sign(a[strong, 1]))) if strong.any() else float("nan")
    # chance level by shuffling which repeats are paired
    perm = np.random.default_rng(1).permutation(len(a))
    r_null = float(np.corrcoef(a[:, 0], a[perm, 1])[0, 1])
    print("\n=== TEST 2: is the direction (who changes whom) reproducible? ===")
    print(f"correlation of asymmetry (gamma_AB - gamma_BA) between repeats: {r_asym:+.2f}")
    print(f"   same, but with repeats shuffled (pure chance):                {r_null:+.2f}")
    print(f"   for comparison, overall boosting (gamma_AB + gamma_BA):        {r_sym:+.2f}")
    print(f"when both repeats show a clear direction, they agree {agree:.0%} of the time "
          f"({int(strong.sum())} cases; chance = 50%)")

    nl = np.array(null_pairs)
    r_fake = float(np.corrcoef(nl[:, 0], nl[:, 1])[0, 1])
    print("\n=== TEST 3: artifact check (fake data where NO direction exists) ===")
    print(f"correlation of asymmetry between fake repeats:                  {r_fake:+.2f}")
    if r_asym > r_fake + 0.1:
        print("-> real data shows MORE repeatable direction than the artifact level: evidence it is real.")
    else:
        print("-> real data is NOT clearly above the artifact level: the direction may be a fitting artifact.")


if __name__ == "__main__":
    main()
