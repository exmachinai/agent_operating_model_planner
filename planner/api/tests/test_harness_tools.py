"""Schritt 8 — Werkzeug/MCP-Bindung + echter SKILL.md-Import je Agent (v0.6).

Spiegelt das Muster von test_harness.py (Agent-CRUD): kompilieren, ein `tool`-
bzw. `skill`-Kommando anwenden, Bindung prüfen, wieder entfernen. Plus
Validierungsfehler (422) und der unveränderte SKILL.md-Import ins Zip.
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


_VALID_SKILL = """---
name: my-skill
description: Tut etwas Konkretes für den Harness.
---

# my-skill

Ein echter, importierter Skill.
"""


def test_skill_import_unchanged_in_graph(client: TestClient) -> None:
    """v0.6 — `skill`-Kommando mit skill_content importiert eine echte SKILL.md."""
    pid = _gate2(client)
    graph = client.post(f"/v1/projects/{pid}/harness").json()
    agent_id = graph["agents"][0]["id"]

    r = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={
            "command": "skill",
            "agent_id": agent_id,
            "skill": "my-skill",
            "skill_content": _VALID_SKILL,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    target = next(a for a in body["agents"] if a["id"] == agent_id)
    assert "my-skill" in target["skills"]
    imported = {s["name"]: s["content"] for s in body["imported_skills"]}
    assert imported.get("my-skill") == _VALID_SKILL


def test_skill_import_rejects_missing_frontmatter(client: TestClient) -> None:
    pid = _gate2(client)
    graph = client.post(f"/v1/projects/{pid}/harness").json()
    agent_id = graph["agents"][0]["id"]
    r = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={
            "command": "skill",
            "agent_id": agent_id,
            "skill": "broken",
            "skill_content": "Nur Freitext, kein Frontmatter.",
        },
    )
    assert r.status_code == 422
