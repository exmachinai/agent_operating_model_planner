# Skill-Katalog (kuratiert, v0.7-Seed)

**33 Skills**, world-class & extern gevettet. Keine AEGIRA-eigenen Methoden-Skills.

- `skill_catalog.py` — lauffaehige Registry (`list_catalog`, `by_id`, `skills_for_agents`, `preselected`).
- `skills/<catalog_id>/SKILL.md` — eine Katalog-Referenz je Skill (Frontmatter + Provenance).
- `_manifest.json` — Audit-Manifest (Slug, Autor, Trust, Quelle, Pfad; sha256 bei Build).

## Wichtig (IP/Lizenz)
Die `SKILL.md` sind **AEGIRA-Katalog-Referenzen**, kein fremder Originalinhalt. Der echte Inhalt wird
zur **Build-Zeit** aus `source` hydriert (Lizenzpruefung + `content_sha256`), vgl. `docs/15` und `docs/16`.

## Eindeutige Bezeichnung
Jeder Skill hat eine `catalog_id` nach Schema `<funktion>_skill` (z. B. `ux-design_skill`). Davon getrennt
ist der Upstream-`slug` (Standard-konform, ohne Unterstrich).

Erzeugt: 2026-06-02
