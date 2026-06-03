"""P0.4/E1/E4 — Schema-Validierungs-Gate + Determinismus für den Harness-Output.

Prüft jeden generierten Artefakttyp gegen das hinterlegte Claude-Code-Schema
(`app.harness.schema_check`) und stellt sicher, dass absichtlich falsche Felder
hart fehlschlagen. Zusätzlich: derselbe Plan → bit-identischer Zip-Hash (E4).
"""

from __future__ import annotations

import io
import json
import zipfile

import pytest
from fastapi.testclient import TestClient

from app.harness import schema_check
from app.harness.schema_check import SchemaError


def _compiled_files(client: TestClient, pid: str) -> dict[str, str]:
    """Kompiliert + friert den Harness ein und gibt {relpath: content}."""
    client.post(f"/v1/projects/{pid}/harness")
    client.post(f"/v1/projects/{pid}/harness/approve")
    resp = client.get(f"/v1/projects/{pid}/harness/files")
    assert resp.status_code == 200
    return {f["path"]: f["content"] for f in resp.json()["files"]}


# --- Positiv: echte Artefakte sind schema-valide --------------------------------


def test_settings_json_is_schema_valid(client: TestClient, gate2_project: str) -> None:
    files = _compiled_files(client, gate2_project)
    settings = json.loads(files[".claude/settings.json"])
    schema_check.validate_settings(settings)  # wirft sonst SchemaError
    # Kanonische Erwartungen (P0.3): keine Phantasie-Keys, gültiger defaultMode.
    assert "thinking_budget" not in settings
    assert "subagents_path" not in settings
    assert settings["permissions"]["defaultMode"] in {
        "default", "acceptEdits", "plan", "dontAsk",
    }


def test_hooks_are_canonical(client: TestClient, gate2_project: str) -> None:
    files = _compiled_files(client, gate2_project)
    settings = json.loads(files[".claude/settings.json"])
    hooks = settings["hooks"]
    schema_check.validate_hooks(hooks)
    assert set(hooks) <= {"PreToolUse", "PostToolUse", "Stop"}
    # Generische, deterministische Hooks immer vorhanden.
    assert ".claude/hooks/audit-log.sh" in files
    assert ".claude/hooks/checkpoint.sh" in files


def _internal_gate2(client: TestClient) -> str:
    """v0.9 — AEGIRA-internes Projekt mit aktivierten Preferences bis Gate 2."""
    pid = client.post("/v1/projects", json={"title": "AEGIRA intern", "description": "x"}).json()["id"]
    client.patch(f"/v1/projects/{pid}/understanding", json={
        "project_type": "it", "project_subtype": "software-app", "target_platform": "azure",
        "understanding_summary": "Internes Vorhaben.", "aegira_internal": True, "use_preferences": True,
    })
    client.post(f"/v1/projects/{pid}/approve-understanding")
    client.post(f"/v1/projects/{pid}/guardrails/clear", json={"proceed": True})
    client.post(f"/v1/projects/{pid}/plan")
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    client.post(f"/v1/projects/{pid}/approve-plan")
    return pid


def test_preference_drift_guard(client: TestClient, gate2_project: str) -> None:
    """v0.9 — extern (Default): KEINE AEGIRA-Preferences; intern: Constitution da."""
    ext = _compiled_files(client, gate2_project)  # gate2_project ist NICHT AEGIRA-intern
    claude = ext["CLAUDE.md"]
    assert "AI Navigator" not in claude and "AEGIRA-Constitution" not in claude
    assert ".claude/hooks/constitution-guard.sh" not in ext
    assert ".claude/rules/zones.md" not in ext
    assert "00_CLAUDE_KNOWLEDGE_ARCHITECTURE" not in ext[".claude/settings.json"]

    intern = _compiled_files(client, _internal_gate2(client))
    assert "AI Navigator" in intern["CLAUDE.md"]
    assert ".claude/hooks/constitution-guard.sh" in intern
    assert ".claude/rules/zones.md" in intern


def test_agent_frontmatter_is_schema_valid(client: TestClient, gate2_project: str) -> None:
    files = _compiled_files(client, gate2_project)
    agents = [p for p in files if p.startswith(".claude/agents/")]
    assert agents
    for path in agents:
        schema_check.validate_agent_frontmatter(files[path])
        assert "thinking_budget" not in files[path]


def test_plugin_json_is_schema_valid(client: TestClient, gate2_project: str) -> None:
    files = _compiled_files(client, gate2_project)
    # gate2_project ist ein Externprojekt (aegira_internal=False) → neutraler Namespace (F-CG6).
    plugin = json.loads(files[".claude/plugins/agent-harness/plugin.json"])
    schema_check.validate_plugin(plugin)
    # B4: Befehle sind Skills, kein doppeltes commands-Manifest.
    assert "commands" not in plugin
    assert "skills" in plugin


def test_commands_migrated_to_skills(client: TestClient, gate2_project: str) -> None:
    files = _compiled_files(client, gate2_project)
    assert ".claude/skills/run-harness/SKILL.md" in files
    assert "disable-model-invocation: true" in files[".claude/skills/run-harness/SKILL.md"]
    # Legacy-Verzeichnis nur noch als Hinweis.
    assert ".claude/commands/README.md" in files


def test_rules_and_matrix_present(client: TestClient, gate2_project: str) -> None:
    files = _compiled_files(client, gate2_project)
    # v0.9 — Zonen-Regeln sind AEGIRA-intern → nur bei internem Projekt (s. drift-guard).
    assert "plan/matrix.md" in files
    assert "RACI" in files["plan/matrix.md"]
    # B5 — AGENTS.md als Cross-Tool-Einstieg, importiert CLAUDE.md.
    assert "AGENTS.md" in files
    assert "@CLAUDE.md" in files["AGENTS.md"]


def test_devcontainer_gated_on_it(client: TestClient) -> None:
    """B6 — .devcontainer/ nur für IT-Vorhaben (Non-Root-Sandbox)."""
    from datetime import datetime, timezone

    from app.harness import templates
    from app.schemas.project import Project

    def _proj(ptype: str | None) -> Project:
        return Project(
            id="p", tenantId="t", owner_user_id="u", title="X",
            project_type=ptype, created_at=datetime.now(timezone.utc),
        )

    assert templates.devcontainer_files(_proj("it"))  # IT → Datei(en)
    assert templates.devcontainer_files(_proj("non-it")) == {}
    assert templates.devcontainer_files(_proj(None)) == {}


def test_mcp_json_valid_when_present(client: TestClient, gate2_project: str) -> None:
    files = _compiled_files(client, gate2_project)
    if ".mcp.json" in files:
        schema_check.validate_mcp(json.loads(files[".mcp.json"]))


# --- Negativ: falsche Felder schlagen hart fehl (CI-Gate beweist Wirkung) -------


def test_invalid_settings_key_rejected() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_settings(
            {"model": "x", "thinking_budget": "high"}  # Phantasie-Key
        )


def test_invalid_default_mode_rejected() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_settings({"permissions": {"defaultMode": "yolo"}})


def test_invalid_hook_event_rejected() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks(
            {"before_tool": [{"matcher": "*", "hooks": [{"type": "command", "command": "x"}]}]}
        )


def test_invalid_hook_handler_type_rejected() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_hooks(
            {"PreToolUse": [{"matcher": "*", "hooks": [{"type": "block"}]}]}
        )


def test_agent_frontmatter_unknown_field_rejected() -> None:
    bad = "---\nname: x\ndescription: y\nthinking_budget: high\n---\n# X\n"
    with pytest.raises(SchemaError):
        schema_check.validate_agent_frontmatter(bad)


def test_mcp_plaintext_secret_rejected() -> None:
    with pytest.raises(SchemaError):
        schema_check.validate_mcp(
            {"mcpServers": {"x": {"type": "http", "url": "https://x",
                                  "headers": {"Authorization": "Bearer sk-secret"}}}}
        )


# --- C1 — Autonomie-Stufe koppelt defaultMode + Telemetrie ----------------------


def test_autonomy_level_drives_default_mode(client: TestClient, gate2_project: str) -> None:
    base = client.post(f"/v1/projects/{gate2_project}/harness").json()
    assert base["autonomy_level"] == 2  # Default = assistiert

    bumped = client.post(
        f"/v1/projects/{gate2_project}/harness/revise",
        json={"command": "autonomy", "autonomy_level": 4},
    )
    assert bumped.status_code == 201
    assert bumped.json()["autonomy_level"] == 4

    # NICHT neu kompilieren (das setzte die Stufe zurück) — direkt einfrieren + holen.
    client.post(f"/v1/projects/{gate2_project}/harness/approve")
    files = {
        f["path"]: f["content"]
        for f in client.get(f"/v1/projects/{gate2_project}/harness/files").json()["files"]
    }
    settings = json.loads(files[".claude/settings.json"])
    assert settings["permissions"]["defaultMode"] == "dontAsk"
    assert settings["env"].get("CLAUDE_CODE_ENABLE_TELEMETRY") == "1"


def test_autonomy_command_requires_level(client: TestClient, gate2_project: str) -> None:
    client.post(f"/v1/projects/{gate2_project}/harness")
    resp = client.post(
        f"/v1/projects/{gate2_project}/harness/revise", json={"command": "autonomy"}
    )
    assert resp.status_code == 422


# --- E4 — Determinismus: gleicher Plan → bit-identischer Zip-Hash ----------------


def test_zip_hash_is_deterministic(client: TestClient, gate2_project: str) -> None:
    client.post(f"/v1/projects/{gate2_project}/harness")
    client.post(f"/v1/projects/{gate2_project}/harness/approve")

    def zip_hash() -> str:
        data = client.get(f"/v1/projects/{gate2_project}/harness/download").content
        return zipfile.ZipFile(io.BytesIO(data)) and __import__("hashlib").sha256(data).hexdigest()

    assert zip_hash() == zip_hash()
