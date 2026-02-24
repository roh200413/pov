from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectRead(BaseModel):
    id: str
    name: str
    description: str | None
    created_at: datetime


class DatasetCreate(BaseModel):
    name: str
    dataset_type: str


class DatasetRead(BaseModel):
    id: str
    project_id: str
    name: str
    dataset_type: str
    created_at: datetime


class DatasetFileRead(BaseModel):
    id: str
    dataset_id: str
    file_name: str
    file_path: str
    media_type: str | None
    size_bytes: int
    meta_json: dict | None
    created_at: datetime
    static_url: str


class ModelRead(BaseModel):
    id: str
    name: str
    task_type: str
    backend: str
    version: str
    created_at: datetime


class InferenceRunCreate(BaseModel):
    project_id: str
    dataset_id: str
    model_id: str
    params: dict[str, Any] | None = Field(default_factory=dict)


class InferenceRunRead(BaseModel):
    id: str
    project_id: str
    dataset_id: str
    model_id: str
    status: str
    params_json: dict | None
    summary_json: dict | None
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class InferenceResultRead(BaseModel):
    id: str
    run_id: str
    sample_key: str
    score: float | None
    verdict: str | None
    output_path: str | None
    detail_json: dict | None
    summary: dict | None
    created_at: datetime
    static_url: str | None


class ValidationCreate(BaseModel):
    run_id: str
    sample_key: str
    human_verdict: str
    comment: str | None = None


class ValidationRead(BaseModel):
    id: str
    run_id: str
    sample_key: str
    human_verdict: str
    comment: str | None
    created_at: datetime
