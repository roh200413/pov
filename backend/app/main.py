from __future__ import annotations

import csv
import imghdr
import shutil
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import models  # noqa: F401
from .config import get_settings
from .database import Base, SessionLocal, engine, get_db
from .models import Dataset, DatasetFile, Model, Project
from .schemas import DatasetCreate, DatasetFileRead, DatasetRead, ModelRead, ProjectCreate, ProjectRead
from .seed import seed_models

settings = get_settings()
STORAGE_ROOT = Path("storage")

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=str(STORAGE_ROOT)), name="static")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_models(db)
    finally:
        db.close()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}




@app.get("/api/models", response_model=list[ModelRead])
def list_models(modality: str | None = None, db: Session = Depends(get_db)) -> list[Model]:
    query = db.query(Model)
    if modality:
        allowed = {"vision", "timeseries", "mixed"}
        if modality not in allowed:
            raise HTTPException(status_code=400, detail="Invalid modality")
        query = query.filter(Model.task_type == modality)

    return query.order_by(Model.created_at.asc()).all()

@app.post("/api/projects", response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> Project:
    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.post("/api/projects/{project_id}/datasets", response_model=DatasetRead)
def create_dataset(project_id: str, payload: DatasetCreate, db: Session = Depends(get_db)) -> Dataset:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    dataset = Dataset(project_id=project_id, name=payload.name, dataset_type=payload.dataset_type)
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def extract_metadata(file_path: Path) -> dict:
    metadata: dict[str, int | str] = {}
    image_type = imghdr.what(file_path)
    if image_type:
        metadata["image_type"] = image_type
        try:
            from PIL import Image

            with Image.open(file_path) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height
        except Exception:
            # Optional best-effort for width/height on image files.
            pass

    if file_path.suffix.lower() == ".csv":
        with file_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            rows = list(reader)
        metadata["row"] = len(rows)
        metadata["col"] = max((len(row) for row in rows), default=0)

    return metadata


@app.post("/api/datasets/{dataset_id}/files", response_model=list[DatasetFileRead])
def upload_dataset_files(
    dataset_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> list[DatasetFileRead]:
    dataset = db.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    raw_dir = STORAGE_ROOT / dataset.project_id / "datasets" / dataset.id / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    created_files: list[DatasetFileRead] = []

    for upload in files:
        safe_name = Path(upload.filename or "upload.bin").name
        destination = raw_dir / safe_name
        with destination.open("wb") as out:
            shutil.copyfileobj(upload.file, out)

        rel_path = destination.as_posix()
        file_size = destination.stat().st_size
        metadata = extract_metadata(destination)

        dataset_file = DatasetFile(
            dataset_id=dataset.id,
            file_name=safe_name,
            file_path=rel_path,
            media_type=upload.content_type,
            size_bytes=file_size,
            meta_json=metadata or None,
        )
        db.add(dataset_file)
        db.flush()
        db.refresh(dataset_file)

        created_files.append(
            DatasetFileRead(
                id=dataset_file.id,
                dataset_id=dataset_file.dataset_id,
                file_name=dataset_file.file_name,
                file_path=dataset_file.file_path,
                media_type=dataset_file.media_type,
                size_bytes=dataset_file.size_bytes,
                meta_json=dataset_file.meta_json,
                created_at=dataset_file.created_at,
                static_url=f"/static/{Path(dataset_file.file_path).relative_to(STORAGE_ROOT).as_posix()}",
            )
        )

    db.commit()
    return created_files
