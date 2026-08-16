.PHONY: dev test build typecheck db-migrate db-shell deploy seed help

help:
	@echo "Available commands:"
	@echo "  make dev         - Start storefront dev server"
	@echo "  make test        - Run backend integration suite (Docker)"
	@echo "  make typecheck   - TypeScript check (storefront + admin)"
	@echo "  make build       - Build storefront for production"
	@echo "  make db-migrate  - Run Alembic migrations (prod compose)"
	@echo "  make db-shell    - psql into the production database"
	@echo "  make seed        - Seed the canonical ELEKTRIX store"
	@echo "  make deploy      - Deploy the production stack (with rollback)"

dev:
	npm run dev

test:
	bash scripts/run_backend_tests.sh

typecheck:
	npx tsc --noEmit
	npm --prefix apps/web run typecheck

build:
	npm run build

db-migrate:
	docker compose -f compose.prod.vm1.yaml run --rm api alembic upgrade head

db-shell:
	docker compose -f compose.prod.vm1.yaml run --rm api python -c "import asyncio,os,sys;sys.path.insert(0,'/app');from sqlalchemy.ext.asyncio import create_async_engine;from sqlalchemy import text;e=create_async_engine(os.environ['DATABASE_URL']);import code;code.interact(local={'e':e,'text':text})" 2>/dev/null || echo "use: docker compose -f compose.prod.vm1.yaml run --rm api bash"

seed:
	docker compose -f compose.prod.vm1.yaml run --rm api python /app/scripts/seed_store.py

deploy:
	SKIP_PULL=1 bash infra/scripts/deploy_vps.sh
