"""
election.py - Experiment 1: a poll that changes the voters it measures.

A town of unique voters (living numbers) heads toward an election.
Polls are published along the way. Publishing a poll is an interaction:
it changes the voters, so the poll changes the result it is trying to predict.

We compare two forecasters on election eve:

  * NAIVE      publishes the latest poll, as if measuring did not change anything.
  * REFLEXIVE  asks: "what number can I publish that will still be true AFTER people
               react to it?"  It searches for a fixed point f where publishing f leads
               to an outcome of about f.

Run:
    python3 election.py            # full experiment over many towns
    python3 election.py --one      # follow one town day by day
"""

import copy
import random
import statistics
import sys

from living import LivingNumber

# ---- the rules of this town (the forecaster is assumed to know these) -------
N_VOTERS = 1500
FRIENDS = 8
DAYS = 60
POLL_EVERY = 7
FINAL_POLL_DAY = DAYS - 3      # election-eve forecast is published 3 days out
POLL_SIZE = 800

DRIFT = 0.03                   # pull back toward one's own core belief each day
JITTER = 0.015                 # daily changes from hidden state
TALK_PULL = 0.08               # how strongly two people move toward each other
BANDWAGON = 0.3                # move toward whoever the poll says is winning
UNDERDOG = 0.3                 # move toward whoever the poll says is losing
COMPLACENCY = 1.6              # leader's fans stay home when the lead looks safe
MOBILIZE = 0.6                 # trailing side's fans show up when it looks close
MEASURE_SHIFT = 0.03           # being asked makes you a bit more sure of yourself


def make_town(seed, remember=True):
    """Build a town where every voter is unique."""
    rng = random.Random(seed)
    voters = []
    lean = rng.uniform(0.47, 0.53)          # the town's overall lean, unknown in advance
    for i in range(N_VOTERS):
        core = min(1, max(0, rng.gauss(lean, 0.18)))
        traits = {
            "core": core,                                   # who they "really" are
            "conformity": rng.betavariate(2, 5),            # follow the crowd
            "underdog": rng.betavariate(1.5, 8),            # root for the loser
            "stubborn": rng.betavariate(2, 3),              # resist others
            "turnout": rng.uniform(0.45, 0.9),              # base chance to vote
        }
        voters.append(LivingNumber(core, traits, name=f"v{i}", seed=rng.random(), remember=remember))
    # friendships form between similar people (homophily)
    order = sorted(range(N_VOTERS), key=lambda i: voters[i].traits["core"])
    friends = []
    for pos, i in enumerate(order):
        near = order[max(0, pos - 15): pos + 16]
        friends.append(rng.sample([j for j in near if j != i], FRIENDS))
    return {"voters": voters, "friends": friends, "rng": rng, "day": 0, "last_poll": None}


def clamp(v):
    return min(1.0, max(0.0, v))


def live_one_day(town):
    """One day passes: time changes everyone, and every conversation changes both people."""
    V, F, rng = town["voters"], town["friends"], town["rng"]
    for v in V:
        v.tick(drift_to=v.traits["core"], rate=DRIFT, jitter=JITTER)
        v.value = clamp(v.value)  # the ruler runs from 0 (surely B) to 1 (surely A)
    for i, v in enumerate(V):
        w = V[rng.choice(F[i])]
        s = v.similarity(w, scale=0.5)
        dv = TALK_PULL * s * (1 - v.traits["stubborn"]) * (w.value - v.value)
        dw = TALK_PULL * s * (1 - w.traits["stubborn"]) * (v.value - w.value)
        v.change(clamp(v.value + dv), f"talked with {w.name}")
        w.change(clamp(w.value + dw), f"talked with {v.name}")
    town["day"] += 1


def take_poll(town):
    """Measure the town. Principle 3: the people you ask are changed by being asked.
    Returns (raw share for A, likely-voter share for A)."""
    V, rng = town["voters"], town["rng"]
    sample = rng.sample(V, POLL_SIZE)
    yes = 0
    w_yes = w_all = 0.0
    for v in sample:
        seen = v.value
        yes += seen > 0.5
        # standard practice: weight each answer by how likely that person is to vote
        w = clamp(v.traits["turnout"] + 0.3 * abs(seen - 0.5))
        w_all += w
        w_yes += w * (seen > 0.5)
        push = MEASURE_SHIFT if seen > 0.5 else -MEASURE_SHIFT
        v.observe(push)
        v.value = clamp(v.value)  # (observe() already recorded "observed")
    return yes / POLL_SIZE, w_yes / w_all


def publish(town, share_a):
    """Publishing a number is an interaction with the whole town."""
    lead = share_a - 0.5
    for v in town["voters"]:
        tr = v.traits
        v.change(clamp(v.value + (BANDWAGON * tr["conformity"] - UNDERDOG * tr["underdog"]) * lead),
                 f"read poll {share_a:.0%}")
    town["last_poll"] = share_a


def election(town):
    """Election day: who actually shows up and what they pick."""
    rng = town["rng"]
    pub = town["last_poll"] if town["last_poll"] is not None else 0.5
    lead = pub - 0.5
    a_votes = b_votes = 0
    for v in town["voters"]:
        backs_a = v.value > 0.5
        leader_side = (backs_a and lead > 0) or (not backs_a and lead < 0)
        p = v.traits["turnout"] + 0.3 * abs(v.value - 0.5)        # enthusiasm
        if leader_side:
            p -= COMPLACENCY * abs(lead)                          # "we've got this"
        else:
            p += MOBILIZE * abs(lead) * (1 - 4 * abs(lead))       # "it's close, go vote"
        if rng.random() < clamp(p):
            if backs_a:
                a_votes += 1
            else:
                b_votes += 1
    return a_votes / max(1, a_votes + b_votes)


def run_until(town, day, publish_polls=True):
    while town["day"] < day:
        live_one_day(town)
        if town["day"] % POLL_EVERY == 0 and town["day"] < day:
            raw, likely = take_poll(town)
            if publish_polls:
                publish(town, likely)


def finish(town, published):
    """Publish the eve forecast, then let the last days and election happen."""
    publish(town, published)
    while town["day"] < DAYS:
        live_one_day(town)
    return election(town)


def reflexive_forecast(eve_poll, model_seed):
    """The forecaster knows the RULES of the town but not its people.
    It builds an imaginary town, learns how a published number shifts the result,
    and then finds the number that stays true after it is published (a fixed point):
        f = eve_poll + shift(f)
    """
    model = make_town(model_seed, remember=False)
    run_until(model, FINAL_POLL_DAY)
    base = take_poll(model)[1]

    def shift(f):
        # how far does publishing f move the outcome away from what the poll saw?
        return finish(copy.deepcopy(model), f) - base

    f = eve_poll
    for _ in range(8):                       # damped fixed-point iteration
        f = 0.5 * f + 0.5 * clamp(eve_poll + shift(f))
    return f


def experiment(n_towns=20):
    print(f"Running {n_towns} towns of {N_VOTERS} unique voters each (takes a minute or two)...\n")
    print(f"{'town':>4} {'raw poll':>9} {'standard':>9} {'reflexive':>10} | "
          f"{'result if raw':>14} {'if standard':>12} {'if reflexive':>13} {'never polled':>13}")
    errs = {"naive": [], "standard": [], "reflexive": []}
    wrong = {"naive": 0, "standard": 0, "reflexive": 0}
    effect = []
    for seed in range(n_towns):
        town = make_town(seed)
        run_until(town, FINAL_POLL_DAY)
        raw, likely = take_poll(town)
        f = reflexive_forecast(likely, model_seed=10_000 + seed)

        out = {}
        for name, published in (("naive", raw), ("standard", likely), ("reflexive", f)):
            out[name] = finish(copy.deepcopy(town), published)
            errs[name].append(abs(out[name] - published))
            wrong[name] += (published > 0.5) != (out[name] > 0.5)

        # the same town in a world where no poll is ever published
        quiet = make_town(seed)
        run_until(quiet, DAYS, publish_polls=False)
        quiet_out = election(quiet)
        effect.append(abs(out["standard"] - quiet_out))

        print(f"{seed:>4} {raw:>9.1%} {likely:>9.1%} {f:>10.1%} | "
              f"{out['naive']:>14.1%} {out['standard']:>12.1%} {out['reflexive']:>13.1%} {quiet_out:>13.1%}")

    print("\n--- what happened ---")
    print(f"publishing polls moved the result by {statistics.mean(effect):.1%} on average "
          f"(vs. the same town never polled)\n")
    print(f"{'forecaster':<34} {'avg error':>9} {'wrong winner':>13}")
    for name, label in (("naive", "naive (raw poll)"),
                        ("standard", "standard (likely-voter poll)"),
                        ("reflexive", "reflexive (fixed point)")):
        print(f"{label:<34} {statistics.mean(errs[name]):>9.1%} {wrong[name]:>9}/{n_towns}")
    print("\nerror = |published forecast - actual result|, measured AFTER the town reacted to it.")
    print("NOTE: the reflexive forecaster knows the town's exact rules. Real forecasters would have to")
    print("estimate them from data, so this is a best case for the idea, not proof it works in reality.")


def follow_one_town(seed=3):
    town = make_town(seed)
    v0 = town["voters"][0]
    print(f"Following town {seed}. Voter v0 starts at {v0.value:.3f} with traits "
          + ", ".join(f"{k}={x:.2f}" for k, x in v0.traits.items()))
    while town["day"] < FINAL_POLL_DAY:
        live_one_day(town)
        if town["day"] % POLL_EVERY == 0:
            raw, p = take_poll(town)
            publish(town, p)
            print(f"day {town['day']:>2}: poll says A has {p:.1%}")
    print(f"\nv0 changed {len(v0.history) - 1} times; similarity to its day-0 self: {v0.similarity_to_past(len(v0.history)):.1%}")
    print("last 5 recorded changes of v0:")
    for t, val, cause in v0.history[-5:]:
        print(f"  t={t:>2} value={val:.3f} cause={cause}")


if __name__ == "__main__":
    if "--one" in sys.argv:
        follow_one_town()
    else:
        experiment()
