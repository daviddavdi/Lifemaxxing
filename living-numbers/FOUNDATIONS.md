# Living Numbers: Foundations

> Ordinary math isn't wrong, it's plain. 1 + 1 = 2 is exact for simple, identical things
> (electrons, dollars, bits). Living things (people, trees, apples, societies) are never
> identical and never stop changing. This project builds math **on top of** ordinary math
> to capture that.

## The six principles

| # | Principle | In plain words | Written as |
|---|-----------|----------------|------------|
| 1 | **Dynamic** | A number is a path through time, not a point. | `x(t)` |
| 2 | **Self-change** | Numbers change on their own (aging, growth, rot). | `x(t+1) = x(t) + f(x(t))` |
| 3 | **Interaction** | Every interaction changes **all** participants, including being observed. | `a, b → a', b'` with `a' ≠ a`, `b' ≠ b` |
| 4 | **Similarity, not equality** | No two numbers are equal, only similar from 0% to 100%. Even `x` now vs. `x` a moment ago is below 100%. | `S(a, b) ∈ [0, 1]` |
| 5 | **Fixed ruler** | A separate, unchanging scale is needed to measure change at all. | ordinary numbers |
| 6 | **Hidden state** | Much of what looks random is caused by details we can't see. | `x(t+1) = F(x(t), hidden(t))` |

## Living addition

```
A ⊕ B = A + B + I(A, B)
```

`I(A, B)` is the **interaction term**:

- `I > 0` synergy: a family (1 ⊕ 1 grows into 4)
- `I < 0` interference: Bonnie & Clyde
- `I = 0` strangers on a bus, where ordinary addition comes back as a special case

After `A ⊕ B`, both `A` and `B` are changed (Principle 3), and the result remembers where it came from.

## Consequences we already found

1. **Similarity doesn't chain.** Equality does: A = B and B = C means A = C. Similarity
   doesn't: you at 10 ≈ you at 13 (74%), you at 13 ≈ you at 16 (74%), but you at 10 vs. 16
   is only 55%. (`python3 living.py`)
2. **Computing changes the inputs.** Because using a number changes it, "the value of x"
   only makes sense **at a time**, and every number carries its history.

## Experiment 1: a poll that changes the voters (`election.py`)

A town of 1,500 unique voters. Each is a living number: a support level for candidate A
(0 = surely B, 1 = surely A) plus hidden traits: core belief, conformity, underdog
sympathy, stubbornness and base turnout. Every day they drift and talk with friends, and
every talk changes both people. Polls are published weekly, and **publishing is an
interaction**: conformists move toward the leader, underdog-lovers toward the trailer,
the leader's fans grow complacent and stay home, and being polled makes people a bit more
sure of themselves.

Three election-eve forecasts:

- **naive:** publish the raw poll.
- **standard:** publish a likely-voter-weighted poll (what real pollsters do).
- **reflexive:** find the number `f` that is still true **after** people react to it,
  the fixed point `f = poll + shift(f)`.

**Results (20 towns):**

| forecaster | avg error after publication | wrong winner |
|---|---|---|
| naive (raw poll) | 5.3% | 2 / 20 |
| standard (likely-voter) | 5.6% | 3 / 20 |
| **reflexive (fixed point)** | **1.7%** | 2 / 20 |

Publishing polls moved results by **2.9%** on average, compared with the same town never polled.

### Honest limitations

- **The reflexive forecaster knows the town's exact rules.** It doesn't know the
  individual people, but it knows how people react. Real forecasters would have to
  **estimate** those rules from data. This is a best case, not proof.
- **It doesn't pick the winner better in close races.** Near 50/50 it fails as often
  as the others (see town 11).
- **The town's rules are invented.** They're plausible and based on known effects
  (bandwagon, underdog, complacency, mere-measurement), but the numbers are made up.

### Prior work we must credit

- **Simon (1954), "Bandwagon and Underdog Effects and the Possibility of Election
  Predictions."** Herbert Simon proved that a forecast which stays correct after
  publication *can* exist, using **Brouwer's fixed-point theorem**. Our reflexive forecaster
  is his idea, built inside a living-numbers world. Grunberg & Modigliani (1954) proved a
  similar result for economic forecasts.
- **Morgenstern (1928)** argued the opposite: that published forecasts defeat themselves.
- **Soros: reflexivity** in markets. **Goodhart's law:** a measure that becomes a target
  stops being a good measure.

## Open questions (where something new could be found)

1. **When does no honest forecast exist?** Simon's proof needs the reaction to be
   *continuous*. In our town it isn't: at exactly 50% complacency jumps from one side to the
   other. So near a tie there may be **no** fixed point, meaning no number you can publish
   would come true. Can we prove when that happens and measure how big the "unforecastable
   zone" is? **This looks like the most promising lead.**
2. **Can the rules be learned?** Replace the all-knowing forecaster with one that estimates
   reactions from past polls and results. How much of the 1.7% advantage survives?
3. **A law of measurement effect:** a formula for how much publishing changes the outcome,
   given the population's traits.
4. **Real data:** test against historical polls and election results.
5. **Beyond elections:** markets, AI recommendation feeds, public health messaging, and
   school testing (Goodhart).

---

# The Living Interaction Formula (LIF)

*(working name; rename it anytime)*

## Version 2: two-way and uneven

Each living number has its own parameters: value `x`, **power** `p` (how strongly it
affects others), **openness** `o` (how easily it is changed; naive = high), and each
direction has its own bond `k_ab` (what a does to b) and `k_ba`.

```
a ⊕ b (t) = a + b + [ k_ab·p_a·o_b + k_ba·p_b·o_a ] · S(a,b) · a · b · (1 − e^(−t/τ))

a → a + ε · o_a · p_b · S · (b − a)
b → b + ε · o_b · p_a · S · (a − b)
```

- At `t = 0` it is ordinary addition.
- With everything equal it reduces to Version 1 (Mom + Dad goes 2 → 3.26 after 10 years → 3.90 after 30).
- A naive `a` (high `o_a`) next to a powerful `b` (high `p_b`) changes a lot while `b` barely moves.

## Experiment 2: LIF on real drug data (`lif_drugs.py`)

**Data:** O'Neil et al. 2016 (Merck), via DrugComb on Zenodo. 92,208 real experiments, each
a 5×5 grid of doses of two cancer drugs, measuring % of cancer cells inhibited. We used
6,000 experiments (1,485 drug pair and cell line combinations, each run more than once).

**LIF in drug terms:** each drug changes the other's effective dose, unevenly:
`dose_B → dose_B · exp(γ_AB · presence_A)`, where `γ_AB = k_AB · p_A · o_B`. With this data
only the product `γ` can be measured, not `k`, `p` and `o` separately.

### Test 1: predicting doses the model never saw (error in % inhibition, lower = better)

| model | params | error |
|---|---|---|
| Bliss (standard, no interaction) | 0 | 11.61 |
| symmetric boosting | 1 | **10.84** |
| symmetric + synergy term | 2 | 11.19 |
| **LIF (uneven)** | 2 | 11.05 |

**Result: LIF beats the standard Bliss model, but does NOT beat the simpler symmetric model at prediction.**

### Test 2: is the direction (who changes whom) real?

If LIF's direction were noise, repeated experiments wouldn't agree on it.

- correlation of direction between repeats: **+0.48** (chance: −0.08)
- when both repeats show a clear direction, they agree **78%** of the time (898 cases; chance = 50%)

### Test 3: artifact check

Fake repeats built from a truth with **no** direction, at the same doses, curve shapes
and noise, then refit from scratch: correlation **+0.12**.

**Result: real data shows much more repeatable direction (+0.48) than the method produces
by itself (+0.12). This is evidence that real drug interactions are uneven, as LIF says.**

### Honest limitations

- **No time data.** These experiments are snapshots, so the time part `(1 − e^(−t/τ))` is untested.
- **Prediction didn't improve.** Knowing the direction exists isn't yet the same as using it to predict better.
- **The artifact check assumes single-drug curves have the standard Hill shape.** If real
  curves are shaped differently, part of the "direction" could still come from that.
- **No pair was tested in both orders** (A,B) and (B,A), so that cross-check isn't possible with this data.
- **Prior work:** directional drug interaction parameters exist, notably **MuSyC (Meyer et al.
  2019)**, which has separate α₁₂ and α₂₁. Our result is consistent with theirs; it isn't a first.

## Experiment 3: do drugs have their own power and openness? (`lif_gamma_table.py`, `lif_power.py`)

LIF says `γ_AB = k · power_A · openness_B`. If each drug really carries one power and one
openness, then **we can predict how two drugs interact before they are ever tested
together.** We fitted the direction for all 22,737 drug pair × cell line combinations,
then held out whole drug pairs (5-fold) and predicted them from the other pairs. Every
test was repeated on fake data with no direction built in.

### Part 1: predicting the direction for pairs never seen together

| model | direction correlation | direction right | FAKE: corr | FAKE: right |
|---|---|---|---|---|
| no drug knowledge | +0.00 | 50% | +0.00 | 50% |
| additive (`μ + u_A + v_B`) | +0.21 | 58% | +0.11 | 54% |
| **LIF (`μ + p_A · o_B`)** | **+0.20** | **59%** | +0.10 | 54% |
| (+cell versions) | +0.20 to +0.21 | 58% | +0.11 | 54% |

**Result:** the direction of unseen pairs is predictable above the artifact level, but only
modestly: about half of the apparent skill also appears in fake data. LIF's power ×
openness does **not** beat the simpler additive form.

### Part 2: using power and openness to predict real doses

The direction predicted from *other* pairs is used as a gentle starting guess when fitting
a new experiment. λ (how strongly) was chosen on fold 0 only; numbers are folds 1–4, about 4,000 experiments.

| method | error | vs LIF prior (± std. error) |
|---|---|---|
| symmetric (previous winner) | 10.86 | +0.365 ± 0.037 |
| LIF with no prior | 10.94 | +0.445 ± 0.046 |
| same prior with direction removed | 10.58 | +0.093 ± 0.021 |
| additive prior | 10.50 | +0.011 ± 0.010 |
| **LIF power × openness prior** | **10.49** | reference |

**Result: for the first time, LIF beats the symmetric model** (by 0.37, about 10 standard errors).
- Most of the gain (~0.28) comes from **learning from other drug pairs**: drugs carry their own interaction habits.
- An extra, statistically clear gain (~0.09, about 4 standard errors) comes from the **direction**, i.e. who changes whom.
- The **multiplicative** power × openness form ties with the additive form, so the data doesn't yet tell them apart.

**Learned values** (all data, cell-line version):
- most powerful: MK-8669, AZD1775, MRK-003, SN-38, MK-2206
- most open: cyclophosphamide, BEZ-235, MK-8669, dasatinib, temozolomide
- least open: oxaliplatin, methotrexate, vinorelbine, carboplatin, doxorubicin

## Experiment 4: similarity (pre-registered; `lif_similarity.py`)

Predictions were committed **before** running (`PREREGISTRATION_similarity.md`). Each drug
was labelled by mechanism; `S` = 1 for the same mechanism, 0.5 for the same family, 0 otherwise.

- P1 strength grows with S: **FAIL** (p = 0.22)
- P2 direction grows with S (the test only LIF makes): **FAIL** (p = 0.82; slightly the opposite way)
- P3 S improves held-out prediction: technically passes, but the gain is 0.1% and the sign is unstable: **no real effect**

**LIF's similarity term is not supported in drug data.** Note that this was LIF's
*untested choice* "more similar = stronger" (open question 3 in the early design: "or do
opposites attract?"). A version where *different* mechanisms interact more is a **new**
hypothesis now, so it must be tested on **new data** (e.g. NCI-ALMANAC), not on this data
we've already looked at.

## Scorecard (after Experiment 6)

| LIF claim | status |
|---|---|
| interactions change both participants, unevenly (direction is real) | **supported** (Exp. 2: repeats agree 78%, well above the artifact level) |
| each thing has its own power / openness that carries to new partners | **weak**: real signal (Exp. 3, 5) but too small to improve predictions of new pairs (Exp. 6, G1) |
| power and openness **multiply** (`p·o`), not add | **rejected** (Exp. 5: additive is significantly better on unseen pairs) |
| more similar things interact more strongly | **not supported** (Exp. 4) |
| opposites interact more | **not supported** (Exp. 5: β ≈ 0) |
| the bond depends on the type pairing | **weakly supported** (Exp. 5: just significant) |
| direction of never-tested pairs predictable from characters | **weak**: correlation 0.12 (Exp. 5); no gain in dose prediction (Exp. 6) |
| useful for predicting real doses of untested pairs | **mixed**: beats a symmetric fit (Exp. 5) but not "no interaction" (Exp. 6) |
| each pair has its own bond | **strongly supported** (Exp. 6: 11.5% lower error) |
| a pair's direction carries to new environments | **supported** (Exp. 6: 2.7% lower error than without direction) |
| the environment changes each thing's power/openness | **not supported** (Exp. 6) |
| effects build over time (`τ`) | **untested** (no time data) |
| polls/predictions change outcomes (Exp. 1) | shown in simulation only |

## Version 3 (chosen by the author after Experiments 1-4)

**Core hypothesis:** when two things interact, the result depends on each one's own
character: how strongly it acts on others (**power**) and how easily it is changed
(**openness**). These belong to the thing itself, so pairings that have never happened can
be predicted.

```
effect of A on B  =  k[type_A, type_B] · (p_A + e_env) · (o_B + f_env) · (1 + β · (1 − S_AB))

a ⊕ b (t) = a + b + [effect A→B + effect B→A] · a · b · (1 − e^(−t/τ))
```

| choice | author's answer | consequence |
|---|---|---|
| power and openness | **multiply** | a fully closed thing (openness 0) is unchanged by anything, however powerful |
| environment | **changes both** | each environment shifts power (`e_env`) and openness (`f_env`) |
| bond sign `k` | **depends on the type pairing** | e.g. DNA-damage drug × growth-signal drug has its own `k`, which can be negative |
| similarity | **opposites interact more** | predicts `β > 0` |

"Opposites interact more" was chosen **after** Experiment 4, so it may only be tested on
new data (NCI-ALMANAC), with predictions written down first.

## Experiment 5: Version 3 on new data (pre-registered; `lif_v3.py`, `PREREGISTRATION_v3.md`)

Predictions were committed before any NCI-ALMANAC interaction was computed. 54,298
experiments, 4,642 drug pairs, 97 drugs, 60 cell lines; held out by drug pair.

| hypothesis | result | verdict |
|---|---|---|
| H1 direction carries to unseen pairs | corr +0.118 vs fake +0.034 | **PASS** |
| H2 power × openness beats power + openness | multiply is slightly *worse* | **FAIL** |
| H3 opposites interact more (β > 0) | β = −0.04 [−0.17, +0.08] | **FAIL** |
| H4 bond depends on the type pairing | small gain, interval just excludes 0 | **PASS** (borderline) |
| H5 useful for dose prediction | error 9.68 → 8.21 | **PASS** |

**What this means.** The core idea, that each thing has its *own* character which shows up
with partners it has never met, replicated on a second, independent dataset and makes real
predictions better. Two of the author's specific choices did not hold: "multiply" lost to
"add", and similarity (either way round) does not matter here. H5 shows the whole formula is
useful, but most of that comes from per-drug power/openness, which Experiment 3 already had.
The direction signal is real but small (correlation 0.12): most of each interaction is still
unexplained.

## Where does the interaction live? (exploratory, `lif_where.py`)

Not pre-registered, so these results only suggest where to look. Shares are of the
**reachable** signal: the fake twins show that about 81% of the spread in each measured γ is
fitting noise from the small 4×4 dose grid, so even a perfect formula could explain only ~19%.

| what the predictor knows | share of reachable signal |
|---|---|
| cell line only | 1% |
| each drug's power + openness (pair never seen) | 13% |
| + how each drug changes in this cell line | 19% |
| this exact pair, seen in other cell lines | 29% |
| pair + cell line | 31% |
| pair + how each drug changes in this cell line | 36% |

Lessons:
1. **Noise is the main enemy.** The two-step method (fit γ per experiment, then model it)
   throws most of the information away.
2. **Character is real but not everything:** a specific pair has a bond of its own beyond its
   two characters (29% vs 13%). This is closer to "Bonnie & Clyde" than family types are.
3. **The environment changes each drug** (13% → 19%), as the author predicted.
4. About two-thirds of the reachable signal is still unexplained.

## Experiment 6: Version 4 fitted on raw measurements (pre-registered; `lif_v4.py`, `PREREGISTRATION_v4.md`)

Version 4: `γ_AB,c = μ + p_A + o_B + p_A,c + o_B,c + K[family_A, family_B] + d_AB`, fitted to every
experiment's raw wells (no noisy one-number summaries), and tested once on 227,354 NCI-ALMANAC
experiments no model had seen.

| hypothesis | verdict |
|---|---|
| G1 drug characters predict direction for never-tested pairs | **FAIL** (the symmetric twin was slightly better) |
| G2 each pair has its own bond | **PASS** (11.5% lower error) |
| G3 the environment changes each drug | **FAIL** (no gain; tuning switched it off) |
| G4 beats "no interaction" (Bliss) for never-tested pairs | **FAIL** (no model did) |
| G5 a pair's direction carries to new cell lines | **PASS** (2.7% lower error than the same model without direction) |

**What this means.** Direction is real and stable, but it belongs to the **relationship**, not to
each thing alone: once a pair has been seen together, who-changes-whom carries into new
environments and improves predictions. From individual characters alone, neither direction nor
strength could be predicted well enough to beat "no interaction". The small character signal of
Experiments 3 and 5 is real but too weak to be useful on its own.

## Ways to improve LIF next

1. **Revise similarity** (done once, failed; see Exp. 4). Test "opposites interact more" on new data only.
2. **Bigger data to tell power × openness from additive.** NCI-ALMANAC (104 drugs, 60 cell
   lines) has many more pairs; the two forms make different predictions there.
3. **Time (`τ`).** Requires time-course combination data (measurements at several hours or days).
4. **Better single-drug curves.** Part of the artifact level comes from fitting each drug's
   curve; a more flexible curve should lower the fake signal and sharpen the real one.
5. **Sign of the bond `k`.** Allow `k` to depend on drug classes (some pairs help, some harm),
   which is the Bonnie & Clyde part of LIF.
