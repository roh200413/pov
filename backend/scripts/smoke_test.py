from __future__ import annotations

import json
import mimetypes
import sys
import uuid
from pathlib import Path
from urllib import request

BASE_URL = "http://localhost:8000"


def log(msg: str) -> None:
    print(f"[smoke] {msg}")


def post_json(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        f"{BASE_URL}{path}",
        method="POST",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_json(path: str) -> dict | list:
    with request.urlopen(f"{BASE_URL}{path}") as resp:
        return json.loads(resp.read().decode("utf-8"))


def post_multipart(path: str, files: list[Path]) -> list:
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = bytearray()

    for f in files:
        ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="files"; filename="{f.name}"\r\n'.encode())
        body.extend(f"Content-Type: {ctype}\r\n\r\n".encode())
        body.extend(f.read_bytes())
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode())

    req = request.Request(
        f"{BASE_URL}{path}",
        method="POST",
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    try:
        project = post_json("/api/projects", {"name": "smoke-project"})
        log(f"project created: {project['id']}")

        dataset = post_json(
            f"/api/projects/{project['id']}/datasets",
            {"name": "smoke-dataset", "dataset_type": "timeseries"},
        )
        log(f"dataset created: {dataset['id']}")

        tmp_dir = Path("/tmp/pov-smoke")
        tmp_dir.mkdir(parents=True, exist_ok=True)
        sample_csv = tmp_dir / "sample.csv"
        sample_csv.write_text("a,b\n1,2\n3,4\n", encoding="utf-8")

        uploaded = post_multipart(f"/api/datasets/{dataset['id']}/files", [sample_csv])
        log(f"files uploaded: {len(uploaded)}")

        models = get_json("/api/models?modality=timeseries")
        if not models:
            raise RuntimeError("no models returned for timeseries")

        run = post_json(
            "/api/inference-runs",
            {
                "project_id": project["id"],
                "dataset_id": dataset["id"],
                "model_id": models[0]["id"],
                "params": {"threshold": 0.5},
            },
        )
        log(f"run created: {run['id']} status={run['status']}")

        import time

        for _ in range(20):
            current = get_json(f"/api/inference-runs/{run['id']}")
            if current["status"] in {"done", "failed"}:
                break
            time.sleep(0.3)
        log(f"run finalized: {current['status']}")

        results = get_json(f"/api/inference-runs/{run['id']}/results?limit=20&offset=0")
        log(f"results fetched: {len(results)}")
        if not results:
            raise RuntimeError("no results produced")

        log("smoke test succeeded")
        return 0
    except Exception as exc:  # noqa: BLE001
        log(f"FAILED: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
