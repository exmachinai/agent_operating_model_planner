"""Pydantic models for projects + plans — Spec docs/02 §4.1, §4.2."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ProjectNature = Literal["concept", "technical", "hybrid-concept-tech"]
TargetPlatform = Literal[
    "azure", "aws", "gcp", "on-prem",
    "hybrid-cloud", "multi-cloud", "claude-code-only",
]
ProjectStatus = Literal["planning", "reviewing", "approved", "compiled", "archived"]


class CreateProjectRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=4000)


class Project(BaseModel):
    id: str
    tenant_id: str = Field(alias="tenantId")
    owner_user_id: str
    title: str
    project_nature: ProjectNature | None = None
    target_platform: TargetPlatform | None = None
    created_at: datetime
    status: ProjectStatus = "planning"
    current_iteration: int = 0
    plan_hash: str | None = None

    model_config = {"populate_by_name": True}
