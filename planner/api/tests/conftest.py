"""Pytest-Fixtures — TestClient gegen die In-Memory-Repos (kein Cosmos/Netzwerk)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.db import harness_repo, plans_repo, projects_repo
from app.main import create_app


@pytest.fixture()
def client() -> TestClient:
    # Frische In-Memory-Repos je Test (Singletons zurücksetzen).
    projects_repo._repo = None
    plans_repo._repo = None
    harness_repo._repo = None
    return TestClient(create_app())


def _approve_to_gate2(client: TestClient) -> str:
    """Bringt ein Projekt bis Gate 2 (freigegebener Plan) und gibt die ID zurück."""
    pid = client.post(
        "/v1/projects", json={"title": "Harness Testprojekt", "description": "Demo"}
    ).json()["id"]
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"project_nature": "technical", "target_platform": "azure",
              "understanding_summary": "Technisches Vorhaben mit klarem Ziel."},
    )
    client.post(f"/v1/projects/{pid}/approve-understanding")
    client.post(f"/v1/projects/{pid}/guardrails/clear", json={"proceed": True})
    client.post(f"/v1/projects/{pid}/plan")
    client.post(f"/v1/projects/{pid}/approve-plan")
    return pid


@pytest.fixture()
def gate2_project(client: TestClient) -> str:
    return _approve_to_gate2(client)
