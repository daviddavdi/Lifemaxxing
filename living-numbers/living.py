"""
living.py - the core of "living numbers".

A LivingNumber is a quantity that:
  1. changes over time                      (Principle 1: dynamic)
  2. changes on its own                     (Principle 2: self-change)
  3. is changed by EVERY interaction,       (Principle 3: interaction)
     including being observed
  4. is never "equal" to another, only      (Principle 4: similarity, not equality)
     similar by some percentage
  5. is measured against a fixed ruler      (Principle 5: the ruler stays still)
  6. looks random only because part of its  (Principle 6: hidden state)
     state is hidden

Run this file directly to see a small demo:
    python3 living.py
"""

import math
import random


class LivingNumber:
    """A number with a value, hidden traits, and a full history of how it got here."""

    def __init__(self, value, traits=None, name="x", seed=0, remember=True):
        self.name = name
        self.remember = remember           # False = skip the diary (faster for big simulations)
        self.value = float(value)          # what we can see (on the fixed ruler)
        self.traits = dict(traits or {})   # what makes it unique (partly hidden)
        self.t = 0                         # its own clock
        self.history = [(0, self.value, "born")]
        # Principle 6: its "randomness" comes from a hidden, fully determined state.
        # Same seed -> exactly the same life, every time.
        self._hidden = random.Random(seed)

    # ---- changing -------------------------------------------------------
    def change(self, new_value, cause):
        """Every change is recorded with its cause, so we know how the number became itself."""
        self.value = float(new_value)
        if self.remember:
            self.history.append((self.t, self.value, cause))

    def tick(self, drift_to=None, rate=0.0, jitter=0.0):
        """Principle 2: time passes and the number changes by itself."""
        self.t += 1
        v = self.value
        if drift_to is not None:
            v += rate * (drift_to - v)
        if jitter:
            v += self._hidden.gauss(0.0, jitter)
        self.change(v, "time")

    def observe(self, disturbance=0.0):
        """Principle 3: you cannot look without touching.
        Returns the value seen *before* the disturbance, then the number is changed by being seen."""
        seen = self.value
        if disturbance:
            self.change(self.value + disturbance, "observed")
        return seen

    # ---- comparing ------------------------------------------------------
    def similarity(self, other, scale=1.0):
        """Principle 4: two living numbers are never equal, only similar (0..1).
        Compares the visible value AND every shared trait."""
        diffs = [self.value - other.value]
        for k in self.traits.keys() & other.traits.keys():
            diffs.append(self.traits[k] - other.traits[k])
        distance = math.sqrt(sum(d * d for d in diffs))
        return math.exp(-distance / scale)

    def similarity_to_past(self, steps_ago, scale=1.0):
        """How similar am I to myself `steps_ago` changes ago? Almost never 100%."""
        idx = max(0, len(self.history) - 1 - steps_ago)
        past_value = self.history[idx][1]
        return math.exp(-abs(self.value - past_value) / scale)

    def __repr__(self):
        return f"<{self.name}={self.value:.3f} t={self.t} changes={len(self.history) - 1}>"


def interact(a, b, pull=0.1):
    """Principle 3: an interaction changes BOTH participants.
    The more similar they are, the more they influence each other."""
    s = a.similarity(b)
    da = pull * s * (b.value - a.value)
    db = pull * s * (a.value - b.value)
    a.change(a.value + da, f"met {b.name}")
    b.change(b.value + db, f"met {a.name}")
    return s


def living_add(a, b, synergy=0.0):
    """A ⊕ B = A + B + I(A, B).
    I is the interaction term: positive synergy (a family), negative (Bonnie & Clyde), or 0 (strangers).
    The result is a new living number that remembers its parents."""
    s = a.similarity(b)
    total = a.value + b.value + synergy * s * a.value * b.value
    child = LivingNumber(total, name=f"({a.name}⊕{b.name})")
    child.history[0] = (0, total, f"born from {a.name}={a.value:.2f} and {b.name}={b.value:.2f}")
    interact(a, b)  # making something together changes both makers
    return child


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=== 1. Two 'ones' are never the same one ===")
    fresh = LivingNumber(1.0, {"freshness": 0.95, "size": 1.0}, name="fresh_apple")
    rotten = LivingNumber(1.0, {"freshness": 0.20, "size": 0.7}, name="rotten_apple")
    print(f"both show value 1.0, but similarity = {fresh.similarity(rotten):.0%}")

    print("\n=== 2. Addition with interaction: A ⊕ B = A + B + I(A,B) ===")
    for label, syn in [("strangers", 0.0), ("family", 2.0), ("Bonnie & Clyde", -1.5)]:
        a = LivingNumber(1.0, {"x": 0.0}, name="a")
        b = LivingNumber(1.0, {"x": 0.1}, name="b")
        print(f"{label:>15}: 1 ⊕ 1 = {living_add(a, b, synergy=syn).value:.2f}")

    print("\n=== 3. Similarity does not chain (unlike equality) ===")
    you10 = LivingNumber(10, {"height": 1.40}, name="you_at_10")
    you13 = LivingNumber(13, {"height": 1.55}, name="you_at_13")
    you16 = LivingNumber(16, {"height": 1.72}, name="you_at_16")
    print(f"10 vs 13: {you10.similarity(you13, scale=10):.0%}")
    print(f"13 vs 16: {you13.similarity(you16, scale=10):.0%}")
    print(f"10 vs 16: {you10.similarity(you16, scale=10):.0%}   <- not the same as the chain suggests")

    print("\n=== 4. You are not the same number you were a moment ago ===")
    x = LivingNumber(1.0, name="me", seed=42)
    for _ in range(5):
        x.tick(jitter=0.05)
    print(f"me now vs me 5 steps ago: {x.similarity_to_past(5):.1%}")

    print("\n=== 5. 'Random' is hidden state: same seed, same life ===")
    a = LivingNumber(1.0, seed=7); b = LivingNumber(1.0, seed=7)
    for _ in range(100):
        a.tick(jitter=0.1); b.tick(jitter=0.1)
    print(f"two lives with the same hidden seed end at {a.value:.6f} and {b.value:.6f}")

    print("\n=== 6. Every number remembers how it became itself ===")
    for t, v, cause in x.history:
        print(f"  t={t}  value={v:.3f}  cause={cause}")
