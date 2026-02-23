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
  - SQLAlchemy + SQLite 연결 준비
  - `/health` 엔드포인트
- Frontend
  - Vite + React + TypeScript 구성
  - `react-router-dom` 기반 위저드 라우팅 뼈대
  - 좌측 사이드바 + 메인 레이아웃
  - `VITE_API_BASE_URL` 환경 변수 분리

## 다음 단계(예정)

1. 프로젝트/데이터셋/모델/런/결과 검증 DB 스키마 추가
2. 로컬 스토리지 경로 규칙(`storage/{project_id}/...`) 구현
3. Adapter/Plugin 기반 Dummy 추론 파이프라인 구현
4. 위저드 각 단계 API 연동 및 End-to-End 완료
