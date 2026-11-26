"""
lif_v3.py - Experiment 5: the pre-registered test of LIF Version 3 on NCI-ALMANAC.

    gamma_AB,env = mu + k[family_A, family_B] * (p_A + e_env) * (o_B + f_env) * (1 + beta * (1 - S_AB))

The hypotheses and pass rules are in PREREGISTRATION_v3.md (committed before running).

Needs:
    python3 fetch_almanac.py
    python3 lif_gamma_table.py --data data/almanac.csv --out data/almanac_gammas.csv --sample 60000
Run:
    python3 lif_v3.py
"""

import csv
import os
import random
from collections import defaultdict

import numpy as np

import lif_drugs as L
from almanac_labels import ALMANAC_CLASSES

HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = os.path.join(HERE, "data", "almanac_gammas.csv")
DOSES = os.path.join(HERE, "data", "almanac.csv")
FOLDS, BOOT, SEED = 5, 2000, 0


def sim(a, b):
    (fa, ma), (fb, mb) = ALMANAC_CLASSES[a], ALMANAC_CLASSES[b]
    return 1.0 if ma == mb else 0.5 if fa == fb else 0.0


def load(fake=False):
    rows = []
    with open(TABLE) as f:
        for r in csv.DictReader(f):
            a, b = r["drug_a"], r["drug_b"]
            if ALMANAC_CLASSES.get(a) is None or ALMANAC_CLASSES.get(b) is None:
                continue
            ab = float(r["fake_g_ab" if fake else "g_ab"])
            ba = float(r["fake_g_ba" if fake else "g_ba"])
            rows.append((a, b, r["cell_line"], ab, ba))
    return rows


def directed(rows):
    out = []
    for a, b, c, ab, ba in rows:
        out += [(a, b, c, ab), (b, a, c, ba)]
    return out


# ---------------------------------------------------------------- models (Adam on squared error)
class Model:
    """kind: 'none' | 'add' | 'mult' (k single, beta=0) | 'v3-singlek' (beta, single k) | 'v3' (full)"""

    def __init__(self, kind, ridge=0.0, iters=1500, lr=0.03):
        self.kind, self.ridge, self.iters, self.lr = kind, ridge, iters, lr

    def _index(self, obs):
        s = np.array([self.di[o[0]] for o in obs])
        t = np.array([self.di[o[1]] for o in obs])
        c = np.array([self.ci[o[2]] for o in obs])
        fs = np.array([self.fi[ALMANAC_CLASSES[o[0]][0]] for o in obs])
        ft = np.array([self.fi[ALMANAC_CLASSES[o[1]][0]] for o in obs])
        S = np.array([sim(o[0], o[1]) for o in obs])
        return s, t, c, fs, ft, S

    def fit(self, obs, drugs, cells, weights=None, warm=None):
        self.di = {d: i for i, d in enumerate(drugs)}
        self.ci = {c: i for i, c in enumerate(cells)}
        fams = sorted({v[0] for v in ALMANAC_CLASSES.values() if v})
        self.fi = {f: i for i, f in enumerate(fams)}
        s, t, c, fs, ft, S = self._index(obs)
        g = np.array([o[3] for o in obs])
        w = np.ones_like(g) if weights is None else weights
        W = w.sum()
        nd, nc, nf = len(drugs), len(cells), len(fams)
        if self.kind == "none":
            self.th = {"mu": np.array((w * g).sum() / W)}
            return self
        rng = np.random.default_rng(SEED)
        if warm is not None:
            th = {k: v.copy() for k, v in warm.th.items()}
        elif self.kind == "add":
            th = {"mu": np.array(g.mean()), "u": np.zeros(nd), "v": np.zeros(nd), "w": np.zeros(nc)}
        else:
            th = {"mu": np.array(g.mean()), "p": 1 + 0.1 * rng.normal(size=nd), "o": 0.1 * rng.normal(size=nd),
                  "e": np.zeros(nc), "f": np.zeros(nc), "k": np.ones((nf, nf)), "beta": np.array(0.0)}
        m = {k: np.zeros_like(v) for k, v in th.items()}
        v2 = {k: np.zeros_like(v) for k, v in th.items()}
        iters = self.iters if warm is None else max(200, self.iters // 5)
        for it in range(1, iters + 1):
            pred, parts = self._pred(th, s, t, c, fs, ft, S)
            r = w * (pred - g) / W                       # d(loss)/d(pred), loss = weighted mean sq / 2
            grad = self._grad(th, parts, r, s, t, c, fs, ft, S, nd, nc, nf)
            for k in th:
                if k in ("mu",):
                    continue
                if self.kind in ("mult", "v3-singlek") and k == "k":
                    grad[k][:] = 0
                if self.kind == "mult" and k == "beta":
                    grad[k] = np.zeros_like(grad[k])
                grad[k] = grad[k] + self.ridge * th[k] * (0 if k in ("k", "beta") else 1)
            for k in th:
                m[k] = 0.9 * m[k] + 0.1 * grad[k]
                v2[k] = 0.999 * v2[k] + 0.001 * grad[k] ** 2
                th[k] = th[k] - self.lr * (m[k] / (1 - 0.9 ** it)) / (np.sqrt(v2[k] / (1 - 0.999 ** it)) + 1e-8)
        self.th = th
        return self

    def _pred(self, th, s, t, c, fs, ft, S):
        if self.kind == "none":
            return np.full(len(s), float(th["mu"])), None
        if self.kind == "add":
            return th["mu"] + th["u"][s] + th["v"][t] + th["w"][c], None
        P = th["p"][s] + th["e"][c]
        O = th["o"][t] + th["f"][c]
        K = th["k"][fs, ft]
        B = 1 + th["beta"] * (1 - S)
        return th["mu"] + K * P * O * B, (P, O, K, B)

    def _grad(self, th, parts, r, s, t, c, fs, ft, S, nd, nc, nf):
        gr = {"mu": np.array(r.sum())}
        if self.kind == "add":
            gr["u"] = np.bincount(s, r, nd)
            gr["v"] = np.bincount(t, r, nd)
            gr["w"] = np.bincount(c, r, nc)
            return gr
        P, O, K, B = parts
        gP, gO = r * K * O * B, r * K * P * B
        gr["p"] = np.bincount(s, gP, nd)
        gr["e"] = np.bincount(c, gP, nc)
        gr["o"] = np.bincount(t, gO, nd)
        gr["f"] = np.bincount(c, gO, nc)
        gk = np.zeros(nf * nf)
        np.add.at(gk, fs * nf + ft, r * P * O * B)
        gr["k"] = gk.reshape(nf, nf)
        gr["beta"] = np.array((r * K * P * O * (1 - S)).sum())
        return gr

    def predict_rows(self, rows):
        """returns (pred_ab, pred_ba) arrays for undirected rows"""
        ab = [(a, b, c, 0) for a, b, c, *_ in rows]
        ba = [(b, a, c, 0) for a, b, c, *_ in rows]
        out = []
        for obs in (ab, ba):
            idx = self._index(obs)
            out.append(self._pred(self.th, *idx)[0])
        return out


# ---------------------------------------------------------------- helpers
def pair_folds(rows):
    pairs = sorted({tuple(sorted(r[:2])) for r in rows})
    random.Random(SEED).shuffle(pairs)
    return {p: i % FOLDS for i, p in enumerate(pairs)}


def crossval(rows, kinds):
    drugs = sorted({r[0] for r in rows} | {r[1] for r in rows})
    cells = sorted({r[2] for r in rows})
    fold_of = pair_folds(rows)
    preds = {k: np.zeros((len(rows), 2)) for k in kinds}
    for f in range(FOLDS):
        tr = [r for r in rows if fold_of[tuple(sorted(r[:2]))] != f]
        te_idx = [i for i, r in enumerate(rows) if fold_of[tuple(sorted(r[:2]))] == f]
        te = [rows[i] for i in te_idx]
        for k in kinds:
            m = Model(k).fit(directed(tr), drugs, cells)
            pab, pba = m.predict_rows(te)
            preds[k][te_idx, 0], preds[k][te_idx, 1] = pab, pba
    return preds


def pair_ids(rows):
    keys = sorted({tuple(sorted(r[:2])) for r in rows})
    kid = {k: i for i, k in enumerate(keys)}
    return np.array([kid[tuple(sorted(r[:2]))] for r in rows]), len(keys)


def boot_ci(stat_fn, pid, npairs, seed=SEED):
    """cluster bootstrap over drug pairs. stat_fn(weights_per_row) -> number"""
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(BOOT):
        cnt = np.bincount(rng.integers(0, npairs, npairs), minlength=npairs)
        vals.append(stat_fn(cnt[pid].astype(float)))
    return np.percentile(vals, [2.5, 97.5])


def wcorr(x, y, w):
    mx, my = (w * x).sum() / w.sum(), (w * y).sum() / w.sum()
    cov = (w * (x - mx) * (y - my)).sum()
    return cov / np.sqrt((w * (x - mx) ** 2).sum() * (w * (y - my) ** 2).sum())


def verdict(ok):
    return "PASS" if ok else "FAIL"


# ---------------------------------------------------------------- main
def main():
    real, fake = load(False), load(True)
    pid, npairs = pair_ids(real)
    drugs = sorted({r[0] for r in real} | {r[1] for r in real})
    print(f"{len(real):,} experiments, {npairs:,} drug pairs, {len(drugs)} drugs, "
          f"{len({r[2] for r in real})} cell lines\n")
    obs = np.array([[r[3], r[4]] for r in real])
    obs_f = np.array([[r[3], r[4]] for r in fake])
    results = {}

    print("cross-validating models (5 folds by drug pair)...")
    P = crossval(real, ["none", "add", "mult", "v3-singlek", "v3"])
    PF = crossval(fake, ["v3"])

    # H1: direction carry-over, real vs fake
    da_obs, da_pred = obs[:, 0] - obs[:, 1], P["v3"][:, 0] - P["v3"][:, 1]
    fa_obs, fa_pred = obs_f[:, 0] - obs_f[:, 1], PF["v3"][:, 0] - PF["v3"][:, 1]
    ones = np.ones(len(real))
    r_real, r_fake = wcorr(da_pred, da_obs, ones), wcorr(fa_pred, fa_obs, ones)
    ci_real = boot_ci(lambda w: wcorr(da_pred, da_obs, w), pid, npairs)
    ci_diff = boot_ci(lambda w: wcorr(da_pred, da_obs, w) - wcorr(fa_pred, fa_obs, w), pid, npairs)
    results["H1"] = ci_real[0] > 0 and ci_diff[0] > 0
    print(f"\nH1 carry-over of direction to unseen pairs")
    print(f"   real corr {r_real:+.3f} [95% {ci_real[0]:+.3f}, {ci_real[1]:+.3f}]   fake corr {r_fake:+.3f}")
    print(f"   real - fake: [95% {ci_diff[0]:+.3f}, {ci_diff[1]:+.3f}]  -> {verdict(results['H1'])}")

    def sqerr(k):
        return ((P[k] - obs) ** 2).sum(1)

    def compare(a, b):
        """mean sq. error difference a - b per gamma, with cluster CI"""
        d = sqerr(a) - sqerr(b)
        ci = boot_ci(lambda w: (w * d).sum() / (2 * w.sum()), pid, npairs)
        return d.sum() / (2 * len(d)), ci

    for k in ("none", "add", "mult", "v3-singlek", "v3"):
        print(f"   held-out error ({k:<10}): {np.sqrt(sqerr(k).mean() / 2):.4f}")

    dm, ci = compare("mult", "add")
    results["H2"] = ci[1] < 0
    print(f"\nH2 multiply beats add: MSE(mult) - MSE(add) = {dm:+.4f} [95% {ci[0]:+.4f}, {ci[1]:+.4f}] "
          f"-> {verdict(results['H2'])}")

    # H3: beta on the full data, bootstrap by refitting with pair weights
    cells = sorted({r[2] for r in real})
    dobs = directed(real)
    dpid = np.repeat(pid, 2)
    full = Model("v3").fit(dobs, drugs, cells)
    beta = float(full.th["beta"])
    rng = np.random.default_rng(SEED)
    betas = []
    print(f"\nH3 opposites interact more: fitted beta = {beta:+.3f}; bootstrapping {BOOT} refits...")
    for i in range(BOOT):
        cnt = np.bincount(rng.integers(0, npairs, npairs), minlength=npairs).astype(float)
        mb = Model("v3").fit(dobs, drugs, cells, weights=cnt[dpid], warm=full)
        betas.append(float(mb.th["beta"]))
        if (i + 1) % 250 == 0:
            print(f"   {i + 1}/{BOOT}", flush=True)
    lo, hi = np.percentile(betas, [2.5, 97.5])
    results["H3"] = lo > 0
    print(f"   beta 95% interval [{lo:+.3f}, {hi:+.3f}] -> {verdict(results['H3'])}")

    dm, ci = compare("v3", "v3-singlek")
    results["H4"] = ci[1] < 0
    print(f"\nH4 bond by type pairing: MSE(k[fam,fam]) - MSE(single k) = {dm:+.4f} "
          f"[95% {ci[0]:+.4f}, {ci[1]:+.4f}] -> {verdict(results['H4'])}")

    results["H5"] = h5(real)

    print("\nfamily bond k (rows: family of A, cols: family of B), from full fit:")
    fams = sorted(full.fi, key=full.fi.get)
    print("   " + " ".join(f"{f[:8]:>9}" for f in fams))
    for i, f in enumerate(fams):
        print(f"   {f[:12]:<12}" + " ".join(f"{full.th['k'][i, j]:>+9.2f}" for j in range(len(fams))))

    print("\nSUMMARY:", ", ".join(f"{k} {verdict(v)}" for k, v in results.items()))


def h5(real, per_fold=500):
    """Version 3 as a prior for dose prediction of unseen pairs vs best symmetric model."""
    print("\nH5 useful for dose prediction: loading dose data...")
    blocks, meta = L.load_blocks(DOSES)
    used = {(r[0], r[1], r[2]) for r in real}
    fold_of = pair_folds(real)
    drugs = sorted({r[0] for r in real} | {r[1] for r in real})
    cells = sorted({r[2] for r in real})
    cand = defaultdict(list)
    for b, (a, bb, c) in meta.items():
        key = tuple(sorted((a, bb)))
        if (a, bb, c) in used or key not in fold_of or len(blocks[b]) < 16:
            continue
        cand[fold_of[key]].append(b)
    lams = [0, 20, 100, 500]
    errs = defaultdict(list)
    pairs_of = defaultdict(list)
    rng = random.Random(SEED)
    for f in range(FOLDS):
        tr = [r for r in real if fold_of[tuple(sorted(r[:2]))] != f]
        m = Model("v3").fit(directed(tr), drugs, cells)
        for b in rng.sample(cand[f], min(per_fold, len(cand[f]))):
            a, bb, c = meta[b]
            if c not in m.ci:
                continue
            da, db, y, pa, pb, ua, ub = L.prepare(blocks[b])
            idx = np.arange(len(y))
            np.random.default_rng(b).shuffle(idx)
            trn, te = idx[: len(y) // 2], idx[len(y) // 2:]
            S, _, _ = L.surfaces(da, db, pa, pb, ua, ub)
            sse = ((S[:, :, trn] - y[trn]) ** 2).sum(-1)
            kk = int(np.argmin(np.diag(sse)))

            def e(pred):
                return float(np.sqrt(np.mean((pred[te] - y[te]) ** 2)))

            errs[(f, "sym-1")].append(e(S[kk, kk]))
            gab, gba = (x[0] for x in m.predict_rows([(a, bb, c, 0, 0)]))
            for lam in lams:
                pen = lam * ((L.GRID[:, None] - gba) ** 2 + (L.GRID[None, :] - gab) ** 2)
                i, j = np.unravel_index(int(np.argmin(sse + pen)), sse.shape)
                errs[(f, f"v3 λ={lam}")].append(e(S[i, j]))
            pairs_of[f].append(tuple(sorted((a, bb))))
    best = min(lams, key=lambda lam: np.mean(errs[(0, f"v3 λ={lam}")]))
    sym = np.array([x for f in range(1, FOLDS) for x in errs[(f, "sym-1")]])
    v3 = np.array([x for f in range(1, FOLDS) for x in errs[(f, f"v3 λ={best}")]])
    keys = [p for f in range(1, FOLDS) for p in pairs_of[f]]
    uk = {k: i for i, k in enumerate(sorted(set(keys)))}
    pid = np.array([uk[k] for k in keys])
    d = v3 - sym
    ci = boot_ci(lambda w: (w * d).sum() / w.sum(), pid, len(uk))
    ok = ci[1] < 0
    print(f"   {len(d)} held-out experiments (folds 1-4), λ={best} chosen on fold 0")
    print(f"   symmetric error {sym.mean():.3f}, Version 3 prior error {v3.mean():.3f}")
    print(f"   difference {d.mean():+.3f} [95% {ci[0]:+.3f}, {ci[1]:+.3f}] -> {verdict(ok)}")
    return ok


if __name__ == "__main__":
    main()
