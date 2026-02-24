from __future__ import annotations

from .adapters.base import BaseInferenceAdapter
from .adapters.dummy_timeseries import DummyTimeseriesAdapter
from .adapters.dummy_vision import DummyVisionAdapter


def get_adapter(backend: str, modality: str) -> BaseInferenceAdapter:
    if backend != "dummy":
        raise ValueError(f"Unsupported backend: {backend}")

    if modality == "vision":
        return DummyVisionAdapter()
    if modality == "timeseries":
        return DummyTimeseriesAdapter()
    if modality == "mixed":
        return DummyVisionAdapter()

    raise ValueError(f"Unsupported modality: {modality}")
