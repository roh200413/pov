from __future__ import annotations

import csv
import random
from pathlib import Path

from .base import BaseInferenceAdapter


class DummyTimeseriesAdapter(BaseInferenceAdapter):
    def run(self, dataset_dir: Path, params: dict | None = None) -> list[dict]:
        outputs: list[dict] = []
        threshold = float((params or {}).get("threshold", 0.5))
        csv_files = [p for p in sorted(dataset_dir.iterdir()) if p.suffix.lower() == '.csv']

        for file_path in csv_files:
            with file_path.open('r', encoding='utf-8', newline='') as f:
                reader = csv.reader(f)
                for row_index, row in enumerate(reader):
                    base = sum(len(col) for col in row) % 100 / 100
                    noise = random.uniform(-0.1, 0.1)
                    score = round(max(0.0, min(1.0, base + noise)), 4)
                    verdict = "ok" if score >= threshold else "ng"
                    outputs.append(
                        {
                            "sample_key": f"{file_path.name}:row:{row_index}",
                            "score": score,
                            "verdict": verdict,
                            "output_path": file_path.as_posix(),
                            "detail_json": {"row_index": row_index, "preview": row[:5], "source_type": "timeseries"},
                            "summary": {"rule": "dummy_timeseries_row_score", "threshold": threshold},
                        }
                    )

        return outputs
