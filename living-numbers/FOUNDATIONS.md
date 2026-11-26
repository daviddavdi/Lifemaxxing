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

### Next step: test power and openness

LIF says `γ_AB = k · p_A · o_B`: each **drug** has its own power and openness. If that's
true, a drug's power should be **the same across all its partners and cell lines**. So:
fit one `p` and one `o` per drug from part of the data, then predict the direction for drug
pairs never seen together. Success would mean LIF's parameters are real properties of
drugs and not just curve-fitting, and it would be a genuine prediction that symmetric
models cannot make.
