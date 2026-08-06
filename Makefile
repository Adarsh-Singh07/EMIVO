.PHONY: test lint build up

up:
	docker compose -f infra/docker/compose.yaml up -d --build

test:
	pytest apps/api/tests/

lint:
	ruff check .
	import-linter --config apps/api/.importlinter
