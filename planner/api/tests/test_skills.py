"""v0.7 — Skill-Repository: Schema, Katalog-Matching, API, Auswahl + Security-Gate.

Deckt M1 (Schema/Registry), M2 (Endpunkt/Matching) und M4 (Kompilierung,
Audit-Manifest, Gate) ab. Spiegelt das Flow-Muster aus test_harness_tools.py.
"""

from __future__ import annotations

import json
import re

import pytest
from fastapi.testclient import TestClient

from app.harness import skill_catalog
from app.schemas.harness import CatalogSkill, SkillTrustTier

_CATALOG_ID_RE = re.compile(r"^[a-z0-9-]+_skill$")
_SLUG_RE = re.compile(r"^[a-z0-9-]{1,64}$")


# --- M1: Schema + Registry ---------------------------------------------------


def test_catalog_has_33_and_conventions() -> None:
    cat = skill_catalog.list_catalog()
    assert len(cat) == 33
    ids = [s.catalog_id for s in cat]
    assert len(set(ids)) == 33  # eindeutig
    for s in cat:
        assert _CATALOG_ID_RE.match(s.catalog_id), s.catalog_id
        assert _SLUG_RE.match(s.slug), s.slug
        assert "_" not in s.slug  # Upstream-slug folgt dem offenen Standard
        assert s.description and len(s.description) <= 1024
        assert isinstance(s.trust_tier, SkillTrustTier)


def test_no_zgpm_or_aegira_method_skills() -> None:
    """Eckpfeiler: keine AEGIRA-eigenen Methoden-Skills im externen Seed."""
    for s in skill_catalog.list_catalog():
        assert not s.catalog_id.startswith("zgpm")
        assert s.trust_tier is not SkillTrustTier.aegira_certified


def test_trust_distribution() -> None:
    tiers = [s.trust_tier for s in skill_catalog.list_catalog()]
    assert tiers.count(SkillTrustTier.anthropic_vetted) == 12
    assert tiers.count(SkillTrustTier.world_top) == 11
    assert tiers.count(SkillTrustTier.community) == 9
    assert tiers.count(SkillTrustTier.experimental) == 1


def test_catalog_id_regex_enforced() -> None:
    with pytest.raises(Exception):
        CatalogSkill(catalog_id="bad id", slug="x", title="t", description="d",
                     author="a", source="s", trust_tier="community", domain="output")
    with pytest.raises(Exception):
        CatalogSkill(catalog_id="ok_skill", slug="under_score", title="t", description="d",
                     author="a", source="s", trust_tier="community", domain="output")


def test_skills_for_agents_matching_and_sort() -> None:
    rec = skill_catalog.skills_for_agents(["doc-agent"])
    assert rec, "doc-agent muss Empfehlungen haben"
    assert all("doc-agent" in s.agent_ids for s in rec)
    # vorselektierte (vetted/world-top) zuerst
    pre = [s.preselected for s in rec]
    assert pre == sorted(pre, reverse=True)


def test_unknown_and_empty_agents() -> None:
    assert skill_catalog.skills_for_agents([]) == []
    assert skill_catalog.skills_for_agents(["does-not-exist"]) == []


def test_preselected_only_vetted_or_worldtop() -> None:
    for s in skill_catalog.preselected(["doc-agent", "ux-agent", "devops-agent", "redteam-agent"]):
        assert s.trust_tier in (
            SkillTrustTier.anthropic_vetted,
            SkillTrustTier.aegira_certified,
            SkillTrustTier.world_top,
        )
    for s in skill_catalog.offered(["redteam-agent", "data-agent"]):
        assert s.trust_tier in (SkillTrustTier.community, SkillTrustTier.experimental)


def test_hydrate_sets_content_and_sha() -> None:
    s = skill_catalog.by_id("docx-export_skill")
    h = skill_catalog.hydrate(s)
    assert h.content and h.content.lstrip().startswith("---")
    assert "name: docx" in h.content
    assert h.content_sha256 and h.content_sha256.startswith("sha256:")


def test_needs_gate_flag() -> None:
    # community/experimental ODER has_scripts → Gate
    assert skill_catalog.by_id("pentest-autonomous_skill").needs_gate  # experimental
    assert skill_catalog.by_id("readme-gen_skill").needs_gate          # community
    assert skill_catalog.by_id("canvas-design_skill").needs_gate       # vetted aber has_scripts
    assert not skill_catalog.by_id("docx-export_skill").needs_gate     # vetted, kein Skript


# --- M2: API-Endpunkt --------------------------------------------------------


def test_get_all_skills(client: TestClient) -> None:
    r = client.get("/v1/skills")
    assert r.status_code == 200
    assert len(r.json()) == 33


def test_recommended_endpoint(client: TestClient) -> None:
    r = client.get("/v1/skills/recommended", params={"agents": "doc-agent,reviewer-agent"})
    assert r.status_code == 200
    body = r.json()
    assert all(s["trust_tier"] in ("anthropic-vetted", "aegira-certified", "world-top")
               for s in body["preselected"])
    assert all(s["trust_tier"] in ("community", "experimental") for s in body["offered"])


def test_recommended_empty_and_unknown(client: TestClient) -> None:
    empty = client.get("/v1/skills/recommended").json()
    assert empty == {"preselected": [], "offered": []}
    unknown = client.get("/v1/skills/recommended", params={"agents": "nope"}).json()
    assert unknown == {"preselected": [], "offered": []}


def test_skill_detail_and_404(client: TestClient) -> None:
    assert client.get("/v1/skills/docx-export_skill").json()["slug"] == "docx"
    assert client.get("/v1/skills/nope_skill").status_code == 404


# --- M4: Auswahl ins ZIP + Manifest + Security-Gate --------------------------


def _gate2(client: TestClient) -> str:
    pid = client.post("/v1/projects", json={"title": "Skill-Pick", "description": "x"}).json()["id"]
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"project_type": "it", "project_subtype": "software-app",
              "target_platform": "azure", "understanding_summary": "Vorhaben mit Zielbild."},
    )
    client.post(f"/v1/projects/{pid}/approve-understanding")
    client.post(f"/v1/projects/{pid}/guardrails/clear", json={"proceed": True})
    client.post(f"/v1/projects/{pid}/plan")
    client.post(f"/v1/projects/{pid}/plan/milestones/done")
    client.post(f"/v1/projects/{pid}/approve-plan")
    return pid


def _agent_for(graph: dict, name: str) -> str:
    return next(a["id"] for a in graph["agents"] if a["name"] == name)


def test_select_vetted_skill_into_zip_and_manifest(client: TestClient) -> None:
    pid = _gate2(client)
    graph = client.post(f"/v1/projects/{pid}/harness").json()
    aid = _agent_for(graph, "implementation-agent")

    r = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={"command": "skill", "agent_id": aid, "catalog_id": "mcp-builder_skill"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert any(c["catalog_id"] == "mcp-builder_skill" for c in body["catalog_skills"])
    imported = {s["name"]: s["content"] for s in body["imported_skills"]}
    assert "mcp-builder" in imported
    assert imported["mcp-builder"].lstrip().startswith("---")

    # Gate 3 → ZIP enthält Skill + valides _manifest.json
    client.post(f"/v1/projects/{pid}/harness/approve")
    files = {f["path"]: f["content"] for f in client.get(f"/v1/projects/{pid}/harness/files").json()["files"]}
    assert ".claude/skills/mcp-builder/SKILL.md" in files
    assert ".claude/skills/_manifest.json" in files
    man = json.loads(files[".claude/skills/_manifest.json"])
    entry = next(e for e in man["skills"] if e["catalog_id"] == "mcp-builder_skill")
    assert entry["trust_tier"] == "anthropic-vetted"
    assert entry["content_sha256"].startswith("sha256:")


def test_security_gate_blocks_without_confirm(client: TestClient) -> None:
    pid = _gate2(client)
    graph = client.post(f"/v1/projects/{pid}/harness").json()
    aid = _agent_for(graph, "implementation-agent")
    # tdd-enforcement_skill ist community → Gate greift ohne confirm_gate (409)
    blocked = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={"command": "skill", "agent_id": aid, "catalog_id": "tdd-enforcement_skill"},
    )
    assert blocked.status_code == 409, blocked.text
    # mit HITL-Quittung erlaubt
    ok = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={"command": "skill", "agent_id": aid, "catalog_id": "tdd-enforcement_skill",
              "confirm_gate": True},
    )
    assert ok.status_code == 201, ok.text


def test_no_manifest_when_no_catalog_skills(client: TestClient) -> None:
    pid = _gate2(client)
    client.post(f"/v1/projects/{pid}/harness")
    client.post(f"/v1/projects/{pid}/harness/approve")
    files = {f["path"] for f in client.get(f"/v1/projects/{pid}/harness/files").json()["files"]}
    assert ".claude/skills/_manifest.json" not in files


def test_remove_catalog_skill(client: TestClient) -> None:
    pid = _gate2(client)
    graph = client.post(f"/v1/projects/{pid}/harness").json()
    aid = _agent_for(graph, "implementation-agent")
    client.post(f"/v1/projects/{pid}/harness/revise",
                json={"command": "skill", "agent_id": aid, "catalog_id": "mcp-builder_skill"})
    rem = client.post(
        f"/v1/projects/{pid}/harness/revise",
        json={"command": "skill", "agent_id": aid, "catalog_id": "mcp-builder_skill", "remove": True},
    )
    assert rem.status_code == 201
    body = rem.json()
    assert not any(c["catalog_id"] == "mcp-builder_skill" for c in body["catalog_skills"])
    target = next(a for a in body["agents"] if a["id"] == aid)
    assert "mcp-builder" not in target["skills"]
