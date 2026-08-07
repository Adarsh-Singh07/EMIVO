FROM python:3.12-slim as builder

WORKDIR /app
RUN pip install poetry

COPY pyproject.toml poetry.lock* ./
RUN poetry config virtualenvs.create false \
  && poetry install --no-interaction --no-ansi --no-root \
  && pip install arq

COPY apps/workers ./apps/workers
COPY packages ./packages

RUN poetry install --no-interaction --no-ansi

FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app /app

CMD ["arq", "apps.workers.main.WorkerSettings"]
