"""
lif_v4.py - Experiment 6: the pre-registered test of LIF Version 4 (PREREGISTRATION_v4.md).

    gamma_AB,c = mu + p_A + o_B + p_A,c + o_B,c + K[family_A, family_B] + d_AB

fitted directly on every experiment's raw-well error table (lif_v4_table.py), against
Bliss (no interaction), the symmetric twin S4, and V4 without the pair or cell terms.

Run: python3 lif_v4_table.py && python3 lif_v4.py
"""

import os

import numpy as np

from almanac_labels import ALMANAC_CLASSES

HERE = os.path.dirname(os.path.abspath(__file__))
TABLES = os.path.join(HERE, "data", "v4_tables.npz")
STEP, LO, NG = 0.2, -4.0, 41
RIDGES = (1, 10, 100, 1000)
BOOT, SEED = 2000, 0

# ---------------------------------------------------------------- data
Z = np.load(TABLES)
SSE = Z["sse"]                                  # [N, g_ba index, g_ab index]
NPTS = Z["npts"].astype(float)
DEV = Z["dev"]
da, db, cl = Z["drug_a"], Z["drug_b"], Z["cell"]
drugs = sorted(set(da) | set(db))
cells = sorted(set(cl))
fams = sorted({ALMANAC_CLASSES[d][0] for d in drugs})
D, C, F = len(drugs), len(cells), len(fams)
di = {d: i for i, d in enumerate(drugs)}
A = np.array([di[x] for x in da])
B = np.array([di[x] for x in db])
CL = np.array([cells.index(x) for x in cl])
FA = np.array([fams.index(ALMANAC_CLASSES[x][0]) for x in da])
FB = np.array([fams.index(ALMANAC_CLASSES[x][0]) for x in db])
N = len(A)
W = 1.0 / (2 * np.maximum(9.0, SSE.reshape(N, -1).min(1) / 7.0))   # precise experiments count more

PAIR = np.minimum(A, B) * D + np.maximum(A, B)                        # unordered pair id
CENTER = NG // 2


def folds_by(keys, seed=SEED):
    u = np.unique(keys)
    f = np.random.default_rng(seed).integers(0, 5, len(u))
    return f[np.searchsorted(u, keys)]


FOLD_PAIR = folds_by(PAIR)
FOLD_EXP = folds_by(PAIR * C + CL)


# ---------------------------------------------------------------- bilinear lookup of the error table
def lookup(idx, gab, gba):
    """Value and slopes of SSE at (gamma_AB, gamma_BA) for experiments idx."""
    x = np.clip((gab - LO) / STEP, 0, NG - 1 - 1e-6)
    y = np.clip((gba - LO) / STEP, 0, NG - 1 - 1e-6)
    j0, i0 = x.astype(int), y.astype(int)
    tx, ty = x - j0, y - i0
    v00 = SSE[idx, i0, j0]; v01 = SSE[idx, i0, j0 + 1]
    v10 = SSE[idx, i0 + 1, j0]; v11 = SSE[idx, i0 + 1, j0 + 1]
    val = (1 - ty) * ((1 - tx) * v00 + tx * v01) + ty * ((1 - tx) * v10 + tx * v11)
    dx = ((1 - ty) * (v01 - v00) + ty * (v11 - v10)) / STEP
    dy = ((1 - tx) * (v10 - v00) + tx * (v11 - v01)) / STEP
    inside_x = (gab > LO) & (gab < -LO)
    inside_y = (gba > LO) & (gba < -LO)
    return val, dx * inside_x, dy * inside_y


# ---------------------------------------------------------------- models
def groups(kind):
    """Parameter groups: (name, size, index for gamma_AB, index for gamma_BA, ridge kind).
    A symmetric model uses the same index for both directions, so gamma_AB = gamma_BA."""
    g = []
    if kind == "S4":
        lo, hi = np.minimum(A, B), np.maximum(A, B)
        flo, fhi = np.minimum(FA, FB), np.maximum(FA, FB)
        g = [("qA", D, A, A, "main", "share:q"), ("qB", D, B, B, "main", "share:q"),
             ("qcA", D * C, A * C + CL, A * C + CL, "cell", "share:qc"),
             ("qcB", D * C, B * C + CL, B * C + CL, "cell", "share:qc"),
             ("K", F * F, flo * F + fhi, flo * F + fhi, "main", None),
             ("d", D * D, lo * D + hi, lo * D + hi, "pair", None)]
        return g
    g = [("p", D, A, B, "main", None), ("o", D, B, A, "main", None)]
    if kind != "V4-cell":
        g += [("pc", D * C, A * C + CL, B * C + CL, "cell", None),
              ("oc", D * C, B * C + CL, A * C + CL, "cell", None)]
    g += [("K", F * F, FA * F + FB, FB * F + FA, "main", None)]
    if kind != "V4-pair":
        g += [("d", D * D, A * D + B, B * D + A, "pair", None)]
    return g


def fit(kind, train, ridge, iters=1200, lr=0.05):
    """Minimise sum_b W_b * SSE_b(gamma_AB, gamma_BA) / n + ridge penalties / n (Adam)."""
    gs = groups(kind)
    # shared parameter vectors: S4's qA/qB are the same vector q (a drug's strength), likewise qc
    vec = {}
    for name, size, _, _, _, share in gs:
        key = share or name
        vec.setdefault(key, np.zeros(size))
    keys = list(vec)
    rk = {(g[5] or g[0]): g[4] for g in gs}
    mu = np.zeros(1)
    m = {k: np.zeros_like(v) for k, v in vec.items()}; m["mu"] = np.zeros(1)
    s = {k: np.zeros_like(v) for k, v in vec.items()}; s["mu"] = np.zeros(1)
    idx = np.flatnonzero(train)
    n, w = len(idx), W[idx]
    sub = [(g[5] or g[0], g[2][idx], g[3][idx]) for g in gs]
    for t in range(1, iters + 1):
        gab = mu[0] + sum(vec[k][ia] for k, ia, _ in sub)
        gba = mu[0] + sum(vec[k][ib] for k, _, ib in sub)
        _, dx, dy = lookup(idx, gab, gba)
        dx, dy = w * dx / n, w * dy / n
        grads = {k: 2 * ridge[rk[k]] * vec[k] / n for k in keys}
        for k, ia, ib in sub:
            grads[k] += np.bincount(ia, dx, len(vec[k])) + np.bincount(ib, dy, len(vec[k]))
        grads["mu"] = np.array([dx.sum() + dy.sum()])
        allv = dict(vec, mu=mu)
        for k, gr in grads.items():
            m[k] = 0.9 * m[k] + 0.1 * gr
            s[k] = 0.999 * s[k] + 0.001 * gr ** 2
            allv[k] -= lr * (m[k] / (1 - 0.9 ** t)) / (np.sqrt(s[k] / (1 - 0.999 ** t)) + 1e-8)
    full = [(g[5] or g[0], g[2], g[3]) for g in gs]
    return lambda ids: (mu[0] + sum(vec[k][ia[ids]] for k, ia, _ in full),
                        mu[0] + sum(vec[k][ib[ids]] for k, _, ib in full)), vec


def heldout(kind, subset, folds, ridge, only=None):
    """Per-experiment held-out error (% inhibition^2) for experiments in subset."""
    err = np.full(N, np.nan)
    for k in (range(5) if only is None else [only]):
        tr, te = subset & (folds != k), np.flatnonzero(subset & (folds == k))
        pred, _ = fit(kind, tr, ridge)
        gab, gba = pred(te)
        err[te] = lookup(te, gab, gba)[0] / NPTS[te]
    return err


def bliss_err():
    return SSE[:, CENTER, CENTER] / NPTS


# ---------------------------------------------------------------- tuning (dev set only)
def tune(kind):
    ridge = {"main": 1, "cell": 1000, "pair": 1000}
    names = [g[4] for g in groups(kind)]
    for rk, folds in (("cell", FOLD_PAIR), ("pair", FOLD_EXP)):
        if rk not in names:
            continue
        scores = {}
        for r in RIDGES:
            e = heldout(kind, DEV, folds, dict(ridge, **{rk: r}), only=0)
            scores[r] = np.nanmean(e)
        ridge[rk] = min(scores, key=scores.get)
        print(f"   {kind:8s} {rk} ridge: " + "  ".join(f"{r}:{v:.2f}" for r, v in scores.items())
              + f"  -> {ridge[rk]}", flush=True)
    return ridge


def boot(diff, mask):
    """Cluster bootstrap over unordered drug pairs of the mean per-experiment difference."""
    u, inv = np.unique(PAIR[mask], return_inverse=True)
    sums = np.bincount(inv, diff[mask])
    cnts = np.bincount(inv).astype(float)
    rng = np.random.default_rng(SEED)
    stats = []
    for _ in range(BOOT):
        c = np.bincount(rng.integers(0, len(u), len(u)), minlength=len(u))
        stats.append((c * sums).sum() / (c * cnts).sum())
    return diff[mask].mean(), np.percentile(stats, [2.5, 97.5])


def main():
    conf = ~DEV
    print(f"{N:,} experiments: {DEV.sum():,} tuning, {conf.sum():,} confirmation; "
          f"{D} drugs, {C} cell lines, {len(np.unique(PAIR)):,} pairs\n")
    print("tuning ridges on the tuning set only...")
    ridges = {k: tune(k) for k in ("V4", "V4-pair", "V4-cell", "S4")}

    print("\nconfirmation (fitted and scored once)...", flush=True)
    E = {"bliss": bliss_err()}
    for kind in ("V4", "V4-cell", "S4"):
        E[("new", kind)] = heldout(kind, conf, FOLD_PAIR, ridges[kind])
        print(f"   new pairs  {kind:8s} RMSE {np.sqrt(np.nanmean(E[('new', kind)][conf])):.3f}", flush=True)
    for kind in ("V4", "V4-pair", "S4"):
        E[("known", kind)] = heldout(kind, conf, FOLD_EXP, ridges[kind])
        print(f"   known pair {kind:8s} RMSE {np.sqrt(np.nanmean(E[('known', kind)][conf])):.3f}", flush=True)
    print(f"   Bliss (no interaction) RMSE {np.sqrt(E['bliss'][conf].mean()):.3f}")

    tests = [("G1", "direction, new pairs: V4 vs S4", E[("new", "V4")], E[("new", "S4")]),
             ("G2", "pair's own bond: V4 vs V4-pair", E[("known", "V4")], E[("known", "V4-pair")]),
             ("G3", "environment: V4 vs V4-cell", E[("new", "V4")], E[("new", "V4-cell")]),
             ("G4", "useful: V4 vs Bliss, new pairs", E[("new", "V4")], E["bliss"]),
             ("G5", "direction, known pairs: V4 vs S4", E[("known", "V4")], E[("known", "S4")])]
    print("\nmean held-out error difference (negative = V4 better), 95% cluster bootstrap:")
    verdict = []
    for g, name, a, b in tests:
        mean, (lo, hi) = boot(a - b, conf)
        ok = hi < 0
        verdict.append(f"{g} {'PASS' if ok else 'FAIL'}")
        print(f"   {g} {name:34s} {mean:+.3f} [{lo:+.3f}, {hi:+.3f}]  ({mean / np.mean(b[conf]):+.1%})"
              f"  -> {'PASS' if ok else 'FAIL'}")

    pred, vec = fit("V4", conf, ridges["V4"])
    gab, gba = pred(np.flatnonzero(conf))
    print(f"\nfull V4 fit: mean gamma {np.mean(gab):+.2f}; direction |gamma_AB - gamma_BA| mean "
          f"{np.mean(np.abs(gab - gba)):.2f}")
    p, o = vec["p"], vec["o"]
    order = np.argsort(p - o)
    print("most 'actor' drugs (power - openness):", ", ".join(drugs[i] for i in order[::-1][:5]))
    print("most 'receiver' drugs:               ", ", ".join(drugs[i] for i in order[:5]))
    print("\nSUMMARY: " + ", ".join(verdict))


if __name__ == "__main__":
    main()
