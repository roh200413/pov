from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Model

DEFAULT_MODELS = [
    {"name": "Dummy Vision v1", "task_type": "vision", "backend": "dummy", "version": "v1"},
    {"name": "Dummy Timeseries v1", "task_type": "timeseries", "backend": "dummy", "version": "v1"},
    {"name": "Dummy Mixed v1", "task_type": "mixed", "backend": "dummy", "version": "v1"},
]


def seed_models(db: Session) -> None:
    existing_names = set(db.scalars(select(Model.name)).all())

    created = False
    for payload in DEFAULT_MODELS:
        if payload["name"] in existing_names:
            continue
        db.add(Model(**payload))
        created = True

    if created:
        db.commit()
