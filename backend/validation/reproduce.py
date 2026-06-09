"""Reproduce the arithmetic reported by the validation API.

The frozen benchmark rows are illustrative and intentionally disclose that raw
third-party source data is not bundled. This script verifies calculations; it
does not independently validate the source observations.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

DATA = Path(__file__).with_name("benchmarks.csv")


def reproduce() -> list[dict]:
    results = []
    with DATA.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            predicted = float(row["predicted"])
            actual = float(row["actual"])
            baseline = float(row["naive_baseline"])
            absolute_error = abs(predicted - actual)
            percentage_error = absolute_error / actual * 100
            reported_error = absolute_error if row["unit"] == "percentage points" else percentage_error
            results.append(
                {
                    "case_id": row["case_id"],
                    "title": row["title"],
                    "predicted": predicted,
                    "actual": actual,
                    "absolute_error": absolute_error,
                    "absolute_percentage_error": percentage_error,
                    "reported_error": reported_error,
                    "reported_error_unit": "percentage points" if row["unit"] == "percentage points" else "percent",
                    "naive_baseline_absolute_error": abs(baseline - actual),
                    "source_note": row["source_note"],
                }
            )
    return results


if __name__ == "__main__":
    print(json.dumps(reproduce(), indent=2))
