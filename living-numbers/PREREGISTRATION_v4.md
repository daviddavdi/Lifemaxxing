# Pre-registration: Experiment 6, LIF Version 4 fitted on raw measurements

**Written and committed BEFORE any Version 4 model was fitted.** What was known beforehand:
the Experiment 5 results and the exploratory `lif_where.py` analysis (on the 54,655
Experiment 5 experiments only). The 227,354 other NCI-ALMANAC experiments have never been
used for any interaction fit.

## The formula (Version 4)

For drug A acting on drug B in cell line c:

```
γ_AB,c = μ + p_A + o_B + p_A,c + o_B,c + K[family_A, family_B] + d_AB
```

- `p_A` power of A, `o_B` openness of B (**added**, as Experiment 5 chose)
- `p_A,c`, `o_B,c`: how this cell line changes A's power and B's openness (environment changes each thing)
- `K[family, family]`: bond by type pairing (8 × 8 families, directed)
- `d_AB`: this exact pair's own bond, **directed** (d_AB ≠ d_BA), shrunk towards 0 so it only
  departs from the family bond when the data supports it
- similarity is dropped (failed twice)

γ then changes doses exactly as in Experiments 2–5: `dose_B,eff = dose_B · exp(γ_AB · presence_A)`, with
single-drug Hill curves fitted from the experiment's own single-drug wells, combined by Bliss.

## The change in method: fit on raw measurements

Before, each experiment was squeezed into one noisy γ estimate. Now every experiment keeps its
full error table: the squared error of its 9 raw combination wells for every
(γ_AB, γ_BA) on a 0.2-step grid from −4 to 4 (`lif_v4_table.py`, same curves as before).
A model is fitted by minimising, over all training experiments,

```
Σ_experiments  SSE(γ_AB, γ_BA) / (2 σ²)     σ² = max(9, best SSE / 7)
```

(bilinear interpolation between grid points), plus ridge penalties on every parameter group.
So a precise experiment counts more than a noisy one, and no information is thrown away.

## Rival models (all fitted the same way)

| model | what it is |
|---|---|
| **Bliss** | no interaction (γ = 0): the pharmacology standard |
| **S4 (symmetric)** | identical pieces, but no direction: γ_AB = γ_BA = μ + q_A + q_B + q_A,c + q_B,c + K_sym + d_{A,B} |
| **V4** | the formula above |
| V4 − pair | V4 without `d_AB` |
| V4 − cell | V4 without `p_A,c`, `o_B,c` |

## Data and procedure (fixed in advance)

- Experiments: NCI-ALMANAC blocks with ≥ 16 wells, both drugs labelled in `almanac_labels.py`.
- **Tuning set:** the 54,655 experiments whose (drug A, drug B, cell line) was in Experiment 5.
  Ridge strengths are chosen here only, separately for every model by the same rule:
  main ridge fixed at 1; cell ridge from {1, 10, 100, 1000} on a new-pair split; then pair
  ridge from {1, 10, 100, 1000} on a new-cell-line split; lowest held-out error wins.
- **Confirmation set:** the other 227,354 experiments. Fitted and scored once.
- Two splits of the confirmation set, 5 folds each (seed 0):
  - **new pairs:** folds by unordered drug pair (the pair was never seen together in training)
  - **known pair, new experiment:** folds by (pair, cell line); the pair was seen in other cell lines
- Score: held-out error per experiment = SSE at the predicted (γ_AB, γ_BA) / 9 wells (% inhibition²).
  No parameter is fitted on a held-out experiment except its own single-drug curves.
- Uncertainty: cluster bootstrap over unordered drug pairs, 2,000 resamples, of the mean
  difference in held-out error. "Significant" = 95% interval excludes 0 in the predicted direction.

## Hypotheses: each passes or fails on its own

| # | hypothesis | split | pass condition |
|---|---|---|---|
| G1 | **Direction (core):** V4 predicts combinations of never-tested pairs better than the same formula without direction | new pairs | error(V4) < error(S4) |
| G2 | **Pairs have their own bond** | known pair | error(V4) < error(V4 − pair) |
| G3 | **Environment changes each drug** | new pairs | error(V4) < error(V4 − cell) |
| G4 | **Useful:** better than the standard no-interaction prediction for never-tested pairs | new pairs | error(V4) < error(Bliss) |
| G5 | **A pair's direction carries to new cell lines** | known pair | error(V4) < error(S4) |

## What counts as failure

Each hypothesis is PASS or FAIL exactly by the rule above. The formula and procedure are not
changed after seeing results; any change becomes Version 5 and needs new data.
