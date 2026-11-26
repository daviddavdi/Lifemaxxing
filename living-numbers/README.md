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

# Experiment 2 - real drug data (needs: pip install numpy scipy)
python3 fetch_oneil.py      # downloads the O'Neil 2016 data (~137 MB, about 1 minute)
python3 lif_drugs.py        # tests the Living Interaction Formula on it (about 2 minutes)
```

## Files

| File | What it is |
|---|---|
| `living.py` | The `LivingNumber` core: value, hidden traits, history, `interact`, `similarity`, living addition `⊕` |
| `election.py` | Experiment 1: polls that change the voters they measure, and a forecaster that accounts for it |
| `fetch_oneil.py` | Downloads real drug-combination data (O'Neil 2016, via DrugComb on Zenodo) |
| `lif_drugs.py` | Experiment 2: the Living Interaction Formula on real drug data, with fair rivals and an artifact check |
| `FOUNDATIONS.md` | The theory, results, honest limitations, prior work, and next questions |
