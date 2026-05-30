"""Environment-driven config — single source of runtime parameters."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ----------------------------------------------------------------
    app_env: Literal["prod", "staging", "dev"] = Field(default="dev", alias="APP_ENV")
    app_version: str = Field(default="0.3.1", alias="APP_VERSION")
    log_level: str = Field(default="info", alias="LOG_LEVEL")

    # --- Cosmos -------------------------------------------------------------
    cosmos_endpoint: str = Field(default="", alias="COSMOS_ENDPOINT")
    cosmos_database: str = Field(default="planner", alias="COSMOS_DATABASE")

    # --- Storage ------------------------------------------------------------
    storage_account_name: str = Field(default="", alias="STORAGE_ACCOUNT_NAME")
    storage_container_plans: str = Field(default="plans-yaml", alias="STORAGE_CONTAINER_PLANS")
    storage_container_harness: str = Field(default="harness-zips", alias="STORAGE_CONTAINER_HARNESS")

    # --- LLM (Foundry) ------------------------------------------------------
    foundry_endpoint: str = Field(default="", alias="AZURE_FOUNDRY_ENDPOINT")
    foundry_deployment_primary: str = Field(default="claude-sonnet-46-primary", alias="AZURE_FOUNDRY_DEPLOYMENT_PRIMARY")
    foundry_deployment_compress: str = Field(default="claude-haiku-45-compress", alias="AZURE_FOUNDRY_DEPLOYMENT_COMPRESS")
    foundry_api_key: str = Field(default="", alias="AZURE_FOUNDRY_API_KEY")

    # --- Entra --------------------------------------------------------------
    entra_tenant_id: str = Field(default="", alias="ENTRA_TENANT_ID")
    entra_app_id: str = Field(default="", alias="ENTRA_APP_ID")
    entra_audience: str = Field(default="https://zgpm.aegira.ai", alias="ENTRA_AUDIENCE")

    # --- Session / Lock-Screen ---------------------------------------------
    session_idle_timeout_workspace_sec: int = Field(default=900, alias="SESSION_IDLE_TIMEOUT_WORKSPACE_SEC")
    session_idle_timeout_admin_sec: int = Field(default=300, alias="SESSION_IDLE_TIMEOUT_ADMIN_SEC")
    session_hard_lock_background_sec: int = Field(default=1800, alias="SESSION_HARD_LOCK_BACKGROUND_SEC")

    # --- Budgets ------------------------------------------------------------
    max_tokens_per_run: int = Field(default=1_000_000, alias="MAX_TOKENS_PER_RUN")
    rate_limit_per_user_per_hour: int = Field(default=20, alias="RATE_LIMIT_PER_USER_PER_HOUR")

    # --- Observability ------------------------------------------------------
    appinsights_connection_string: str = Field(default="", alias="APPINSIGHTS_CONNECTION_STRING")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
