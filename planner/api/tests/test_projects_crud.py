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
    client.patch(f"/v1/projects/{pid}/understanding", json={"project_nature": "concept", "aegira_internal": False})
    client.post(f"/v1/projects/{pid}/approve-understanding")
    resp = client.patch(f"/v1/projects/{pid}", json={"title": "Geht nicht mehr"})
    assert resp.status_code == 409


def test_rename_validation_422(client: TestClient) -> None:
    pid = client.post("/v1/projects", json={"title": "Titel"}).json()["id"]
    resp = client.patch(f"/v1/projects/{pid}", json={"title": "ab"})  # < 3 Zeichen
    assert resp.status_code == 422


def test_gate1_requires_aegira_internal(client: TestClient) -> None:
    """v0.9.3 — Preference-Drift-Frage muss vor Gate 1 beantwortet sein."""
    pid = client.post("/v1/projects", json={"title": "Ohne Drift-Antwort"}).json()["id"]
    client.patch(f"/v1/projects/{pid}/understanding", json={"project_nature": "concept"})
    blocked = client.post(f"/v1/projects/{pid}/approve-understanding")
    assert blocked.status_code == 422
    # Nach Beantwortung klappt die Freigabe.
    client.patch(f"/v1/projects/{pid}/understanding", json={"aegira_internal": False})
    ok = client.post(f"/v1/projects/{pid}/approve-understanding")
    assert ok.status_code == 200


def test_preference_guard_editable_after_gate1(client: TestClient) -> None:
    """v0.9.3 — der Governance-Schalter bleibt nach Gate 1 korrigierbar,
    das übrige Verständnis aber eingefroren."""
    pid = client.post("/v1/projects", json={"title": "Mühle-Fall"}).json()["id"]
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"project_nature": "concept", "aegira_internal": False,
              "understanding_summary": "Externes Vorhaben."},
    )
    assert client.post(f"/v1/projects/{pid}/approve-understanding").status_code == 200

    # Preference-Drift-Guard nachträglich korrigieren → erlaubt, wird übernommen.
    resp = client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"aegira_internal": True, "use_preferences": True},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["aegira_internal"] is True
    assert body["use_preferences"] is True

    # Eingefrorene Felder bleiben unverändert, auch wenn sie mitgeschickt werden.
    resp2 = client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"understanding_summary": "GEÄNDERT", "aegira_internal": False},
    )
    assert resp2.status_code == 200
    assert resp2.json()["understanding_summary"] == "Externes Vorhaben."
    assert resp2.json()["aegira_internal"] is False


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


def test_cloud_providers_removed(client: TestClient) -> None:
    """v0.4 — Cloud-Provider (SharePoint/OneDrive/Dropbox/Azure-Blob) entfernt."""
    pid = client.post("/v1/projects", json={"title": "Cloud entfernt"}).json()["id"]
    providers = client.get(f"/v1/projects/{pid}/context/cloud/providers").json()
    assert providers == []
    # Connect/Import scheitern sauber (501), nicht mit 500.
    assert client.post(
        f"/v1/projects/{pid}/context/cloud/connect?provider=dropbox"
    ).status_code == 501
    assert client.post(
        f"/v1/projects/{pid}/context/cloud/dropbox/import?path=/Briefe"
    ).status_code == 501
