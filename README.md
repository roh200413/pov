# PoC AI Inference Tool

`PoC AI 추론 툴`의 Step 0 스캐폴딩입니다.

## Monorepo 구조

- `backend/`: FastAPI + SQLAlchemy + SQLite 기반 API 서버
- `frontend/`: React + Vite + TypeScript 기반 UI

## Backend 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 필요 시 값 수정
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

확인:

```bash
curl http://localhost:8000/health
```

## Frontend 실행

```bash
cd frontend
npm install
cp .env.example .env  # 필요 시 API 주소 수정
npm run dev -- --host 0.0.0.0 --port 5173
```

브라우저에서 `http://localhost:5173` 접속 후 5단계 위저드 라우트를 확인할 수 있습니다.

## 현재 포함된 최소 구성

- Backend
  - FastAPI 앱 부팅
  - CORS 설정
  - SQLAlchemy + SQLite 연결
  - Step 1 DB 스키마(`projects`, `datasets`, `dataset_files`, `models`, `inference_runs`, `inference_results`, `validations`)
  - 서버 시작 시 기본 모델 3종 seed
    - Dummy Vision v1 (`vision`, `dummy`)
    - Dummy Timeseries v1 (`timeseries`, `dummy`)
    - Dummy Mixed v1 (`mixed`, `dummy`)
  - Step 2 업로드 API
    - `POST /api/projects`
    - `POST /api/projects/{project_id}/datasets`
    - `POST /api/datasets/{dataset_id}/files` (multipart 다중 파일)
  - Step 3 모델 조회 API
    - `GET /api/models?modality=vision|timeseries|mixed`
  - 업로드 파일 저장 경로: `storage/{project_id}/datasets/{dataset_id}/raw/...`
  - `/static`으로 `storage/` 정적 서빙
  - `/health` 엔드포인트
- Frontend
  - Vite + React + TypeScript 구성
  - `react-router-dom` 기반 위저드 라우팅 뼈대
  - 좌측 사이드바 + 메인 레이아웃
  - `VITE_API_BASE_URL` 환경 변수 분리

## 최소 스모크 테스트

```bash
cd backend
python -m compileall app
```

서버 실행 후 예시 흐름:

```bash
# 1) 프로젝트 생성
curl -X POST http://localhost:8000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"demo-project","description":"poc"}'

# 2) 데이터셋 생성
curl -X POST http://localhost:8000/api/projects/{project_id}/datasets \
  -H 'Content-Type: application/json' \
  -d '{"name":"demo-dataset","dataset_type":"vision"}'

# 3) 파일 업로드
curl -X POST http://localhost:8000/api/datasets/{dataset_id}/files \
  -F 'files=@./sample.png' \
  -F 'files=@./sample.csv'
```

응답에는 `static_url`이 포함되어 `/static/...` 경로로 미리보기 가능합니다.

## 다음 단계(예정)

1. Adapter/Plugin 기반 Dummy 추론 파이프라인 구현
2. Step 4/5 API + UI 연동 및 End-to-End 완료
