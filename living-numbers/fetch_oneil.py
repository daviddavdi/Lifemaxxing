"""
fetch_oneil.py - download the real O'Neil et al. (2016) drug-combination data.

Source: DrugComb raw data v1.4 on Zenodo (record 18449193). The full file is about 2 GB,
but the O'Neil (Merck) study comes first, so we stream only that part and stop.

Output: data/oneil.csv  (block, dose of drug A, dose of drug B, % inhibition, drug A, drug B, cell line)

Run:  python3 fetch_oneil.py
"""

import csv
import io
import os
import urllib.request

URL = "https://zenodo.org/api/records/18449193/files/drugcomb_data_v1.4.csv/content"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "oneil.csv")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    print("streaming DrugComb raw data from Zenodo (O'Neil study only)...")
    with urllib.request.urlopen(URL, timeout=120) as resp, open(OUT, "w", newline="") as f:
        reader = csv.DictReader(io.TextIOWrapper(resp, encoding="utf-8"))
        out = csv.writer(f)
        out.writerow(["block", "dose_a", "dose_b", "inhibition", "drug_a", "drug_b", "cell_line"])
        rows = other = 0
        for r in reader:
            if r["study_name"] != "ONEIL":
                other += 1
                if other > 50_000:          # we are past the O'Neil section
                    break
                continue
            other = 0
            out.writerow([r["block_id"], r["conc_r"], r["conc_c"], r["inhibition"],
                          r["drug_row"], r["drug_col"], r["cell_line_name"]])
            rows += 1
            if rows % 100_000 == 0:
                print(f"  {rows:,} measurements")
    print(f"saved {rows:,} measurements to {OUT}")


if __name__ == "__main__":
    main()
