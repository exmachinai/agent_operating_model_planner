"""Schritt 8 — Werkzeug/MCP-Bindung je Agent (v0.5 `tool`-Kommando).

Spiegelt das Muster von test_harness.py (Agent-CRUD): kompilieren, ein `tool`-
Kommando anwenden, Bindung prüfen, wieder entfernen. Plus Validierungsfehler (422)
und der /plan/accepted-tools-Endpunkt.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _gate2(client: TestClient) -> str:
    """Projekt bis Gate 2 (Plan freigegeben) bringen → Harness kompilierbar."""
    pid = client.post(
        "/v1/projects", json={"title": "Tool-Bind", "description": "x"}
    ).json()["id"]
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={
            "project_type": "it",
            "project_subtype": "software-app",
            "target_platform": "azure",
            "understanding_summary": "Vorhaben mit klarem Zielbild.",
        },
    )
    client.post(f"/v1/projects/{pid}/approve-understanding")
    client.post(f"/v1/projects/{pid}/guardrails/clear", json={"proceed": True})
    client.post(f"/v1/projects/{pid}/plan")
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    client.post(f"/v1/projects/{pid}/plan/activities/done")
    client.post(f"/v1/projects/{pid}/approve-plan")
    return pid


def test_tool_bind_and_remove(client: TestClient) -> None:
    pid = _gate2(client)
    graph = client.post(f"/v1/projects/{pid}/harness").json()
    agent_id = graph["agents"][0]["id"]

    add = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={"command": "tool", "agent_id": agent_id, "tool": "web-search"},
    )
    assert add.status_code == 201, add.text
    target = next(a for a in add.json()["agents"] if a["id"] == agent_id)
    assert "web-search" in target["tools"]

    rem = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={"command": "tool", "agent_id": agent_id, "tool": "web-search", "remove": True},
    )
    assert rem.status_code == 201
    target2 = next(a for a in rem.json()["agents"] if a["id"] == agent_id)
    assert "web-search" not in target2["tools"]


def test_tool_command_requires_fields(client: TestClient) -> None:
    pid = _gate2(client)
    client.post(f"/v1/projects/{pid}/harness")
    # agent_id fehlt → ValueError → 422
    resp = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={"command": "tool", "tool": "web-search"},
    )
    assert resp.status_code == 422


def test_accepted_tools_endpoint_empty(client: TestClient) -> None:
    pid = _gate2(client)
    # DONE-Flow akzeptierte nichts → leere Liste, aber 200.
    r0 = client.get(f"/v1/projects/{pid}/plan/accepted-tools")
    assert r0.status_code == 200
    assert isinstance(r0.json(), list)


def test_accepted_tools_reflects_acceptance(client: TestClient) -> None:
    # Eigener Flow: Tool annehmen, bevor Aktivitäten-DONE.
    pid = client.post(
        "/v1/projects", json={"title": "Accept-Tools", "description": "x"}
    ).json()["id"]
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={
            "project_type": "it",
            "project_subtype": "data-analytics",
            "target_platform": "azure",
            "understanding_summary": "Datenprojekt.",
        },
    )
    client.post(f"/v1/projects/{pid}/approve-understanding")
    client.post(f"/v1/projects/{pid}/guardrails/clear", json={"proceed": True})
    client.post(f"/v1/projects/{pid}/plan")
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    plan = client.get(f"/v1/projects/{pid}/plan").json()
    ms = plan["milestones"][0]
    act = ms["activities"][0]
    tool_id = act["tool_suggestions"][0]["id"]
    tool_name = act["tool_suggestions"][0]["name"]
    client.post(
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
    accepted = client.get(f"/v1/projects/{pid}/plan/accepted-tools").json()
    assert any(t["name"] == tool_name for t in accepted)
