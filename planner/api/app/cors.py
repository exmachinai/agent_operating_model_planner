"""CORS-Konfiguration — nur erlaubte Origins, Methoden, Header.

Spec: docs/02 (Security). Erlaubt die lokalen Dev-Origins und die Prod-Domain.
In Nicht-Prod-Umgebungen kommen 127.0.0.1/localhost:3000 hinzu, damit das lokale
Frontend (Next dev) die API cross-origin erreichen kann.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings

logger = logging.getLogger("aegira.planner.api.cors")


def apply_cors(app: FastAPI) -> None:
    s = get_settings()
    origins = [
        "https://zgpm.aegira.ai",
        "http://localhost:3000",
    ]
    if s.app_env != "prod":
        origins += ["http://127.0.0.1:3000"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("CORS aktiv für Origins: %s", origins)
