---
name: mece-check
description: mece-check_skill — Prüft Struktur auf MECE-Konformität und Pyramid-Logik (McKinsey-Prinzipien). Trigger: Gliederung/Argumentation schärfen.
metadata:
  catalog_id: mece-check_skill
  author: exmachinAI
  source: internal:aegira
  trust_tier: aegira-certified
  domain: methodology
  agent_ids: [methodology-agent]
  version: "n/v"
  risk: low
  required_tools: [read]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# MECE-/Pyramid-Prüfung  (`mece-check_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `mece-check`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:aegira) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
mece-check_skill — Prüft Struktur auf MECE-Konformität und Pyramid-Logik (McKinsey-Prinzipien). Trigger: Gliederung/Argumentation schärfen.

## Klassifizierung
- Trust-Tier: **aegira-certified**  (vorselektiert)
- Domäne: methodology · Agentenrollen: methodology-agent
- Risk: low · Skripte: nein
- Tools: read · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:aegira` (Pfad `mece-check/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/mece-check/SKILL.md` ins Harness-ZIP.
