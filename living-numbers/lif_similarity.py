"""
lif_similarity.py - Experiment 4: does SIMILARITY scale interactions, as LIF says?

Predictions were written down first in PREREGISTRATION_similarity.md.
Needs data/gammas.csv (python3 lif_gamma_table.py).
Run:  python3 lif_similarity.py
"""

import csv
import os
import random
from collections import defaultdict

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = os.path.join(HERE, "data", "gammas.csv")

# drug -> (broad family, specific mechanism), from each drug's known primary mechanism
DRUG_CLASSES = {
    "5-FU": ("DNA damage", "antimetabolite"),
    "GEMCITABINE": ("DNA damage", "antimetabolite"),
    "METHOTREXATE": ("DNA damage", "antimetabolite"),
    "CARBOPLATIN": ("DNA damage", "platinum"),
    "OXALIPLATIN": ("DNA damage", "platinum"),
    "CYCLOPHOSPHAMIDE": ("DNA damage", "alkylating"),
    "MITOMYCINE": ("DNA damage", "alkylating"),
    "TEMOZOLOMIDE": ("DNA damage", "alkylating"),
    "DOXORUBICIN": ("DNA damage", "topoisomerase II"),
    "ETOPOSIDE": ("DNA damage", "topoisomerase II"),
    "SN-38": ("DNA damage", "topoisomerase I"),
    "TOPOTECAN": ("DNA damage", "topoisomerase I"),
    "ABT-888": ("DNA repair / checkpoint", "PARP"),
    "MK-4827": ("DNA repair / checkpoint", "PARP"),
    "AZD1775": ("DNA repair / checkpoint", "checkpoint kinase"),
    "MK-8776": ("DNA repair / checkpoint", "checkpoint kinase"),
    "BEZ-235": ("growth signalling", "PI3K/AKT/mTOR"),
    "MK-2206": ("growth signalling", "PI3K/AKT/mTOR"),
    "MK-8669": ("growth signalling", "PI3K/AKT/mTOR"),
    "ERLOTINIB": ("growth signalling", "EGFR family"),
    "LAPATINIB": ("growth signalling", "EGFR family"),
    "SORAFENIB": ("growth signalling", "multi-kinase"),
    "SUNITINIB": ("growth signalling", "multi-kinase"),
    "DASATINIB": ("growth signalling", "multi-kinase"),
    "PD325901": ("growth signalling", "MEK"),
    "L778123": ("growth signalling", "farnesyltransferase"),
    "MRK-003": ("growth signalling", "notch / gamma-secretase"),
    "PACLITAXEL": ("cell division", "microtubule"),
    "VINBLASTINE": ("cell division", "microtubule"),
    "VINORELBINE": ("cell division", "microtubule"),
    "MK-5108": ("cell division", "mitotic / CDK kinase"),
    "DINACICLIB": ("cell division", "mitotic / CDK kinase"),
    "BORTEZOMIB": ("protein handling", "proteasome"),
    "GELDANAMYCIN": ("protein handling", "HSP90"),
    "DEXAMETHASONE": ("hormone", "glucocorticoid"),
    "MK-4541": ("hormone", "androgen receptor"),
    "METFORMIN": ("metabolism", "metformin"),
    "ZOLINZA": ("epigenetic", "HDAC"),
}


def similarity(a, b, classes):
    fa, ma = classes[a]
    fb, mb = classes[b]
    if ma == mb:
        return 1.0
    if fa == fb:
        return 0.5
    return 0.0


def load_pairs(fake=False):
    """Average over cell lines -> one row per drug pair."""
    acc = defaultdict(list)
    with open(TABLE) as f:
        for r in csv.DictReader(f):
            ab = float(r["fake_g_ab" if fake else "g_ab"])
            ba = float(r["fake_g_ba" if fake else "g_ba"])
            acc[(r["drug_a"], r["drug_b"])].append((ab, ba))
    pairs = []
    for (a, b), v in acc.items():
        v = np.array(v)
        pairs.append((a, b,
                      float(np.mean(np.abs(v[:, 0]) + np.abs(v[:, 1]))),   # strength
                      float(np.mean(np.abs(v[:, 0] - v[:, 1])))))           # direction
    return pairs


def spearman(x, y):
    rx = np.argsort(np.argsort(x)).astype(float)
    ry = np.argsort(np.argsort(y)).astype(float)
    return float(np.corrcoef(rx, ry)[0, 1])


def perm_test(pairs, col, n=10_000, seed=0):
    drugs = sorted(DRUG_CLASSES)
    labels = [DRUG_CLASSES[d] for d in drugs]
    y = np.array([p[col] for p in pairs])
    s_obs = np.array([similarity(p[0], p[1], DRUG_CLASSES) for p in pairs])
    obs = spearman(s_obs, y)
    rng = random.Random(seed)
    count = 0
    for _ in range(n):
        shuffled = labels[:]
        rng.shuffle(shuffled)
        cl = dict(zip(drugs, shuffled))
        s = np.array([similarity(p[0], p[1], cl) for p in pairs])
        if spearman(s, y) >= obs:
            count += 1
    return obs, (count + 1) / (n + 1), s_obs, y


def by_level(s, y):
    return {lvl: (float(y[s == lvl].mean()), int((s == lvl).sum())) for lvl in (0.0, 0.5, 1.0)}


# ---------------------------------------------------------------- P3
def p3():
    """Held-out drug pairs: power x openness, with and without similarity."""
    import lif_power as LP
    rows = LP.load_table(False)
    drugs = sorted({r[0] for r in rows} | {r[1] for r in rows})
    cells = sorted({r[2] for r in rows})
    fold_of = LP.pair_folds(rows)
    err = {"LIF": [], "LIF+S": []}
    betas = []
    for f in range(LP.FOLDS):
        train = LP.directed([r for r in rows if fold_of[frozenset(r[:2])] != f])
        test = [r for r in rows if fold_of[frozenset(r[:2])] == f]
        base = LP.Model("LIF", True).fit(train, drugs, cells)
        # fit beta on training data: gamma - mu = p*o*q*(1 + beta*S)  -> 1-D least squares
        z = np.array([base.p[base.di[s]] * base.o[base.di[t]] * base.q[base.ci[c]] for s, t, c, _ in train])
        S = np.array([similarity(s, t, DRUG_CLASSES) for s, t, _, _ in train])
        g = np.array([o[3] for o in train]) - base.mu
        r = g - z
        beta = float((r * z * S).sum() / ((z * S) ** 2).sum())
        betas.append(beta)
        for a, b, c, ab, ba in test:
            for src, dst, obs in ((a, b, ab), (b, a, ba)):
                pred = base.predict(src, dst, c)
                s = similarity(src, dst, DRUG_CLASSES)
                err["LIF"].append((pred - obs) ** 2)
                err["LIF+S"].append((base.mu + (pred - base.mu) * (1 + beta * s) - obs) ** 2)
    d = np.array(err["LIF+S"]) - np.array(err["LIF"])
    return (float(np.sqrt(np.mean(err["LIF"]))), float(np.sqrt(np.mean(err["LIF+S"]))),
            float(d.mean()), float(d.std(ddof=1) / np.sqrt(len(d))), betas)


def main():
    assert set(DRUG_CLASSES) >= {p[0] for p in load_pairs()} | {p[1] for p in load_pairs()}
    pairs = load_pairs(False)
    fake = load_pairs(True)
    s_all = np.array([similarity(p[0], p[1], DRUG_CLASSES) for p in pairs])
    print(f"{len(pairs)} drug pairs: {int((s_all == 1).sum())} same mechanism, "
          f"{int((s_all == 0.5).sum())} same family, {int((s_all == 0).sum())} different\n")
    verdicts = {}
    for name, col, label in (("P1", 2, "strength |g_AB|+|g_BA|"), ("P2", 3, "direction |g_AB-g_BA|")):
        rho, p, s, y = perm_test(pairs, col)
        lv = by_level(s, y)
        ok = rho > 0 and p < 0.05
        verdicts[name] = ok
        print(f"=== {name}: does {label} increase with similarity? ===")
        for lvl, (m, n) in lv.items():
            print(f"   S={lvl:<4} average {m:.3f}   ({n} pairs)")
        print(f"   Spearman correlation {rho:+.3f}, permutation p = {p:.4f}  ->  {'PASS' if ok else 'FAIL'}")
        if name == "P2":
            rf, pf, sf, yf = perm_test(fake, 3, n=2000)
            print(f"   artifact check on fake data: correlation {rf:+.3f}, p = {pf:.3f}")
        print()
    e0, e1, dm, se, betas = p3()
    ok = dm < -2 * se and np.mean(betas) > 0
    verdicts["P3"] = ok
    print("=== P3: does adding similarity improve predictions for unseen drug pairs? ===")
    print(f"   error without S {e0:.4f}, with S {e1:.4f}  (difference {dm:+.4f} ± {se:.4f})")
    print(f"   fitted beta per fold: {', '.join(f'{b:+.2f}' for b in betas)}")
    print(f"   -> {'PASS' if ok else 'FAIL'}\n")
    print("SUMMARY:", ", ".join(f"{k} {'PASS' if v else 'FAIL'}" for k, v in verdicts.items()))


if __name__ == "__main__":
    main()
