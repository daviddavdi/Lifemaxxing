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
