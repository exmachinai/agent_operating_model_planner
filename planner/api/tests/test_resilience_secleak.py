"""Resilienz (RES-2) + Secret-Leak (SEC-LEAK) — Teststrategie §7, P1.

- RES-2: Doppel-Approve an allen drei Gates ist idempotent-blockierend (409),
  kein inkonsistenter Zustand / kein Neu-Stempeln von Hashes.
- SEC-LEAK: generierte Artefakte enthalten KEINE Klartext-Secrets; `.env`-Lesen
  ist per `deny: Read(./.env)` blockiert; MCP-Secrets nur als `${ENV}`-Referenz.
"""

from __future__ import annotations

import json
import re

from fastapi.testclient import TestClient

# --- RES-2: Doppel-Approve je Gate ------------------------------------------

def test_res2_gate1_double_approve_409(client: TestClient, gate2_project: str) -> None:
    # gate2_project hat Gate 1 bereits passiert.
    resp = client.post(f"/v1/projects/{gate2_project}/approve-understanding")
    assert resp.status_code == 409


def test_res2_gate2_double_approve_409(client: TestClient, gate2_project: str) -> None:
    resp = client.post(f"/v1/projects/{gate2_project}/approve-plan")
    assert resp.status_code == 409


def test_res2_gate3_double_approve_409(client: TestClient, gate2_project: str) -> None:
    client.post(f"/v1/projects/{gate2_project}/harness")
    first = client.post(f"/v1/projects/{gate2_project}/harness/approve")
    assert first.status_code == 200
    sha1 = first.json()["harness_zip_sha256"]
    # Zweiter Approve muss blocken (sonst würde der Zip-Hash neu gestempelt).
    second = client.post(f"/v1/projects/{gate2_project}/harness/approve")
    assert second.status_code == 409
    # Zustand unverändert.
    proj = client.get(f"/v1/projects/{gate2_project}").json()
    assert proj["harness_zip_sha256"] == sha1


# --- SEC-LEAK ----------------------------------------------------------------

def _gate3_files(client: TestClient, gate2_project: str) -> dict[str, str]:
    client.post(f"/v1/projects/{gate2_project}/harness")
    client.post(f"/v1/projects/{gate2_project}/harness/approve")
    body = client.get(f"/v1/projects/{gate2_project}/harness/files").json()
    return {f["path"]: f["content"] for f in body["files"]}


def test_secleak_env_example_has_no_plaintext_secrets(
    client: TestClient, gate2_project: str
) -> None:
    files = _gate3_files(client, gate2_project)
    env = files.get(".env.example", "")
    assert env, ".env.example fehlt"
    # Secret-artige Keys (KEY/TOKEN/SECRET/PASSWORD/PAT/CREDENTIAL) müssen LEER
    # (oder ${...}) sein — nicht-geheime Defaults wie OWNER/PATH/Flags sind erlaubt.
    # Bewusst ohne bloßes "PAT" (würde fälschlich GITHUB_PROTECTED_PATHS matchen).
    secretish = re.compile(r"(API_KEY|_KEY\b|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)", re.IGNORECASE)
    saw_secret_key = False
    for line in env.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        if not secretish.search(key):
            continue
        saw_secret_key = True
        val = val.strip()
        assert val == "" or val.startswith("${"), f"Klartext-Secret in .env.example: {line}"
    assert saw_secret_key, "Erwarte mind. einen Secret-Key (z. B. ANTHROPIC_API_KEY)"


def test_secleak_settings_denies_env_read(client: TestClient, gate2_project: str) -> None:
    files = _gate3_files(client, gate2_project)
    settings = json.loads(files[".claude/settings.json"])
    deny = json.dumps(settings.get("permissions", {}).get("deny", []))
    assert "Read(./.env)" in deny, "Kein deny:Read(./.env) in settings.json"


def test_secleak_mcp_secrets_only_env_refs(client: TestClient, gate2_project: str) -> None:
    files = _gate3_files(client, gate2_project)
    mcp_raw = files.get(".mcp.json")
    if not mcp_raw:  # .mcp.json nur, wenn ein Skill einen MCP-Server verlangt.
        return
    mcp = json.loads(mcp_raw)
    # Alle env-Werte müssen ${ENV}-Referenzen sein, keine Literale.
    blob = json.dumps(mcp)
    for m in re.finditer(r'"env"\s*:\s*\{([^}]*)\}', blob):
        for kv in re.finditer(r'"[^"]+"\s*:\s*"([^"]*)"', m.group(1)):
            assert kv.group(1).startswith("${"), f"MCP-Secret nicht als ${{ENV}}: {kv.group(1)}"
