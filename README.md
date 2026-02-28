# PoC AI Inference Tool

5단계 위저드 기반 PoC AI 추론 툴입니다.

1) 프로젝트 생성 → 2) 데이터셋 업데이트 → 3) 모델 선택 → 4) 모델 추론 → 5) 결과 검증

## Monorepo 구조

- `backend/`: FastAPI + SQLAlchemy + SQLite
- `frontend/`: React + Vite + TypeScript

## Backend 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend 실행

```bash
cd frontend
npm install
cp .env.example .env
npm run dev -- --host 0.0.0.0 --port 5173
```

## 구현된 API

- Projects / Datasets / Upload
  - `GET /api/projects`
  - `POST /api/projects`
  - `GET /api/projects/{project_id}/datasets`
  - `POST /api/projects/{project_id}/datasets`
  - `POST /api/datasets/{dataset_id}/files`
- Models
  - `GET /api/models?modality=vision|timeseries|mixed`
- Inference Runs
  - `POST /api/inference-runs`
  - `GET /api/inference-runs/{run_id}`
  - `GET /api/inference-runs/{run_id}/results?limit=&offset=`
- Validations
  - `POST /api/validations`
  - `GET /api/inference-runs/{run_id}/validations`

## 저장 경로 규칙

- 업로드 원본: `storage/{project_id}/datasets/{dataset_id}/raw/...`
- 추론 출력: `storage/{project_id}/runs/{run_id}/outputs/...`
- 정적 서빙: `/static` → `storage/`

## Adapter 구조

- `backend/app/inference/adapters/base.py`
- `backend/app/inference/adapters/dummy_vision.py`
- `backend/app/inference/adapters/dummy_timeseries.py`
- `backend/app/inference/adapter_registry.py`

모델의 `backend + task_type` 기준으로 adapter를 선택하고, Run 상태는
`queued -> running -> done/failed` 로 전환됩니다.

## End-to-End 사용 시나리오

1. Step 1에서 프로젝트 생성 (좌측 사이드바에서도 생성 가능)
2. Step 2에서 데이터셋 생성 후 파일 업로드
3. Step 3에서 modality 탭으로 모델 조회 후 카드 선택
4. Step 4에서 추론 실행 → run 상태 및 summary 확인
5. Step 5에서 결과 테이블 조회/상세 확인 후 OK/NG + 코멘트 저장
   - 검증률 = 검증 완료 sample 수 / 전체 결과 수

## Backend 스모크 테스트

> 서버(`uvicorn app.main:app`)를 먼저 띄운 뒤 실행

```bash
cd backend
python scripts/smoke_test.py
```

검증 순서:

- 프로젝트 생성
- 데이터셋 생성
- CSV 업로드
- 모델 조회
- 추론 run 생성
- run 완료 polling
- 결과 조회

실패 시 `[smoke] FAILED: ...` 로그로 원인을 출력합니다.
