from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class BaseInferenceAdapter(ABC):
    @abstractmethod
    def run(self, dataset_dir: Path, params: dict | None = None) -> list[dict]:
        """Return list of inference result payloads with sample_key/score/verdict/detail_json/output_path."""
