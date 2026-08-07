.PHONY: dev test build db-migrate help

help:
	@echo "Available commands:"
	@echo "  make dev         - Start development server"
	@echo "  make test        - Run tests"
	@echo "  make build       - Build for production"
	@echo "  make db-migrate  - Run database migrations"

dev:
	npm run dev

test:
	npm run test

build:
	npm run build

db-migrate:
	npm run db:migrate
