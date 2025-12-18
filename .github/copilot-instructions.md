## Purpose
Короткие инструкции для AI-агентов, чтобы быстро начать работу в этом репозитории.

## Big picture
- Монорепо с двумя основными частями: backend (Python) и frontend (React + Vite).
- Backend: `backend/app/main.py` — FastAPI HTTP-сервис; DB доступ через `backend/app/db.py`; модели — `backend/app/models.py`; схема/валидация — `backend/app/schemas.py`.
- Frontend: Vite + React в `frontend/` (entry `frontend/src/App.tsx`), HTTP-клиент в `frontend/src/api/http.ts` (axios, `API_BASE` берётся из `VITE_API_BASE`).
- Инфраструктура: `docker-compose.yml` поднимает `db` (Postgres), `backend` и `frontend` для локальной разработки.

## Important workflows (commands)
- Run full stack via Docker: `docker-compose up --build` (project root).
- Backend local dev (from `backend/`):
  - Create venv and install: `python -m venv .venv` / `.venv\\Scripts\\activate` (Windows) / `pip install -r requirements.txt`.
  - Migrations: `alembic upgrade head` (run in `backend/`, uses `alembic.ini`).
  - Seed sample data: `python -m app.seed` (run in `backend/`).
  - Run dev server: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
- Frontend local dev (from `frontend/`): `npm install` then `npm run dev` (Vite serves on :5173).

## Environment and config
- Backend settings live in `backend/app/core/config.py` (Pydantic settings). Key env vars:
  - `DATABASE_URL` / `database_url` — SQLAlchemy URL (docker-compose sets `postgresql+psycopg://app:app@db:5432/card_issuance`).
  - `CORS_ORIGINS` / `cors_origins` — CSV of allowed origins.
- Frontend reads `VITE_API_BASE` (see `docker-compose.yml` and `frontend/src/api/http.ts`).

## Project-specific conventions & patterns
- Reference tables: many domain enums live in DB as reference models (`RefStatus`, `RefBranch`, `RefChannel`, `RefVendor`, `RefCardProduct`, `RefTariffPlan`). Code refers to them via DB lookups (see `backend/app/seed.py` and `backend/app/main.py`).
- Status handling: statuses are stored in `RefStatus` with `entity_type` and `code` (e.g. `entity_type='application'`, `code='APPROVED'`). Prefer lookups by code, not hard-coded numeric ids.
- Service layer: business logic lives in `backend/app/service.py` — controllers in `main.py` call `service.*` functions and return Pydantic schemas from `schemas.py`.
- Print/PDF: HTML templates in `backend/app/templates/` rendered to PDF via `weasyprint` in `backend/app/pdf.py`.
- Seeding: realistic demo data script is `backend/app/seed.py` — use it to populate refs, clients, applications, batches, cards.

## Integration points & data flows
- Frontend → Backend: axios base URL from `VITE_API_BASE`; endpoints are under `/api/*` (see `main.py`). Error normalization happens in `frontend/src/api/http.ts` — emulate that shape when returning errors.
- Backend → DB: SQLAlchemy core; migrations via Alembic (`alembic/versions/`). Use `SessionLocal`/`get_db()` from `backend/app/db.py` for DB sessions.
- External libs of note: `weasyprint` (PDF), `pydantic-settings` for settings, `FastAPI` + `uvicorn`.

## When changing code — practical tips
- If you need a status id, query `RefStatus` by `entity_type`+`code` (see `_get_status_id` in `backend/app/seed.py`).
- When adding/refactoring endpoints, update `frontend/src/api/queries.ts` to keep UI in sync.
- Keep schema changes in `schemas.py` and reflect DB migrations in `alembic/versions/`.
- Use `python -m app.seed` to repopulate demo data after schema or seed changes.

## Files to inspect first (quick links)
- Backend entry: `backend/app/main.py`
- Backend settings: `backend/app/core/config.py`
- DB/session: `backend/app/db.py`
- Business logic: `backend/app/service.py`
- Models: `backend/app/models.py`
- Seed data: `backend/app/seed.py`
- Alembic migrations: `backend/alembic/versions/`
- Frontend entry: `frontend/src/main.tsx` and `frontend/src/App.tsx`
- Frontend API client: `frontend/src/api/http.ts` and `frontend/src/api/queries.ts`

## What I can't infer automatically
- Any CI commands or deployment secrets not present in repo (ask where production DB, secrets, and CI pipelines live).

---
If you'd like, I can iterate: (1) merge into an existing `.github/copilot-instructions.md` if present, or (2) expand sections with concrete examples (curl requests, sequence diagrams), or (3) add recommended tests and lint commands. Что сделать дальше?
