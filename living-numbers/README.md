# Living Numbers

Math for things that change over time, are changed by every interaction, and are never
exactly equal, only similar. Built **on top of** ordinary math, not replacing it.

Start with **[FOUNDATIONS.md](FOUNDATIONS.md)**: the principles, the first results, and the open questions.

## Run it

Experiment 1 needs only plain Python 3. Experiment 2 also needs numpy and scipy.

```bash
cd living-numbers
python3 living.py           # demos: two different "ones", 1 ⊕ 1, similarity that doesn't chain
python3 election.py --one   # follow one town and one voter's full history
python3 election.py         # the full experiment (about 2 minutes)

# Experiment 2 - real drug data (needs: pip install numpy scipy)
python3 fetch_oneil.py      # downloads the O'Neil 2016 data (~137 MB, about 1 minute)
python3 lif_drugs.py        # tests the Living Interaction Formula on it (about 2 minutes)
python3 lif_gamma_table.py  # Experiment 3: fit every drug pair x cell line (about 7 minutes, 4 cores)
python3 lif_power.py        # do drugs have their own power and openness? (about 1 minute)

# Experiment 5 - Version 3, pre-registered, on NCI-ALMANAC
python3 fetch_almanac.py    # streams the 2 GB file, keeps 5.1 M ALMANAC rows (~15 minutes)
python3 lif_gamma_table.py --data data/almanac.csv --out data/almanac_gammas.csv --sample 60000
python3 lif_v3.py           # tests H1-H5 (bootstrap of 2,000 refits; can take an hour or more)
python3 lif_where.py        # exploratory: where the interaction signal lives (seconds)
```

## Files

| File | What it is |
|---|---|
| `living.py` | The `LivingNumber` core: value, hidden traits, history, `interact`, `similarity`, living addition `⊕` |
| `election.py` | Experiment 1: polls that change the voters they measure, and a forecaster that accounts for it |
| `fetch_oneil.py` | Downloads real drug-combination data (O'Neil 2016, via DrugComb on Zenodo) |
| `lif_drugs.py` | Experiment 2: the Living Interaction Formula on real drug data, with fair rivals and an artifact check |
| `lif_gamma_table.py` | Fits who-changes-whom for all 22,737 drug pair x cell line combinations, plus fake controls |
| `lif_power.py` | Experiment 3: learns each drug's power and openness and predicts drug pairs never tested together |
| `lif_similarity.py` | Experiment 4: does similarity change interaction strength? (pre-registered) |
| `fetch_almanac.py`, `almanac_labels.py` | NCI-ALMANAC download and drug family/mechanism labels |
| `lif_v3.py` | Experiment 5: Version 3 tested against pre-registered hypotheses H1-H5 |
| `lif_where.py` | Exploratory: how much of the interaction drugs, pairs and cell lines explain |
| `PREREGISTRATION_*.md` | Predictions written before results, with results appended after |
| `FOUNDATIONS.md` | The theory, results, honest limitations, prior work, and next questions |
