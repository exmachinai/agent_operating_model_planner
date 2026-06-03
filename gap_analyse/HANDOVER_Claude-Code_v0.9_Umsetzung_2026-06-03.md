# HANDOVER → Claude Code — Release v0.9 (strukturiert nach P0 → P2)

**Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` · **Ziel-Release:** `v0.9`
**Datum:** 2026-06-03 · **Quelle der Aufgaben:** `gap_analyse/TODO_Weltklasse_vs_BestPractice_2026-06-03.md`
**Prüfgrundlage:** `Best-Practice_Agentische-Entwicklung_Artefakte-und-HITL.md` (im Folgenden „BP-MD")

> Ausführungsauftrag für Claude Code. Lies zuerst `CLAUDE.md` (Repo-Wurzel) + die TODO-Datei.
> Arbeite **Explore → Plan → Implement → Commit**. „Verifikation ist der höchste Hebel" (BP-MD §4).
> **Struktur dieses Dokuments: nach Priorität (P0 → P2).** Die Bucket-Herkunft (A–F) steht je Aufgabe in `[ ]`.

---

## 0. Leitplanken (nicht verhandelbar — AEGIRA-Constitution)

- AEGIRA ist **Trust-Infrastructure**, nicht Compliance-Software. **Keine 100%-Claims.**
- Rechtsräume **DE · EU27-Rest · UK · CH**. Niemals „DACH". Maturity = **AIMS**.
- Produktnamen eingefroren: **AI Navigator / AI Guardian / AI Commander**.
- **Zone-2-Verbot:** kein Write auf `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**`. Keine Secrets im Klartext.
- Doku-Sprache **Deutsch**, Code-Identifier **Englisch**. Methodentreue: ZGPM + McKinsey (MECE, Pyramid, hypothesengetrieben).

## 1. Vorgehen & Branch

1. Branch `release/v0.9` von `main`. **Plan zuerst** (Repo-Regel), dann Code.
2. Verifikations-Subagent (frischer Kontext, nur Korrektheit) reviewt jeden Phasen-Diff adversarial.
3. PR gegen `main`, Imperativ-Titel, Test-Belege + iPhone-Screenshots.
4. Bei Schema-Unsicherheit: **gegen offizielle Claude-Code-Doku verifizieren**
   (`code.claude.com/docs/en/{hooks,settings,permission-modes,skills,sub-agents}`) — NICHT raten.
5. **Bucket-Legende:** A=Runtime-Schema · B=Artefakte · C=Governance/Reifegrad · D=RACI/Methodik · E=Verifikation · F=UX/iPhone.

---

# PHASE P0 — Blockierend, zuerst („läuft es real + ist es lesbar?")

> Ohne korrektes Runtime-Schema ist alles andere kosmetisch; ohne Legende/Safe-Area ist die UI nicht weltklasse.
> **Reihenfolge innerhalb P0:** P0.1 → P0.5.

### P0.1 — PVM-Code-Legende einblenden  `[D1]`
- **Dateien:** `planner/components/PlanViews.tsx` (`RaciMatrix`), `app/projects/[id]/plan/page.tsx`.
- **Tun:** Code→Bedeutung-Tabelle **sichtbar** unter die Matrix rendern (Daten liegen in `PVM_TITLE`/`PVM_LABEL`).
  Heute nur Hover-Tooltip + Regel-Legende.
- **Akzeptanz:** Legende ohne Hover lesbar (auch mobil); A11y unverändert grün.

### P0.2 — Hook-Schema korrigieren  `[A1]`
- **Dateien:** `planner/api/app/harness/templates.py → hook_files()`, `settings_json()`.
- **Tun:** Kanonisches Schema: Hooks in `settings.json` unter `hooks`, Events `PreToolUse`/`PostToolUse`/`Stop`,
  je `matcher` + Handler `type:"command"`, Blockieren via **Exit-Code 2**. `constitution-guard` als
  `PreToolUse` `permissionDecision:"deny"` (greift im bypass + rekursiv für Subagents, BP-MD §4).
- **Akzeptanz:** validiert gegen offizielles Hooks-Schema; `constitution-guard` blockt simulierten
  Write auf `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/`.

### P0.3 — `settings.json` schematreu  `[A2]`
- **Datei:** `templates.py → settings_json()`.
- **Tun:** Phantasie-Keys raus (`subagents_path`, `skills_path`, `commands_path`, `memory_path`,
  `thinking_budget`, `$schema`-URL). Nur dokumentierte Felder; Permissions deny→ask→allow.
- **Akzeptanz:** lädt in echtem Claude Code ohne Warnung.

### P0.4 — Schema-Validierungs-Suite (CI-Gate)  `[A3/E1]`
- **Datei:** `planner/api/tests/test_harness_schema.py` (neu).
- **Tun:** jeden Artefakttyp (`settings.json`, Hooks, Agenten-Frontmatter, `plugin.json`, `.mcp.json`)
  gegen hinterlegtes JSON-Schema prüfen; in CI **blockierend**.
- **Akzeptanz:** `pytest` grün; absichtlich falsches Feld → rot.

### P0.5 — Safe-Area-Insets (iPhone, heute fehlend)  `[F1]`
- **Dateien:** `app/layout.tsx` (Viewport), `app/styles/tokens.css` (`.aegira-shell` + Sticky-Leisten).
- **Tun:** `viewport` um `viewportFit:"cover"`; Padding mit `env(safe-area-inset-*)`
  (`max(clamp(...), env(...))`). Sticky-Aktionsleisten: `padding-bottom: env(safe-area-inset-bottom)`.
- **Akzeptanz:** iPhone 15 Plus — Home-Indicator überdeckt keine Buttons; nichts unter der Dynamic Island.

---

# PHASE P1 — Kurzfristig (Vollständigkeit, Trust, Anschlussfähigkeit, mobile Bedienbarkeit)

### Runtime/Artefakte
- **P1.1 `[A4]` Versions-Inkonsistenz:** `compiler._SCHEMA_VERSION` (`2.1.0-…`) vs.
  `templates.changelog_md()` (`2.0.0-…`) auf **einen** Wert. *Akzeptanz:* Grep findet nur eine Version.
- **P1.2 `[B1]` `.mcp.json` generieren (Schicht 10):** neue `templates.mcp_json()` in `compiler.build_files()`;
  Server aus `CatalogSkill.required_mcps` + Tool-Specs; Credentials nur `${ENV}`; Transport `http`/`stdio`.
  *Akzeptanz:* GitHub-MCP-Harness erzeugt valide `.mcp.json` ohne Klartext-Secret.
- **P1.3 `[B3]` Permission-Modi + `ask`-Liste:** `settings.json` `defaultMode` (an Reifegrad P1.5 gekoppelt),
  `ask`-Patterns, Protected Paths. *Akzeptanz:* Modus je Reifegrad korrekt.
- **P1.4 `[B4]` Commands → Skills:** `templates.command_files()` → `skill_files()`; `plugin_json()` anpassen;
  `.claude/commands/` nur noch Legacy-Hinweis. *Akzeptanz:* `/run-harness` etc. als Skill, keine Kollisionswarnung.

### Governance/Reifegrad
- **P1.5 `[C1]` Autonomie-/Reifegrad-Selektor (Stufe 1–4):** `schemas/harness.py` (`AutonomyLevel`),
  `compiler.py`, `templates.settings_json()`, UI `app/projects/[id]/harness/page.tsx`. Stufe steuert gebündelt
  `defaultMode`, Hook-Strenge, Sandbox-Pflicht, HITL-Dichte; an AIMS koppeln. Prinzip: **Autonomie an
  Reversibilität, nicht Mechanik** (BP-MD §7). *Akzeptanz:* Stufe 1 = read-only/Approvals; Stufe 4 = `auto`+Telemetrie.
- **P1.6 `[C2]` Irreversibilitäts-Flag:** `ToolSpec.irreversible: bool` → erzwingt HITL-Gate (zusätzlich zu `risk=high`).
  *Akzeptanz:* irreversibles Tool erzeugt HITL-Knoten.
- **P1.7 `[C3]` Credential-/Transcript-Hygiene:** deny `Read(./.env)` + Secret-Globs; `cleanupPeriodDays`;
  `CLAUDE_CODE_SKIP_PROMPT_HISTORY` in `settings.json`/`env_example()`. *Akzeptanz:* deny-Regeln + Hinweis in INSTALL/HANDOVER.

### RACI/Methodik (Entscheidung: PVM bleibt interne Wahrheit, RACI ist Anzeige-Standard + Toggle)
- **P1.8 `[D2]` RACI-Anzeige + Toggle:** `PlanViews.tsx`, `lib/api.ts`, `templates.plan_pvm()`.
  Mapping A→**R** · L/F→**A** (genau einer) · E/e/B→**C** · I/V→**I**. RACI-Badges default + Legende; Toggle „RACI ⇄ PVM";
  interne Codes/Regeln unverändert. *Akzeptanz:* Umschalten ändert nur Labels, nicht die Konsistenzprüfung.
- **P1.9 `[D3]` RACI-Konsistenzcheck-Labels:** bestehende Validierung (≥1 A, genau ein F/L, „e" nie ohne „E")
  auf RACI mappen („genau ein Accountable", „≥1 Responsible"). *Akzeptanz:* Logik identisch, nur Beschriftung wechselt.

### UX/iPhone
- **P1.10 `[F2]` Breite Ansichten mobil:** `PlanViews.tsx` (Matrix/Gantt/Heatmap/Token), `Accordion.tsx`.
  `.aegira-scroll-x` + Scroll-Affordance (Fade „mehr →"); erste Spalte `position:sticky; left:0`;
  RACI-Legende mobil als umbrechende Chips. *Akzeptanz:* Matrix bei 430px nutzbar, Meilenstein-Spalte sichtbar.
- **P1.11 `[F3]` Touch & Eingabe:** interaktive Elemente ≥44px (`.aegira-tap`); Inputs `font-size:16px`
  (kein iOS-Auto-Zoom); `touch-action`/`tap-highlight` sauber. *Akzeptanz:* kein Fokus-Zoom; keine Ziele <44px.
- **P1.12 `[F4]` Mobile Aktionsleisten:** Primäraktion je Schritt (z. B. „Review & Freigabe (Gate 2)") als
  **sticky Bottom-Bar** mit Safe-Area; Sekundäres in Overflow. *Akzeptanz:* Hauptaktion ohne Scrollen, Daumenreichweite.
- **P1.13 `[F6]` A11y (WCAG 2.1 AA):** Kontrast AA, Tastatur, ARIA (Akkordeon/Matrix/Toggle), Farbe nie alleiniger
  Bedeutungsträger (Ampel/RACI zusätzlich Symbol/Label). *Akzeptanz:* Lighthouse-A11y ≥95 auf `/plan`, `/harness`, `/review`.

---

# PHASE P2 — Mittelfristig (Ausbau, Härtung, Feinschliff)

- **P2.1 `[A5]`** `runtime_requirements` gegen reale aktuelle Versionen prüfen (Versionsdrift, BP-MD §9).
- **P2.2 `[B2]`** `.claude/rules/*.md` (Schicht 3): Zone-Regeln, Naming `YYMMDD_HHMM_USER-XXX` als `paths`-Glob-Regel.
- **P2.3 `[B5]`** `AGENTS.md` per `@import` aus `CLAUDE.md` — nur bei Cross-Tool-`target_platform`.
- **P2.4 `[B6]`** `.devcontainer/` (Non-Root) — nur IT-Harnesses; Voraussetzung für `acceptEdits`/`auto` (BP-MD §8).
- **P2.5 `[C4]`** OTel-Snippet + Cowork-Audit-Lücke (BP-MD §5/§9) in `handover_md()`; `audit-log`-Hook als Kompensation benennen.
- **P2.6 `[C5]`** Stopping-Conditions vereinheitlichen/dokumentieren (`MAX_HARNESS_ITERATIONS=25` vs. Reviewer „max 3").
- **P2.7 `[D4]`** McKinsey-Findings (MECE/Pyramid/Hypothese) als eigene Reviewer-Findings sichtbar.
- **P2.8 `[D5]`** Matrix-Export (RACI/PVM als CSV/MD) ins ZIP für Audit-Ablage.
- **P2.9 `[E2]`** Headless-Smoke: Harness in Sandbox `--permission-mode dontAsk` starten; Agenten/Hooks laden. CI-Job.
- **P2.10 `[E3]`** Adversariale Review des kompilierten Harness (frischer Kontext, nur Korrektheit).
- **P2.11 `[E4]`** Determinismus-Test: gleicher Plan → bit-identischer ZIP-Hash.
- **P2.12 `[F5]`** Visueller Feinschliff: 8-pt-Rhythmus, Hierarchie (Display/Body), sparsame Schatten (`--sh-1/2`),
  Fokus-Ringe (`--c-focus`), Lade-/Leer-/Fehlerzustände, Mikro-Animationen (respektiert `prefers-reduced-motion`),
  keine ad-hoc-Farben (Tokens = Single Source, neue Werte zuerst in `BRAND.md`).

---

## Definition of Done — v0.9

1. **P0 + P1 vollständig** (Akzeptanzkriterien erfüllt); **P2** umgesetzt oder als Issue dokumentiert.
2. `pytest` grün inkl. Schema-/Determinismus-Tests (P0.4/P2.11); Lint/Typecheck grün.
3. Headless-Smoke (P2.9) lädt den Harness fehlerfrei.
4. **iPhone-15-Plus-Belege:** Screenshots 430×932 von `/plan`, `/harness`, `/review` (Matrix, Bottom-Bar,
   Safe-Area) im PR; Lighthouse-A11y ≥95.
5. Versionsbumps konsistent auf **v0.9** (`compiler`, `package.json`, Changelog, `runtime_requirements`).
6. `CHANGELOG`/Doku auf Deutsch; PR verlinkt diese Datei + die TODO-Datei.

## Verboten (Reminder)
Keine 100%-Claims · kein „DACH" · keine anderen Produktnamen · kein Write in Zone 2 · keine Secrets im Klartext ·
keine Schema-Felder raten (gegen offizielle Doku verifizieren).

---

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust. Stand gegen die jeweils aktuelle Claude-Code-Doku verifizieren (BP-MD §9).*
