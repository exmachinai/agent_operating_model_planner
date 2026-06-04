"""Effektiver Skill-Katalog (v0.8) — Code-Katalog ⊕ Admin-Registry.

Vereint den code-definierten Katalog (`skill_catalog`, inkl. AEGIRA-Methoden-
Strang) mit der Admin-Freigabeliste (`SkillRegistry`: released/blocked/custom).
Liefert die *freigegebene* Sicht für normale Nutzer und die *vollständige* Sicht
(mit Freigabe-Status) für den Admin.
"""

from __future__ import annotations

from ..schemas.harness import CatalogSkill, SkillRegistry
from . import skill_catalog


def _effective(reg: SkillRegistry) -> list[CatalogSkill]:
    """Code-Katalog + Custom-Skills (Custom überschreibt gleiche catalog_id)."""
    by_id: dict[str, CatalogSkill] = {s.catalog_id: s for s in skill_catalog.list_catalog()}
    for c in reg.custom:
        by_id[c.catalog_id] = c
    return list(by_id.values())


def is_released(skill: CatalogSkill, reg: SkillRegistry) -> bool:
    if skill.catalog_id in reg.blocked:
        return False
    if skill.catalog_id in reg.released:
        return True
    return skill_catalog.default_released(skill)


def all_with_status(reg: SkillRegistry) -> list[tuple[CatalogSkill, bool]]:
    """Vollständiger Katalog + Freigabe-Status (für den Adminbereich)."""
    items = _effective(reg)
    items.sort(key=lambda s: (not s.preselected, s.catalog_id))
    return [(s, is_released(s, reg)) for s in items]


def released_catalog(reg: SkillRegistry) -> list[CatalogSkill]:
    """Nur freigegebene Skills (für normale Nutzer)."""
    return [s for s in _effective(reg) if is_released(s, reg)]


def released_by_id(catalog_id: str, reg: SkillRegistry) -> CatalogSkill | None:
    for s in _effective(reg):
        if s.catalog_id == catalog_id and is_released(s, reg):
            return s
    return None


def any_by_id(catalog_id: str, reg: SkillRegistry) -> CatalogSkill | None:
    return next((s for s in _effective(reg) if s.catalog_id == catalog_id), None)


def hydrate(skill: CatalogSkill) -> CatalogSkill:
    """Setzt content (Custom-Inhalt oder echte ausführbare SKILL.md) + content_sha256."""
    import hashlib

    content = skill.content or skill_catalog.render_skill(skill)
    sha = "sha256:" + hashlib.sha256(content.encode("utf-8")).hexdigest()
    return skill.model_copy(update={"content": content, "content_sha256": sha})


def _sort_key(s: CatalogSkill) -> tuple:
    return (not s.preselected, s.catalog_id)


def recommended(agent_ids: list[str], reg: SkillRegistry) -> dict[str, list[CatalogSkill]]:
    """Empfehlungen je Agenten-Set, nur freigegeben: preselected vs. offered."""
    want = set(agent_ids)
    rel = [s for s in released_catalog(reg) if want & set(s.agent_ids)]
    rel.sort(key=_sort_key)
    return {
        "preselected": [s for s in rel if s.preselected],
        "offered": [s for s in rel if not s.preselected],
    }
