"""
lif_gamma_table.py - measure the interaction direction for every drug pair x cell line.

For each (drug A, drug B, cell line) in the O'Neil data, this fits the LIF interaction
gamma_AB (what A does to B) and gamma_BA (what B does to A), averaged over 2 repeats.
It ALSO builds one fake experiment with NO direction built in (gamma_AB = gamma_BA) at
the same doses, curve shapes and noise, and fits it the same way. That fake column is
the artifact control: anything we "discover" in it is produced by the method, not by drugs.

Output: data/gammas.csv   (used by lif_power.py)
Run:    python3 lif_gamma_table.py      (about 7 minutes on 4 cores)
"""

import argparse
import csv
import os
import random
from collections import defaultdict
from multiprocessing import Pool

import numpy as np

import lif_drugs as L

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "gammas.csv")
_blocks = None


def fake_gammas(points, seed):
    """One fake repeat from a symmetric truth; returns its fitted (gamma_AB, gamma_BA)."""
    da, db, y, pa, pb, ua, ub = L.prepare(points)
    S, _, _ = L.surfaces(da, db, pa, pb, ua, ub)
    i = int(np.argmin(np.diag(((S - y) ** 2).sum(-1))))
    noise = max(3.0, float(np.std(S[i, i] - y)))
    P = np.array(points)
    A, B = P[:, 0], P[:, 1]
    uA = np.where(A > 0, L.presence(np.maximum(A, 1e-12), A[A > 0].min(), A.max()), 0)
    uB = np.where(B > 0, L.presence(np.maximum(B, 1e-12), B[B > 0].min(), B.max()), 0)
    g = L.GRID[i]
    ea = np.clip(L.hill(A * np.exp(g * uB), *pa) / 100, 0, 1)
    eb = np.clip(L.hill(B * np.exp(g * uA), *pb) / 100, 0, 1)
    truth = 100 * (1 - (1 - ea) * (1 - eb))
    rng = np.random.default_rng(seed)
    fake = [(a, b, t + rng.normal(0, noise)) for a, b, t in zip(A, B, truth)]
    return L.fit_gammas(*L.prepare(fake))


def work(item):
    key, ids = item
    real = [L.fit_gammas(*L.prepare(_blocks[b])) for b in ids]
    gab = float(np.mean([r[0] for r in real]))
    gba = float(np.mean([r[1] for r in real]))
    fab, fba = fake_gammas(_blocks[ids[0]], seed=ids[0])
    return (*key, gab, gba, fab, fba, len(ids))


def init(blocks):
    global _blocks
    _blocks = blocks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=os.path.join(os.path.dirname(OUT), "oneil.csv"))
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--sample", type=int, default=0, help="use a random sample of this many combinations (seed 0)")
    args = ap.parse_args()
    print("loading real data...")
    blocks, meta = L.load_blocks(args.data)
    groups = defaultdict(list)
    for b, m in meta.items():
        groups[m].append(b)
    # keep only complete dose grids (at least 4x4); skips a few malformed experiments
    items = [(k, [b for b in sorted(v) if len(blocks[b]) >= 16][:2]) for k, v in sorted(groups.items())]
    items = [it for it in items if it[1]]
    if args.sample:
        items = random.Random(0).sample(items, min(args.sample, len(items)))
    print(f"fitting {len(items):,} drug-pair x cell-line combinations on 4 cores...")
    rows = []
    with Pool(4, initializer=init, initargs=(blocks,)) as pool:
        for n, r in enumerate(pool.imap_unordered(work, items, chunksize=50), 1):
            rows.append(r)
            if n % 2000 == 0:
                print(f"  {n:,}/{len(items):,}")
    with open(args.out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["drug_a", "drug_b", "cell_line", "g_ab", "g_ba", "fake_g_ab", "fake_g_ba", "repeats"])
        w.writerows(rows)
    print(f"saved {len(rows):,} rows to {args.out}")


if __name__ == "__main__":
    main()
