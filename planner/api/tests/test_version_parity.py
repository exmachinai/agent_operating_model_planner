"""VER-PARITY (Teststrategie §5/P0, Risk R5) — Versions-Strings müssen konsistent sein.

Backend-`app_version`, Frontend-`package.json`, Compiler-`_COMPILER_ID`-Suffix und der
`GET /health`-Report dürfen nicht driften. Vor v0.9.4 standen sie auf 0.9.2 / 0.9.4 /
@0.9.0 auseinander — genau die „Versions-Drift", die falsche Runtime-Annahmen erzeugt.
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import get_settings
from app.harness import compiler

# Single Source of Truth für die erwartete Release-Version.
EXPECTED_VERSION = "0.10.4"

# tests/ -> api/ -> planner/  (dort liegt die Frontend-package.json)
_PACKAGE_JSON = Path(__file__).resolve().parents[2] / "package.json"


def test_backend_app_version_matches_expected() -> None:
    assert get_settings().app_version == EXPECTED_VERSION


def test_frontend_package_version_matches_expected() -> None:
    data = json.loads(_PACKAGE_JSON.read_text(encoding="utf-8"))
    assert data["version"] == EXPECTED_VERSION


def test_compiler_id_suffix_matches_expected() -> None:
    # _COMPILER_ID hat die Form "aegira-planner@<version>".
    assert compiler._COMPILER_ID.endswith(f"@{EXPECTED_VERSION}"), compiler._COMPILER_ID


def test_health_reports_config_version(client: TestClient) -> None:
    # Ohne APP_VERSION-Override (Test-Env) meldet /health den Config-Default.
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["version"] == EXPECTED_VERSION


def test_all_version_sources_agree() -> None:
    """Ein einziger Wert über alle Quellen — bricht bei jeder künftigen Teil-Bump-Drift."""
    pkg = json.loads(_PACKAGE_JSON.read_text(encoding="utf-8"))["version"]
    compiler_suffix = compiler._COMPILER_ID.rsplit("@", 1)[-1]
    assert {get_settings().app_version, pkg, compiler_suffix} == {EXPECTED_VERSION}
