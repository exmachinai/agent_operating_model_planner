"""Schritt 6a — geführter Plan-Wizard: Meilenstein-Ops + DONE-Gate (v0.6).

Deckt ab: Meilenstein-Operationen (add/reorder), das DONE-Gating (Sperre nach
Bestätigung) und die abgeleiteten Felder (qualitatives risk_narrative). LLM ist
im Test nicht konfiguriert → es greift der deterministische Composer-Fallback.

v0.6 — Aktivitäten & Personentage entfernt: der Plan endet auf Meilenstein-Ebene,
die konkrete Arbeit übernehmen die Agenten autonom.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _prepare_plan(client: TestClient) -> str:
    pid = client.post(
        "/v1/projects", json={"title": "Wizard-Test", "description": "x"}
    ).json()["id"]
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={
            "project_type": "it",
            "project_subtype": "software-app",
            "target_platform": "azure",
            "understanding_summary": "Ein klar umrissenes Vorhaben mit Zielbild.",
        },
    )
    client.post(f"/v1/projects/{pid}/approve-understanding")
    client.post(f"/v1/projects/{pid}/guardrails/clear", json={"proceed": True})
    client.post(f"/v1/projects/{pid}/plan")
    return pid


def test_plan_has_narrative_and_no_activities(client: TestClient) -> None:
    pid = _prepare_plan(client)
    plan = client.get(f"/v1/projects/{pid}/plan").json()
    # Qualitatives Gesamtrisiko (nicht nur Ampel) ist gesetzt.
    assert plan["risk_narrative"].strip()
    # v0.6 — Meilensteine haben kein activities-Feld mehr.
    ms = plan["milestones"][0]
    assert "activities" not in ms
    # Methodentreue bleibt: PVM + MRL je Meilenstein.
    assert ms["responsibilities"]
    assert ms["mrl"]


def test_milestone_ops_add_and_reorder(client: TestClient) -> None:
    pid = _prepare_plan(client)
    before = client.get(f"/v1/projects/{pid}/plan").json()
    n0 = len(before["milestones"])

    # add
    r = client.post(
        f"/v1/projects/{pid}/plan/milestones/op",
        json=[{"op": "add", "name": "Pilot abgeschlossen"}],
    )
    assert r.status_code == 201, r.text
    after = r.json()
    assert len(after["milestones"]) == n0 + 1
    assert after["milestones"][-1]["name"] == "Pilot abgeschlossen"

    # reorder (umkehren) — Gantt-Termine müssen monoton neu vergeben werden
    order = [m["id"] for m in reversed(after["milestones"])]
    r2 = client.post(
        f"/v1/projects/{pid}/plan/milestones/op",
        json=[{"op": "reorder", "order": order}],
    )
    assert r2.status_code == 201
    reordered = r2.json()
    assert [m["id"] for m in reordered["milestones"]] == order
    dates = [m["planned_date"] for m in reordered["milestones"]]
    assert dates == sorted(dates)  # Termine in Reihenfolge


def test_milestone_ops_locked_after_done(client: TestClient) -> None:
    pid = _prepare_plan(client)
    # DONE schaltet direkt das 6c-Ergebnis frei (keine Aktivitäts-Stufe mehr).
    assert client.post(f"/v1/projects/{pid}/plan/milestones/done").status_code == 200
    r = client.post(
        f"/v1/projects/{pid}/plan/milestones/op",
        json=[{"op": "add", "name": "Zu spät"}],
    )
    assert r.status_code == 409


def test_activity_endpoints_gone(client: TestClient) -> None:
    """v0.6 — die 6b-Aktivitäts-Endpunkte existieren nicht mehr (404)."""
    pid = _prepare_plan(client)
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    assert client.post(
        f"/v1/projects/{pid}/plan/activities/op",
        json=[{"op": "add", "milestone_id": "M01", "description": "x"}],
    ).status_code == 404
    assert client.post(f"/v1/projects/{pid}/plan/activities/done").status_code == 404
    assert client.get(f"/v1/projects/{pid}/plan/accepted-tools").status_code == 404
