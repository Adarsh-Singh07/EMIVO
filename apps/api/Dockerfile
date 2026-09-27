FROM python:3.12-slim as builder

WORKDIR /app
COPY apps/api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt uvicorn

COPY apps/api ./apps/api
COPY db ./db
COPY db/alembic.ini ./alembic.ini
COPY scripts ./scripts

FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app /app

# curl is a transport fallback for the media adapter: the R2 S3 edge rejects
# OpenSSL 3.5-based TLS client fingerprints (this image's Python stack) from
# some networks, while curl (OpenSSL 3.0) connects reliably, so uploads
# alternate httpx and curl with retries.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as an unprivileged user — the app binds 8000 (>1024) and needs no
# other privileges.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

ENV PYTHONPATH=/app/apps/api

CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
