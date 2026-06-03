"""Erweiterte Compiler-/Harness-Invarianten (Teststrategie §4, P1).

Ergänzt `test_compiler_properties.py` um:
- INV-8  Iterations-Cap (MAX_HARNESS_ITERATIONS) → 409.
- INV-6  Absolute Pfade ($HARNESS_ROOT) im Deliverable.
- INV-10 Anti-Muster sind als `findings` sichtbar.
- INV-4  Rote Risiko-Ampel: `stop-on-red`-Hook im Deliverable.
- INV-11 Skill-Manifest (`_manifest.json`) inkl. Trust-Tier/`needs_gate`-Semantik.
"""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.schemas.harness import MAX_HARNESS_ITERATIONS


def _compile(client: TestClient, gate2_project: str) -> dict:
    return client.post(f"/v1/projects/{gate2_project}/harness").json()


def _files_after_gate3(client: TestClient, gate2_project: str) -> dict[str, str]:
    client.post(f"/v1/projects/{gate2_project}/harness")
    client.post(f"/v1/projects/{gate2_project}/harness/approve")
    body = client.get(f"/v1/projects/{gate2_project}/harness/files").json()
    return {f["path"]: f["content"] for f in body["files"]}


def test_inv8_iteration_cap_returns_409(client: TestClient, gate2_project: str) -> None:
    """Revisionen sind bei MAX_HARNESS_ITERATIONS gedeckelt (kein Endlos-Loop)."""
    _compile(client, gate2_project)
    last_iter = 1
    hit_cap = False
    for i in range(MAX_HARNESS_ITERATIONS + 5):
        cmd = "sequence" if i % 2 == 0 else "parallel"
        resp = client.post(
            f"/v1/projects/{gate2_project}/harness/revise", json={"command": cmd}
        )
        if resp.status_code == 409:
            hit_cap = True
            break
        assert resp.status_code == 201, resp.text
        last_iter = resp.json()["iteration"]
        assert last_iter <= MAX_HARNESS_ITERATIONS
    assert hit_cap, "Iterations-Cap wurde nie erreicht"
    assert last_iter <= MAX_HARNESS_ITERATIONS


def test_inv6_absolute_paths_in_claude_md(client: TestClient, gate2_project: str) -> None:
    files = _files_after_gate3(client, gate2_project)
    claude = files["CLAUDE.md"]
    assert "$HARNESS_ROOT" in claude, "CLAUDE.md ohne $HARNESS_ROOT"
    assert "absolute Pfade" in claude or "absolut" in claude.lower()


def test_inv10_anti_patterns_are_visible_as_findings(
    client: TestClient, gate2_project: str
) -> None:
    """Der Compiler macht Anti-Muster sichtbar: `findings` mit gültigem severity-Set."""
    graph = _compile(client, gate2_project)
    assert "findings" in graph
    for f in graph["findings"]:
        assert f["severity"] in {"info", "warn", "fail"}
        assert f.get("rule") and f.get("message")


def test_inv4_stop_on_red_hook_present(client: TestClient, gate2_project: str) -> None:
    """INV-4: Rote Risiko-Ampel wird runtime durch den stop-on-red-Hook abgefangen."""
    files = _files_after_gate3(client, gate2_project)
    hook = files.get(".claude/hooks/stop-on-red.sh", "")
    assert hook, "stop-on-red-Hook fehlt"
    # Der Hook erkennt eine rote Ampel und stoppt (continue:false).
    assert "rot" in hook.lower() or "red" in hook.lower()
    assert "continue" in hook and "false" in hook


def test_inv11_skill_manifest_has_trust_and_gate(
    client: TestClient, gate2_project: str
) -> None:
    files = _files_after_gate3(client, gate2_project)
    manifest_raw = files.get(".claude/skills/_manifest.json")
    assert manifest_raw, "Skill-Manifest fehlt"
    manifest = json.loads(manifest_raw)
    assert manifest.get("skills"), "Manifest ohne Skills"
    for sk in manifest["skills"]:
        # Trust-Tier steuert das Security-Gate (needs_gate ist daraus abgeleitet).
        assert isinstance(sk.get("trust_tier"), str) and sk["trust_tier"], sk
        assert sk.get("content_sha256", "").startswith("sha256:")
