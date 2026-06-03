"""Gate-1-Guard + Preference-Drift (Teststrategie §8/§6 CG-6, P0).

Gate 1 (Verständnis-Freigabe) darf NUR durchgehen, wenn die beiden steuernden
Pflichtfelder gesetzt sind:
  - `project_nature` (IT/Non-IT-Achse) — sonst rät der Compiler.
  - `aegira_internal` (Preference-Drift-Guard) — entscheidet, ob AEGIRA-Preferences/
    Constitution überhaupt angewandt werden (Kundenschutz, v0.9.3/0.9.4).

Fehlt eins → 422 (handlungsfähiger Hinweis, kein Stacktrace). `aegira_internal=False`
muss zudem `use_preferences=False` erzwingen (kein Marken-Leak in Kundendeliverables).
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _new_project(client: TestClient) -> str:
    return client.post(
        "/v1/projects", json={"title": "Gate-1 Guard", "description": "Demo"}
    ).json()["id"]


def test_approve_blocked_without_project_nature(client: TestClient) -> None:
    pid = _new_project(client)
    # Nur Zusammenfassung, KEINE project_nature.
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"understanding_summary": "Ziel ist klar.", "aegira_internal": False},
    )
    resp = client.post(f"/v1/projects/{pid}/approve-understanding")
    assert resp.status_code == 422
    assert "rojektart" in resp.json()["detail"] or "IT" in resp.json()["detail"]


def test_approve_blocked_without_aegira_internal(client: TestClient) -> None:
    pid = _new_project(client)
    # project_nature gesetzt, aber Preference-Drift-Frage unbeantwortet.
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"project_nature": "technical", "understanding_summary": "Ziel ist klar."},
    )
    resp = client.post(f"/v1/projects/{pid}/approve-understanding")
    assert resp.status_code == 422
    assert "AEGIRA" in resp.json()["detail"]


def test_approve_passes_with_both_fields(client: TestClient) -> None:
    pid = _new_project(client)
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"project_nature": "technical", "understanding_summary": "Ziel ist klar.",
              "aegira_internal": True},
    )
    resp = client.post(f"/v1/projects/{pid}/approve-understanding")
    assert resp.status_code in (200, 201), resp.text


def test_aegira_internal_false_disables_preferences(client: TestClient) -> None:
    pid = _new_project(client)
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"project_nature": "concept", "understanding_summary": "Externer Kunde.",
              "aegira_internal": False},
    )
    proj = client.get(f"/v1/projects/{pid}").json()
    # Preference-Drift-Guard: Externprojekt → keine AEGIRA-Preferences.
    assert proj.get("use_preferences") is False
