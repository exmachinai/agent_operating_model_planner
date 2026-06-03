"""Golden-/Snapshot-Test (Teststrategie §2/§10, P2) — `syrupy`.

Friert die DATEI-STRUKTUR des kompilierten Harness ein (sortierte Pfadliste).
Fängt unbeabsichtigte strukturelle Drift (Datei hinzugefügt/entfernt/umbenannt) —
ergänzend zur Determinismus-Invariante INV-7 (Inhalt). Pfade sind stabil
(keine Projekt-IDs); bei bewusster Änderung: `pytest --snapshot-update`.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _gate3_paths(client: TestClient, gate2_project: str) -> list[str]:
    client.post(f"/v1/projects/{gate2_project}/harness")
    client.post(f"/v1/projects/{gate2_project}/harness/approve")
    body = client.get(f"/v1/projects/{gate2_project}/harness/files").json()
    return sorted(f["path"] for f in body["files"])


def test_harness_structure_golden(client: TestClient, gate2_project: str, snapshot) -> None:
    assert _gate3_paths(client, gate2_project) == snapshot
