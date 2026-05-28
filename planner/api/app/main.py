"""
AEGIRA Planner — Backend API entry point.

Spec: docs/02_architecture-option-b.md §8.1
Brand-Constraints: keine 100%-Claims, Rechtsräume DE/EU27/UK/CH, AIMS-Maturity.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import Settings, get_settings
from .routers import health, projects, sessions, hitl

logger = logging.getLogger("aegira.planner.api")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup/shutdown: warmup Cosmos client, validate Entra config."""
    settings = get_settings()
    logger.info("starting AEGIRA Planner API (env=%s)", settings.app_env)
    # Cosmos client warmup happens lazily in db.cosmos.get_client()
    yield
    logger.info("shutting down")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(
        title="AEGIRA Planner API",
        version=settings.app_version,
        description=(
            "Multi-Agent Planning API for ZGPM-compliant project plans. "
            "Compiles portable Agent-Harness Zips for Claude Code execution."
        ),
        docs_url="/docs" if settings.app_env != "prod" else None,
        redoc_url="/redoc" if settings.app_env != "prod" else None,
        openapi_url="/openapi.json" if settings.app_env != "prod" else None,
        lifespan=lifespan,
    )

    # CORS — locked to the public app domain.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://zgpm.aegira.ai",
            "https://docs.aegira.ai",
        ] + (["http://localhost:3000"] if settings.app_env != "prod" else []),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Routers — order matters for OpenAPI grouping.
    app.include_router(health.router, tags=["health"])
    app.include_router(projects.router, prefix="/v1/projects", tags=["projects"])
    app.include_router(sessions.router, prefix="/v1/sessions", tags=["sessions"])
    app.include_router(hitl.router, prefix="/v1", tags=["hitl"])

    @app.exception_handler(Exception)
    async def unhandled_exc(_request, exc):  # noqa: ANN001
        logger.exception("unhandled: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": "Ein unerwarteter Fehler — bitte später erneut versuchen.",
            },
        )

    return app


app = create_app()
