# Pre-registration: Experiment 5, LIF Version 3 on NCI-ALMANAC

**Written and committed BEFORE any ALMANAC interaction was computed.** Only the file layout
(4×4 dose grids, 60 cell lines, ~104 drugs) and drug names were looked at.

## The formula being tested (Version 3, author's choices)

```
γ_AB,env = μ + k[family_A, family_B] · (p_A + e_env) · (o_B + f_env) · (1 + β · (1 − S_AB))
```

- `p`, `o`: each drug's power and openness; `e_env`, `f_env`: each cell line's shift of power and openness
- `k`: bond, one value per (family of A, family of B), can be negative
- `S`: similarity from mechanism labels (`almanac_labels.py`, fixed before results): 1 same mechanism, 0.5 same family, 0 otherwise
- γ is measured per experiment exactly as in Experiments 2–3 (`lif_drugs.py`, unchanged)

## Data and procedure (fixed in advance)

- NCI-ALMANAC from DrugComb v1.4 (Zenodo 18449193), 4×4 dose grids.
- Drugs labelled `None` in `almanac_labels.py` are excluded.
- A random 60,000 drug pair × cell line experiments (seed 0) are fitted, each with one
  fake no-direction twin (artifact control), as in `lif_gamma_table.py`.
- Hold-out: 5 folds **by drug pair** (seed 0). Every model is fitted on 4 folds and scored on the 5th.
- Uncertainty: **cluster bootstrap over drug pairs** (2,000 resamples). "Significant" = 95%
  interval excludes zero in the predicted direction.

## Hypotheses: each passes or fails on its own

| # | hypothesis | pass condition |
|---|---|---|
| H1 | **Carry-over:** per-drug power/openness learned on other pairs predicts the **direction** of unseen pairs | correlation (predicted vs. observed γ_AB − γ_BA) on held-out pairs is significantly > 0 **and** significantly greater than the same number on the fake data |
| H2 | **Multiply, not add:** `(p+e)(o+f)` predicts held-out γ better than additive `μ + u_A + v_B + w_env` | held-out squared error significantly lower for multiplicative |
| H3 | **Opposites interact more** | fitted β > 0, with 95% bootstrap interval excluding 0 |
| H4 | **Bond depends on type pairing** | `k[family, family]` gives significantly lower held-out error than a single `k` |
| H5 | **Useful:** Version 3 used as a prior predicts real dose responses of unseen pairs better than the best symmetric model (as in Exp. 3, Part 2) | held-out dose error significantly lower than symmetric (sym-1), on 2,000 held-out experiments, λ chosen on fold 0, scored on folds 1–4 |

## What counts as failure

Each hypothesis is reported as PASS or FAIL exactly by the rule above. The formula is
**not** changed after seeing these results; any change becomes Version 4 and needs new data.
