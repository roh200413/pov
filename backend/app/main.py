from __future__ import annotations

import csv
import imghdr
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import models  # noqa: F401
from .config import get_settings
from .database import Base, SessionLocal, engine, get_db
from .inference.adapter_registry import get_adapter
from .models import Dataset, DatasetFile, InferenceResult, InferenceRun, Model, Project, Validation
from .schemas import (
    DatasetCreate,
    DatasetFileRead,
    DatasetRead,
    InferenceResultRead,
    InferenceRunCreate,
    InferenceRunRead,
    ModelRead,
    ProjectCreate,
    ProjectRead,
    ValidationCreate,
    ValidationRead,
)
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


@app.get("/api/projects", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return db.query(Project).order_by(Project.created_at.desc()).all()


@app.post("/api/projects", response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> Project:
    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get("/api/projects/{project_id}/datasets", response_model=list[DatasetRead])
def list_datasets(project_id: str, db: Session = Depends(get_db)) -> list[Dataset]:
    return db.query(Dataset).filter(Dataset.project_id == project_id).order_by(Dataset.created_at.desc()).all()


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


@app.get("/api/models", response_model=list[ModelRead])
def list_models(modality: str | None = None, db: Session = Depends(get_db)) -> list[Model]:
    query = db.query(Model)
    if modality:
        allowed = {"vision", "timeseries", "mixed"}
        if modality not in allowed:
            raise HTTPException(status_code=400, detail="Invalid modality")
        query = query.filter(Model.task_type == modality)

    return query.order_by(Model.created_at.asc()).all()


def extract_metadata(file_path: Path) -> dict:
    metadata: dict[str, int | str] = {}
    image_type = imghdr.what(file_path)
    if image_type:
        metadata["image_type"] = image_type

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
        dataset_file = DatasetFile(
            dataset_id=dataset.id,
            file_name=safe_name,
            file_path=rel_path,
            media_type=upload.content_type,
            size_bytes=destination.stat().st_size,
            meta_json=extract_metadata(destination) or None,
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


def _run_inference_background(run_id: str) -> None:
    db = SessionLocal()
    try:
        run = db.get(InferenceRun, run_id)
        if run is None:
            return

        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(run)

        dataset = db.get(Dataset, run.dataset_id)
        model = db.get(Model, run.model_id)
        if dataset is None or model is None:
            raise ValueError("Dataset or model not found")

        dataset_dir = STORAGE_ROOT / dataset.project_id / "datasets" / dataset.id / "raw"
        adapter = get_adapter(model.backend, model.task_type)
        items = adapter.run(dataset_dir, run.params_json or {})

        output_dir = STORAGE_ROOT / run.project_id / "runs" / run.id / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)

        db.query(InferenceResult).filter(InferenceResult.run_id == run.id).delete()
        for item in items:
            output_path = item.get("output_path")
            if output_path:
                output_ref = Path(output_path)
                if output_ref.exists():
                    manifest_path = output_dir / f"{item['sample_key'].replace('/', '_')}.json"
                    manifest_path.write_text(json.dumps(item, ensure_ascii=False), encoding="utf-8")

            db.add(
                InferenceResult(
                    run_id=run.id,
                    sample_key=item["sample_key"],
                    score=item.get("score"),
                    verdict=item.get("verdict"),
                    output_path=item.get("output_path"),
                    detail_json=item.get("detail_json"),
                    summary=item.get("summary"),
                )
            )

        total = len(items)
        ok_count = sum(1 for item in items if item.get("verdict") == "ok")
        run.summary_json = {
            "total": total,
            "ok": ok_count,
            "ng": total - ok_count,
            "output_dir": output_dir.as_posix(),
        }
        run.status = "done"
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        run = db.get(InferenceRun, run_id)
        if run is not None:
            run.status = "failed"
            run.error_message = str(exc)
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


@app.post("/api/inference-runs", response_model=InferenceRunRead)
def create_inference_run(
    payload: InferenceRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> InferenceRun:
    if db.get(Project, payload.project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if db.get(Dataset, payload.dataset_id) is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if db.get(Model, payload.model_id) is None:
        raise HTTPException(status_code=404, detail="Model not found")

    run = InferenceRun(
        project_id=payload.project_id,
        dataset_id=payload.dataset_id,
        model_id=payload.model_id,
        status="queued",
        params_json=payload.params,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(_run_inference_background, run.id)
    return run


@app.get("/api/inference-runs/{run_id}", response_model=InferenceRunRead)
def get_inference_run(run_id: str, db: Session = Depends(get_db)) -> InferenceRun:
    run = db.get(InferenceRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@app.get("/api/inference-runs/{run_id}/results", response_model=list[InferenceResultRead])
def list_inference_results(
    run_id: str,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[InferenceResultRead]:
    rows = (
        db.query(InferenceResult)
        .filter(InferenceResult.run_id == run_id)
        .order_by(InferenceResult.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    response: list[InferenceResultRead] = []
    for row in rows:
        static_url = None
        if row.output_path and row.output_path.startswith(str(STORAGE_ROOT)):
            static_url = f"/static/{Path(row.output_path).relative_to(STORAGE_ROOT).as_posix()}"
        response.append(
            InferenceResultRead(
                id=row.id,
                run_id=row.run_id,
                sample_key=row.sample_key,
                score=row.score,
                verdict=row.verdict,
                output_path=row.output_path,
                detail_json=row.detail_json,
                summary=row.summary,
                created_at=row.created_at,
                static_url=static_url,
            )
        )
    return response


@app.post("/api/validations", response_model=ValidationRead)
def create_validation(payload: ValidationCreate, db: Session = Depends(get_db)) -> Validation:
    run = db.get(InferenceRun, payload.run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    validation = Validation(
        run_id=payload.run_id,
        sample_key=payload.sample_key,
        human_verdict=payload.human_verdict,
        comment=payload.comment,
    )
    db.add(validation)
    db.commit()
    db.refresh(validation)
    return validation


@app.get("/api/inference-runs/{run_id}/validations", response_model=list[ValidationRead])
def list_validations(run_id: str, db: Session = Depends(get_db)) -> list[Validation]:
    return (
        db.query(Validation)
        .filter(Validation.run_id == run_id)
        .order_by(Validation.created_at.desc())
        .all()
    )
