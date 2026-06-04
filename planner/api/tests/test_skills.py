"""v0.7/0.8 — Skill-Repository: Katalog, AEGIRA-Strang, Freigabeliste, Zuordnung.

Deckt ab: Schema/Registry, Kürzel-in-Beschreibung, Admin-Freigabeliste (released/
blocked/custom), freigegebene Sicht für Nutzer, Vorbelegung der Agenten mit echten
Skills (keine Fakes mehr), Zuordnung nur freigegebener Skills + Audit-Manifest.
"""

from __future__ import annotations

import json
import re

from fastapi.testclient import TestClient

from app.harness import skill_catalog
from app.schemas.harness import SkillTrustTier

_CATALOG_ID_RE = re.compile(r"^[a-z0-9-]+_skill$")
_SLUG_RE = re.compile(r"^[a-z0-9-]{1,64}$")
_ADMIN = "zgpm@aegira.ai"
_PW = "Demo2026#"


# --- Katalog (Code) ----------------------------------------------------------


def test_catalog_size_and_conventions() -> None:
    cat = skill_catalog.list_catalog()
    assert len(cat) == 49  # 33 extern + 16 AEGIRA-Methoden
    assert len({s.catalog_id for s in cat}) == 49
    for s in cat:
        assert _CATALOG_ID_RE.match(s.catalog_id), s.catalog_id
        assert _SLUG_RE.match(s.slug) and "_" not in s.slug, s.slug
        # Kürzel MUSS in der Beschreibung auftauchen
        assert s.catalog_id in s.description, s.catalog_id


def test_aegira_method_strang_present() -> None:
    cat = skill_catalog.list_catalog()
    aegira = [s for s in cat if s.trust_tier is SkillTrustTier.aegira_certified]
    assert len(aegira) == 16
    ids = {s.catalog_id for s in aegira}
    assert {"zgpm-plan_skill", "raci-validate_skill", "risk-traffic-light_skill"} <= ids


def test_every_default_agent_has_preselected_skill() -> None:
    """Keine Fakes mehr → jede vorbelegte Agentenrolle hat ≥1 echten Skill."""
    from app.harness import catalog as agent_catalog

    for ptype, sub in [("it", "software-app"), ("non-it", "concept-strategy"), (None, None)]:
        for a in agent_catalog.defaults_for(ptype, sub):
            if a.kind == "hitl":
                continue
            assert skill_catalog.preselected([a.id]), f"{a.id} ohne vorselektierten Skill"


def test_default_released_only_preselected_tiers() -> None:
    for s in skill_catalog.list_catalog():
        assert skill_catalog.default_released(s) == (s.trust_tier in (
            SkillTrustTier.anthropic_vetted, SkillTrustTier.aegira_certified, SkillTrustTier.world_top))


# --- API: freigegebene Sicht -------------------------------------------------


def test_get_skills_returns_only_released(client: TestClient) -> None:
    skills = client.get("/v1/skills").json()
    # Standard-Freigabe: vetted(12)+aegira(16)+world-top(11) = 39
    assert len(skills) == 39
    tiers = {s["trust_tier"] for s in skills}
    assert "community" not in tiers and "experimental" not in tiers


def test_recommended_offered_empty_until_admin_releases(client: TestClient) -> None:
    body = client.get("/v1/skills/recommended", params={"agents": "implementation-agent,test-agent"}).json()
    assert body["preselected"]  # vetted/world-top vorhanden
    assert body["offered"] == []  # community (tdd) erst nach Admin-Freigabe


# --- Admin-Freigabeliste -----------------------------------------------------


def _admin_token(client: TestClient) -> str:
    from app.auth import security
    from app.db.users_repo import get_users_repo
    import asyncio, re as _re

    url = client.post("/v1/auth/register", json={"email": _ADMIN, "password": _PW}).json()["verify_url"]
    client.post("/v1/auth/verify", json={"token": _re.search(r"token=([^&]+)", url).group(1)})
    client.post("/v1/auth/login", json={"email": _ADMIN, "password": _PW})
    user = asyncio.run(get_users_repo().get(_ADMIN))
    code = security.totp_now(security.secret_from_base32(user.totp_secret))
    return client.post("/v1/auth/unlock", json={"email": _ADMIN, "password": _PW, "code": code}).json()["token"]


def test_admin_lists_full_catalog_with_status(client: TestClient) -> None:
    hdr = {"Authorization": f"Bearer {_admin_token(client)}"}
    rows = client.get("/v1/auth/admin/skills", headers=hdr).json()
    assert len(rows) == 49
    by_id = {r["skill"]["catalog_id"]: r for r in rows}
    assert by_id["docx-export_skill"]["released"] is True
    assert by_id["tdd-enforcement_skill"]["released"] is False  # community default-gesperrt


def test_admin_release_then_offered_and_assignable(client: TestClient) -> None:
    hdr = {"Authorization": f"Bearer {_admin_token(client)}"}
    # vor Freigabe: tdd nicht in freigegebener Sicht
    assert all(s["catalog_id"] != "tdd-enforcement_skill" for s in client.get("/v1/skills").json())
    # freigeben
    r = client.post("/v1/auth/admin/skills/tdd-enforcement_skill/release", headers=hdr)
    assert r.status_code == 200 and r.json()["released"] is True
    assert any(s["catalog_id"] == "tdd-enforcement_skill" for s in client.get("/v1/skills").json())


def test_admin_add_custom_skill(client: TestClient) -> None:
    hdr = {"Authorization": f"Bearer {_admin_token(client)}"}
    r = client.post("/v1/auth/admin/skills", headers=hdr, json={
        "catalog_id": "custom-demo_skill", "slug": "custom-demo", "title": "Custom Demo",
        "description": "Tut etwas Spezielles.", "domain": "methodology", "agent_ids": ["doc-agent"],
    })
    assert r.status_code == 201, r.text
    assert r.json()["custom"] is True and r.json()["released"] is True
    # Kürzel in Beschreibung ergänzt
    assert "custom-demo_skill" in r.json()["skill"]["description"]
    # taucht in freigegebener Sicht auf
    assert any(s["catalog_id"] == "custom-demo_skill" for s in client.get("/v1/skills").json())


def test_admin_skills_requires_admin(client: TestClient) -> None:
    assert client.get("/v1/auth/admin/skills").status_code == 403


# --- Kompilierung: Vorbelegung + Zuordnung + Manifest ------------------------


def _gate2(client: TestClient) -> str:
    pid = client.post("/v1/projects", json={"title": "Skill v08", "description": "x"}).json()["id"]
    client.patch(f"/v1/projects/{pid}/understanding",
                 json={"project_type": "it", "project_subtype": "software-app",
                       "target_platform": "azure", "understanding_summary": "Vorhaben mit Zielbild.",
                       "aegira_internal": False})
    client.post(f"/v1/projects/{pid}/approve-understanding")
    client.post(f"/v1/projects/{pid}/guardrails/clear", json={"proceed": True})
    client.post(f"/v1/projects/{pid}/plan")
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    client.post(f"/v1/projects/{pid}/approve-plan")
    return pid


def test_compile_prepopulates_real_skills_no_fakes(client: TestClient) -> None:
    pid = _gate2(client)
    g = client.post(f"/v1/projects/{pid}/harness").json()
    # Jeder Nicht-HITL-Agent hat echte Skill-Tags …
    for a in g["agents"]:
        if a["kind"] == "hitl":
            continue
        assert a["skills"], f"{a['name']} ohne Skills"
    # … und alle Tags sind echte Slugs aus dem Katalog (keine Fakes wie zgpm-validate/mece).
    all_slugs = {s.slug for s in skill_catalog.list_catalog()}
    used = {sk for a in g["agents"] for sk in a["skills"]}
    assert used <= all_slugs
    assert "mece" not in used and "system-design" not in used  # alte Fakes weg
    # Vorbelegte Skills sind als Inhalt + Manifest hinterlegt
    assert g["catalog_skills"] and g["imported_skills"]


def test_assign_only_released_skill(client: TestClient) -> None:
    pid = _gate2(client)
    g = client.post(f"/v1/projects/{pid}/harness").json()
    aid = next(a["id"] for a in g["agents"] if a["name"] == "implementation-agent")
    # community-Skill (nicht freigegeben) → 403
    blocked = client.post(f"/v1/projects/{pid}/harness/revise",
                          json={"command": "skill", "agent_id": aid, "catalog_id": "tdd-enforcement_skill"})
    assert blocked.status_code == 403, blocked.text
    # freigegebener vetted-Skill → ok, taucht als Tag auf
    ok = client.post(f"/v1/projects/{pid}/harness/revise",
                     json={"command": "skill", "agent_id": aid, "catalog_id": "mcp-builder_skill"})
    assert ok.status_code == 201, ok.text
    target = next(a for a in ok.json()["agents"] if a["id"] == aid)
    assert "mcp-builder" in target["skills"]


def test_zip_has_manifest_and_no_huelle(client: TestClient) -> None:
    pid = _gate2(client)
    client.post(f"/v1/projects/{pid}/harness")
    client.post(f"/v1/projects/{pid}/harness/approve")
    files = {f["path"]: f["content"] for f in client.get(f"/v1/projects/{pid}/harness/files").json()["files"]}
    assert ".claude/skills/_manifest.json" in files
    man = json.loads(files[".claude/skills/_manifest.json"])
    assert man["count"] >= 1
    # keine Platzhalter-Hülle mit dem alten Marker
    for path, content in files.items():
        if path.startswith(".claude/skills/") and path.endswith("SKILL.md"):
            assert "betroffen ist" not in content  # alter Hüllen-Text
