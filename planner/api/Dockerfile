# Base-Image: Microsoft Azure Linux (mcr.microsoft.com) — komplett Docker-Hub-frei,
# keine Auth, keine Rate-Limits. Migration weg von python:3.12-slim (Debian).
# Siehe docs/18_acr-artifact-cache.md.
FROM mcr.microsoft.com/azurelinux/base/python:3.12

WORKDIR /app

# OS-deps: curl ist im Base-Image vorhanden; ca-certificates + shadow-utils (useradd)
# via tdnf (Azure-Linux-Paketmanager).
RUN tdnf install -y ca-certificates shadow-utils \
    && tdnf clean all

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
