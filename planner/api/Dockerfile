# Base-Image über den ACR-Artifact-Cache statt anonym von Docker Hub — vermeidet das
# anonyme Pull-Rate-Limit (`toomanyrequests`) im `az acr build`. Cache-Rule +
# authentifiziertes Credential-Set: planner/infra/modules/acrCache.bicep,
# Doku: docs/18_acr-artifact-cache.md.
FROM aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/python:3.12-slim

WORKDIR /app

# OS-deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN useradd --create-home --shell /bin/bash app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]
