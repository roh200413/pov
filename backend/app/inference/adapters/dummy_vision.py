from __future__ import annotations

import random
from pathlib import Path

from .base import BaseInferenceAdapter


class DummyVisionAdapter(BaseInferenceAdapter):
    def run(self, dataset_dir: Path, params: dict | None = None) -> list[dict]:
        threshold = float((params or {}).get("threshold", 0.5))
        outputs: list[dict] = []
        image_files = [p for p in sorted(dataset_dir.iterdir()) if p.suffix.lower() in {'.png', '.jpg', '.jpeg', '.bmp'}]

        for file_path in image_files:
            score = round(random.uniform(0.2, 0.98), 4)
            verdict = "ok" if score >= threshold else "ng"
            bbox = {
                "x": random.randint(0, 100),
                "y": random.randint(0, 100),
                "w": random.randint(20, 120),
                "h": random.randint(20, 120),
            }
            outputs.append(
                {
                    "sample_key": file_path.name,
                    "score": score,
                    "verdict": verdict,
                    "output_path": file_path.as_posix(),
                    "detail_json": {"bbox": bbox, "source_type": "image"},
                    "summary": {"rule": "dummy_vision_threshold", "threshold": threshold},
                }
            )
        return outputs
