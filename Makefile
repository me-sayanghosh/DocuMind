.PHONY: up down api worker web test test-backend test-frontend eval migrate lint format clean quality help prod-build prod-up prod-down prod-logs

help:
	@echo "Available commands:"
	@echo "  make up            - Start Postgres and Redis via Docker Compose"
	@echo "  make down          - Stop Docker Compose services"
	@echo "  make prod-build    - Build production Docker containers"
	@echo "  make prod-up       - Start production stack with Docker Compose"
	@echo "  make prod-down     - Stop production stack"
	@echo "  make prod-logs     - View production stack logs"
	@echo "  make api           - Start FastAPI backend with reload"
	@echo "  make worker        - Start ARQ background worker"
	@echo "  make web           - Start Vite frontend dev server"
	@echo "  make quality       - Run multi-check code quality test suite"
	@echo "  make test          - Run all backend and frontend tests"
	@echo "  make test-backend  - Run backend pytest tests"
	@echo "  make test-frontend - Run frontend tests"
	@echo "  make eval          - Run RAG evaluation harness"
	@echo "  make migrate       - Run database migrations with Alembic"
	@echo "  make lint          - Lint backend and frontend code"
	@echo "  make format        - Format code"

up:
	docker compose up -d db redis

down:
	docker compose down

prod-build:
	docker compose -f docker-compose.prod.yml build

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

api:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

worker:
	cd backend && python -m arq app.worker.settings.WorkerSettings

web:
	cd frontend && npm run dev

migrate:
	cd backend && alembic upgrade head

quality:
	@if [ -f backend/.venv/bin/python ]; then \
		backend/.venv/bin/python scripts/quality_checks.py; \
	else \
		python3 scripts/quality_checks.py; \
	fi

test-backend:
	cd backend && if [ -f .venv/bin/pytest ]; then .venv/bin/pytest -v; else pytest -v; fi

test-frontend:
	cd frontend && npx tsc --noEmit && npm run build

test: test-backend test-frontend

eval:
	cd backend && python -m app.cli eval

lint:
	cd backend && ruff check .
	cd frontend && npm run lint

format:
	cd backend && ruff format .
	cd frontend && npm run format

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
