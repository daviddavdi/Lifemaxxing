# Living Numbers

Math for things that change over time, are changed by every interaction, and are never
exactly equal, only similar. Built **on top of** ordinary math, not replacing it.

Start with **[FOUNDATIONS.md](FOUNDATIONS.md)**: the principles, the first results, and the open questions.

## Run it

Plain Python 3, nothing to install.

```bash
cd living-numbers
python3 living.py           # demos: two different "ones", 1 ⊕ 1, similarity that doesn't chain
python3 election.py --one   # follow one town and one voter's full history
python3 election.py         # the full experiment (about 2 minutes)
```

## Files

| File | What it is |
|---|---|
| `living.py` | The `LivingNumber` core: value, hidden traits, history, `interact`, `similarity`, living addition `⊕` |
| `election.py` | Experiment 1: polls that change the voters they measure, and a forecaster that accounts for it |
| `FOUNDATIONS.md` | The theory, results, honest limitations, prior work, and next questions |
