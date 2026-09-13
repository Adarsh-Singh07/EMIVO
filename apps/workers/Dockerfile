FROM python:3.12-slim as builder

WORKDIR /app
COPY apps/api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt arq

COPY apps/workers ./apps/workers
COPY apps/api ./apps/api
COPY packages ./packages

FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app /app

ENV PYTHONPATH=/app/apps/api:/app/apps/workers

RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

CMD ["arq", "apps.workers.main.WorkerSettings"]
