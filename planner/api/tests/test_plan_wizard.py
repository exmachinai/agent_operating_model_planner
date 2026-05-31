"""Schritt 6a/6b — geführter Plan-Wizard: Edit-Ops + DONE-Gates (v0.5).

Deckt ab: Meilenstein-/Aktivitäts-Operationen (add/update/delete/reorder), die
DONE-Gating-Reihenfolge (409 vor Bestätigung) und die abgeleiteten Felder
(Werkzeug-Vorschläge je Aktivität, qualitatives risk_narrative). LLM ist im Test
nicht konfiguriert → es greift der deterministische Composer-Fallback.
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


def test_plan_has_tool_suggestions_and_narrative(client: TestClient) -> None:
    pid = _prepare_plan(client)
    plan = client.get(f"/v1/projects/{pid}/plan").json()
    # Qualitatives Gesamtrisiko (nicht nur Ampel) ist gesetzt.
    assert plan["risk_narrative"].strip()
    # Jede erste Aktivität hat abgeleitete Werkzeug-Vorschläge.
    act = plan["milestones"][0]["activities"][0]
    assert len(act["tool_suggestions"]) >= 1
    assert act["tool_suggestions"][0]["what_it_does"]


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


def test_activity_ops_require_milestone_done(client: TestClient) -> None:
    pid = _prepare_plan(client)
    plan = client.get(f"/v1/projects/{pid}/plan").json()
    mid = plan["milestones"][0]["id"]
    # Vor Meilenstein-DONE: Aktivitäts-Op gesperrt (409).
    r = client.post(
        f"/v1/projects/{pid}/plan/activities/op",
        json=[{"op": "add", "milestone_id": mid, "description": "Daten analysieren"}],
    )
    assert r.status_code == 409
    # Meilensteine bestätigen.
    assert client.post(f"/v1/projects/{pid}/plan/milestones/done").status_code == 200
    # Jetzt erlaubt.
    r2 = client.post(
        f"/v1/projects/{pid}/plan/activities/op",
        json=[{"op": "add", "milestone_id": mid, "description": "Daten analysieren"}],
    )
    assert r2.status_code == 201, r2.text
    acts = r2.json()["milestones"][0]["activities"]
    assert any("Daten analysieren" in a["description"] for a in acts)
    # Neue Aktivität hat Werkzeug-Vorschläge (Datenanalyse erwartet).
    new_act = next(a for a in acts if "Daten analysieren" in a["description"])
    assert any(t["name"] == "data-analysis" for t in new_act["tool_suggestions"])


def test_milestone_ops_locked_after_done(client: TestClient) -> None:
    pid = _prepare_plan(client)
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    r = client.post(
        f"/v1/projects/{pid}/plan/milestones/op",
        json=[{"op": "add", "name": "Zu spät"}],
    )
    assert r.status_code == 409


def test_activities_done_requires_milestones_done(client: TestClient) -> None:
    pid = _prepare_plan(client)
    # activities/done ohne milestones/done → 409
    assert client.post(f"/v1/projects/{pid}/plan/activities/done").status_code == 409
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    assert client.post(f"/v1/projects/{pid}/plan/activities/done").status_code == 200


def test_tool_accept_persists(client: TestClient) -> None:
    pid = _prepare_plan(client)
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    plan = client.get(f"/v1/projects/{pid}/plan").json()
    ms = plan["milestones"][0]
    act = ms["activities"][0]
    tool_id = act["tool_suggestions"][0]["id"]
    r = client.post(
        f"/v1/projects/{pid}/plan/activities/op",
        json=[
            {
                "op": "update",
                "milestone_id": ms["id"],
                "id": act["id"],
                "tool_id": tool_id,
                "tool_accepted": True,
            }
        ],
    )
    assert r.status_code == 201, r.text
    new_act = next(
        a for a in r.json()["milestones"][0]["activities"] if a["id"] == act["id"]
    )
    accepted = [t for t in new_act["tool_suggestions"] if t["accepted"]]
    assert any(t["id"] == tool_id for t in accepted)
