"""
fetch_almanac.py - download the NCI-ALMANAC drug-combination data (via DrugComb on Zenodo).

Streams the full DrugComb raw file (~2 GB) once, keeps only the ALMANAC study, and prints
how many measurements each study in the file has.

Output: data/almanac.csv  (same columns as data/oneil.csv)
Run:    python3 fetch_almanac.py     (about 15 minutes)
"""

import csv
import io
import os
import urllib.request
from collections import Counter

URL = "https://zenodo.org/api/records/18449193/files/drugcomb_data_v1.4.csv/content"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "almanac.csv")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    studies = Counter()
    with urllib.request.urlopen(URL, timeout=300) as resp, open(OUT, "w", newline="") as f:
        reader = csv.DictReader(io.TextIOWrapper(resp, encoding="utf-8"))
        out = csv.writer(f)
        out.writerow(["block", "dose_a", "dose_b", "inhibition", "drug_a", "drug_b", "cell_line"])
        for n, r in enumerate(reader, 1):
            studies[r["study_name"]] += 1
            if r["study_name"] == "ALMANAC":
                out.writerow([r["block_id"], r["conc_r"], r["conc_c"], r["inhibition"],
                              r["drug_row"], r["drug_col"], r["cell_line_name"]])
            if n % 2_000_000 == 0:
                print(f"  {n:,} rows read; ALMANAC so far {studies['ALMANAC']:,}", flush=True)
    print("measurements per study:", dict(studies.most_common()))
    print(f"saved {studies['ALMANAC']:,} ALMANAC measurements to {OUT}")


if __name__ == "__main__":
    main()
