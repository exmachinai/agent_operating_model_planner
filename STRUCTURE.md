# Ordnerstruktur — AEGIRA Agent Operating Model Planner

> Stand: 29.05.2026. Diese Datei dokumentiert die kanonische Ablage dieses App-Repos.
> Code- und Build-Ordner sind unverändert; nur Ablage/Referenzmaterial wurde geordnet.

## Top-Level

| Pfad | Zweck |
|---|---|
| `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `LICENSE`, `BRAND.md` | Repo-Meta & Operating-Regeln. |
| `.gitignore` | Git-Ausschlüsse (u. a. `ZGPM/`, `node_modules/`, Build-Artefakte). |
| `STRUCTURE.md` | **Dieses Dokument.** |
| `planner/` | Azure-native Planner-App (Next.js Frontend, FastAPI `api/`, `infra/` Bicep). |
| `mcp/` | `github-pat-mcp-server` (eigener MCP-Server). |
| `harness/` | Portables Agent-Harness-Template (`_template/`). |
| `docs/` | Architektur-, Methodik- & Setup-Doku (`00`–`09`). |
| `_assets/` | Markenassets: `logos/` (svg/png/favicons/social), `moodboard/`. |
| `deliverables/` | Präsentationen & Guides (Stakeholder-Output). |
| `_meta/` | Handover-Notizen & Arbeits-Chatverlauf. |
| `ZGPM/` | Historisches PwC-ZGPM-Quellmaterial (Referenz, nicht im Git). |
| `_deploy-azure.sh`, `_push-images.sh`, `_push-update.sh`, `_push-to-github.sh` | Operative Skripte — **bewusst auf Top-Level** (referenzieren sich gegenseitig; in Doku als Top-Level erwartet). |

## `docs/`

`00_overview` · `01_zgpm-method` · `02_architecture-option-b` · `03_harness-zip-spec` ·
`04_agent-best-practices` · `05_ux-ui-best-practices` · `06_azure-configuration-guide` ·
`07_verification-sweep` · `08_dns-bytecamp-setup` · `09_process-flow` (User-Journey, McK-optimiert).

## `deliverables/`

| Datei | Inhalt |
|---|---|
| `AEGIRA_Planner_User_Guide.pptx` | Aktueller, didaktischer User Guide (29 Slides). |
| `AEGIRA_Agent_Operating_Model_Planner_Entscheidungsvorlage.pptx` | Entscheidungsvorlage. |
| `_superseded/AEGIRA_Planner_User_Guide.pdf` | Alter 11-seitiger Guide — durch die .pptx ersetzt. |

## `_meta/`

| Datei | Inhalt |
|---|---|
| `HANDOVER_2026-05-29_PROCESS-ALIGNED.md` | Aktueller Handover (App-Bau entlang des 9-Schritt-Prozesses). |
| `_HANDOVER_NEXT_MORNING.md` | Vorheriger Handover (Phase-2-Spike). |
| `agentic_project_planning_chatverlauf.md` | Ursprünglicher Ideen-Chatverlauf. |

## `ZGPM/` (Referenz)

`00_TOOL/` (Tool + Tutorial) · `01_HILFE/` (Hilfe + Bilder) · `02_BEISPIELE/` (Projektworkbooks) ·
`99_ORIGINAL_ZIPS/` (Original-Downloads) · `_QUARANTAENE_Duplikate/` (deckungsgleiche Mehrfach-
Extraktionen — nach Sichtung löschbar). Details: `ZGPM/README.md`.

## Hinweise

- **Nicht-destruktiv umstrukturiert:** Es wurde nichts gelöscht außer OS-Noise (`.DS_Store`).
  Doppeltes ZGPM-Material liegt in `ZGPM/_QUARANTAENE_Duplikate/` und kann nach Prüfung entfernt werden.
- **Code/Build/Deploy unverändert:** `planner/`, `mcp/`, `harness/`, Skripte und `.gitignore`
  wurden nicht angefasst, damit Builds und Push/Deploy weiter funktionieren.
