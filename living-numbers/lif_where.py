"""
lif_where.py - where does the interaction live? (exploratory, run after Experiment 5)

Splits each measured interaction gamma (what A does to B in one cell line) into parts and
asks, on held-out data, how much each part predicts:

  drugs      : actor's power + receiver's openness + cell line       (held out by drug pair)
  pair       : this exact directed pair, learned from OTHER cell lines (held out by experiment)
  pair+cell  : pair + cell line
  pair+drug×cell : pair + how each drug's power/openness changes in this cell line
The noise ceiling comes from the fake twins (known truth, same doses, same fitting).
Run: python3 lif_where.py
"""
import random
from collections import defaultdict

import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import lsqr

import lif_v3 as V

rows = V.directed(V.load())
fake = V.directed(V.load(fake=True))
y = np.array([r[3] for r in rows])
print(f"{len(rows):,} directed interactions, variance {y.var():.3f}")

# noise: the fake twins share the same truth in both directions, so their gap is pure noise
fr = V.load(fake=True)
noise = np.var([ab - ba for _, _, _, ab, ba in fr]) / 2
print(f"noise variance of one measured gamma ~ {noise:.3f}  -> best possible R2 ~ {1 - noise / y.var():.2f}\n")


def design(feats):
    idx, cols, n = {}, [], 0
    for r in rows:
        cs = []
        for f in feats:
            k = (f, f(r))
            if k not in idx:
                idx[k] = len(idx)
            cs.append(idx[k])
        cols.append(cs)
    i = np.repeat(np.arange(len(rows)), len(feats))
    j = np.concatenate(cols)
    return csr_matrix((np.ones(len(j)), (i, j)), shape=(len(rows), len(idx)))


actor = lambda r: ("A", r[0])
recv = lambda r: ("B", r[1])
cell = lambda r: ("C", r[2])
pair = lambda r: ("P", r[0], r[1])
actor_cell = lambda r: ("AC", r[0], r[2])
recv_cell = lambda r: ("BC", r[1], r[2])
upair = lambda r: tuple(sorted(r[:2]))

rng = random.Random(0)
pairs = sorted({upair(r) for r in rows})
pf = {p: rng.randrange(5) for p in pairs}
by_pair = np.array([pf[upair(r)] for r in rows])
# experiment-level folds: both directions of one experiment stay together
ex = {}
by_exp = np.array([ex.setdefault((upair(r), r[2]), rng.randrange(5)) for r in rows])


def cv(feats, folds, damp=1.0):
    X = design(feats)
    pred = np.zeros_like(y)
    for k in range(5):
        tr, te = folds != k, folds == k
        mu = y[tr].mean()
        w = lsqr(X[tr], y[tr] - mu, damp=damp)[0]
        pred[te] = mu + X[te] @ w
    return 1 - np.mean((y - pred) ** 2) / y.var()


print("held-out R2 (share of variation predicted); best of damping 1/3/10 - exploratory, not pre-registered:")
for name, feats, folds in [
    ("cell line only", [cell], by_pair),
    ("drugs (power+openness) + cell, new pairs", [actor, recv, cell], by_pair),
    ("drugs + drug×cell, new pairs", [actor, recv, cell, actor_cell, recv_cell], by_pair),
    ("pair seen in other cells", [pair], by_exp),
    ("pair + cell", [pair, cell], by_exp),
    ("pair + drug×cell", [pair, cell, actor_cell, recv_cell], by_exp),
]:
    best = max(cv(feats, folds, d) for d in (1, 3, 10))
    print(f"  {name:42s} {best:+.3f}   ({best / (1 - noise / y.var()):4.0%} of the reachable signal)")
