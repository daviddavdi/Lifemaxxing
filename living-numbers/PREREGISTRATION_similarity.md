# Pre-registration: Experiment 4, Similarity (S)

**Written and committed BEFORE running the test.** The analysis is in `lif_similarity.py`.

## Hypothesis (from LIF)

LIF multiplies every interaction by the similarity `S(a, b)`: more similar things interact more strongly.

## How similarity is measured

Each of the 38 drugs is labelled by mechanism (see `DRUG_CLASSES` in `lif_similarity.py`),
with a broad family and a specific mechanism:

- `S = 1.0` same specific mechanism (e.g. carboplatin + oxaliplatin)
- `S = 0.5` same broad family, different mechanism
- `S = 0.0` different families

Labels come from each drug's known primary mechanism and were fixed before any result was seen.

## Predictions

Unit of analysis: drug **pair** (averaged over cell lines), so 583 pairs and no double counting.
Significance: **permutation test**, shuffling which drug has which label (10,000 shuffles).
A prediction **passes** only if it goes the predicted way with p < 0.05.

| # | prediction | does standard pharmacology also predict it? |
|---|---|---|
| P1 | Interaction **strength** `|γ_AB| + |γ_BA|` increases with S | **Yes** (same-mechanism drugs act like extra dose) → passing is weak evidence for LIF |
| P2 | Interaction **direction** `|γ_AB − γ_BA|` increases with S | **No**, if anything the opposite → **this is the real test of LIF** |
| P3 | Adding S to the power × openness model (`γ = μ + p_A·o_B·(1 + β·S)`) predicts held-out drug pairs better than without S, with β > 0 | Partly |

The test statistic for P1 and P2 is the Spearman correlation between S and the quantity, over pairs.
P2 is also computed on the fake (no-direction) data as an artifact check.

## What counts as failure

If P2 doesn't pass, LIF's claim that similarity scales the *directional* interaction is not
supported by this data, and that will be reported as a failure, whatever P1 and P3 show.

---

## Results (added after running; predictions above unchanged)

583 drug pairs: 12 same mechanism, 69 same family, 502 different.

| # | result | verdict |
|---|---|---|
| P1 strength vs S | Spearman +0.018, p = 0.22 (averages 2.67 / 2.74 / 3.36 for S = 0 / 0.5 / 1) | **FAIL** |
| P2 direction vs S | Spearman −0.053, p = 0.82 (averages 2.12 / 2.08 / 1.89): slightly the **opposite** way | **FAIL** |
| P3 S in the model | error 1.8056 → 1.8050 (−0.0024 ± 0.0009); β per fold +0.15, −0.13, +0.15, +0.15, −0.21 | technically **PASS** under the rule, but the gain is 0.1% and β flips sign between folds, so we treat it as **no real effect** |

**Conclusion: the claim that similarity scales interactions is not supported by this data.**
The key test (P2) failed, and it leaned toward what standard pharmacology expects: same-mechanism
pairs are slightly *more* symmetric. The same-mechanism group is small (12 pairs), so a weak
effect can't be ruled out, but there is no evidence for it here.
