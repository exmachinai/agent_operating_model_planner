"""WP-4 — Projektverwaltung (Rename, Duplizieren, Löschen) + WP-5 Dropbox-Blocker."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_rename_before_gate1(client: TestClient) -> None:
    pid = client.post("/v1/projects", json={"title": "Alter Titel"}).json()["id"]
    resp = client.patch(f"/v1/projects/{pid}", json={"title": "Neuer Titel"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Neuer Titel"


def test_rename_blocked_after_gate1(client: TestClient) -> None:
    pid = client.post("/v1/projects", json={"title": "Fixiert"}).json()["id"]
    client.patch(f"/v1/projects/{pid}/understanding", json={"project_nature": "concept"})
    client.post(f"/v1/projects/{pid}/approve-understanding")
    resp = client.patch(f"/v1/projects/{pid}", json={"title": "Geht nicht mehr"})
    assert resp.status_code == 409


def test_rename_validation_422(client: TestClient) -> None:
    pid = client.post("/v1/projects", json={"title": "Titel"}).json()["id"]
    resp = client.patch(f"/v1/projects/{pid}", json={"title": "ab"})  # < 3 Zeichen
    assert resp.status_code == 422


def test_duplicate_resets_gates(client: TestClient, gate2_project: str) -> None:
    resp = client.post(f"/v1/projects/{gate2_project}/duplicate")
    assert resp.status_code == 201
    copy = resp.json()
    assert copy["id"] != gate2_project
    assert copy["title"].endswith("(Kopie)")
    assert copy["status"] == "planning"
    assert copy["gate1_approved_at"] is None
    assert copy["gate2_approved_at"] is None


def test_delete_then_404(client: TestClient) -> None:
    pid = client.post("/v1/projects", json={"title": "Wegwerf"}).json()["id"]
    assert client.delete(f"/v1/projects/{pid}").status_code == 204
    assert client.get(f"/v1/projects/{pid}").status_code == 404


def test_dropbox_blocked_without_secrets(client: TestClient, monkeypatch) -> None:
    for var in ("DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    pid = client.post("/v1/projects", json={"title": "Dropbox-Test"}).json()["id"]
    providers = client.get(f"/v1/projects/{pid}/context/cloud/providers").json()
    dropbox = next(p for p in providers if p["id"] == "dropbox")
    assert dropbox["status"] == "blocked"
    assert "DROPBOX_REFRESH_TOKEN" in dropbox["missing_env"]

    resp = client.post(f"/v1/projects/{pid}/context/cloud/connect?provider=dropbox")
    assert resp.status_code == 501


def test_dropbox_import_blocked_without_secrets(client: TestClient, monkeypatch) -> None:
    for var in ("DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    pid = client.post("/v1/projects", json={"title": "Dropbox-Import"}).json()["id"]
    resp = client.post(f"/v1/projects/{pid}/context/cloud/dropbox/import?path=/Briefe")
    assert resp.status_code == 501
