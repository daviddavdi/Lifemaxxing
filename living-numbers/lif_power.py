"""
lif_power.py - Experiment 3: do drugs have their own POWER and OPENNESS?

The Living Interaction Formula says what drug A does to drug B is

        gamma_AB = k * power_A * openness_B

so every drug should carry ONE power and ONE openness that stay the same whatever it is
paired with. If true, we can predict how two drugs interact BEFORE they are ever tested
together. This script checks that.

  * Hold out whole drug pairs (never seen together in training, in any cell line).
  * Learn each drug's power/openness from the other pairs.
  * Predict the held-out pairs.

Rivals:
  none       one number for everything (no drug knowledge)
  additive   gamma_AB = mu + u_A + v_B         (per-drug knobs, but no power x openness)
  LIF        gamma_AB = mu + p_A * o_B         (the formula's power x openness)
  ... and "+cell" versions where each cell line also has its own factor (the environment).

Artifact control: everything is repeated on FAKE data with no direction built in.
Part 2 then uses the learned power/openness to predict real dose experiments.

Needs data/gammas.csv (python3 lif_gamma_table.py) and data/oneil.csv.
Run:  python3 lif_power.py
"""

import csv
import os
import random
from collections import defaultdict

import numpy as np

import lif_drugs as L

HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = os.path.join(HERE, "data", "gammas.csv")
FOLDS = 5
RIDGE = 1.0


# ---------------------------------------------------------------- data
def load_table(fake=False):
    rows = []
    with open(TABLE) as f:
        for r in csv.DictReader(f):
            ab = float(r["fake_g_ab" if fake else "g_ab"])
            ba = float(r["fake_g_ba" if fake else "g_ba"])
            rows.append((r["drug_a"], r["drug_b"], r["cell_line"], ab, ba))
    return rows


def directed(rows):
    """Each row gives two observations: A->B and B->A."""
    out = []
    for a, b, c, ab, ba in rows:
        out.append((a, b, c, ab))
        out.append((b, a, c, ba))
    return out


# ---------------------------------------------------------------- models
class Model:
    def __init__(self, kind, cell=False):
        self.kind, self.cell = kind, cell

    def fit(self, obs, drugs, cells):
        self.di = {d: i for i, d in enumerate(drugs)}
        self.ci = {c: i for i, c in enumerate(cells)}
        s = np.array([self.di[o[0]] for o in obs])
        t = np.array([self.di[o[1]] for o in obs])
        c = np.array([self.ci[o[2]] for o in obs])
        g = np.array([o[3] for o in obs])
        nd, nc = len(drugs), len(cells)
        self.mu = g.mean()
        if self.kind == "none":
            return self
        if self.kind == "additive":
            # least squares with a small ridge: mu + u[s] + v[t] (+ w[c])
            cols = 2 * nd + (nc if self.cell else 0)
            X = np.zeros((len(g), cols))
            X[np.arange(len(g)), s] = 1
            X[np.arange(len(g)), nd + t] = 1
            if self.cell:
                X[np.arange(len(g)), 2 * nd + c] = 1
            y = g - self.mu
            w = np.linalg.solve(X.T @ X + RIDGE * np.eye(cols), X.T @ y)
            self.u, self.v = w[:nd], w[nd:2 * nd]
            self.w = w[2 * nd:] if self.cell else np.zeros(nc)
            return self
        # LIF: mu + p[s] * o[t] (* q[c]) by alternating least squares
        rng = np.random.default_rng(0)
        p, o, q = 1 + 0.1 * rng.normal(size=nd), 1 + 0.1 * rng.normal(size=nd), np.ones(nc)
        mu = self.mu
        for _ in range(60):
            r = g - mu
            fo = o[t] * q[c]
            p = np.bincount(s, r * fo, nd) / (np.bincount(s, fo * fo, nd) + RIDGE)
            fp = p[s] * q[c]
            o = np.bincount(t, r * fp, nd) / (np.bincount(t, fp * fp, nd) + RIDGE)
            if self.cell:
                fq = p[s] * o[t]
                q = np.bincount(c, r * fq, nc) / (np.bincount(c, fq * fq, nc) + RIDGE)
            mu = float(np.mean(g - p[s] * o[t] * q[c]))
        self.p, self.o, self.q, self.mu = p, o, q, mu
        return self

    def predict(self, src, dst, cell):
        if self.kind == "none":
            return self.mu
        s, t = self.di[src], self.di[dst]
        c = self.ci.get(cell)
        if self.kind == "additive":
            return self.mu + self.u[s] + self.v[t] + (self.w[c] if c is not None else 0)
        return self.mu + self.p[s] * self.o[t] * (self.q[c] if c is not None else 1)


MODELS = [("none", False), ("additive", False), ("LIF", False), ("additive", True), ("LIF", True)]


def label(kind, cell):
    return kind + ("+cell" if cell else "")


# ---------------------------------------------------------------- part 1
def pair_folds(rows):
    pairs = sorted({frozenset((a, b)) for a, b, *_ in rows}, key=sorted)
    random.Random(0).shuffle(pairs)
    return {p: i % FOLDS for i, p in enumerate(pairs)}


def evaluate(rows):
    drugs = sorted({r[0] for r in rows} | {r[1] for r in rows})
    cells = sorted({r[2] for r in rows})
    fold_of = pair_folds(rows)
    res = {label(*m): defaultdict(list) for m in MODELS}
    for f in range(FOLDS):
        train = [r for r in rows if fold_of[frozenset(r[:2])] != f]
        test = [r for r in rows if fold_of[frozenset(r[:2])] == f]
        for kind, cell in MODELS:
            m = Model(kind, cell).fit(directed(train), drugs, cells)
            R = res[label(kind, cell)]
            for a, b, c, ab, ba in test:
                pab, pba = m.predict(a, b, c), m.predict(b, a, c)
                R["err"] += [(pab - ab) ** 2, (pba - ba) ** 2]
                R["obs_asym"].append(ab - ba)
                R["pred_asym"].append(pab - pba)
    out = {}
    for name, R in res.items():
        oa, pa = np.array(R["obs_asym"]), np.array(R["pred_asym"])
        clear = np.abs(oa) >= 1
        out[name] = {
            "rmse": float(np.sqrt(np.mean(R["err"]))),
            "asym_r": float(np.corrcoef(oa, pa)[0, 1]) if pa.std() > 0 else 0.0,
            "sign": float(np.mean(np.sign(oa[clear]) == np.sign(pa[clear]))) if pa.std() > 0 else 0.5,
        }
    return out


def print_part1(real, fake):
    print(f"{'model':<14} {'gamma error':>11} {'direction corr':>15} {'direction right':>16} "
          f"| {'FAKE: corr':>10} {'FAKE: right':>11}")
    for name in real:
        r, f = real[name], fake[name]
        print(f"{name:<14} {r['rmse']:>11.3f} {r['asym_r']:>+15.2f} {r['sign']:>16.0%} "
              f"| {f['asym_r']:>+10.2f} {f['sign']:>11.0%}")


# ---------------------------------------------------------------- part 2
def fit_with_prior(da, db, y, pa, pb, ua, ub, train, g_ab_hat, g_ba_hat, lam):
    """LIF fit on the training points, gently pulled toward the predicted power x openness."""
    S, _, _ = L.surfaces(da, db, pa, pb, ua, ub)
    sse = ((S[:, :, train] - y[train]) ** 2).sum(-1)
    pen = lam * ((L.GRID[:, None] - g_ba_hat) ** 2 + (L.GRID[None, :] - g_ab_hat) ** 2)
    i, j = np.unravel_index(int(np.argmin(sse + pen)), sse.shape)
    return S[i, j]


def part2(rows, per_fold=1000):
    print("\nloading dose data for part 2...")
    blocks, meta = L.load_blocks()
    by_key = defaultdict(list)
    for b, m in meta.items():
        by_key[m].append(b)
    drugs = sorted({r[0] for r in rows} | {r[1] for r in rows})
    cells = sorted({r[2] for r in rows})
    fold_of = pair_folds(rows)
    lams = [0, 20, 100, 500]
    scores = defaultdict(list)          # (fold, method) -> errors
    rng = random.Random(1)
    for f in range(FOLDS):
        train_rows = [r for r in rows if fold_of[frozenset(r[:2])] != f]
        test_rows = [r for r in rows if fold_of[frozenset(r[:2])] == f]
        lif = Model("LIF", True).fit(directed(train_rows), drugs, cells)
        add = Model("additive", True).fit(directed(train_rows), drugs, cells)
        for a, b, c, *_ in rng.sample(test_rows, per_fold):
            # use a repeat NOT used to build the table when one exists
            ids = sorted(by_key[(a, b, c)])
            blk = ids[2] if len(ids) > 2 else ids[-1]
            da, db, y, pa, pb, ua, ub = L.prepare(blocks[blk])
            idx = np.arange(len(y))
            np.random.default_rng(blk).shuffle(idx)
            tr, te = idx[: len(y) // 2], idx[len(y) // 2:]

            def err(pred):
                return float(np.sqrt(np.mean((pred[te] - y[te]) ** 2)))

            S, _, _ = L.surfaces(da, db, pa, pb, ua, ub)
            sse = ((S[:, :, tr] - y[tr]) ** 2).sum(-1)
            k = int(np.argmin(np.diag(sse)))
            scores[(f, "sym-1")].append(err(S[k, k]))
            for name, m in (("LIF", lif), ("additive", add)):
                gab, gba = m.predict(a, b, c), m.predict(b, a, c)
                for lam in lams:
                    pred = fit_with_prior(da, db, y, pa, pb, ua, ub, tr, gab, gba, lam)
                    scores[(f, f"{name}-prior λ={lam}")].append(err(pred))
                    if name == "LIF":
                        # control: same prior, but with the DIRECTION removed (both = average)
                        gm = 0.5 * (gab + gba)
                        diag = np.diag(sse) + 2 * lam * (L.GRID - gm) ** 2
                        kk = int(np.argmin(diag))
                        scores[(f, f"sym-prior λ={lam}")].append(err(S[kk, kk]))
    # choose λ on fold 0 only, report folds 1..4 (no peeking at the test folds)
    best = {}
    for name in ("LIF", "additive", "sym"):
        best[name] = min(lams, key=lambda lam: np.mean(scores[(0, f"{name}-prior λ={lam}")]))
    report = {"sym-1 (best model so far)": "sym-1",
              "LIF, no prior (λ=0)": "LIF-prior λ=0",
              f"symmetric prior, no direction (λ={best['sym']})": f"sym-prior λ={best['sym']}",
              f"additive prior (λ={best['additive']})": f"additive-prior λ={best['additive']}",
              f"LIF power x openness prior (λ={best['LIF']})": f"LIF-prior λ={best['LIF']}"}
    print("\n=== PART 2: predicting unseen doses, for drug pairs the power/openness model never saw ===")
    print("(λ chosen on fold 0; numbers below are folds 1-4 only)")
    ref = np.array([x for f in range(1, FOLDS) for x in scores[(f, f"LIF-prior λ={best['LIF']}")]])
    for shown, key in report.items():
        e = np.array([x for f in range(1, FOLDS) for x in scores[(f, key)]])
        d = e - ref
        se = d.std(ddof=1) / np.sqrt(len(d)) if d.std() > 0 else 0.0
        vs = f"   vs LIF prior: {d.mean():+.3f} ± {se:.3f}" if d.std() > 0 else "   (reference)"
        print(f"  {shown:<44} error {e.mean():.2f}{vs}")
    print("  ('vs LIF prior' > 0 means LIF prior is better; difference is meaningful if > about 2x the ± value)")
    return best


def main():
    real = evaluate(load_table(False))
    fake = evaluate(load_table(True))
    print("=== PART 1: predicting the interaction direction of drug pairs NEVER seen together ===")
    print("(5-fold, held out by drug pair; 'right' = sign of who-changes-whom correct, chance 50%)\n")
    print_part1(real, fake)

    rows = load_table(False)
    drugs = sorted({r[0] for r in rows} | {r[1] for r in rows})
    m = Model("LIF", True).fit(directed(rows), drugs, sorted({r[2] for r in rows}))
    order = np.argsort(-m.p)
    print("\nlearned on all data, power (p) and openness (o) per drug:")
    print("  most powerful:", ", ".join(f"{drugs[i]} ({m.p[i]:+.2f})" for i in order[:5]))
    print("  least powerful:", ", ".join(f"{drugs[i]} ({m.p[i]:+.2f})" for i in order[-5:]))
    order = np.argsort(-m.o)
    print("  most open:     ", ", ".join(f"{drugs[i]} ({m.o[i]:+.2f})" for i in order[:5]))
    print("  least open:    ", ", ".join(f"{drugs[i]} ({m.o[i]:+.2f})" for i in order[-5:]))
    print(f"  corr(power, openness) across drugs: {np.corrcoef(m.p, m.o)[0, 1]:+.2f}")

    part2(rows)


if __name__ == "__main__":
    main()
