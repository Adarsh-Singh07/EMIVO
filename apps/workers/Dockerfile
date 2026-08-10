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

ENV PYTHONPATH=/app:/app/apps/workers

CMD ["arq", "apps.workers.main.WorkerSettings"]
