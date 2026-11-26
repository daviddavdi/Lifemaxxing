"""
lif_v4_table.py - keep every experiment's full information for Version 4.

For each NCI-ALMANAC experiment (block) this stores the squared error of its raw combination
wells for every (gamma_BA, gamma_AB) on the 41 x 41 grid used since Experiment 2, instead of
squeezing it into one noisy gamma. Same single-drug curves as before (lif_drugs.prepare).

Output: data/v4_tables.npz  (sse [N,41,41] float32, npts, drug_a, drug_b, cell, dev flag)
Run:    python3 lif_v4_table.py      (about 20-40 minutes on 4 cores)
"""

import csv
import os
from collections import defaultdict
from multiprocessing import Pool

import numpy as np

import lif_drugs as L
from almanac_labels import ALMANAC_CLASSES

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "data", "almanac.csv")
DEV = os.path.join(HERE, "data", "almanac_gammas.csv")
OUT = os.path.join(HERE, "data", "v4_tables.npz")


def table(points):
    da, db, y, pa, pb, ua, ub = L.prepare(points)
    S, _, _ = L.surfaces(da, db, pa, pb, ua, ub)
    return ((S - y) ** 2).sum(-1).astype(np.float32), len(y)


def main():
    blocks = defaultdict(list)
    meta = {}
    with open(RAW) as f:
        for r in csv.DictReader(f):
            b = int(r["block"])
            blocks[b].append((float(r["dose_a"]), float(r["dose_b"]), float(r["inhibition"])))
            meta[b] = (r["drug_a"], r["drug_b"], r["cell_line"])
    dev = {(r["drug_a"], r["drug_b"], r["cell_line"]) for r in csv.DictReader(open(DEV))}
    ids = sorted(b for b in blocks if len(blocks[b]) >= 16
                 and ALMANAC_CLASSES.get(meta[b][0]) and ALMANAC_CLASSES.get(meta[b][1]))
    print(f"{len(ids):,} experiments; building error tables on 4 cores...")
    with Pool(4) as pool:
        res = []
        for n, r in enumerate(pool.imap(table, (blocks[b] for b in ids), chunksize=200), 1):
            res.append(r)
            if n % 20000 == 0:
                print(f"  {n:,}/{len(ids):,}", flush=True)
    np.savez(OUT,
             sse=np.stack([r[0] for r in res]),
             npts=np.array([r[1] for r in res]),
             block=np.array(ids),
             drug_a=np.array([meta[b][0] for b in ids]),
             drug_b=np.array([meta[b][1] for b in ids]),
             cell=np.array([meta[b][2] for b in ids]),
             dev=np.array([meta[b] in dev for b in ids]))
    print(f"saved {OUT}")


if __name__ == "__main__":
    main()
