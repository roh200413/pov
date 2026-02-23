from datetime import datetime

from pydantic import BaseModel


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
