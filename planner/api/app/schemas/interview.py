"""Schemas für das Schärfungs-Interview (Schritt 2, VERSTEHEN).

Spec: docs/09_process-flow.md (Schritt 2) — McKinsey: MECE, hypothesengeleitet,
eine Frage nach der anderen, aktive Vorschläge (Projektart, Plattform, Summary),
jeder Vorschlag annehmbar/änderbar/verwerfbar.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .project import ProjectNature, TargetPlatform

Role = Literal["assistant", "user"]
SuggestionKind = Literal["project_nature", "target_platform", "understanding_summary"]


class Suggestion(BaseModel):
    """Ein konkreter, übernehmbarer Vorschlag des Interviewers.

    `value` ist genau das, was beim Übernehmen via PATCH /understanding gesetzt
    wird (Feld = `kind`).
    """

    id: str
    kind: SuggestionKind
    value: str
    label: str
    rationale: str = ""


class InterviewMessage(BaseModel):
    role: Role
    content: str
    suggestions: list[Suggestion] = Field(default_factory=list)


class InterviewState(BaseModel):
    project_id: str
    transcript: list[InterviewMessage] = Field(default_factory=list)
    done: bool = False


class InterviewTurnRequest(BaseModel):
    """Eine Antwort des Anwenders im Interview."""

    message: str = Field(min_length=1, max_length=8000)
