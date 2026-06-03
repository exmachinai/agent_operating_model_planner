# Offene P2-Restposten nach v0.9 (als Issues dokumentiert)

**Stand:** 2026-06-03 · DoD v0.9 erlaubt P2 „umgesetzt **oder** als Issue dokumentiert".
Folgende P2-Punkte sind bewusst **nicht** in v0.9 umgesetzt und hier als nachziehbare
Issues festgehalten. Begründung je Punkt: Aufwand/CI-Infra oder kontextabhängiger Scope.

### Erledigt in v0.9 (Nachtrag)
- **D4** — McKinsey-Finding `mckinsey.mece-ungesichert` in `_detect_anti_patterns` (echte Heuristik: Methodik-Agent/ZGPM-/MECE-Skill vorhanden?).
- **B5** — `AGENTS.md` (Cross-Tool-Einstieg, `@import` von `CLAUDE.md`) wird erzeugt.
- **B6** — `.devcontainer/devcontainer.json` (Non-Root) für IT-Harnesses (gated auf `project_type=="it"`).
- **CI-Gate** — `.github/workflows/ci.yml` (pytest inkl. Schema-Gate + tsc + eslint) bei PR/Push.

### Weiterhin offen
| # | Bucket | Titel | Warum verschoben | Vorschlag |
|---|---|---|---|---|
| E2 | Verifikation | Headless-Smoke (echter `claude --headless`-Lauf in Sandbox) | Braucht CI-Runner mit installiertem Claude Code + `jq`; CLI nicht in CI verfügbar | Eigener Job mit Claude-Code-Install, Harness entpacken, Hooks/Agenten-Load prüfen |
| E3 | Verifikation | Adversariale Review des kompilierten Harness (frischer Kontext) | Orchestrierung/Agenten-Infra; über Schema-Gate (P0.4) bereits teilabgedeckt | Reviewer-Subagent-Lauf im CI gegen den ZIP-Output |
| F5 | UX | Restlicher visueller Feinschliff (Lade-/Leer-/Fehlerzustände, Mikro-Animationen) | Kern erledigt (Tokens, Safe-Area, Focus-Ringe, Bottom-Bars); Rest iterativ | Pro Seite Leer-/Lade-/Fehlerzustände vervollständigen |

## Hinweis DoD-Belege
- **iPhone-15-Plus-Screenshots** (`/plan`, `/harness`, `/review`) + **Lighthouse-A11y ≥95**:
  in dieser Umgebung nicht erzeugbar (Next-Build nicht aus Dropbox-Pfad). Bei lokalem
  Build/Deploy nachreichen — die zugrundeliegenden Maßnahmen (Safe-Area, ≥44px, 16px-Inputs,
  ARIA, Farbe-nicht-allein) sind im Code umgesetzt und per `tsc`/`eslint` abgesichert.

*exmachinAI · AEGIRA AI Trust Platform.*
